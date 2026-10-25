import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';
import { addSector } from '../../src/db/repo';
import { validateName } from '../../src/domain/forms';
import { Button, ErrorText, Field, Label } from '../../src/ui/kit';
import { useTheme } from '../../src/ui/theme';
import { errorMessage } from '../../src/ui/errors';

/** /sector/new?cragId=<crag>: add a sector to a crag. An existing name is reused, not duplicated. */
export default function NewSector() {
  const { cragId } = useLocalSearchParams<{ cragId: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const { t } = useTranslation();
  const th = useTheme();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    const v = validateName(name);
    if (!v.ok) { setError(t(v.error)); return; }
    setSaving(true);
    try {
      await addSector(db, cragId, v.value);
      router.back();
    } catch (e) {
      setError(errorMessage(e));
      setSaving(false);
    }
  }

  return (
    <ScrollView style={{ backgroundColor: th.bg }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: t('edit.addSectorTitle') }} />
      <Label>{t('edit.name')}</Label>
      <Field value={name} onChangeText={setName} accessibilityLabel={t('edit.name')} placeholder={t('ascent.sectorPlaceholder')} autoFocus returnKeyType="done" onSubmitEditing={save} />
      {error ? <ErrorText>{error}</ErrorText> : null}
      <Button label={saving ? t('common.saving') : t('common.save')} onPress={save} disabled={saving} />
    </ScrollView>
  );
}
