"use client";

import {
  AlertCircle,
  ArrowRight,
  Building2,
  Calculator,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Loader2,
  MessageCircle,
  RefreshCw,
  Send,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { LanguageSwitcher } from "@/components/language-switcher";
import { businessProfiles, businessProfilesById } from "@/data";
import {
  SCENARIO_PRESETS,
  calculateCashBridge,
  calculateFinancialSnapshot,
  calculateHealthScore,
  createScenario,
  generateFinancialSignals,
  prioritizeOverdueInvoices,
  simulateScenario,
  topOverdueCollectionValue,
} from "@/lib/finance";
import { useLocale, type Locale, type TranslationCopy } from "@/lib/i18n";
import type {
  BusinessProfile,
  ProfileId,
  ScenarioKind,
} from "@/types";

const DEFAULT_PROFILE_ID: ProfileId = "distributor";
const DEFAULT_SCENARIO_KIND: ScenarioKind = "branch";
const MINIMUM_RESERVE_MMK = 2_500_000;
const BRANCH_OUTLAY_MMK = SCENARIO_PRESETS.branch.upfrontCostMmk;

type UnknownRecord = Record<string, unknown>;

interface NormalizedFinding {
  readonly title?: string;
  readonly detail: string;
  readonly evidence: readonly string[];
}

interface NormalizedAnalysis {
  readonly status?: string;
  readonly mode?: string;
  readonly intent?: string;
  readonly answerLanguage?: string;
  readonly businessHealth?: string;
  readonly riskLevel?: string;
  readonly summaryMm?: string;
  readonly summaryEn?: string;
  readonly findings: readonly NormalizedFinding[];
  readonly nextBestActions: readonly string[];
  readonly limitations: readonly string[];
  readonly degradationReasons: readonly string[];
  readonly model?: string;
  readonly requestId?: string;
}

type AnalysisState =
  | { readonly phase: "idle" }
  | { readonly phase: "loading"; readonly question: string }
  | {
      readonly phase: "answered";
      readonly question: string;
      readonly payload: unknown;
    }
  | {
      readonly phase: "error";
      readonly question: string;
      readonly message: string;
    };

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asText = (value: unknown): string | undefined => {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return undefined;
};

const objectSummary = (value: unknown): string | undefined => {
  const direct = asText(value);
  if (direct) {
    return direct;
  }

  if (!isRecord(value)) {
    return undefined;
  }

  const score = asText(value.score);
  const band = asText(value.band);
  if (score && band) {
    return `${score}/100 · ${band}`;
  }

  return (
    asText(value.label) ??
    asText(value.status) ??
    asText(value.summary) ??
    score ??
    asText(value.value)
  );
};

const pickLocalized = (
  record: UnknownRecord,
  locale: Locale,
  mmKey: string,
  enKey: string,
): string | undefined => {
  const preferred = asText(record[locale === "my" ? mmKey : enKey]);
  const fallback = asText(record[locale === "my" ? enKey : mmKey]);
  return preferred ?? fallback;
};

const normalizeTextList = (
  value: unknown,
  locale: Locale,
): readonly string[] => {
  if (!Array.isArray(value)) {
    const item = objectSummary(value);
    return item ? [item] : [];
  }

  return value
    .map((item) => {
      if (isRecord(item)) {
        const evidenceLabel =
          pickLocalized(item, locale, "labelMm", "labelEn") ??
          asText(item.label) ??
          asText(item.metric);
        const evidenceValue = asText(item.displayValue) ?? asText(item.value);
        if (evidenceLabel && evidenceValue) {
          return `${evidenceLabel}: ${evidenceValue}`;
        }

        return (
          pickLocalized(item, locale, "titleMm", "titleEn") ??
          pickLocalized(item, locale, "messageMm", "messageEn") ??
          pickLocalized(item, locale, "rationaleMm", "rationaleEn") ??
          asText(item.action) ??
          asText(item.summary) ??
          asText(item.detail) ??
          asText(item.title) ??
          asText(item.message)
        );
      }

      return asText(item);
    })
    .filter((item): item is string => Boolean(item));
};

const normalizeFindings = (
  value: unknown,
  locale: Locale,
): readonly NormalizedFinding[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item): NormalizedFinding | null => {
      if (typeof item === "string" && item.trim()) {
        return { detail: item.trim(), evidence: [] };
      }

      if (!isRecord(item)) {
        return null;
      }

      const detail =
        pickLocalized(item, locale, "explanationMm", "explanationEn") ??
        asText(item.detail) ??
        asText(item.summary) ??
        asText(item.explanation) ??
        asText(item.finding) ??
        asText(item.message) ??
        asText(item.title);

      if (!detail) {
        return null;
      }

      return {
        title:
          pickLocalized(item, locale, "titleMm", "titleEn") ??
          asText(item.title) ??
          asText(item.label),
        detail,
        evidence: normalizeTextList(item.evidence, locale),
      };
    })
    .filter((item): item is NormalizedFinding => item !== null);
};

