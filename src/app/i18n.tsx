import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { isRtl, pickLocale, translate, type MessageBundle, type TranslateValues } from '@alm/sdk';
import { api } from '@/lib/api';

interface LocaleOption {
  code: string;
  label: string;
  rtl: boolean;
}

interface I18nContextValue {
  locale: string;
  rtl: boolean;
  locales: LocaleOption[];
  ready: boolean;
  setLocale: (code: string) => void;
  /**
   * `t('candidates.title', 'Candidates directory')`
   *
   * The English lives at the call site rather than in a separate file, so a
   * developer changing the wording changes what translators see in the same
   * edit — and a missing translation renders real words rather than a key.
   */
  t: (key: string, fallback: string, values?: TranslateValues) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);
const STORAGE_KEY = 'alm-locale';

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locales, setLocales] = useState<LocaleOption[]>([
    { code: 'en', label: 'English', rtl: false },
  ]);
  const [locale, setLocaleState] = useState('en');
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);

  // Which languages this agency offers. Unauthenticated on purpose: the sign-in
  // screen needs its own words before anybody has a session.
  useEffect(() => {
    let cancelled = false;

    void api
      .get<{ items: LocaleOption[] }>('/api/v1/i18n')
      .then((response) => {
        if (cancelled || !response.items.length) return;
        setLocales(response.items);
        setLocaleState((current) =>
          pickLocale(response.items, localStorage.getItem(STORAGE_KEY) ?? current, navigator.languages),
        );
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    void api
      .get<MessageBundle>(`/api/v1/i18n/${locale}`)
      .then((bundle) => {
        if (cancelled) return;
        setMessages(bundle.messages);
      })
      .catch(() => {
        // A missing bundle is survivable: every `t()` call carries its English.
        if (!cancelled) setMessages({});
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [locale]);

  const rtl = isRtl(locales, locale);

  /**
   * Direction is set on the document rather than a wrapper, so it reaches
   * portals — dialogs and dropdowns render outside the React tree and would
   * otherwise stay left-to-right in an RTL language.
   */
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = rtl ? 'rtl' : 'ltr';
  }, [locale, rtl]);

  const setLocale = useCallback((code: string) => {
    localStorage.setItem(STORAGE_KEY, code);
    setLocaleState(code);
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      rtl,
      locales,
      ready,
      setLocale,
      t: (key, fallback, values) => translate(messages, key, fallback, values),
    }),
    [locale, rtl, locales, ready, setLocale, messages],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used inside I18nProvider');
  return context;
}

/** Shorthand for components that only need to translate. */
export function useT(): I18nContextValue['t'] {
  return useI18n().t;
}
