import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import type { AreaNames } from '../db/repo';
import { childrenOf, type Area } from '../domain/areas';
import { sameName, suggest } from '../domain/text';
import { Chip, ChipRow, Field } from './kit';
import { useTheme } from './theme';

/**
 * Region, area ("rejon") and optional group as three text fields with chips. Each row offers the
 * children of what is chosen above it, so picking from chips walks down the tree; typing a new name creates it on save.
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

  const row = (label: string, text: string, set: (s: string) => void, options: Area[], bad?: boolean, placeholder?: string) => (
    <View>
      <Text style={{ color: th.muted, fontSize: 12, marginTop: 12, marginBottom: 4 }}>{label}</Text>
      <Field value={text} onChangeText={set} accessibilityLabel={label} invalid={bad} placeholder={placeholder} />
      {options.length ? (
        <ChipRow>
          {suggest(options, text, (a) => a.name, () => [], 8).map((a) => (
            <Chip key={a.id} label={a.name} on={sameName(a.name, text)} onPress={() => set(sameName(a.name, text) ? '' : a.name)} />
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
      {row(t('areas.groupOptional'), value.group, (s) => onChange({ ...value, group: s }), area ? childrenOf(areas, area.id) : [])}
    </View>
  );
}
