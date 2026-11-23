import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { exportBackup, importBackup } from '../../db/backup';
import { activePhotos, hasAscents, listAscentsForExport } from '../../db/repo';
import { devicePath, folderKind, unpackBackup } from '../../domain/autoBackup';
import { formatDateTime, isoDate } from '../../domain/dates';
import { AppError } from '../../domain/errors';
import { backupStatus } from '../../domain/history';
import { ASCENT_STYLES } from '../../domain/grades';
import { csvSeparator, JOURNAL_CSV_COLUMNS, journalCsv } from '../../domain/journalCsv';
import { formatBytes } from '../../domain/photos';
import { backupNow, listBackups, restoreBackup, scanFolder, withBackupLock, type FolderBackup } from '../autoBackup';
import { pickBackupFolder, testBackupFolder } from '../backupFolder';
import { restorePhotosInBackground, usePhotoRestore } from '../photoRestore';
import { busyProgress, hideBusy, showBusy } from '../busy';
import { ask } from '../confirm';
import { errorMessage } from '../errors';
import { F } from '../fonts';
import { FoldSection, MoreText } from '../Fold';
import { Button, Label, LinkButton } from '../kit';
import { useSettings } from '../settingsStore';
import { Text } from '../Text';
import { useTheme } from '../theme';
import type { Run } from './run';

