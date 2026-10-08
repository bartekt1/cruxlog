import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text } from 'react-native';
import { exportBackup, importBackup } from '../src/db/backup';
import { applyImport } from '../src/db/repo';
import { buildImportPlan } from '../src/domain/csvImport';
import { BOULDER_SYSTEMS, ROUTE_SYSTEMS } from '../src/domain/grades';
import i18n from '../src/i18n';
import { Button, Chip, Label } from '../src/ui/kit';
import { useSettings } from '../src/ui/settingsStore';
import { useTheme } from '../src/ui/theme';

export default function Settings() {
  const db = useSQLiteContext();
  const { t } = useTranslation();
  const th = useTheme();
  const s = useSettings();
  const [msg, setMsg] = useState('');

  const guard = async (fn: () => Promise<string | void>) => {
    try { setMsg((await fn()) ?? ''); } catch (e) { setMsg(t('settings.failed', { message: (e as Error).message })); }
  };

  const doExport = () => guard(async () => {
    const file = new File(Paths.cache, `cruxlog-backup-${Date.now()}.json`);
    file.create();
    file.write(JSON.stringify(await exportBackup(db)));
    await Sharing.shareAsync(file.uri, { mimeType: 'application/json' });
  });

  const doImport = () => guard(async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
    if (res.canceled) return;
    const text = await new File(res.assets[0].uri).text();
    const n = await importBackup(db, JSON.parse(text));
    return t('settings.importDone', { count: n });
  });

  const doCsv = () => guard(async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: ['text/csv', 'text/comma-separated-values', 'text/plain'], multiple: true, copyToCacheDirectory: true });
    if (res.canceled) return;
    const texts: Record<string, string> = {};
    for (const a of res.assets) texts[a.name.toLowerCase()] = await new File(a.uri).text();
    const plan = buildImportPlan({ crags: texts['crags.csv'] ?? '', sectors: texts['sectors.csv'], routes: texts['routes.csv'] ?? '', pitches: texts['pitches.csv'] });
    if (plan.errors.length) {
      const first = plan.errors.slice(0, 8).map((e) => `${e.file}:${e.line} ${e.message}`).join('\n');
      return `${t('settings.csvErrors', { count: plan.errors.length })}\n${first}`;
    }
    return t('settings.csvDone', await applyImport(db, plan));
  });

  return (
    <ScrollView style={{ backgroundColor: th.bg }} contentContainerStyle={{ padding: 16 }}>
      <Label>{t('settings.language')}</Label>
      <Chip label="Polski" on={i18n.language === 'pl'} onPress={() => i18n.changeLanguage('pl')} />
      <Chip label="English" on={i18n.language === 'en'} onPress={() => i18n.changeLanguage('en')} />
      <Label>{t('settings.routeGrades')}</Label>
      {ROUTE_SYSTEMS.map((x) => <Chip key={x} label={x.toUpperCase()} on={s.routeSystem === x} onPress={() => s.setRouteSystem(x)} />)}
      <Label>{t('settings.boulderGrades')}</Label>
      {BOULDER_SYSTEMS.map((x) => <Chip key={x} label={x.toUpperCase()} on={s.boulderSystem === x} onPress={() => s.setBoulderSystem(x)} />)}
      <Label>{t('settings.csv')}</Label>
      <Text style={{ color: th.muted }}>{t('settings.csvHelp')}</Text>
      <Button label={t('settings.csv')} onPress={doCsv} />
      <Label>{t('settings.backup')}</Label>
      <Button label={t('settings.export')} onPress={doExport} variant="plain" />
      <Button label={t('settings.import')} onPress={doImport} variant="plain" />
      {msg ? <Text style={{ color: th.ink, marginTop: 16 }}>{msg}</Text> : null}
    </ScrollView>
  );
}
