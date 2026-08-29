"use client";

import { useEffect, useSyncExternalStore } from "react";

import { isLocale, localeToHtmlLang } from "./helpers";
import { translations, type TranslationCopy } from "./translations";
import type { Locale } from "./types";

export const LOCALE_STORAGE_KEY = "thriveai-locale";
export const DEFAULT_LOCALE: Locale = "my";
const LOCALE_EVENT = "thriveai-locale";

const readLocale = (): Locale => {
  const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  return isLocale(stored) ? stored : DEFAULT_LOCALE;
};

const subscribe = (onStoreChange: () => void): (() => void) => {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(LOCALE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(LOCALE_EVENT, onStoreChange);
  };
};

export const useLocale = (): {
  readonly locale: Locale;
  readonly copy: TranslationCopy;
  readonly setLocale: (next: Locale) => void;
} => {
  const locale = useSyncExternalStore(subscribe, readLocale, () => DEFAULT_LOCALE);

  useEffect(() => {
    document.documentElement.lang = localeToHtmlLang(locale);
  }, [locale]);

  const setLocale = (next: Locale) => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    window.dispatchEvent(new Event(LOCALE_EVENT));
  };

  return {
    locale,
    copy: translations[locale],
    setLocale,
  };
};
