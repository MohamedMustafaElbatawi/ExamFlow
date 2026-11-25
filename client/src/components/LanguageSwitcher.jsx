import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

export const LanguageSwitcher = ({ className = '' }) => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language || 'ar';
  const isArabic = currentLang.startsWith('ar');

  const toggleLanguage = () => {
    const nextLang = isArabic ? 'en' : 'ar';
    i18n.changeLanguage(nextLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      type="button"
      className={`inline-flex items-center space-x-1.5 rtl:space-x-reverse px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm transition-colors ${className}`}
      title={isArabic ? 'Switch to English' : 'التحويل إلى العربية'}
      aria-label="Language Switcher"
    >
      <Globe className="w-4 h-4 text-brand-600 flex-shrink-0" />
      <span>{isArabic ? 'English' : 'العربية'}</span>
    </button>
  );
};
