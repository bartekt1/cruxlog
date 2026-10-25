import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, ScrollView } from 'react-native';
import { ROUTE_SYSTEMS } from '../src/domain/grades';
import type { Lang } from '../src/domain/settings';
import i18n from '../src/i18n';
import { showError } from '../src/ui/errors';
import { Chip, ChipRow, Label } from '../src/ui/kit';
import { BackupSection } from '../src/ui/settings/BackupSection';
import { ImportSection } from '../src/ui/settings/ImportSection';
import { UpdateSection } from '../src/ui/settings/UpdateSection';
import type { Run } from '../src/ui/settings/run';
import { useSettings } from '../src/ui/settingsStore';
import { useTheme } from '../src/ui/theme';

export default function Settings() {
  const { t } = useTranslation();
  const th = useTheme();
  const s = useSettings();
  const [busy, setBusy] = useState(false);

  // Results go to an alert so they are seen even when the button is far down the screen.
  const run: Run = async (fn) => {
    setBusy(true);
    try {
      const msg = await fn();
      if (msg) Alert.alert(t('settings.done'), msg);
    } catch (e) {
      showError(e);
    } finally {
      setBusy(false);
    }
  };

  const setLanguage = (lang: Lang) => {
    s.setLanguage(lang);
    i18n.changeLanguage(lang);
  };

  return (
    <ScrollView style={{ backgroundColor: th.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
      <Label>{t('settings.language')}</Label>
      <ChipRow>
        <Chip label="Polski" on={i18n.language === 'pl'} onPress={() => setLanguage('pl')} />
        <Chip label="English" on={i18n.language === 'en'} onPress={() => setLanguage('en')} />
      </ChipRow>
      <Label>{t('settings.theme')}</Label>
      <ChipRow>
        {(['system', 'light', 'dark'] as const).map((m) => <Chip key={m} label={t(`settings.themes.${m}`)} on={s.themeMode === m} onPress={() => s.setThemeMode(m)} />)}
      </ChipRow>
      <Label>{t('settings.routeGrades')}</Label>
      <ChipRow>
        {ROUTE_SYSTEMS.map((x) => <Chip key={x} label={x.toUpperCase()} on={s.routeSystem === x} onPress={() => s.setRouteSystem(x)} />)}
      </ChipRow>
      <ImportSection run={run} busy={busy} />
      <BackupSection run={run} busy={busy} />
      <UpdateSection run={run} busy={busy} />
      {busy ? <ActivityIndicator color={th.accent} style={{ marginTop: 16 }} /> : null}
    </ScrollView>
  );
}
