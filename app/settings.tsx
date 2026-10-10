import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, ScrollView, Text } from 'react-native';
import { exportBackup, importBackup } from '../src/db/backup';
import { applyImport } from '../src/db/repo';
import { buildImportPlan } from '../src/domain/csvImport';
import { BOULDER_SYSTEMS, ROUTE_SYSTEMS } from '../src/domain/grades';
import type { Lang } from '../src/domain/settings';
import i18n from '../src/i18n';
import { Button, Chip, ChipRow, Label } from '../src/ui/kit';
import { useSettings } from '../src/ui/settingsStore';
import { useTheme } from '../src/ui/theme';

class UserError extends Error {}

export default function Settings() {
  const db = useSQLiteContext();
  const { t } = useTranslation();
  const th = useTheme();
  const s = useSettings();
  const [busy, setBusy] = useState(false);

  // Results go to an alert so they are seen even when the button is far down the screen.
  const run = async (fn: () => Promise<string | void>) => {
    setBusy(true);
    try {
      const msg = await fn();
      if (msg) Alert.alert(t('settings.done'), msg);
    } catch (e) {
      Alert.alert(t('settings.problem'), e instanceof UserError ? e.message : t('common.failed', { message: (e as Error).message }));
    } finally {
      setBusy(false);
    }
  };

  const setLanguage = (lang: Lang) => {
    s.setLanguage(lang);
    i18n.changeLanguage(lang);
  };

  const doExport = () => run(async () => {
    const file = new File(Paths.cache, `cruxlog-backup-${Date.now()}.json`);
    file.create();
    file.write(JSON.stringify(await exportBackup(db)));
    await Sharing.shareAsync(file.uri, { mimeType: 'application/json' });
  });

  const doImport = () => run(async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
    if (res.canceled) return;
    let data: unknown;
    try {
      data = JSON.parse(await new File(res.assets[0].uri).text());
    } catch {
      throw new UserError(t('settings.notBackup'));
    }
    if (!data || typeof data !== 'object' || (data as { app?: unknown }).app !== 'cruxlog') throw new UserError(t('settings.notBackup'));
    const n = await importBackup(db, data);
    return t('settings.importDone', { count: n });
  });

  const doCsv = () => run(async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: ['text/csv', 'text/comma-separated-values', 'text/plain'], multiple: true, copyToCacheDirectory: true });
    if (res.canceled) return;
    const texts: Record<string, string> = {};
    for (const a of res.assets) texts[a.name.toLowerCase()] = await new File(a.uri).text();
    if (!texts['crags.csv'] || !texts['routes.csv']) {
      throw new UserError(t('settings.csvMissing', { files: res.assets.map((a) => a.name).join(', ') }));
    }
    const plan = buildImportPlan({ crags: texts['crags.csv'], sectors: texts['sectors.csv'], routes: texts['routes.csv'], pitches: texts['pitches.csv'] });
    if (plan.errors.length) {
      const first = plan.errors.slice(0, 8).map((e) => `${e.file}:${e.line} ${e.message}`).join('\n');
      throw new UserError(`${t('settings.csvErrors', { count: plan.errors.length })}\n\n${first}`);
    }
    return t('settings.csvDone', await applyImport(db, plan));
  });

  return (
    <ScrollView style={{ backgroundColor: th.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
      <Label>{t('settings.language')}</Label>
      <ChipRow>
        <Chip label="Polski" on={i18n.language === 'pl'} onPress={() => setLanguage('pl')} />
        <Chip label="English" on={i18n.language === 'en'} onPress={() => setLanguage('en')} />
      </ChipRow>
      <Label>{t('settings.routeGrades')}</Label>
      <ChipRow>
        {ROUTE_SYSTEMS.map((x) => <Chip key={x} label={x.toUpperCase()} on={s.routeSystem === x} onPress={() => s.setRouteSystem(x)} />)}
      </ChipRow>
      <Label>{t('settings.boulderGrades')}</Label>
      <ChipRow>
        {BOULDER_SYSTEMS.map((x) => <Chip key={x} label={x.toUpperCase()} on={s.boulderSystem === x} onPress={() => s.setBoulderSystem(x)} />)}
      </ChipRow>
      <Label>{t('settings.csv')}</Label>
      <Text style={{ color: th.muted }}>{t('settings.csvHelp')}</Text>
      <Button label={t('settings.csv')} onPress={doCsv} disabled={busy} />
      <Label>{t('settings.backup')}</Label>
      <Text style={{ color: th.muted }}>{t('settings.backupHelp')}</Text>
      <Button label={t('settings.export')} onPress={doExport} variant="plain" disabled={busy} />
      <Button label={t('settings.import')} onPress={doImport} variant="plain" disabled={busy} />
      {busy ? <ActivityIndicator color={th.accent} style={{ marginTop: 16 }} /> : null}
    </ScrollView>
  );
}
