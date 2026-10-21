import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Text } from '../src/ui/Text';
import { exportBackup, importBackup } from '../src/db/backup';
import { devicePath, folderKind } from '../src/domain/autoBackup';
import { listBackups, restorePhotos, restoreBackup, scanFolder, syncPhotos, writeBackup, type FolderBackup } from '../src/ui/autoBackup';
import { formatBytes } from '../src/domain/photos';
import { pickBackupFolder, testBackupFolder } from '../src/ui/backupFolder';
import { activePhotos, applyCragPositions, applyImport, importedUsage, listAscents, removeImported } from '../src/db/repo';
import { backupStatus } from '../src/domain/history';
import { buildImportPlan, type ImportPlan } from '../src/domain/csvImport';
import { detectFormat, parseFlatCsv, parsePositionsCsv, planFromFlatRows, type FlatRow } from '../src/domain/flatImport';
import { guidebookRows } from '../src/domain/guidebookCsv';
import { theCragRows } from '../src/domain/thecragCsv';
import { ROUTE_SYSTEMS } from '../src/domain/grades';
import type { Lang } from '../src/domain/settings';
import i18n from '../src/i18n';
import { Button, Chip, ChipRow, Label, LinkButton } from '../src/ui/kit';
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
  const [photoStats, setPhotoStats] = useState({ count: 0, bytes: 0 });
  const [copies, setCopies] = useState<FolderBackup[] | null>(null); // the copies in the folder, once "show" was tapped
  useEffect(() => { listAscents(db).then((a) => setHasData(a.length > 0)); }, [db]);
  useEffect(() => { activePhotos(db).then((p) => setPhotoStats({ count: p.length, bytes: p.reduce((sum, x) => sum + x.bytes, 0) })); }, [db]);
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

  // Picks the folder for automatic backups and proves it can be written to before remembering it.
  const doPickFolder = () => run(async () => {
    const dir = await pickBackupFolder();
    if (!dir) return;
    try {
      testBackupFolder(dir);
    } catch (e) {
      throw new UserError(t('settings.folderFailed', { message: (e as Error).message }));
    }
    s.setBackupDir(dir.uri, dir.name);
    try { await scanFolder(dir.uri); } catch { /* the folder is looked through again when needed */ } // so copies and photos already there are recognised
    return t('settings.folderOk', { name: dir.name });
  });

  const when = (at: number) => new Date(at).toLocaleString(i18n.language, { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const folderText = !s.backupDir ? t('settings.folderNone')
    : folderKind(s.backupDir) === 'drive' ? t('settings.folderDrive')
    : folderKind(s.backupDir) === 'device' ? t('settings.folderDevice', { path: devicePath(s.backupDir) || s.backupDirName })
    : t('settings.folderIs', { name: s.backupDirName || s.backupDir });

  const doBackupNow = () => run(async () => {
    try {
      const r = await writeBackup(db, s.backupDir!);
      s.setAutoBackupResult(Date.now(), '');
      setCopies(null);
      const done = t('settings.backupNowDone', { name: r.name, kb: Math.max(1, Math.round(r.bytes / 1024)), count: r.count });
      try {
        const n = await syncPhotos(db, s.backupDir!);
        s.setPhotosSynced(Date.now());
        return n ? `${done}\n\n${t('settings.photosCopied', { count: n })}` : done;
      } catch (e) {
        s.setAutoBackupResult(Date.now(), `photos:${(e as Error).message}`);
        return `${done}\n\n${t('photos.backupFailed', { message: (e as Error).message })}`;
      }
    } catch (e) {
      s.setAutoBackupResult(Date.now(), (e as Error).message);
      throw e;
    }
  });

  // The list is looked up in the folder (a short wait on Google Drive), so it shows a spinner.
  const showCopies = () => run(async () => {
    if (copies) { setCopies(null); return; }
    setCopies(await listBackups(s.backupDir!));
  });

  const doRestore = (b: FolderBackup) => run(async () => {
    const ok = await ask(t('settings.restoreTitle'), t('settings.restoreQuestion', { when: when(b.at) }), t('settings.restoreYes'), t('common.cancel'));
    if (!ok) return;
    const records = await restoreBackup(db, b);
    const photos = await restorePhotos(db, s.backupDir!);
    return t('settings.importDone', { count: records }) + (photos ? `\n\n${t('photos.restored', { count: photos })}` : '');
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
      <Label>{t('settings.autoBackup')}</Label>
      <Text style={{ color: th.muted }}>{t('settings.autoBackupHelp')}</Text>
      <Text style={{ color: th.ink, marginTop: 8, fontWeight: '600' }}>{folderText}</Text>
      {s.backupDir ? (
        <>
          <Text style={{ color: s.autoBackupError ? th.warn : th.muted, marginTop: 4 }}>
            {s.autoBackupError ? (s.autoBackupError.startsWith('photos:') ? t('photos.backupFailed', { message: s.autoBackupError.slice(7) }) : t('settings.autoFailed', { message: s.autoBackupError }))
              : s.autoBackupAt ? t('settings.autoLast', { when: when(s.autoBackupAt) }) : t('settings.autoNever')}
          </Text>
          {photoStats.count ? <Text style={{ color: th.muted, marginTop: 2 }}>{t('photos.stats', { count: photoStats.count, size: formatBytes(photoStats.bytes, i18n.language) })}</Text> : null}
          <Button label={t('settings.backupNow')} onPress={doBackupNow} disabled={busy} />
          <Button label={copies ? t('settings.hideCopies') : t('settings.showCopies')} onPress={showCopies} variant="plain" disabled={busy} />
          {copies ? (
            copies.length ? copies.map((b) => (
              <Text key={b.uri} style={{ color: th.ink, marginTop: 6 }} accessibilityLabel={`${when(b.at)}, ${Math.max(1, Math.round(b.size / 1024))} KB`}>
                {when(b.at)} · {Math.max(1, Math.round(b.size / 1024))} KB
              </Text>
            )) : <Text style={{ color: th.muted, marginTop: 6 }}>{t('settings.noCopies')}</Text>
          ) : null}
          {copies?.map((b) => <LinkButton key={`r-${b.uri}`} label={t('settings.restoreOne', { when: when(b.at) })} onPress={() => doRestore(b)} />)}
          <Button label={t('settings.changeFolder')} onPress={doPickFolder} variant="plain" disabled={busy} />
          <LinkButton label={t('settings.autoOff')} onPress={() => { s.setBackupDir(null); setCopies(null); }} />
        </>
      ) : (
        <Button label={t('settings.pickFolder')} onPress={doPickFolder} variant="plain" disabled={busy} />
      )}
      <Button label={t('settings.export')} onPress={doExport} variant="plain" disabled={busy} />
      <Button label={t('settings.import')} onPress={doImport} variant="plain" disabled={busy} />
      {busy ? <ActivityIndicator color={th.accent} style={{ marginTop: 16 }} /> : null}
    </ScrollView>
  );
}
