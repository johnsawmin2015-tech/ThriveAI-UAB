import type { Locale, LocalizedText } from "./types";

export const LOCALES = ["my", "en"] as const;

export const localeToHtmlLang = (locale: Locale): "my" | "en" =>
  locale === "my" ? "my" : "en";

export const isLocale = (value: unknown): value is Locale =>
  value === "en" || value === "my";

export const localize = (value: LocalizedText, locale: Locale): string =>
  value[locale];
