import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, Text, View } from 'react-native';
import { listCrags, type CragRow } from '../../src/db/repo';
import { EmptyState, Screen } from '../../src/ui/kit';
import { useTheme } from '../../src/ui/theme';

export default function Crags() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { t } = useTranslation();
  const th = useTheme();
  const [rows, setRows] = useState<CragRow[]>([]);
  useFocusEffect(useCallback(() => { listCrags(db).then(setRows); }, [db]));

  return (
    <Screen>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.id}
        ListEmptyComponent={<EmptyState title={t('crags.empty')} hint={t('crags.emptyHint')} />}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/crag/${item.id}`)}
            accessibilityRole="button"
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: th.line, opacity: pressed ? 0.6 : 1 })}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: th.ink, fontWeight: '600', fontSize: 16 }}>{item.name}</Text>
              <Text style={{ color: th.muted, fontSize: 12 }}>{t('crags.routes', { count: item.routes })}</Text>
            </View>
            <Text style={{ color: th.muted, fontSize: 20 }}>›</Text>
          </Pressable>
        )}
      />
    </Screen>
  );
}
