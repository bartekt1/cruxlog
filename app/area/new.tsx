import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';
import { Text } from '../../src/ui/Text';
import { addArea, getArea } from '../../src/db/repo';
import { childLevel, type AreaLevel } from '../../src/domain/areas';
import { validateName } from '../../src/domain/forms';
import { Button, ErrorText, Field, Label } from '../../src/ui/kit';
import { useTheme } from '../../src/ui/theme';
import { errorMessage } from '../../src/ui/errors';

/** /area/new?parentId=<area>: add a region (no parent), a rejon (in a region) or a group (in a rejon). */
export default function NewArea() {
  const { parentId } = useLocalSearchParams<{ parentId?: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const { t } = useTranslation();
  const th = useTheme();
  const [level, setLevel] = useState<AreaLevel | null>(parentId ? null : 'region');
  const [parentName, setParentName] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!parentId) return;
    getArea(db, parentId).then((p) => { setLevel(childLevel(p)); setParentName(p?.name ?? ''); });
  }, [db, parentId]);

  async function save() {
    const v = validateName(name);
    if (!v.ok) { setError(t(v.error)); return; }
    setSaving(true);
    try {
      const id = await addArea(db, parentId ?? null, v.value);
      router.replace(`/area/${id}`);
    } catch (e) {
      setError(errorMessage(e));
      setSaving(false);
    }
  }

  if (!level) return null;
  return (
    <ScrollView style={{ backgroundColor: th.bg }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: t(`areas.add.${level}`) }} />
      {parentName ? <Text style={{ color: th.muted }}>{t('areas.inside', { name: parentName })}</Text> : null}
      <Label>{t('edit.name')}</Label>
      <Field value={name} onChangeText={setName} accessibilityLabel={t('edit.name')} placeholder={t(`areas.placeholder.${level}`)} autoFocus returnKeyType="done" onSubmitEditing={save} />
      {error ? <ErrorText>{error}</ErrorText> : null}
      <Button label={saving ? t('common.saving') : t('common.save')} onPress={save} disabled={saving} />
    </ScrollView>
  );
}