const normalizeAnalysis = (
  value: unknown,
  locale: Locale,
): NormalizedAnalysis => {
  const record = isRecord(value) ? value : {};
  const meta = isRecord(record.meta) ? record.meta : {};

  return {
    status: asText(record.status),
    mode: asText(record.mode),
    intent: asText(record.intent),
    answerLanguage: asText(record.answerLanguage),
    businessHealth: objectSummary(record.businessHealth),
    riskLevel: objectSummary(record.riskLevel),
    summaryMm: asText(record.summaryMm),
    summaryEn: asText(record.summaryEn),
    findings: normalizeFindings(record.findings, locale),
    nextBestActions: normalizeTextList(record.nextBestActions, locale),
    limitations: normalizeTextList(record.limitations, locale),
    degradationReasons: normalizeTextList(record.degradationReasons, locale),
    model:
      asText(meta.model) ??
      asText(meta.modelName) ??
      asText(record.model) ??
      asText(record.modelName),
    requestId: asText(meta.requestId) ?? asText(record.requestId),
  };
};

const formatMmk = (value: number): string => {
  const sign = value < 0 ? "−" : "";
  const absolute = Math.abs(value);

  if (absolute >= 1_000_000) {
    const millions = absolute / 1_000_000;
    const digits = Number.isInteger(millions) ? 0 : 1;
    return `${sign}MMK ${millions.toFixed(digits)}M`;
  }

  if (absolute >= 1_000) {
    const thousands = absolute / 1_000;
    const digits = Number.isInteger(thousands) ? 0 : 1;
    return `${sign}MMK ${thousands.toFixed(digits)}K`;
  }

  return `${sign}MMK ${absolute.toLocaleString("en-US")}`;
};

const formatSignedPercent = (value: number | null): string =>
  value === null ? "—" : `${value > 0 ? "+" : ""}${value}%`;

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const formatDate = (isoDate: string): string => {
  const [year, month, day] = isoDate.split("-");
  const monthIndex = Number(month) - 1;
  const monthLabel = MONTH_LABELS[monthIndex] ?? month;

  return `${Number(day)} ${monthLabel} ${year}`;
};

const formatMonth = (month: string): string => {
  const [year, monthNumber] = month.split("-");
  const monthIndex = Number(monthNumber) - 1;
  const monthLabel = MONTH_LABELS[monthIndex] ?? monthNumber;

  return `${monthLabel} ${year}`;
};

const formatRunway = (
  months: number | null,
  copy: TranslationCopy,
): string =>
  months === null ? copy.metrics.selfFunding : copy.metrics.months(months);

const healthBand = (score: number, copy: TranslationCopy) => {
  if (score >= 75) {
    return { label: copy.snapshot.bands.stable, tone: "positive" as const };
  }

  if (score >= 50) {
    return { label: copy.snapshot.bands.watch, tone: "warning" as const };
  }

  return { label: copy.snapshot.bands.critical, tone: "danger" as const };
};

const nextActionCopy = (
  profile: BusinessProfile,
  overdueCount: number,
  collectionValueMmk: number,
  copy: TranslationCopy,
) => {
  if (overdueCount > 0) {
    return {
      amount: formatMmk(collectionValueMmk),
      headline: copy.action.collectHeadline,
      title: copy.action.collectDetail(Math.min(3, overdueCount)),
      support: copy.action.collectSupport,
    };
  }

  if (
    profile.payables.reduce((sum, item) => sum + item.outstandingAmountMmk, 0) >
    profile.currentCashMmk
  ) {
    return {
      amount: null,
      headline: null,
      title: copy.action.alignPayables,
      support: copy.action.collectSupport,
    };
  }

  return {
    amount: null,
    headline: null,
    title: copy.action.boundedTest,
    support: copy.action.collectSupport,
  };
};

function MetricCard({
  icon,
  label,
  value,
  detail,
  tone = "neutral",
}: {
  readonly icon: React.ReactNode;
  readonly label: string;
  readonly value: string;
  readonly detail: string;
  readonly tone?: "neutral" | "positive" | "warning" | "danger";
}) {
  return (
    <article className={`metric-card metric-${tone}`}>
      <div className="metric-label-row">
        <span className="metric-icon" aria-hidden="true">
          {icon}
        </span>
        <span className="metric-label">{label}</span>
      </div>
      <strong className="metric-value">{value}</strong>
      <span className="metric-detail">{detail}</span>
    </article>
  );
}

