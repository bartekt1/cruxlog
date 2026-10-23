import { Stack } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, ScrollView, View } from 'react-native';
import { installPack, listInstalledPacks, removePack, type InstalledPack } from '../src/db/repo';
import { AppError } from '../src/domain/errors';
import { groupPacks, packState, packUrl, parsePackIndex, PACKS_INDEX_URL, type PackInfo } from '../src/domain/packs';
import { MissingColumnsError, planFromFiles, UnknownFileError } from '../src/domain/importPlan';
import { formatBytes } from '../src/domain/photos';
import { ask } from '../src/ui/confirm';
import { errorMessage, showError } from '../src/ui/errors';
import { Button, Card, EmptyState, Label, LinkButton } from '../src/ui/kit';
import { Text } from '../src/ui/Text';
import { useTheme } from '../src/ui/theme';

/** Fetches a text from the packs repository, never from a stale cache. No internet becomes a clear message. */
async function fetchText(url: string): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`${url}?t=${Date.now()}`, { cache: 'no-store' });
  } catch {
    throw new AppError('packs.offline');
  }
  if (!res.ok) throw new AppError('packs.serverError', { status: res.status });
  return res.text();
}

/** Settings › Crag packs: the packs on the server by region and area; download, update or remove each, or a whole area. */
export default function Packs() {
  const db = useSQLiteContext();
  const { t, i18n } = useTranslation();
  const th = useTheme();
  const [list, setList] = useState<PackInfo[] | null>(null);
  const [listError, setListError] = useState('');
  const [installed, setInstalled] = useState<InstalledPack[]>([]);
  const [busy, setBusy] = useState<string | null>(null); // the pack (or area) being worked on

  const loadInstalled = useCallback(() => listInstalledPacks(db).then(setInstalled), [db]);
  const loadList = useCallback(async () => {
    setListError('');
    setList(null);
    try {
      setList(parsePackIndex(JSON.parse(await fetchText(PACKS_INDEX_URL))));
    } catch (e) {
      setListError(e instanceof AppError ? errorMessage(e) : t('packs.badList'));
    }
  }, [t]);
  useEffect(() => { loadInstalled(); loadList(); }, [loadInstalled, loadList]);

  const versionOf = new Map(installed.map((p) => [p.id, p.version]));

  /** Downloads and writes one pack; returns the counts for the message. */
  async function install(p: PackInfo) {
    const text = await fetchText(packUrl(PACKS_INDEX_URL, p));
    let plan;
    try {
      plan = planFromFiles({ [p.file]: text });
    } catch (e) {
      if (e instanceof UnknownFileError || e instanceof MissingColumnsError) throw new AppError('packs.badPack', { name: p.name });
      throw e;
    }
    if (plan.errors.length) throw new AppError('packs.badPack', { name: p.name });
    return installPack(db, { id: p.id, name: p.name, version: p.version }, plan);
  }

  async function run(key: string, packs: PackInfo[]) {
    setBusy(key);
    try {
      let crags = 0; let routes = 0;
      for (const p of packs) { const r = await install(p); crags += r.crags; routes += r.routes; }
      Alert.alert(t('packs.title'), t('packs.done', { crags, routes }));
    } catch (e) {
      showError(e);
    } finally {
      await loadInstalled();
      setBusy(null);
    }
  }

  async function remove(p: { id: string; name: string }) {
    const ok = await ask(t('packs.removeTitle'), t('packs.removeQuestion', { name: p.name }), t('common.delete'), t('common.cancel'));
    if (!ok) return;
    setBusy(p.id);
    try { await removePack(db, p.id); } catch (e) { showError(e); } finally { await loadInstalled(); setBusy(null); }
  }

  const gone = installed.filter((p) => list && !list.some((x) => x.id === p.id)); // installed, but no longer on the server

  return (
    <ScrollView style={{ backgroundColor: th.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
      <Stack.Screen options={{ title: t('packs.title') }} />
      <Text style={{ color: th.muted }}>{t('packs.help')}</Text>
      {listError ? (
        <>
          <Text style={{ color: th.warn, marginTop: 12 }}>{listError}</Text>
          <Button label={t('packs.retry')} variant="plain" onPress={loadList} />
        </>
      ) : !list ? (
        <ActivityIndicator color={th.accent} style={{ marginTop: 24 }} />
      ) : !list.length ? (
        <EmptyState title={t('packs.empty')} />
      ) : groupPacks(list).map((g) => {
        const toGet = g.packs.filter((p) => packState(p, versionOf.get(p.id)) !== 'installed');
        const areaKey = `area:${g.region}|${g.area}`;
        return (
          <View key={areaKey}>
            <Label>{[g.region, g.area].filter(Boolean).join(' › ')}</Label>
            {toGet.length > 1 ? <LinkButton label={t('packs.getArea', { count: toGet.length })} onPress={() => { if (!busy) run(areaKey, toGet); }} /> : null}
            {g.packs.map((p) => {
              const state = packState(p, versionOf.get(p.id));
              const working = busy === p.id || busy === areaKey;
              return (
                <Card key={p.id} style={{ padding: 12, marginTop: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: th.ink, fontSize: 16, fontWeight: '600' }}>{p.name}</Text>
                      <Text style={{ color: th.muted, fontSize: 13 }}>
                        {t('packs.counts', { crags: p.crags, routes: p.routes, size: formatBytes(p.bytes, i18n.language) })}
                      </Text>
                      <Text style={{ color: state === 'available' ? th.muted : th.accent, fontSize: 13 }}>
                        {state === 'available' ? t('packs.notInstalled') : state === 'update' ? t('packs.update', { version: p.version }) : t('packs.installed', { version: p.version })}
                      </Text>
                    </View>
                    {working ? <ActivityIndicator color={th.accent} /> : null}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {state !== 'installed' ? (
                      <View style={{ flex: 1 }}>
                        <Button label={state === 'update' ? t('packs.doUpdate') : t('packs.get')} onPress={() => run(p.id, [p])} disabled={!!busy} />
                      </View>
                    ) : null}
                    {state !== 'available' ? (
                      <View style={{ flex: 1 }}>
                        <Button label={t('packs.remove')} variant="danger" onPress={() => remove(p)} disabled={!!busy} />
                      </View>
                    ) : null}
                  </View>
                </Card>
              );
            })}
          </View>
        );
      })}
      {gone.length ? (
        <>
          <Label>{t('packs.gone')}</Label>
          {gone.map((p) => (
            <Card key={p.id} style={{ padding: 12, marginTop: 8 }}>
              <Text style={{ color: th.ink, fontWeight: '600' }}>{p.name}</Text>
              <Button label={t('packs.remove')} variant="danger" onPress={() => remove(p)} disabled={!!busy} />
            </Card>
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}
