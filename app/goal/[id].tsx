import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView } from 'react-native';
import { deleteGoal, getGoal, setGoalDone, updateGoal, type GoalRow } from '../../src/db/repo';
import type { GoalKind } from '../../src/domain/forms';
import { GoalForm, type GoalFormValue } from '../../src/ui/GoalForm';
import { Button } from '../../src/ui/kit';
import { useTheme } from '../../src/ui/theme';

const toForm = (g: GoalRow): GoalFormValue => ({
  kind: g.kind as GoalKind,
  title: g.title,
  target: g.target != null ? String(g.target) : '',
  gradeIndex: g.grade_index,
  route: g.route_id
    ? { id: g.route_id, name: g.route_name ?? '', crag_name: g.crag_name ?? '', grade_index: g.route_grade_index ?? 0, grade_label: g.route_grade_label ?? '',
      grade_system: g.route_grade_system ?? 'kr', type: g.route_type ?? 'sport' }
    : null,
});

/** /goal/<id>: change a goal, mark it done or reopen it, or delete it. */
export default function EditGoal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const { t } = useTranslation();
  const th = useTheme();
  const [goal, setGoal] = useState<GoalRow | null>(null);

  useEffect(() => { getGoal(db, id).then((g) => { if (g) setGoal(g); else router.back(); }); }, [db, id, router]);
  if (!goal) return null;
  const done = goal.done_at != null;

  const remove = () =>
    Alert.alert(t('goals.deleteTitle'), t('goals.deleteQuestion', { title: goal.title }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => deleteGoal(db, goal.id).then(() => router.back()) },
    ]);

  return (
    <ScrollView style={{ backgroundColor: th.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <Stack.Screen options={{ title: t('goals.editTitle') }} />
      <GoalForm
        initial={toForm(goal)}
        submitLabel={t('common.save')}
        onSubmit={async (kind, v) => { await updateGoal(db, goal.id, { kind, ...v }); }}
        onSaved={() => router.back()}
      />
      <Button label={done ? t('goals.reopen') : t('goals.markDone')} variant="plain" onPress={() => setGoalDone(db, goal.id, !done).then(() => router.back())} />
      <Button label={t('common.delete')} variant="danger" onPress={remove} />
    </ScrollView>
  );
}
