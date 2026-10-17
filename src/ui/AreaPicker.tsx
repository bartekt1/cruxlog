import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import type { AreaNames } from '../db/repo';
import { PATH_SEP, childrenOf, splitPath, type Area } from '../domain/areas';
import { sameName, suggest } from '../domain/text';
import { Chip, ChipRow, Field } from './kit';
import { useTheme } from './theme';

/**
 * Region, area ("rejon") and optional group as three text fields with chips. Each row offers the
 * children of what is chosen above it, so picking from chips walks down the tree; typing a new name creates it on save.
 * The group field can hold several levels ("Dolina Sanki › Zimny Dół"); its chips go one level deeper each time.
 */
export function AreaPicker({ areas, value, onChange, invalid }: {
  areas: Area[];
  value: AreaNames;
  onChange: (v: AreaNames) => void;
  invalid?: { region?: boolean; area?: boolean };
}) {
  const { t } = useTranslation();
  const th = useTheme();
  const region = childrenOf(areas, null).find((a) => sameName(a.name, value.region)) ?? null;
  const area = region ? childrenOf(areas, region.id).find((a) => sameName(a.name, value.area)) ?? null : null;
  // Walk down the group levels typed so far. When every level exists and the last one has sub-groups, the chips
  // offer those; otherwise they offer the siblings matching the last level being typed.
  const levels = splitPath(value.group);
  const chain: (Area | null)[] = [];
  let at = area;
  for (const name of levels) {
    at = at ? childrenOf(areas, at.id).find((a) => sameName(a.name, name)) ?? null : null;
    chain.push(at);
  }
  const last = chain[chain.length - 1];
  const goDeeper = levels.length > 0 && !!last && childrenOf(areas, last.id).length > 0;
  const done = goDeeper ? levels : levels.slice(0, -1);
  const parent = goDeeper ? last : done.length ? chain[done.length - 1] : area;
  const groupPrefix = done.length ? `${done.join(` ${PATH_SEP} `)} ${PATH_SEP} ` : '';
  const groupLast = goDeeper ? '' : levels[levels.length - 1] ?? '';
  const groupOptions = parent ? childrenOf(areas, parent.id) : [];

  const row = (label: string, text: string, set: (s: string) => void, options: Area[], bad?: boolean, placeholder?: string,
    chips?: { query: string; pick: (a: Area) => void; on: (a: Area) => boolean }) => (
    <View>
      <Text style={{ color: th.muted, fontSize: 12, marginTop: 12, marginBottom: 4 }}>{label}</Text>
      <Field value={text} onChangeText={set} accessibilityLabel={label} invalid={bad} placeholder={placeholder} />
      {options.length ? (
        <ChipRow>
          {suggest(options, chips?.query ?? text, (a) => a.name, () => [], 8).map((a) => (
            <Chip key={a.id} label={a.name} on={chips ? chips.on(a) : sameName(a.name, text)}
              onPress={() => (chips ? chips.pick(a) : set(sameName(a.name, text) ? '' : a.name))} />
          ))}
        </ChipRow>
      ) : null}
    </View>
  );

  return (
    <View>
      {row(t('areas.region'), value.region, (s) => onChange({ region: s, area: sameName(s, value.region) ? value.area : '', group: sameName(s, value.region) ? value.group : '' }),
        childrenOf(areas, null), invalid?.region, t('areas.regionPlaceholder'))}
      {row(t('areas.area'), value.area, (s) => onChange({ ...value, area: s, group: sameName(s, value.area) ? value.group : '' }),
        region ? childrenOf(areas, region.id) : [], invalid?.area, t('areas.areaPlaceholder'))}
      {row(t('areas.groupOptional'), value.group, (s) => onChange({ ...value, group: s }), groupOptions, false, undefined, {
        query: groupLast,
        on: (a) => sameName(a.name, groupLast),
        // Picking a chip completes the last level; its sub-groups then show as the next chips.
        pick: (a) => onChange({ ...value, group: `${groupPrefix}${a.name}` }),
      })}
    </View>
  );
}
