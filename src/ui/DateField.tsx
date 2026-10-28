import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, View } from 'react-native';
import { Chip, ChipRow } from './kit';
import { Text } from './Text';
import { formatDay, isoDate, isValidIsoDate, relativeDay, shiftDay } from '../domain/dates';
import { useTheme } from './theme';

const toDate = (iso: string) => {
  if (!isValidIsoDate(iso)) return new Date();
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** Opens the system calendar: a dialog on Android, an inline calendar on iOS (shown by `iosOpen`). */
function useCalendar(value: string, onChange: (iso: string) => void, allowFuture?: boolean) {
  const [iosOpen, setIosOpen] = useState(false);
  const maximumDate = allowFuture ? undefined : new Date();
  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({ value: toDate(value), mode: 'date', maximumDate, onValueChange: (_e, d) => onChange(isoDate(d)) });
    } else {
      setIosOpen((o) => !o);
    }
  };
  const calendar = Platform.OS === 'ios' && iosOpen
    ? <DateTimePicker value={toDate(value)} mode="date" display="inline" maximumDate={maximumDate} onValueChange={(_e, d) => onChange(isoDate(d))} />
    : null;
  return { open, calendar };
}

/** "Today", "Yesterday" and "Other day…" (the calendar); a day picked there shows on the third chip. Past days only. */
export function DateChips({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
  const { t, i18n } = useTranslation();
  const today = isoDate(new Date());
  const yesterday = shiftDay(today, -1);
  const { open, calendar } = useCalendar(value, onChange);
  const other = value !== today && value !== yesterday;
  return (
    <View>
      <ChipRow>
        <Chip label={t('common.today')} on={value === today} onPress={() => onChange(today)} />
        <Chip label={t('common.yesterday')} on={value === yesterday} onPress={() => onChange(yesterday)} />
        <Chip label={other ? formatDay(value, i18n.language, today) : t('ascent.otherDay')} on={other} onPress={open} />
      </ChipRow>
      {calendar}
    </View>
  );
}

/** Shows the chosen day; tapping opens the system calendar. Future days cannot be picked unless `allowFuture` (a planned trip). */
export function DateField({ value, onChange, label, allowFuture }: { value: string; onChange: (iso: string) => void; label: string; allowFuture?: boolean }) {
  const th = useTheme();
  const { t, i18n } = useTranslation();
  const today = isoDate(new Date());
  const rel = relativeDay(value, today);
  const text = `${rel ? `${t(`common.${rel}`)}, ` : ''}${formatDay(value, i18n.language, today)}`;

  const { open, calendar } = useCalendar(value, onChange, allowFuture);

  return (
    <View>
      <Pressable
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${text}`}
        accessibilityHint={t('ascent.pickDate')}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: th.outline, borderRadius: 12, paddingHorizontal: 12, minHeight: 48, backgroundColor: th.surface, opacity: pressed ? 0.7 : 1 })}
      >
        <Text style={{ color: th.ink, fontSize: 16 }}>{text}</Text>
        <Text style={{ color: th.accent, fontWeight: '600' }}>{t('common.change')}</Text>
      </Pressable>
      {calendar}
    </View>
  );
}
