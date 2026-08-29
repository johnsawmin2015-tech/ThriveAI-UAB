"use client";

import type { Locale } from "@/lib/i18n";

interface LanguageSwitcherProps {
  readonly locale: Locale;
  readonly enLabel: string;
  readonly myLabel: string;
  readonly enAria: string;
  readonly myAria: string;
  readonly groupAria: string;
  readonly onChange: (locale: Locale) => void;
}

export function LanguageSwitcher({
  locale,
  enLabel,
  myLabel,
  enAria,
  myAria,
  groupAria,
  onChange,
}: LanguageSwitcherProps) {
  return (
    <div className="language-switcher" role="group" aria-label={groupAria}>
      <button
        type="button"
        className={locale === "en" ? "is-active" : undefined}
        aria-label={enAria}
        aria-pressed={locale === "en"}
        onClick={() => onChange("en")}
      >
        {enLabel}
      </button>
      <button
        type="button"
        className={locale === "my" ? "is-active" : undefined}
        aria-label={myAria}
        aria-pressed={locale === "my"}
        lang="my"
        onClick={() => onChange("my")}
      >
        {myLabel}
      </button>
    </div>
  );
}
