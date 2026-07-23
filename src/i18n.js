import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import zhTw from './locales/zh-tw.json';

const language = window.location.pathname.startsWith('/en/') ? 'en' : 'zh-TW';

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, 'zh-TW': { translation: zhTw } },
  lng: language,
  fallbackLng: 'zh-TW',
  interpolation: { escapeValue: false },
});

export default i18n;
