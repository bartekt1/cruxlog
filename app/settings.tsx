import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Text } from '../src/ui/Text';
import { exportBackup, importBackup } from '../src/db/backup';
import { applyCragPositions, applyImport, importedUsage, listAscents, removeImported } from '../src/db/repo';
import { backupStatus } from '../src/domain/history';
import { buildImportPlan, type ImportPlan } from '../src/domain/csvImport';
import { detectFormat, parseFlatCsv, parsePositionsCsv, planFromFlatRows, type FlatRow } from '../src/domain/flatImport';
import { guidebookRows } from '../src/domain/guidebookCsv';
import { theCragRows } from '../src/domain/thecragCsv';
import { ROUTE_SYSTEMS } from '../src/domain/grades';
import type { Lang } from '../src/domain/settings';
import i18n from '../src/i18n';
import { Button, Chip, ChipRow, Label } from '../src/ui/kit';
import { useSettings } from '../src/ui/settingsStore';
import { useTheme } from '../src/ui/theme';

class UserError extends Error {}

/** Yes/no question as a promise. */
const ask = (title: string, message: string, yes: string, no: string) =>
  new Promise<boolean>((resolve) =>
    Alert.alert(title, message, [
      { text: no, style: 'cancel', onPress: () => resolve(false) },
      { text: yes, onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) }));

