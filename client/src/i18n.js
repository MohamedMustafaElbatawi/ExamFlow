import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ar from './locales/ar.json';
import en from './locales/en.json';

// Helper to get active user ID if any
export const getActiveUserId = () => {
  try {
    const savedUser = localStorage.getItem('examflow_user');
    if (savedUser) {
      const u = JSON.parse(savedUser);
      return u._id || u.id || null;
    }
  } catch (e) {
    // ignore
  }
  return null;
};

// Retrieve saved language preference: first check active user's preference, then fallback to Arabic
export const getInitialLanguage = () => {
  const userId = getActiveUserId();
  if (userId) {
    const userPref = localStorage.getItem(`examflow_lang_${userId}`);
    if (userPref) return userPref;
  }
  return localStorage.getItem('examflow_lang') || 'ar';
};

const initialLang = getInitialLanguage();

// Apply direction and language to HTML document
export const updateDocumentDirection = (lang) => {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      ar: { translation: ar },
      en: { translation: en },
    },
    lng: initialLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already handles XSS
    },
  });

// Apply document direction immediately
updateDocumentDirection(initialLang);

// Listen to language change events
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('examflow_lang', lng);
  const userId = getActiveUserId();
  if (userId) {
    localStorage.setItem(`examflow_lang_${userId}`, lng);
  }
  updateDocumentDirection(lng);
});

export default i18n;
