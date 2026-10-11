import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, FlatList, Keyboard, Text, View } from 'react-native';
import { addGoal, deleteGoal, listAscents, listGoals, setGoalDone, type GoalRow } from '../../src/db/repo';
import { validateGoalDraft, type GoalKind } from '../../src/domain/forms';
import { countGoalProgress, yearStats } from '../../src/domain/stats';
import { Button, Chip, ChipRow, EmptyState, ErrorText, Field, Label, LinkButton, Screen } from '../../src/ui/kit';
import { useTheme } from '../../src/ui/theme';

export default function Goals() {
  const db = useSQLiteContext();
  const { t } = useTranslation();
  const th = useTheme();
  const [rows, setRows] = useState<GoalRow[]>([]);
  const [kind, setKind] = useState<GoalKind>('count');
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [sends, setSends] = useState(0);
  const year = new Date().getFullYear();

  const load = useCallback(() => {
    listGoals(db).then(setRows);
    listAscents(db).then((a) => setSends(yearStats(a.map((r) => ({ date: r.date, type: r.type, gradeIndex: r.grade_index, style: r.style })), year).sends));
  }, [db, year]);
  useFocusEffect(load);

  async function add() {
    const draft = validateGoalDraft({ kind, title, target });
    if (!draft.ok) { setError(t(draft.error)); return; }
    setError('');
    setSaving(true);
    try {
      await addGoal(db, kind, draft.value.title, draft.value.target);
      setTitle(''); setTarget('');
      Keyboard.dismiss();
      load();
    } catch (e) {
      setError(t('common.failed', { message: (e as Error).message }));
    } finally {
      setSaving(false);
    }
  }

  const confirmDelete = (g: GoalRow) =>
    Alert.alert(t('goals.deleteTitle'), t('goals.deleteQuestion', { title: g.title }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => deleteGoal(db, g.id).then(load) },
    ]);

  return (
    <Screen>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 32 }}
        ListHeaderComponent={
          <View style={{ paddingBottom: 8 }}>
            <Label>{t('goals.kind')}</Label>
            <ChipRow>
              {(['count', 'project', 'wishlist'] as GoalKind[]).map((k) => <Chip key={k} label={t(`goals.${k}`)} on={kind === k} onPress={() => setKind(k)} />)}
            </ChipRow>
            <Field value={title} onChangeText={setTitle} placeholder={t('goals.newTitle')} accessibilityLabel={t('goals.newTitle')} returnKeyType="done" onSubmitEditing={add} />
            {kind === 'count' ? (
              <Field style={{ marginTop: 8, width: 160 }} value={target} onChangeText={setTarget} placeholder={t('goals.target')} accessibilityLabel={t('goals.target')} keyboardType="number-pad" />
            ) : null}
            {error ? <ErrorText>{error}</ErrorText> : null}
            <Button label={t('common.add')} onPress={add} disabled={saving || !title.trim()} />
          </View>
        }
        ListEmptyComponent={<EmptyState title={t('goals.empty')} hint={t('goals.emptyHint')} />}
        renderItem={({ item }) => {
          const done = item.done_at != null;
          const progress = item.kind === 'count' && item.target ? countGoalProgress(item.target, sends) : null;
          return (
            <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: th.line, opacity: done ? 0.6 : 1 }}>
              <Text style={{ color: th.ink, fontWeight: '600', textDecorationLine: done ? 'line-through' : 'none' }}>{done ? '✓ ' : ''}{item.title}</Text>
              <Text style={{ color: th.muted, fontSize: 12 }}>{t(`goals.${item.kind as GoalKind}`)}</Text>
              {progress ? (
                <View style={{ marginTop: 6, gap: 4 }} accessible accessibilityLabel={t('goals.progress', { value: progress.value, target: progress.target, year })}>
                  <View style={{ height: 8, borderRadius: 4, backgroundColor: th.soft, overflow: 'hidden' }}>
                    <View style={{ height: 8, width: `${progress.ratio * 100}%`, backgroundColor: th.accent }} />
                  </View>
                  <Text style={{ color: progress.reached ? th.accent : th.muted, fontSize: 12 }}>
                    {t('goals.progress', { value: progress.value, target: progress.target, year })}
                  </Text>
                </View>
              ) : null}
              <View style={{ flexDirection: 'row', gap: 20 }}>
                <LinkButton label={done ? t('goals.reopen') : t('goals.markDone')} onPress={() => setGoalDone(db, item.id, !done).then(load)} />
                <LinkButton label={t('common.delete')} onPress={() => confirmDelete(item)} />
              </View>
            </View>
          );
        }}
      />
    </Screen>
  );
}
