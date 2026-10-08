import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Text, View } from 'react-native';
import { listCrags, type CragRow } from '../../src/db/repo';
import { Screen } from '../../src/ui/kit';
import { useTheme } from '../../src/ui/theme';

export default function Crags() {
  const db = useSQLiteContext();
  const { t } = useTranslation();
  const th = useTheme();
  const [rows, setRows] = useState<CragRow[]>([]);
  useFocusEffect(useCallback(() => { listCrags(db).then(setRows); }, [db]));

  return (
    <Screen>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.id}
        ListEmptyComponent={<Text style={{ color: th.muted, marginTop: 24 }}>{t('crags.empty')}</Text>}
        renderItem={({ item }) => (
          <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: th.line }}>
            <Text style={{ color: th.ink, fontWeight: '600', fontSize: 16 }}>{item.name}</Text>
            <Text style={{ color: th.muted, fontSize: 12 }}>{t('crags.routes', { count: item.routes })}</Text>
          </View>
        )}
      />
    </Screen>
  );
}
