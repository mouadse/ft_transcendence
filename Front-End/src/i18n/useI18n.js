import { uiStore } from '../stores/uiStore';
import { messages } from './messages';

export const LANGUAGE_OPTIONS = [
  { value: 'en', shortLabel: 'EN', titleKey: 'common.languages.english' },
  { value: 'fr', shortLabel: 'FR', titleKey: 'common.languages.french' },
  { value: 'ar', shortLabel: 'AR', titleKey: 'common.languages.arabic' },
];

export function getLocaleForLanguage(language) {
  if (language === 'fr') return 'fr-FR';
  if (language === 'ar') return 'ar-MA';
  return 'en-US';
}

function getByPath(source, path) {
  return path.split('.').reduce((acc, part) => {
    if (acc && typeof acc === 'object' && part in acc) return acc[part];
    return undefined;
  }, source);
}

function interpolate(template, params) {
  if (typeof template !== 'string' || !params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const value = params[key];
    return value === undefined || value === null ? '' : String(value);
  });
}

export function useI18n(namespace) {
  const language = uiStore((state) => state.language);
  const setLanguage = uiStore((state) => state.setLanguage);
  const locale = getLocaleForLanguage(language);
  const isRTL = language === 'ar';

  function t(key, params) {
    const candidates = namespace && !key.includes('.')
      ? [`${namespace}.${key}`, key]
      : [key];

    for (const candidate of candidates) {
      const translated = getByPath(messages[language], candidate);
      if (translated !== undefined) return interpolate(translated, params);
    }

    for (const candidate of candidates) {
      const fallback = getByPath(messages.en, candidate);
      if (fallback !== undefined) return interpolate(fallback, params);
    }

    return key;
  }

  return {
    language,
    setLanguage,
    locale,
    dir: isRTL ? 'rtl' : 'ltr',
    isRTL,
    t,
  };
}

