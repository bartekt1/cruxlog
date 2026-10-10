import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Keyboard, Text, View } from 'react-native';
import { addGoal, listGoals, type GoalRow } from '../../src/db/repo';
import { validateGoalDraft, type GoalKind } from '../../src/domain/forms';
import { Button, Chip, ChipRow, EmptyState, ErrorText, Field, Label, Screen } from '../../src/ui/kit';
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

  const load = useCallback(() => { listGoals(db).then(setRows); }, [db]);
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
        renderItem={({ item }) => (
          <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: th.line }}>
            <Text style={{ color: th.ink, fontWeight: '600' }}>{item.title}</Text>
            <Text style={{ color: th.muted, fontSize: 12 }}>{t(`goals.${item.kind as GoalKind}`)}{item.target ? ` · ${item.target}` : ''}</Text>
          </View>
        )}
      />
    </Screen>
  );
}
