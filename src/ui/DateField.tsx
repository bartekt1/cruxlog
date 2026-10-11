import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, Text, View } from 'react-native';
import { formatDay, isoDate, isValidIsoDate, relativeDay } from '../domain/dates';
import { useTheme } from './theme';

const toDate = (iso: string) => {
  if (!isValidIsoDate(iso)) return new Date();
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** Shows the chosen day; tapping opens the system calendar. Future days cannot be picked. */
export function DateField({ value, onChange, label }: { value: string; onChange: (iso: string) => void; label: string }) {
  const th = useTheme();
  const { t, i18n } = useTranslation();
  const [iosOpen, setIosOpen] = useState(false);
  const today = isoDate(new Date());
  const rel = relativeDay(value, today);
  const text = `${rel ? `${t(`common.${rel}`)}, ` : ''}${formatDay(value, i18n.language, today)}`;

  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({ value: toDate(value), mode: 'date', maximumDate: new Date(), onValueChange: (_e, d) => onChange(isoDate(d)) });
    } else {
      setIosOpen((o) => !o);
    }
  };

  return (
    <View>
      <Pressable
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${text}`}
        accessibilityHint={t('ascent.pickDate')}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: th.outline, borderRadius: 6, paddingHorizontal: 12, minHeight: 48, backgroundColor: th.surface, opacity: pressed ? 0.7 : 1 })}
      >
        <Text style={{ color: th.ink, fontSize: 16 }}>{text}</Text>
        <Text style={{ color: th.accent, fontWeight: '600' }}>{t('common.change')}</Text>
      </Pressable>
      {Platform.OS === 'ios' && iosOpen ? (
        <DateTimePicker value={toDate(value)} mode="date" display="inline" maximumDate={new Date()} onValueChange={(_e, d) => onChange(isoDate(d))} />
      ) : null}
    </View>
  );
}
