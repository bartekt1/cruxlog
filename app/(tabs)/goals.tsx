import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Text, View } from 'react-native';
import { addGoal, listGoals, type GoalRow } from '../../src/db/repo';
import { Button, Chip, Field, Screen } from '../../src/ui/kit';
import { useTheme } from '../../src/ui/theme';

type Kind = 'count' | 'project' | 'wishlist';

export default function Goals() {
  const db = useSQLiteContext();
  const { t } = useTranslation();
  const th = useTheme();
  const [rows, setRows] = useState<GoalRow[]>([]);
  const [kind, setKind] = useState<Kind>('count');
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');

  const load = useCallback(() => { listGoals(db).then(setRows); }, [db]);
  useFocusEffect(load);

  async function add() {
    if (!title.trim()) return;
    await addGoal(db, kind, title.trim(), kind === 'count' && target ? Number(target) : null);
    setTitle(''); setTarget(''); load();
  }

  return (
    <Screen>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.id}
        ListHeaderComponent={
          <View style={{ paddingTop: 12 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {(['count', 'project', 'wishlist'] as Kind[]).map((k) => <Chip key={k} label={t(`goals.${k}`)} on={kind === k} onPress={() => setKind(k)} />)}
            </View>
            <Field value={title} onChangeText={setTitle} placeholder={t('goals.newTitle')} />
            {kind === 'count' ? <Field style={{ marginTop: 8 }} value={target} onChangeText={setTarget} placeholder={t('goals.target')} keyboardType="numeric" /> : null}
            <Button label={t('common.add')} onPress={add} />
          </View>
        }
        renderItem={({ item }) => (
          <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: th.line }}>
            <Text style={{ color: th.ink, fontWeight: '600' }}>{item.title}</Text>
            <Text style={{ color: th.muted, fontSize: 12 }}>{t(`goals.${item.kind}`)}{item.target ? ` · ${item.target}` : ''}</Text>
          </View>
        )}
      />
    </Screen>
  );
}
