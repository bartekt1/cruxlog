import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { useSQLiteContext } from 'expo-sqlite';
import { useTranslation } from 'react-i18next';
import { applyCragPositions, applyImport, importedUsage, removeImported } from '../../db/repo';
import { AppError } from '../../domain/errors';
import { detectFormat, parsePositionsCsv } from '../../domain/flatImport';
import { planFromFiles, UnknownFileError } from '../../domain/importPlan';
import { ask } from '../confirm';
import { Button, Label } from '../kit';
import { Text } from '../Text';
import { useTheme } from '../theme';
import type { Run } from './run';

/** Settings › importing crags and routes from CSV files (route lists or crag positions), and removing imported ones. */
export function ImportSection({ run, busy }: { run: Run; busy: boolean }) {
  const db = useSQLiteContext();
  const { t } = useTranslation();
  const th = useTheme();

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
    let built;
    try {
      built = planFromFiles(texts);
    } catch (e) {
      if (e instanceof UnknownFileError) throw new AppError('settings.csvUnknown', { file: e.file });
      throw e;
    }
    const { plan, skipped } = built;
    if (plan.errors.length) {
      const first = plan.errors.slice(0, 8).map((e) => `${e.file}, ${t('settings.csvLine', { line: e.line })}: ${e.message}`).join('\n');
      throw new AppError('settings.csvErrorList', { count: plan.errors.length, list: first });
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
    if (!rows.length) throw new AppError('settings.positionsNone');
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
    <>
      <Label>{t('settings.csv')}</Label>
      <Text style={{ color: th.muted }}>{t('settings.csvHelp')}</Text>
      <Button label={t('settings.csv')} onPress={doCsv} disabled={busy} />
      <Text style={{ color: th.muted, marginTop: 8 }}>{t('settings.removeImportedHelp')}</Text>
      <Button label={t('settings.removeImported')} onPress={doRemoveImported} disabled={busy} variant="plain" />
    </>
  );
}
