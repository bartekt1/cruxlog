import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { exportBackup, importBackup } from '../../db/backup';
import { activePhotos, hasAscents } from '../../db/repo';
import { devicePath, folderKind, unpackBackup } from '../../domain/autoBackup';
import { formatDateTime } from '../../domain/dates';
import { AppError } from '../../domain/errors';
import { backupStatus } from '../../domain/history';
import { formatBytes } from '../../domain/photos';
import { backupNow, listBackups, restorePhotos, restoreBackup, scanFolder, withBackupLock, type FolderBackup } from '../autoBackup';
import { pickBackupFolder, testBackupFolder } from '../backupFolder';
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
  });

  // The list is looked up in the folder (a short wait on Google Drive), so it shows a spinner.
  const showCopies = () => run(async () => {
    if (copies) { setCopies(null); return; }
    setCopies(await withBackupLock(() => listBackups(s.backupDir!)));
  });

  const doRestore = (b: FolderBackup) => run(async () => {
    const ok = await ask(t('settings.restoreTitle'), t('settings.restoreQuestion', { when: when(b.at) }), t('settings.restoreYes'), t('common.cancel'));
    if (!ok) return;
    const { records, photos } = await withBackupLock(async () => ({
      records: await restoreBackup(db, b), photos: await restorePhotos(db, s.backupDir!),
    }));
    return t('settings.importDone', { count: records }) + (photos ? `\n\n${t('photos.restored', { count: photos })}` : '');
  });

  const doImport = () => run(async () => {
    // A manual export (.json) or an automatic copy (.json.gz) picked anywhere, e.g. on Drive in the system file picker.
    const res = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'application/gzip', 'application/x-gzip', 'application/octet-stream'], copyToCacheDirectory: true,
    });
    if (res.canceled) return;
    let data: unknown;
    try {
      data = unpackBackup(new Uint8Array(await new File(res.assets[0].uri).arrayBuffer()));
    } catch {
      throw new AppError('settings.notBackup');
    }
    const n = await importBackup(db, data);
    // The pictures come from the backup folder, if one is chosen.
    const dir = s.backupDir;
    const photos = dir ? await withBackupLock(() => restorePhotos(db, dir)).catch(() => 0) : 0;
    return t('settings.importDone', { count: n }) + (photos ? `\n\n${t('photos.restored', { count: photos })}` : '');
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