export default function Settings() {
  const db = useSQLiteContext();
  const { t } = useTranslation();
  const th = useTheme();
  const s = useSettings();
  const [busy, setBusy] = useState(false);
  const [hasData, setHasData] = useState(false);
  useEffect(() => { listAscents(db).then((a) => setHasData(a.length > 0)); }, [db]);
  const backup = backupStatus(s.lastBackupAt, Date.now(), hasData);

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
    s.setLastBackupAt(Date.now());
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

  // Older three-file format (crags.csv + routes.csv, optional sectors.csv and pitches.csv).
  function legacyPlan(texts: Record<string, string>) {
    if (!texts['crags.csv'] || !texts['routes.csv']) {
      throw new UserError(t('settings.csvMissing', { files: Object.keys(texts).join(', ') }));
    }
    return buildImportPlan({ crags: texts['crags.csv'], sectors: texts['sectors.csv'], routes: texts['routes.csv'], pitches: texts['pitches.csv'] });
  }

  // One file per route list: the guidebook export, a theCrag export or the simple table. Several files are merged.
  function oneFilePlan(texts: Record<string, string>): { plan: ImportPlan; skipped: number } {
    const rows: FlatRow[] = [];
    const errors: ImportPlan['errors'] = [];
    let skipped = 0;
    let only: ImportPlan | null = null;
    const files = Object.entries(texts);
    for (const [name, text] of files) {
      const format = detectFormat(text);
      if (!format) throw new UserError(t('settings.csvUnknown', { file: name }));
      let fileRows: FlatRow[];
      if (format === 'thecrag') {
        const res = theCragRows(text);
        fileRows = res.rows;
        skipped += Object.values(res.skipped).reduce((a, b) => a + b, 0);
      } else fileRows = format === 'guidebook' ? guidebookRows(text) : parseFlatCsv(text);
      const plan = planFromFlatRows(fileRows);
      errors.push(...plan.errors.map((e) => ({ ...e, file: name })));
      rows.push(...fileRows);
      if (files.length === 1) only = plan;
    }
    if (errors.length) return { plan: { ...planFromFlatRows([]), errors }, skipped };
    return { plan: only ?? planFromFlatRows(rows), skipped };
  }

  const doCsv = () => run(async () => {
    // Some Android file managers report CSV files as Excel or plain binary, so accept those too.
    const res = await DocumentPicker.getDocumentAsync({
      type: ['text/*', 'text/csv', 'text/comma-separated-values', 'application/csv', 'application/vnd.ms-excel', 'application/octet-stream'],
      multiple: true, copyToCacheDirectory: true,
    });
    if (res.canceled) return;
    const texts: Record<string, string> = {};
    for (const a of res.assets) texts[a.name.toLowerCase()] = await new File(a.uri).text();
    const only = Object.values(texts);
    if (only.length === 1 && detectFormat(only[0]) === 'positions') return importPositions(only[0]);
    const { plan, skipped } = texts['crags.csv'] || texts['routes.csv'] ? { plan: legacyPlan(texts), skipped: 0 } : oneFilePlan(texts);
    if (plan.errors.length) {
      const first = plan.errors.slice(0, 8).map((e) => `${e.file}, ${t('settings.csvLine', { line: e.line })}: ${e.message}`).join('\n');
      throw new UserError(`${t('settings.csvErrors', { count: plan.errors.length })}\n\n${first}`);
    }
    const ok = await ask(
      t('settings.csvConfirmTitle'),
      t('settings.csvConfirm', { crags: plan.crags.length, routes: plan.routes.length })
        + (skipped ? `\n\n${t('settings.csvSkipped', { count: skipped })}` : ''),
      t('settings.csvConfirmYes'), t('common.cancel'),
    );
    if (!ok) return;
    return t('settings.csvDone', await applyImport(db, plan));
  });

  // A file with crag positions only (crag or key, lat, lng): fills in the map pins of crags already in the app.
  async function importPositions(text: string) {
    const rows = parsePositionsCsv(text);
    if (!rows.length) throw new UserError(t('settings.positionsNone'));
    const approx = rows.filter((r) => r.approx).length;
    const ok = await ask(t('settings.csvConfirmTitle'),
      t('settings.positionsConfirm', { count: rows.length }) + (approx ? `\n\n${t('settings.positionsApprox', { count: approx })}` : ''),
      t('settings.csvConfirmYes'), t('common.cancel'));
    if (!ok) return;
    const { updated, kept, unmatched } = await applyCragPositions(db, rows);
    const names = unmatched.slice(0, 8).map((r) => r.name || r.key).join(', ');
    return t('settings.positionsDone', { count: updated })
      + (kept ? `\n\n${t('settings.positionsKept', { count: kept })}` : '')
      + (unmatched.length ? `\n\n${t('settings.positionsUnmatched', { count: unmatched.length, names })}` : '');
  }

  const doRemoveImported = () => run(async () => {
    const n = await importedUsage(db);
    if (!n.routes && !n.crags) return t('settings.removeImportedNone');
    const ok = await ask(t('settings.removeImportedTitle'), t('settings.removeImportedConfirm', n), t('common.delete'), t('common.cancel'));
    if (!ok) return;
    await removeImported(db);
    return t('settings.removeImportedDone', n);
  });

  return (
    <ScrollView style={{ backgroundColor: th.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
      <Label>{t('settings.language')}</Label>
      <ChipRow>
        <Chip label="Polski" on={i18n.language === 'pl'} onPress={() => setLanguage('pl')} />
        <Chip label="English" on={i18n.language === 'en'} onPress={() => setLanguage('en')} />
      </ChipRow>
      <Label>{t('settings.theme')}</Label>
      <ChipRow>
        {(['system', 'light', 'dark'] as const).map((m) => <Chip key={m} label={t(`settings.themes.${m}`)} on={s.themeMode === m} onPress={() => s.setThemeMode(m)} />)}
      </ChipRow>
      <Label>{t('settings.routeGrades')}</Label>
      <ChipRow>
        {ROUTE_SYSTEMS.map((x) => <Chip key={x} label={x.toUpperCase()} on={s.routeSystem === x} onPress={() => s.setRouteSystem(x)} />)}
      </ChipRow>
      <Label>{t('settings.csv')}</Label>
      <Text style={{ color: th.muted }}>{t('settings.csvHelp')}</Text>
      <Button label={t('settings.csv')} onPress={doCsv} disabled={busy} />
      <Text style={{ color: th.muted, marginTop: 8 }}>{t('settings.removeImportedHelp')}</Text>
      <Button label={t('settings.removeImported')} onPress={doRemoveImported} disabled={busy} variant="plain" />
      <Label>{t('settings.backup')}</Label>
      <Text style={{ color: th.muted }}>{t('settings.backupHelp')}</Text>
      <Text style={{ color: backup.due ? th.warn : th.ink, marginTop: 8, fontWeight: '600' }}>
        {backup.days == null ? t('settings.lastBackupNever') : backup.days === 0 ? t('settings.lastBackupToday') : t('settings.lastBackupDays', { n: backup.days })}
      </Text>
      <Button label={t('settings.export')} onPress={doExport} variant="plain" disabled={busy} />
      <Button label={t('settings.import')} onPress={doImport} variant="plain" disabled={busy} />
      {busy ? <ActivityIndicator color={th.accent} style={{ marginTop: 16 }} /> : null}
    </ScrollView>
  );
}