/** Settings › backups: when the last one was made, the automatic copy to a folder with its list and restore, and the manual file. */
export function BackupSection({ run, busy }: { run: Run; busy: boolean }) {
  const db = useSQLiteContext();
  const { t, i18n } = useTranslation();
  const th = useTheme();
  const s = useSettings();
  const [hasData, setHasData] = useState(false);
  const [photoStats, setPhotoStats] = useState({ count: 0, bytes: 0 });
  const [showManual, setShowManual] = useState(false);
  const [copies, setCopies] = useState<FolderBackup[] | null>(null); // the copies in the folder, once "show" was tapped
  useEffect(() => { hasAscents(db).then(setHasData); }, [db]);
  useEffect(() => { activePhotos(db).then((p) => setPhotoStats({ count: p.length, bytes: p.reduce((sum, x) => sum + x.bytes, 0) })); }, [db]);
  const backup = backupStatus(s.lastBackupAt, Date.now(), hasData);
  const photoRestore = usePhotoRestore();
  // When photos finish coming back in the background, the count and size above are read again.
  useEffect(() => {
    if (photoRestore.restored) activePhotos(db).then((p) => setPhotoStats({ count: p.length, bytes: p.reduce((sum, x) => sum + x.bytes, 0) }));
  }, [db, photoRestore.restored]);
  const photoLine = photoRestore.active
    ? (photoRestore.total ? t('photos.restoreProgress', { done: photoRestore.done, total: photoRestore.total }) : t('photos.restoreLooking'))
    : photoRestore.error ? t('photos.restoreFailed', { message: photoRestore.error })
    : photoRestore.restored != null ? t('photos.restored', { count: photoRestore.restored }) : '';

  const doExport = () => run(async () => {
    const file = new File(Paths.cache, `cruxlog-backup-${Date.now()}.json`);
    file.create();
    file.write(JSON.stringify(await exportBackup(db)));
    hideBusy(); // the share sheet comes next
    await Sharing.shareAsync(file.uri, { mimeType: 'application/json' });
    s.setLastBackupAt(Date.now());
  }, t('busy.preparingFile'));

  // The journal as a spreadsheet file (Excel, Google Sheets): one row per ascent, grades in the chosen scale.
  const doExportCsv = () => run(async () => {
    const rows = await listAscentsForExport(db);
    if (!rows.length) return t('settings.journalCsvEmpty');
    const label = <K extends string>(keys: readonly K[], word: (k: K) => string) =>
      Object.fromEntries(keys.map((k) => [k, word(k)])) as Record<K, string>;
    const csv = journalCsv(rows, s.routeSystem, {
      columns: label(JOURNAL_CSV_COLUMNS, (k) => t(`settings.journalCsvColumns.${k}`)),
      styles: label(ASCENT_STYLES, (k) => t(`styles.${k}`)),
      types: label(['sport', 'multipitch'] as const, (k) => t(`types.${k}`)),
    }, csvSeparator(i18n.language));
    const file = new File(Paths.cache, `${t('settings.journalCsvFile')}-${isoDate(new Date())}.csv`);
    if (file.exists) file.delete();
    file.create();
    file.write(csv);
    hideBusy(); // the share sheet comes next
    await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: t('settings.journalCsv') });
  }, t('busy.preparingFile'));

  // Picks the folder for automatic backups and proves it can be written to before remembering it.
  const doPickFolder = () => run(async () => {
    const dir = await pickBackupFolder();
    if (!dir) return;
    showBusy(t('busy.checkingFolder'));
    try {
      testBackupFolder(dir);
    } catch (e) {
      throw new AppError('settings.folderFailed', { message: errorMessage(e) });
    }
    s.setBackupDir(dir.uri, dir.name);
    // So copies and photos already there are recognised; the folder is looked through again when needed.
    await withBackupLock(() => scanFolder(dir.uri)).catch(() => {});
    return t('settings.folderOk', { name: dir.name });
  });

  const when = (at: number) => formatDateTime(at, i18n.language);
  const folderText = !s.backupDir ? t('settings.folderNone')
    : folderKind(s.backupDir) === 'drive' ? t('settings.folderDrive')
    : folderKind(s.backupDir) === 'device' ? t('settings.folderDevice', { path: devicePath(s.backupDir) || s.backupDirName })
    : t('settings.folderIs', { name: s.backupDirName || s.backupDir });

  const doBackupNow = () => run(async () => {
    const { copy, photos } = await backupNow(db, s.backupDir!);
    setCopies(null);
    const done = t('settings.backupNowDone', { name: copy.name, kb: Math.max(1, Math.round(copy.bytes / 1024)), count: copy.count });
    if (photos instanceof Error) return `${done}\n\n${t('photos.backupFailed', { message: errorMessage(photos) })}`;
    return photos ? `${done}\n\n${t('settings.photosCopied', { count: photos })}` : done;
  }, t('busy.backingUp'));

  // The list is looked up in the folder each time (a short wait on Google Drive), so copies made on another phone show too.
  const showCopies = () => {
    if (copies) { setCopies(null); return; }
    run(async () => { setCopies(await withBackupLock(() => listBackups(s.backupDir!))); }, t('busy.lookingForCopies'));
  };

  const doRestore = (b: FolderBackup) => run(async () => {
    const ok = await ask(t('settings.restoreTitle'), t('settings.restoreQuestion', { when: when(b.at) }), t('settings.restoreYes'), t('common.cancel'));
    if (!ok) return;
    // The data first (seconds); the photos follow in the background with their progress shown below, as on Google Drive
    // they can take minutes.
    showBusy(t('busy.restoring'));
    const records = await withBackupLock(() => restoreBackup(db, b, busyProgress));
    restorePhotosInBackground(db, s.backupDir!);
    return `${t('settings.importDone', { count: records })}\n\n${t('photos.restoringLater')}`;
  });

  const doImport = () => run(async () => {
    // A manual export (.json) or an automatic copy (.json.gz) picked anywhere, e.g. on Drive in the system file picker.
    const res = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'application/gzip', 'application/x-gzip', 'application/octet-stream'], copyToCacheDirectory: true,
    });
    if (res.canceled) return;
    showBusy(t('busy.restoring'));
    let data: unknown;
    try {
      data = unpackBackup(new Uint8Array(await new File(res.assets[0].uri).arrayBuffer()));
    } catch {
      throw new AppError('settings.notBackup');
    }
    const n = await importBackup(db, data, busyProgress);
    // The pictures come from the backup folder, if one is chosen, in the background.
    if (s.backupDir) restorePhotosInBackground(db, s.backupDir);
    return t('settings.importDone', { count: n }) + (s.backupDir ? `\n\n${t('photos.restoringLater')}` : '');
  });

  return (
    <FoldSection title={t('settings.backup')} warn={backup.due}
      summary={backup.days == null ? t('settings.lastBackupNever') : backup.days === 0 ? t('settings.lastBackupToday') : t('settings.lastBackupDays', { n: backup.days })}>
      <Label>{t('settings.autoBackup')}</Label>
      <MoreText short={t('settings.autoBackupShort')} long={t('settings.autoBackupHelp')} />
      <Text style={{ color: th.ink, marginTop: 8, fontWeight: '600' }}>{folderText}</Text>
      {s.backupDir ? (
        <>
          <Text style={{ color: s.autoBackupError ? th.warn : th.muted, marginTop: 4 }}>
            {s.autoBackupError ? (s.autoBackupError.startsWith('photos:') ? t('photos.backupFailed', { message: s.autoBackupError.slice(7) }) : t('settings.autoFailed', { message: s.autoBackupError }))
              : s.autoBackupAt ? t('settings.autoLast', { when: when(s.autoBackupAt) }) : t('settings.autoNever')}
          </Text>
          {photoLine ? <Text accessibilityLiveRegion="polite" style={{ color: photoRestore.error ? th.warn : th.ink, marginTop: 4, fontWeight: '600' }}>{photoLine}</Text> : null}
          {photoStats.count ? <Text style={{ color: th.muted, marginTop: 2 }}>{t('photos.stats', { count: photoStats.count, size: formatBytes(photoStats.bytes, i18n.language) })}</Text> : null}
          <Button label={t('settings.backupNow')} onPress={doBackupNow} disabled={busy} />
          <Button label={copies ? t('settings.hideCopies') : t('settings.showCopies')} onPress={showCopies} variant="plain" disabled={busy} />
          {copies ? (
            copies.length ? copies.map((b) => (
              <View key={b.uri} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, paddingVertical: 4, borderBottomWidth: 1, borderColor: th.line }}>
                <Text style={{ flex: 1, color: th.ink }}>{when(b.at)} · {Math.max(1, Math.round(b.size / 1024))} KB</Text>
                <LinkButton label={t('settings.restoreYes')} onPress={() => doRestore(b)} />
              </View>
            )) : <Text style={{ color: th.muted, marginTop: 6 }}>{t('settings.noCopies')}</Text>
          ) : null}
          <Button label={t('settings.changeFolder')} onPress={doPickFolder} variant="plain" disabled={busy} />
          <LinkButton label={t('settings.autoOff')} onPress={() => { s.setBackupDir(null); setCopies(null); }} />
        </>
      ) : (
        <Button label={t('settings.pickFolder')} onPress={doPickFolder} variant="plain" disabled={busy} />
      )}
      <Label>{t('settings.journalCsv')}</Label>
      <MoreText short={t('settings.journalCsvShort')} long={t('settings.journalCsvHelp')} />
      <Button label={t('settings.journalCsvButton')} onPress={doExportCsv} variant="plain" disabled={busy} />
      {/* The manual copy (one file, without photos) stays available but folded away: the automatic one is the main way. */}
      <Pressable onPress={() => setShowManual(!showManual)} accessibilityRole="button" accessibilityState={{ expanded: showManual }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 20, minHeight: 44 }}>
        <Ionicons name={showManual ? 'chevron-down' : 'chevron-forward'} size={18} color={th.muted} />
        <Text style={{ color: th.ink, fontFamily: F.semi }}>{t('settings.manualBackup')}</Text>
      </Pressable>
      {showManual ? (
        <>
          <MoreText short={t('settings.backupShort')} long={t('settings.backupHelp')} />
          <Button label={t('settings.export')} onPress={doExport} variant="plain" disabled={busy} />
          <Button label={t('settings.import')} onPress={doImport} variant="plain" disabled={busy} />
        </>
      ) : null}
    </FoldSection>
  );
}
