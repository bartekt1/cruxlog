import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import { resolveLanguage } from '../domain/settings';
import { useSettings } from '../ui/settingsStore';
import en from './en.json';
import pl from './pl.json';

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, pl: { translation: pl } },
  lng: resolveLanguage(useSettings.getState().language, getLocales()[0]?.languageCode),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  compatibilityJSON: 'v4',
});

export default i18n;
