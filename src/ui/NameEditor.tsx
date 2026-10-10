import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text } from 'react-native';
import type { NamedRow } from '../db/repo';
import { validateName } from '../domain/forms';
import { Button, ErrorText, Field, Label } from './kit';
import { useTheme } from './theme';

/** Rename or delete something that only has a name (a sector, a region). */
export function NameEditor({ title, hint, load, rename, onDelete, deleteLabel }: {
  title: string;
  hint?: string;
  load: () => Promise<NamedRow | null>;
  rename: (name: string) => Promise<void>;
  /** Shows the confirmation and deletes; receives the current name. */
  onDelete: (name: string) => void;
  deleteLabel: string;
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const th = useTheme();
  const [name, setName] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load().then((row) => { if (row) { setName(row.name); setLoaded(true); } });
  }, [load]);

  async function save() {
    const v = validateName(name);
    if (!v.ok) { setError(t(v.error)); return; }
    setSaving(true);
    try {
      await rename(v.value);
      router.back();
    } catch (e) {
      setError(t('common.failed', { message: (e as Error).message }));
      setSaving(false);
    }
  }

  return (
    <ScrollView style={{ backgroundColor: th.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title }} />
      <Label>{t('edit.name')}</Label>
      <Field value={name} onChangeText={setName} accessibilityLabel={t('edit.name')} returnKeyType="done" onSubmitEditing={save} />
      {hint ? <Text style={{ color: th.muted, marginTop: 8 }}>{hint}</Text> : null}
      {error ? <ErrorText>{error}</ErrorText> : null}
      <Button label={saving ? t('common.saving') : t('common.save')} onPress={save} disabled={saving || !loaded} />
      <Button label={deleteLabel} onPress={() => onDelete(name)} variant="danger" disabled={saving || !loaded} />
    </ScrollView>
  );
}
