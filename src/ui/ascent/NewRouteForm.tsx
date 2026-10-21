import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { listCragRoutes, listSectorNames, type AreaNames, type AreaRow, type CragChoice, type CragRouteRow } from '../../db/repo';
import { pathLabel, pathNames, rankByChosenArea } from '../../domain/areas';
import { routeGrade, type GradeSystem, type RouteType } from '../../domain/grades';
import { sameName, suggest } from '../../domain/text';
import { AreaPicker } from '../AreaPicker';
import { GradeFields } from '../GradeFields';
import { Chip, ChipRow, Field, LinkButton, Suggestions } from '../kit';
import { Text } from '../Text';
import { useTheme } from '../theme';

export type NewRouteDraft = { crag: string; sector: string; name: string; type: RouteType; system: GradeSystem; grade: string; areas: AreaNames };
export type NewRouteField = 'crag' | 'name' | 'grade' | 'region';

/**
 * The route typed with a new ascent: area, crag (an existing one is suggested), sector, name and grade.
 * `existingCrag` is the crag already in the app with the typed name; `scrollTo` brings a focused field to the top of the form's
 * scroll view, so its suggestions are not under the keyboard.
 */
export function NewRouteForm({ value, onChange, crags, areaRows, cragPath, existingCrag, bad, onUseExisting, onCancel, scrollTo }: {
  value: NewRouteDraft; onChange: (v: NewRouteDraft) => void;
  crags: CragChoice[]; areaRows: AreaRow[]; cragPath: (c: CragChoice) => string; existingCrag: CragChoice | null;
  bad: (f: NewRouteField) => boolean; onUseExisting: (r: CragRouteRow) => void; onCancel: () => void; scrollTo: (y: number) => void;
}) {
  const db = useSQLiteContext();
  const { t } = useTranslation();
  const th = useTheme();
  const { crag, sector, name, areas } = value;
  const set = (patch: Partial<NewRouteDraft>) => onChange({ ...value, ...patch });
  const [focus, setFocus] = useState<'crag' | 'sector' | null>(null);
  const [sectorNames, setSectorNames] = useState<string[]>([]);
  const [cragRoutes, setCragRoutes] = useState<CragRouteRow[]>([]);

  useEffect(() => {
    if (!existingCrag) { setSectorNames([]); setCragRoutes([]); return; }
    let live = true; // typing another crag before these arrive must not show the first one's sectors and routes
    listSectorNames(db, existingCrag.id).then((x) => { if (live) setSectorNames(x); });
    listCragRoutes(db, existingCrag.id).then((x) => { if (live) setCragRoutes(x); });
    return () => { live = false; };
  }, [db, existingCrag?.id]);
  const duplicate = name.trim() ? cragRoutes.find((r) => sameName(r.name, name)) ?? null : null;

  const formY = useRef(0);
  const fieldY = useRef<Record<string, number>>({});
  function focusField(f: 'crag' | 'sector' | 'name') {
    if (f !== 'name') setFocus(f);
    const y = formY.current + (fieldY.current[f] ?? 0);
    setTimeout(() => scrollTo(Math.max(0, y - 8)), 150);
  }

  // Crags offered while typing; crags in the chosen region/area come first.
  const cragOptions = rankByChosenArea(suggest(crags, crag, (c) => c.name, (c) => [cragPath(c)], 30), areaRows, areas).slice(0, 5);
  function pickCrag(c: CragChoice) {
    set({ crag: c.name, ...(c.region_id ? { areas: pathNames(areaRows, c.region_id) } : {}) });
    setFocus(null);
  }

  const sub = { color: th.muted, fontSize: 12, marginTop: 12, marginBottom: 4 } as const;
  const hint = { color: th.muted, fontSize: 12, marginTop: 4 } as const;

  return (
    <View onLayout={(e) => { formY.current = e.nativeEvent.layout.y; }}>
      <View>
        {existingCrag?.region_id ? (
          <>
            <Text style={sub}>{t('areas.where')}</Text>
            <Text style={{ color: th.ink, fontSize: 16, paddingVertical: 8 }}>{pathLabel(areaRows, existingCrag.region_id)}</Text>
          </>
        ) : (
          <AreaPicker areas={areaRows} value={areas} onChange={(a) => set({ areas: a })}
            invalid={{ region: bad('region') && !areas.region.trim(), area: bad('region') && !areas.area.trim() }} />
        )}
      </View>

      <View onLayout={(e) => { fieldY.current.crag = e.nativeEvent.layout.y; }}>
        <Text style={sub}>{t('ascent.crag')}</Text>
        <Field
          value={crag} onChangeText={(x) => set({ crag: x })} placeholder={t('ascent.cragPlaceholder')} accessibilityLabel={t('ascent.crag')} invalid={bad('crag')}
          onFocus={() => focusField('crag')} onBlur={() => setFocus(null)}
        />
        {focus === 'crag' || (crag.trim() && !existingCrag) ? (
          <Suggestions
            items={cragOptions.filter((c) => !sameName(c.name, crag)).map((c) => ({ key: c.id, title: c.name, subtitle: cragPath(c) || undefined }))}
            onPick={(key) => { const c = crags.find((x) => x.id === key); if (c) pickCrag(c); }}
          />
        ) : null}
        {crag.trim() && !existingCrag ? <Text style={hint}>{t('ascent.newCragHint')}</Text> : null}
      </View>

      <View onLayout={(e) => { fieldY.current.sector = e.nativeEvent.layout.y; }}>
        <Text style={sub}>{t('ascent.sector')}</Text>
        <Field
          value={sector} onChangeText={(x) => set({ sector: x })} placeholder={t('ascent.sectorPlaceholder')} accessibilityLabel={t('ascent.sector')}
          onFocus={() => focusField('sector')} onBlur={() => setFocus(null)}
        />
        {sectorNames.length ? (
          <ChipRow>
            {suggest(sectorNames, sector, (x) => x, () => [], 8).map((x) => (
              <Chip key={x} label={x} on={sameName(x, sector)} onPress={() => set({ sector: sameName(x, sector) ? '' : x })} />
            ))}
          </ChipRow>
        ) : crag.trim() ? <Text style={hint}>{existingCrag ? t('ascent.noSectorsYet') : t('ascent.sectorNewCrag')}</Text> : null}
      </View>

      <View onLayout={(e) => { fieldY.current.name = e.nativeEvent.layout.y; }}>
        <Text style={sub}>{t('ascent.name')}</Text>
        <Field value={name} onChangeText={(x) => set({ name: x })} accessibilityLabel={t('ascent.name')} invalid={bad('name')} onFocus={() => focusField('name')} />
      </View>
      {duplicate ? (
        <View style={{ padding: 12, borderRadius: 14, backgroundColor: th.soft, gap: 4, marginTop: 8 }}>
          <Text style={{ color: th.ink }}>
            {t('ascent.duplicate', { name: duplicate.name, sector: duplicate.sector_name, grade: routeGrade(duplicate, duplicate.grade_system) })}
          </Text>
          <LinkButton label={t('ascent.useExisting')} onPress={() => onUseExisting(duplicate)} />
        </View>
      ) : null}
      <GradeFields value={value} onChange={(v) => set({ type: v.type, system: v.system, grade: v.grade })}
        invalid={bad('grade')} heading={(text) => <Text style={sub}>{text}</Text>} />
      <LinkButton label={t('common.cancel')} onPress={onCancel} />
    </View>
  );
}
