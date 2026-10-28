import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';
import { Text } from './Text';
import type { NamedRow } from '../db/repo';
import { validateName } from '../domain/forms';
import { Button, ErrorText, Field, Label } from './kit';
import { useTheme } from './theme';
import { errorMessage } from './errors';
import { FromPack } from './FromPack';

/** Rename or delete something that only has a name (a sector, a region). One from a pack or an import is not deleted: `fromPack` says so. */
export function NameEditor({ title, hint, load, rename, onDelete, deleteLabel, fromPack }: {
  title: string;
  hint?: string;
  load: () => Promise<NamedRow | null>;
  rename: (name: string) => Promise<void>;
  /** Shows the confirmation and deletes; receives the current name. */
  onDelete: (name: string) => void;
  deleteLabel: string;
  /** Shown instead of Delete when the loaded row is not the user's own; `onReport` reports it as gone. */
  fromPack: { note: string; onReport?: () => Promise<boolean> };
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const th = useTheme();
  const [name, setName] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [own, setOwn] = useState(true);

  useEffect(() => {
    load().then((row) => { if (row) { setName(row.name); setOwn(row.source === 'user'); setLoaded(true); } });
  }, [load]);

  async function save() {
    const v = validateName(name);
    if (!v.ok) { setError(t(v.error)); return; }
    setSaving(true);
    try {
      await rename(v.value);
      router.back();
    } catch (e) {
      setError(errorMessage(e));
      setSaving(false);
    }
  }

  return (
    <ScrollView style={{ backgroundColor: th.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title }} />
      <Label>{t('edit.name')}</Label>
      <Field value={name} onChangeText={setName} accessibilityLabel={t('edit.name')} returnKeyType="done" onSubmitEditing={save} />
      {hint && own ? <Text style={{ color: th.muted, marginTop: 8 }}>{hint}</Text> : null}
      {error ? <ErrorText>{error}</ErrorText> : null}
      <Button label={saving ? t('common.saving') : t('common.save')} onPress={save} disabled={saving || !loaded} />
      {!loaded ? null : own ? <Button label={deleteLabel} onPress={() => onDelete(name)} variant="danger" disabled={saving} />
        : <FromPack note={fromPack.note} name={name} onReport={fromPack.onReport} />}
    </ScrollView>
  );
}
