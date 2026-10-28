import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { GOAL_KINDS, validateGoalDraft, type GoalKind, type GoalValue } from '../domain/forms';
import { formatGrade, ROUTE_LADDER } from '../domain/grades';
import { Button, Chip, ChipRow, ErrorText, Field, Label } from './kit';
import { RoutePicker, type PickedRoute } from './RoutePicker';
import { useSettings } from './settingsStore';
import { Text } from './Text';
import { useTheme } from './theme';
import { errorMessage } from './errors';

export type GoalFormValue = { kind: GoalKind; title: string; target: string; gradeIndex: number | null; route: PickedRoute | null };
export const EMPTY_GOAL: GoalFormValue = { kind: 'count', title: '', target: '', gradeIndex: null, route: null };

/** The fields of a goal for its kind, used to add one and to edit one. */
export function GoalForm({ initial, submitLabel, onSubmit, onSaved }: {
  initial: GoalFormValue;
  submitLabel: string;
  onSubmit: (kind: GoalKind, v: GoalValue) => Promise<void>;
  /** Called after a successful save; `reset` clears the form (for adding the next goal). */
  onSaved?: (reset: () => void) => void;
}) {
  const { t } = useTranslation();
  const th = useTheme();
  const { routeSystem } = useSettings();
  const [v, setV] = useState<GoalFormValue>(initial);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (patch: Partial<GoalFormValue>) => setV((cur) => ({ ...cur, ...patch }));

  const year = new Date().getFullYear();
  const fallbackTitle = v.kind === 'grade' && v.gradeIndex != null
    ? t('goals.gradeTitle', { count: Number(v.target) || 1, grade: formatGrade(v.gradeIndex, routeSystem), year })
    : v.route?.name ?? '';

  async function save() {
    const draft = validateGoalDraft({ kind: v.kind, title: v.title, target: v.target, gradeIndex: v.gradeIndex, routeId: v.route?.id ?? null, fallbackTitle });
    if (!draft.ok) { setError(t(draft.error)); return; }
    setError('');
    setSaving(true);
    try {
      await onSubmit(v.kind, draft.value);
      onSaved?.(() => setV({ ...EMPTY_GOAL, kind: v.kind }));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <View>
      <Label>{t('goals.kind')}</Label>
      <ChipRow>{GOAL_KINDS.map((k) => <Chip key={k} label={t(`goals.${k}`)} on={v.kind === k} onPress={() => set({ kind: k })} />)}</ChipRow>
      <Text style={{ color: th.muted, fontSize: 13, marginBottom: 8 }}>{t(`goals.help.${v.kind}`)}</Text>
      {v.kind === 'grade' ? (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {ROUTE_LADDER.map((_, i) => <Chip key={i} label={`${formatGrade(i, routeSystem)}+`} on={v.gradeIndex === i} onPress={() => set({ gradeIndex: i })} />)}
          </ScrollView>
          <Label>{t('goals.routesCount')}</Label>
          <Field style={{ width: 200 }} value={v.target} onChangeText={(s) => set({ target: s })} placeholder="1"
            accessibilityLabel={t('goals.routesCount')} keyboardType="number-pad" />
        </>
      ) : null}
      {v.kind === 'project' || v.kind === 'wishlist' ? <RoutePicker value={v.route} onChange={(route) => set({ route })} /> : null}
      <Label>{t('goals.newTitle')}</Label>
      <Field value={v.title} onChangeText={(s) => set({ title: s })} placeholder={fallbackTitle || t('goals.newTitle')}
        accessibilityLabel={t('goals.newTitle')} returnKeyType="done" />
      {v.kind === 'count' ? (
        <>
          <Label>{t('goals.target')}</Label>
          <Field style={{ width: 200 }} value={v.target} onChangeText={(s) => set({ target: s })} placeholder="30"
            accessibilityLabel={t('goals.target')} keyboardType="number-pad" />
        </>
      ) : null}
      {error ? <ErrorText>{error}</ErrorText> : null}
      <Button label={saving ? t('common.saving') : submitLabel} onPress={save} disabled={saving} />
    </View>
  );
}
