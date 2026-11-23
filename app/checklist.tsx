import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, View } from 'react-native';
import { addChecklistItems, deleteChecklistItem, listChecklist, resetChecklist, setChecklistDone, type ChecklistItem } from '../src/db/repo';
import { checklistLabel, checklistProgress, CHECKLIST_LABEL_MAX, DEFAULT_CHECKLIST } from '../src/domain/checklist';
import { runOrAlert } from '../src/ui/errors';
import { F } from '../src/ui/fonts';
import { IconButton } from '../src/ui/icons';
import { Button, EmptyState, ErrorText, Field, Label, LinkButton, Screen } from '../src/ui/kit';
import { Text } from '../src/ui/Text';
import { useTheme } from '../src/ui/theme';

/** The packing checklist: tick things off before leaving, add your own, untick everything for the next trip. */
export default function Checklist() {
  const db = useSQLiteContext();
  const { t } = useTranslation();
  const th = useTheme();
  const [items, setItems] = useState<ChecklistItem[] | null>(null);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => { listChecklist(db).then(setItems); }, [db]);
  useFocusEffect(load);

  // Every change goes to the database first; the list is then read again, so the screen never shows unsaved state.
  const change = async (fn: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    await runOrAlert(fn);
    setBusy(false);
    load();
  };

  const add = () => {
    const res = checklistLabel(text);
    if ('error' in res) { setError(t(res.error, { max: CHECKLIST_LABEL_MAX })); return; }
    setError('');
    change(async () => { await addChecklistItems(db, [res.label]); setText(''); });
  };

  const progress = checklistProgress(items ?? []);

  return (
    <Screen>
      <FlatList
        data={items ?? []}
        keyExtractor={(i) => i.id}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{ paddingBottom: 40 }}
        ListHeaderComponent={
          <View style={{ paddingBottom: 8 }}>
            {progress.total ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                <Text accessibilityLiveRegion="polite" style={{ color: th.ink, fontFamily: F.cond, fontSize: 20 }}>
                  {t('checklist.progress', { done: progress.done, total: progress.total })}
                </Text>
                {progress.done ? <LinkButton label={t('checklist.reset')} onPress={() => change(() => resetChecklist(db))} /> : null}
              </View>
            ) : null}
            <Label>{t('checklist.addLabel')}</Label>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Field value={text} onChangeText={(v) => { setText(v); if (error) setError(''); }} placeholder={t('checklist.addPlaceholder')}
                  accessibilityLabel={t('checklist.addLabel')} invalid={!!error} maxLength={CHECKLIST_LABEL_MAX + 20}
                  returnKeyType="done" onSubmitEditing={add} submitBehavior="submit" />
              </View>
              <IconButton name="add-circle" size={36} label={t('checklist.add')} onPress={add} />
            </View>
            {error ? <ErrorText>{error}</ErrorText> : null}
          </View>
        }
        ListEmptyComponent={items && !items.length ? (
          <View>
            <EmptyState title={t('checklist.empty')} hint={t('checklist.emptyHint')} />
            <Button label={t('checklist.useDefaults')} disabled={busy}
              onPress={() => change(() => addChecklistItems(db, DEFAULT_CHECKLIST.map((k) => t(`checklist.defaults.${k}`))))} />
          </View>
        ) : null}
        renderItem={({ item, index }) => (
          <View style={{ flexDirection: 'row', alignItems: 'center', borderTopWidth: index ? 1 : 0, borderColor: th.line }}>
            <Pressable onPress={() => change(() => setChecklistDone(db, item.id, !item.done))}
              accessibilityRole="checkbox" accessibilityState={{ checked: item.done }} accessibilityLabel={item.label}
              style={({ pressed }) => ({ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, opacity: pressed ? 0.6 : 1 })}>
              <Ionicons name={item.done ? 'checkbox' : 'square-outline'} size={26} color={item.done ? th.accent : th.muted} />
              <Text style={{ flex: 1, color: item.done ? th.muted : th.ink, fontSize: 17, textDecorationLine: item.done ? 'line-through' : 'none' }}>
                {item.label}
              </Text>
            </Pressable>
            <IconButton name="trash-outline" size={20} color={th.muted} label={t('checklist.delete', { label: item.label })}
              onPress={() => change(() => deleteChecklistItem(db, item.id))} />
          </View>
        )}
      />
    </Screen>
  );
}