function AnalysisPanel({
  state,
  locale,
  copy,
  onRetry,
}: {
  readonly state: AnalysisState;
  readonly locale: Locale;
  readonly copy: TranslationCopy;
  readonly onRetry: () => void;
}) {
  if (state.phase === "idle") {
    return null;
  }

  if (state.phase === "loading") {
    return (
      <section className="analysis-panel card" aria-live="polite">
        <div className="analysis-loading">
          <Loader2 className="spin" aria-hidden="true" />
          <div>
            <strong>{copy.analysis.loadingTitle}</strong>
            <span>{copy.analysis.loadingDetail}</span>
          </div>
        </div>
      </section>
    );
  }

  if (state.phase === "error") {
    return (
      <section className="analysis-panel analysis-error card" role="alert">
        <AlertCircle aria-hidden="true" />
        <div>
          <strong>{copy.analysis.errorTitle}</strong>
          <p>{copy.analysis.errorRetry}</p>
          <button className="text-button" type="button" onClick={onRetry}>
            <RefreshCw aria-hidden="true" />
            <span>{copy.analysis.retry}</span>
          </button>
        </div>
      </section>
    );
  }

  const response = normalizeAnalysis(state.payload, locale);
  const mode = response.mode ?? "unknown";
  const isFallback = /fallback|degrad|determin/i.test(mode);
  const summary =
    locale === "my"
      ? (response.summaryMm ?? response.summaryEn)
      : (response.summaryEn ?? response.summaryMm);

  return (
    <section className="analysis-panel card" aria-labelledby="analysis-title">
      <div className="section-heading analysis-heading">
        <div>
          <span className="eyebrow">{copy.analysis.eyebrow}</span>
          <h2 id="analysis-title">{copy.analysis.title}</h2>
          <p>{copy.analysis.forQuestion(state.question)}</p>
        </div>
        <div className={`mode-badge ${isFallback ? "mode-fallback" : "mode-model"}`}>
          {isFallback ? (
            <ShieldCheck aria-hidden="true" />
          ) : (
            <MessageCircle aria-hidden="true" />
          )}
          <span>{isFallback ? copy.analysis.fallback : mode}</span>
          {response.model ? (
            <span>
              · {copy.analysis.model} {response.model}
            </span>
          ) : null}
        </div>
      </div>

      <div className="analysis-summary">
        {summary ? (
          <p className="summary-primary">{summary}</p>
        ) : (
          <p>{copy.analysis.emptySummary}</p>
        )}
      </div>

      <div className="analysis-meta">
        {response.status ? (
          <span>
            {copy.analysis.status}: {response.status}
          </span>
        ) : null}
        {response.intent ? (
          <span>
            {copy.analysis.intent}: {response.intent}
          </span>
        ) : null}
        {response.answerLanguage ? (
          <span>
            {copy.analysis.language}: {response.answerLanguage}
          </span>
        ) : null}
        {response.businessHealth ? (
          <span>
            {copy.analysis.health}: {response.businessHealth}
          </span>
        ) : null}
        {response.riskLevel ? (
          <span>
            {copy.analysis.risk}: {response.riskLevel}
          </span>
        ) : null}
      </div>

      {response.findings.length > 0 ? (
        <div className="analysis-block">
          <h3>{copy.analysis.findings}</h3>
          <ol className="finding-list">
            {response.findings.map((finding, index) => (
              <li key={`${finding.detail}-${index}`}>
                {finding.title ? <strong>{finding.title}</strong> : null}
                <p>{finding.detail}</p>
                {finding.evidence.length > 0 ? (
                  <ul className="evidence-list">
                    {finding.evidence.map((evidence, evidenceIndex) => (
                      <li key={`${evidence}-${evidenceIndex}`}>{evidence}</li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {response.nextBestActions.length > 0 ? (
        <div className="analysis-block">
          <h3>{copy.analysis.actions}</h3>
          <ol className="action-list">
            {response.nextBestActions.map((action, index) => (
              <li key={`${action}-${index}`}>{action}</li>
            ))}
          </ol>
        </div>
      ) : null}

      {response.limitations.length > 0 ||
      response.degradationReasons.length > 0 ? (
        <details className="analysis-disclosure">
          <summary>
            <ChevronDown aria-hidden="true" />
            <span>{copy.analysis.limitations}</span>
          </summary>
          {response.degradationReasons.length > 0 ? (
            <>
              <strong>{copy.analysis.degradation}</strong>
              <ul>
                {response.degradationReasons.map((reason, index) => (
                  <li key={`${reason}-${index}`}>{reason}</li>
                ))}
              </ul>
            </>
          ) : null}
          {response.limitations.length > 0 ? (
            <>
              <strong>{copy.analysis.limitations}</strong>
              <ul>
                {response.limitations.map((limitation, index) => (
                  <li key={`${limitation}-${index}`}>{limitation}</li>
                ))}
              </ul>
            </>
          ) : null}
        </details>
      ) : null}
    </section>
  );
}

export function DecisionWorkspace() {
  const { locale, copy, setLocale } = useLocale();
  const [selectedProfileId, setSelectedProfileId] =
    useState<ProfileId>(DEFAULT_PROFILE_ID);
  const [scenarioKind, setScenarioKind] = useState<ScenarioKind>(
    DEFAULT_SCENARIO_KIND,
  );
  const [upfrontMmkInput, setUpfrontMmkInput] = useState(
    String(SCENARIO_PRESETS[DEFAULT_SCENARIO_KIND].upfrontCostMmk),
  );
  const [question, setQuestion] = useState("");
  const [analysisState, setAnalysisState] = useState<AnalysisState>({
    phase: "idle",
  });
  const [isComposing, setIsComposing] = useState(false);
  const requestControllerRef = useRef<AbortController | null>(null);
  const requestSequenceRef = useRef(0);

  const profile = businessProfilesById[selectedProfileId];
  const profileLabels = copy.profiles[selectedProfileId];
  const snapshot = useMemo(
    () => calculateFinancialSnapshot(profile),
    [profile],
  );
  const health = useMemo(
    () => calculateHealthScore(profile, snapshot),
    [profile, snapshot],
  );
  const signals = useMemo(() => generateFinancialSignals(profile), [profile]);
  const prioritizedInvoices = useMemo(
    () => prioritizeOverdueInvoices(profile),
    [profile],
  );
  const expectedCollectionsMmk = useMemo(
    () => topOverdueCollectionValue(profile, 3),
    [profile],
  );
  const cashBridgeNow = useMemo(
    () =>
      calculateCashBridge({
        currentCashMmk: profile.currentCashMmk,
        expectedCollectionsMmk: 0,
        decisionOutlayMmk: BRANCH_OUTLAY_MMK,
        minimumReserveMmk: MINIMUM_RESERVE_MMK,
      }),
    [profile],
  );
  const cashBridgeAfterCollections = useMemo(
    () =>
      calculateCashBridge({
        currentCashMmk: profile.currentCashMmk,
        expectedCollectionsMmk,
        decisionOutlayMmk: BRANCH_OUTLAY_MMK,
        minimumReserveMmk: MINIMUM_RESERVE_MMK,
      }),
    [expectedCollectionsMmk, profile],
  );

  const upfrontMmk = Number(upfrontMmkInput);
  const scenarioInputIsValid =
    upfrontMmkInput.trim().length > 0 &&
    Number.isFinite(upfrontMmk) &&
    upfrontMmk >= 0;
  const scenario = useMemo(
    () =>
      scenarioInputIsValid
        ? createScenario(scenarioKind, { upfrontCostMmk: upfrontMmk })
        : null,
    [scenarioInputIsValid, scenarioKind, upfrontMmk],
  );
  const scenarioResult = useMemo(
    () => (scenario ? simulateScenario(profile, scenario) : null),
    [profile, scenario],
  );

  useEffect(
    () => () => {
      requestControllerRef.current?.abort();
    },
    [],
  );

  const submitQuestion = async (questionOverride?: string) => {
    const submittedQuestion = (questionOverride ?? question).trim();

    if (!submittedQuestion || isComposing) {
      return;
    }

    requestControllerRef.current?.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;
    const sequence = requestSequenceRef.current + 1;
    requestSequenceRef.current = sequence;
    setQuestion(submittedQuestion);
    setAnalysisState({ phase: "loading", question: submittedQuestion });

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: selectedProfileId,
          question: submittedQuestion,
          preferredLanguage: locale,
        }),
        signal: controller.signal,
      });
      const responseText = await response.text();
      let payload: unknown = {};

      if (responseText) {
        try {
          payload = JSON.parse(responseText);
        } catch {
          payload = {};
        }
      }

      if (!response.ok) {
        const errorRecord = isRecord(payload) ? payload : {};
        throw new Error(
          asText(errorRecord.message) ??
            asText(errorRecord.error) ??
            `Request failed with status ${response.status}.`,
        );
      }

      if (
        controller.signal.aborted ||
        requestSequenceRef.current !== sequence
      ) {
        return;
      }

      setAnalysisState({
        phase: "answered",
        question: submittedQuestion,
        payload,
      });
    } catch (error) {
      if (
        controller.signal.aborted ||
        requestSequenceRef.current !== sequence
      ) {
        return;
      }

      setAnalysisState({
        phase: "error",
        question: submittedQuestion,
        message:
          error instanceof Error
            ? error.message
            : "The analysis service could not be reached.",
      });
      console.error("ThriveAI analysis failed", error);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submitQuestion();
  };

  const handleQuestionKeyDown = (
    event: KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing &&
      !isComposing
    ) {
      event.preventDefault();
      void submitQuestion();
    }
  };

  const handleProfileChange = (nextProfileId: ProfileId) => {
    requestControllerRef.current?.abort();
    requestSequenceRef.current += 1;
    setSelectedProfileId(nextProfileId);
    setScenarioKind(DEFAULT_SCENARIO_KIND);
    setUpfrontMmkInput(
      String(SCENARIO_PRESETS[DEFAULT_SCENARIO_KIND].upfrontCostMmk),
    );
    setQuestion("");
    setAnalysisState({ phase: "idle" });
  };

  const handleScenarioChange = (nextKind: ScenarioKind) => {
    const nextScenario = createScenario(nextKind);
    setScenarioKind(nextKind);
    setUpfrontMmkInput(String(nextScenario.upfrontCostMmk));
  };

  const retryQuestion =
    analysisState.phase === "error" ? analysisState.question : question;
  const band = healthBand(health.total, copy);
  const payableGapMmk = Math.max(
    snapshot.liquidity.payablesMmk - profile.currentCashMmk,
    0,
  );
  const nextAction = nextActionCopy(
    profile,
    prioritizedInvoices.length,
    expectedCollectionsMmk,
    copy,
  );
  const growth = snapshot.growth.revenueGrowthPercent;
  const snapshotInsight =
    growth !== null && growth > 0
      ? copy.snapshot.growthUp(formatSignedPercent(growth))
      : copy.snapshot.growthFlat;
  const snapshotConstraint =
    payableGapMmk > 0
      ? copy.snapshot.payableGap(formatMmk(payableGapMmk))
      : snapshot.runway.months === null
        ? copy.runway.covers
        : copy.runway.months(snapshot.runway.months);
  const assistantStatus =
    analysisState.phase === "loading"
      ? copy.assistant.loading
      : analysisState.phase === "answered"
        ? copy.assistant.answered
        : analysisState.phase === "error"
          ? copy.assistant.error
          : copy.assistant.idle;

  return (
    <main className="workspace-shell">
      <header className="workspace-header">
        <a className="brand" href="#decision-snapshot" aria-label={copy.brand.homeAria}>
          <span className="brand-mark" aria-hidden="true">
            T
          </span>
          <span>
            <strong>{copy.brand.name}</strong>
            <small>{copy.brand.tagline}</small>
          </span>
        </a>

        <div className="header-tools">
          <div className="business-context">
            <label htmlFor="business-selector">
              <Building2 aria-hidden="true" />
              <span>{copy.selector.label}</span>
            </label>
            <div className="select-wrap">
              <select
                id="business-selector"
                value={selectedProfileId}
                aria-label={copy.selector.aria}
                onChange={(event) =>
                  handleProfileChange(event.target.value as ProfileId)
                }
              >
                {businessProfiles.map((business) => (
                  <option key={business.id} value={business.id}>
                    {copy.profiles[business.id].name}
                  </option>
                ))}
              </select>
              <ChevronDown aria-hidden="true" />
            </div>
          </div>
          <LanguageSwitcher
            locale={locale}
            enLabel={copy.language.en}
            myLabel={copy.language.my}
            enAria={copy.language.enAria}
            myAria={copy.language.myAria}
            groupAria={copy.language.groupAria}
            onChange={setLocale}
          />
        </div>
      </header>

      <section className="business-strip" aria-label={copy.selector.label}>
        <div>
          <span className="business-name">{profileLabels.name}</span>
        </div>
        <div className="business-meta">
          <span>{profileLabels.sector}</span>
          <span>{profileLabels.location}</span>
          <span>
            {copy.business.dataAsOf}{" "}
            <time dateTime={profile.asOfDate}>
              {formatDate(profile.asOfDate)}
            </time>
          </span>
        </div>
      </section>

      <section
        className="decision-snapshot card"
        id="decision-snapshot"
        aria-labelledby="snapshot-title"
      >
        <div className="score-block">
          <span className="eyebrow">{copy.snapshot.eyebrow}</span>
          <div className="score-value-row">
            <strong className="score-value">{health.total}</strong>
            <span className="score-denominator">/100</span>
          </div>
          <span className={`status-pill status-${band.tone}`}>
            {band.label}
          </span>
          <span className="method-label">
            {copy.snapshot.method} · v{health.methodologyVersion}
          </span>
        </div>

        <div className="snapshot-story">
          <span className="eyebrow">{copy.snapshot.decisionEyebrow}</span>
          <h1 id="snapshot-title">
            {snapshotInsight} {snapshotConstraint}
          </h1>
        </div>

        <details className="score-disclosure">
          <summary>
            <Calculator aria-hidden="true" />
            <span>{copy.snapshot.howCalculated}</span>
            <ChevronDown className="disclosure-chevron" aria-hidden="true" />
          </summary>
          <div className="score-breakdown">
            <div>
              <span>{copy.snapshot.profitability}</span>
              <strong>{health.subScores.profitability}/100</strong>
            </div>
            <div>
              <span>{copy.snapshot.liquidity}</span>
              <strong>{health.subScores.liquidity}/100</strong>
            </div>
            <div>
              <span>{copy.snapshot.cashFlow}</span>
              <strong>{health.subScores.cashFlow}/100</strong>
            </div>
            <div>
              <span>{copy.snapshot.growth}</span>
              <strong>{health.subScores.growth}/100</strong>
            </div>
          </div>
          <p>{copy.snapshot.methodNote}</p>
        </details>
      </section>

      <section className="metric-grid" aria-label={copy.metrics.aria}>
        <MetricCard
          icon={<TrendingUp />}
          label={copy.metrics.revenue}
          value={formatMmk(snapshot.revenueMmk)}
          detail={`${formatMonth(snapshot.month)} · ${formatSignedPercent(growth)} ${copy.metrics.mom}`}
          tone={growth !== null && growth >= 0 ? "positive" : "warning"}
        />
        <MetricCard
          icon={<WalletCards />}
          label={copy.metrics.cash}
          value={formatMmk(profile.currentCashMmk)}
          detail={copy.metrics.cashCoverage(
            String(snapshot.liquidity.cashCoverageRatio ?? "—"),
          )}
          tone="neutral"
        />
        <MetricCard
          icon={<Clock3 />}
          label={copy.metrics.runway}
          value={formatRunway(snapshot.runway.months, copy)}
          detail={copy.metrics.monthlyBurn(
            formatMmk(snapshot.runway.monthlyBurnMmk),
          )}
          tone={
            snapshot.runway.status === "critical"
              ? "danger"
              : snapshot.runway.status === "watch"
                ? "warning"
                : "positive"
          }
        />
        <MetricCard
          icon={<CircleDollarSign />}
          label={copy.metrics.payables}
          value={formatMmk(snapshot.liquidity.payablesMmk)}
          detail={copy.metrics.supplierCount(profile.payables.length)}
          tone={
            snapshot.liquidity.payablesMmk > profile.currentCashMmk
              ? "danger"
              : "neutral"
          }
        />
      </section>

      <AnalysisPanel
        state={analysisState}
        locale={locale}
        copy={copy}
        onRetry={() => void submitQuestion(retryQuestion)}
      />

      <section className="decision-grid" aria-label={copy.action.pathAria}>
        <article className="next-action card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">{copy.action.eyebrow}</span>
              <h2>{copy.action.title}</h2>
            </div>
            <span className="section-icon icon-positive" aria-hidden="true">
              <ArrowRight />
            </span>
          </div>

          <div className="action-hero">
            {nextAction.amount ? (
              <>
                <strong className="action-amount">{nextAction.amount}</strong>
                <span className="action-headline">{nextAction.headline}</span>
              </>
            ) : null}
            <p className="action-primary">{nextAction.title}</p>
          </div>

          <div className="action-why">
            <span>{copy.action.whyMatters}</span>
            <p>{nextAction.support}</p>
          </div>

          <div className="action-impact" aria-label={copy.action.impactAria}>
            <span className="impact-risk">
              <small>{copy.action.expandNow}</small>
              <strong>{formatMmk(cashBridgeNow.endingCashMmk)}</strong>
            </span>
            <ArrowRight aria-hidden="true" />
            <span className="impact-safe">
              <small>{copy.action.collectThen}</small>
              <strong>
                {formatMmk(cashBridgeAfterCollections.endingCashMmk)}
              </strong>
            </span>
          </div>
          <button
            className="secondary-button"
            type="button"
            onClick={() => void submitQuestion(copy.assistant.prompts[0])}
          >
            <MessageCircle aria-hidden="true" />
            <span>{copy.action.ask}</span>
            <ArrowRight aria-hidden="true" />
          </button>
        </article>

        <article className="cash-bridge card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">{copy.bridge.eyebrow}</span>
              <h2>{copy.bridge.title}</h2>
              <p>{copy.bridge.subtitle}</p>
            </div>
            <span className="section-icon icon-warning" aria-hidden="true">
              <Calculator />
            </span>
          </div>

          <p className="bridge-cash-label">{copy.bridge.cashAfter}</p>

          <div className="bridge-paths">
            <div className="bridge-path bridge-risk">
              <div className="bridge-path-heading">
                <TrendingDown aria-hidden="true" />
                <span>
                  <small>{copy.bridge.riskyPath}</small>
                  <strong>{copy.bridge.expandNow}</strong>
                </span>
              </div>
              <strong className="bridge-result">
                {formatMmk(cashBridgeNow.endingCashMmk)}
              </strong>
              <p>
                {copy.bridge.reserveGap}:{" "}
                <strong>{formatMmk(cashBridgeNow.reserveGapMmk)}</strong>
              </p>
            </div>

            <div className="bridge-arrow" aria-hidden="true">
              <span>{copy.bridge.versus}</span>
            </div>

            <div className="bridge-path bridge-safe">
              <div className="bridge-path-heading">
                <ShieldCheck aria-hidden="true" />
                <span>
                  <small>{copy.bridge.saferPath}</small>
                  <strong>{copy.bridge.collectThen}</strong>
                </span>
              </div>
              <strong className="bridge-result">
                {formatMmk(cashBridgeAfterCollections.endingCashMmk)}
              </strong>
              <p>
                {cashBridgeAfterCollections.reserveProtected
                  ? `${copy.bridge.reserveProtected} · ${formatMmk(cashBridgeAfterCollections.surplusAboveReserveMmk)} ${copy.bridge.aboveMinimum}`
                  : `${copy.bridge.reserveGap} · ${formatMmk(cashBridgeAfterCollections.reserveGapMmk)}`}
              </p>
            </div>
          </div>

          <div className="assumption-row" aria-label={copy.bridge.title}>
            <span>
              {copy.bridge.topOverdue}: {formatMmk(expectedCollectionsMmk)}
            </span>
            <span>
              {copy.bridge.branchOutlay}: {formatMmk(BRANCH_OUTLAY_MMK)}
            </span>
            <span>
              {copy.bridge.reserve}: {formatMmk(MINIMUM_RESERVE_MMK)}
            </span>
          </div>

          <div className="bridge-decision">
            <AlertCircle aria-hidden="true" />
            <p>
              {copy.bridge.required(
                formatMmk(cashBridgeNow.requiredCollectionsMmk),
              )}
            </p>
          </div>

          <details className="calculation-disclosure">
            <summary>
              <ChevronDown aria-hidden="true" />
              <span>{copy.bridge.how}</span>
            </summary>
            <div>
              <p className="bridge-equation">
                <span>{copy.bridge.expandNow}:</span>
                <span>{formatMmk(profile.currentCashMmk)}</span>
                <span aria-hidden="true">−</span>
                <span>{formatMmk(BRANCH_OUTLAY_MMK)}</span>
                <span aria-hidden="true">=</span>
                <strong>{formatMmk(cashBridgeNow.endingCashMmk)}</strong>
              </p>
              <p className="bridge-equation">
                <span>{copy.bridge.collectThen}:</span>
                <span>{formatMmk(profile.currentCashMmk)}</span>
                <span aria-hidden="true">+</span>
                <span>{formatMmk(expectedCollectionsMmk)}</span>
                <span aria-hidden="true">−</span>
                <span>{formatMmk(BRANCH_OUTLAY_MMK)}</span>
                <span aria-hidden="true">=</span>
                <strong>
                  {formatMmk(cashBridgeAfterCollections.endingCashMmk)}
                </strong>
              </p>
              <p>{copy.bridge.formula1}</p>
              <p>{copy.bridge.formula2}</p>
              <p>{copy.bridge.formula3}</p>
            </div>
          </details>
        </article>

        <article className="why-card card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">{copy.evidence.eyebrow}</span>
              <h2>{copy.evidence.title}</h2>
            </div>
            <span className="section-icon" aria-hidden="true">
              <ShieldCheck />
            </span>
          </div>

          <div className="signal-list">
            {signals.length > 0 ? (
              signals.map((signal) => {
                const signalCopy =
                  signal.id in copy.signals
                    ? copy.signals[signal.id as keyof typeof copy.signals]
                    : null;
                return (
                  <div className="signal-row" key={signal.id}>
                    <span
                      className={`signal-dot signal-${signal.kind} signal-${signal.severity}`}
                      aria-hidden="true"
                    />
                    <div>
                      <span className={`signal-kind kind-${signal.kind}`}>
                        {copy.evidence.kinds[signal.kind]}
                      </span>
                      <strong>{signalCopy?.title ?? signal.title}</strong>
                      <p>{signalCopy?.explanation ?? signal.explanation}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="empty-copy">{copy.evidence.empty}</p>
            )}
          </div>

          <div className="invoice-block">
            <div className="subsection-heading">
              <h3>{copy.evidence.invoices}</h3>
              <strong>{formatMmk(expectedCollectionsMmk)}</strong>
            </div>
            {prioritizedInvoices.length > 0 ? (
              <ol className="invoice-list">
                {prioritizedInvoices.slice(0, 3).map((invoice) => (
                  <li key={invoice.id}>
                    <span className={`priority-tag priority-${invoice.priority}`}>
                      {copy.evidence.priorities[invoice.priority]}
                    </span>
                    <span>
                      <strong>{invoice.customerName}</strong>
                      <small>
                        {copy.evidence.daysOverdue(invoice.daysOverdue)} ·{" "}
                        {invoice.id}
                      </small>
                    </span>
                    <strong className="invoice-amount">
                      {formatMmk(invoice.outstandingAmountMmk)}
                    </strong>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="empty-copy">
                {copy.evidence.noneOverdue(formatDate(profile.asOfDate))}
              </p>
            )}
          </div>
        </article>
      </section>

      <section className="scenario-card card" aria-labelledby="scenario-title">
        <div className="section-heading scenario-heading">
          <div>
            <span className="eyebrow">{copy.scenario.eyebrow}</span>
            <h2 id="scenario-title">{copy.scenario.title}</h2>
            <p>{copy.scenario.subtitle}</p>
          </div>
          <span className="not-forecast">
            <AlertCircle aria-hidden="true" />
            {copy.scenario.badge}
          </span>
        </div>

        <div className="scenario-controls">
          <label>
            <span>{copy.scenario.preset}</span>
            <span className="select-wrap">
              <select
                value={scenarioKind}
                onChange={(event) =>
                  handleScenarioChange(event.target.value as ScenarioKind)
                }
              >
                {(Object.keys(SCENARIO_PRESETS) as ScenarioKind[]).map(
                  (kind) => (
                    <option key={kind} value={kind}>
                      {copy.scenarios[kind]}
                    </option>
                  ),
                )}
              </select>
              <ChevronDown aria-hidden="true" />
            </span>
          </label>

          <label>
            <span>{copy.scenario.amount}</span>
            <input
              type="number"
              min="0"
              step="100000"
              inputMode="numeric"
              value={upfrontMmkInput}
              aria-invalid={!scenarioInputIsValid}
              aria-describedby="upfront-help"
              onChange={(event) => setUpfrontMmkInput(event.target.value)}
            />
            <small id="upfront-help">
              {scenarioInputIsValid
                ? copy.scenario.entered(formatMmk(upfrontMmk))
                : copy.scenario.invalid}
            </small>
          </label>
        </div>

        {scenario && scenarioResult ? (
          <>
            <div className="scenario-comparison" aria-live="polite">
              <div>
                <span className="comparison-label">{copy.scenario.before}</span>
                <dl>
                  <div>
                    <dt>{copy.scenario.runway}</dt>
                    <dd>
                      {formatRunway(scenarioResult.baselineRunwayMonths, copy)}
                    </dd>
                  </div>
                  <div>
                    <dt>{copy.scenario.endingCash}</dt>
                    <dd>{formatMmk(scenarioResult.baselineEndingCashMmk)}</dd>
                  </div>
                </dl>
              </div>
              <ArrowRight className="comparison-arrow" aria-hidden="true" />
              <div className="scenario-after">
                <span className="comparison-label">
                  {copy.scenarios[scenarioKind]}
                </span>
                <dl>
                  <div>
                    <dt>{copy.scenario.runway}</dt>
                    <dd>
                      {formatRunway(scenarioResult.scenarioRunwayMonths, copy)}
                    </dd>
                  </div>
                  <div>
                    <dt>{copy.scenario.endingCash}</dt>
                    <dd>{formatMmk(scenarioResult.scenarioEndingCashMmk)}</dd>
                  </div>
                </dl>
              </div>
              <div
                className={`scenario-impact impact-${scenarioResult.runwayDirection}`}
              >
                <span>{copy.scenario.impact}</span>
                <strong>{formatMmk(scenarioResult.endingCashImpactMmk)}</strong>
                <small>
                  {
                    copy.scenario[
                      scenarioResult.runwayDirection === "improves"
                        ? "runwayImproves"
                        : scenarioResult.runwayDirection === "worsens"
                          ? "runwayWorsens"
                          : "runwayUnchanged"
                    ]
                  }
                </small>
              </div>
            </div>

            <details className="scenario-assumptions">
              <summary>
                <ChevronDown aria-hidden="true" />
                <span>{copy.scenario.assumptions}</span>
              </summary>
              <div className="assumption-grid">
                <div>
                  <span>{copy.scenario.revenueChange}</span>
                  <strong>{formatMmk(scenario.monthlyRevenueChangeMmk)}</strong>
                  <small>
                    {copy.scenario.startsMonth(scenario.revenueChangeStartMonth)}
                  </small>
                </div>
                <div>
                  <span>{copy.scenario.expenseChange}</span>
                  <strong>{formatMmk(scenario.monthlyExpenseChangeMmk)}</strong>
                  <small>
                    {copy.scenario.startsMonth(scenario.expenseChangeStartMonth)}
                  </small>
                </div>
                <div>
                  <span>{copy.scenario.realization}</span>
                  <strong>
                    {Math.round(scenarioResult.cashRealizationRate * 100)}%
                  </strong>
                  <small>{copy.scenario.appliedRevenue}</small>
                </div>
                <div>
                  <span>{copy.scenario.baselineSource}</span>
                  <strong>
                    {snapshot.baseline30Day.sourceMonths.join(", ")}
                  </strong>
                  <small>{copy.scenario.trailing}</small>
                </div>
              </div>
              <ul className="caveat-list">
                {copy.scenario.caveats.map((caveat) => (
                  <li key={caveat}>{caveat}</li>
                ))}
              </ul>
            </details>
          </>
        ) : (
          <p className="scenario-error" role="alert">
            {copy.scenario.invalidAlert}
          </p>
        )}
      </section>

      <footer className="advisory-note">
        <ShieldCheck aria-hidden="true" />
        <p>{copy.advisory}</p>
      </footer>

      <section className="question-dock" aria-labelledby="question-title">
        <div className="question-dock-heading">
          <div>
            <MessageCircle aria-hidden="true" />
            <strong id="question-title">{copy.assistant.title}</strong>
          </div>
          <span className="request-status" aria-live="polite">
            {assistantStatus}
          </span>
        </div>

        <form className="question-form" onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="business-question">
            {copy.assistant.fieldLabel}
          </label>
          <textarea
            id="business-question"
            rows={1}
            value={question}
            placeholder={copy.assistant.placeholder}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={handleQuestionKeyDown}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
          />
          <button
            className="send-button"
            type="submit"
            disabled={!question.trim() || analysisState.phase === "loading"}
          >
            {analysisState.phase === "loading" ? (
              <Loader2 className="spin" aria-hidden="true" />
            ) : (
              <Send aria-hidden="true" />
            )}
            <span>
              {analysisState.phase === "loading"
                ? copy.assistant.sending
                : copy.assistant.send}
            </span>
          </button>
        </form>

        <details className="dock-suggestions">
          <summary>
            <ChevronDown aria-hidden="true" />
            <span>{copy.assistant.suggestions}</span>
          </summary>
          <div aria-label={copy.assistant.suggestionsAria}>
            {copy.assistant.prompts.map((suggestion) => (
              <button
                type="button"
                key={suggestion}
                disabled={analysisState.phase === "loading"}
                onClick={() => void submitQuestion(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </details>
      </section>
    </main>
  );
}
