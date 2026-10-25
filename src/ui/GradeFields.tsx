import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { gradeExample, systemAfterTypeChange, systemsFor, type GradeSystem, type RouteType } from '../domain/grades';
import { Chip, ChipRow, Field, Label } from './kit';
import { useSettings } from './settingsStore';

const TYPES: RouteType[] = ['sport', 'multipitch'];

export type GradeValue = { type: RouteType; system: GradeSystem; grade: string };

/** Type, grade system and grade of a route, as in every route form. `heading` draws the small titles (Label by default). */
export function GradeFields({ value, onChange, invalid, heading = (text) => <Label>{text}</Label> }: {
  value: GradeValue; onChange: (v: GradeValue) => void; invalid?: boolean; heading?: (text: string) => ReactNode;
}) {
  const { t } = useTranslation();
  const { routeSystem } = useSettings();
  const { type, system, grade } = value;
  return (
    <>
      {heading(t('ascent.type'))}
      <ChipRow>
        {TYPES.map((x) => (
          <Chip key={x} label={t(`types.${x}`)} on={type === x} onPress={() => onChange({ ...value, type: x, system: systemAfterTypeChange(x, system, routeSystem) })} />
        ))}
      </ChipRow>
      {heading(t('ascent.gradeSystem'))}
      <ChipRow>{systemsFor(type).map((s) => <Chip key={s} label={s.toUpperCase()} on={system === s} onPress={() => onChange({ ...value, system: s })} />)}</ChipRow>
      {heading(t('ascent.grade'))}
      <Field value={grade} onChangeText={(g) => onChange({ ...value, grade: g })} invalid={invalid} accessibilityLabel={t('ascent.grade')}
        autoCapitalize="characters" autoCorrect={false} placeholder={t('ascent.gradeExample', { example: gradeExample(system, type) })} />
    </>
  );
}
