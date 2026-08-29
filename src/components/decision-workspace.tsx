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
import type {
  BusinessProfile,
  FinancialSignal,
  ProfileId,
  ScenarioKind,
} from "@/types";

const DEFAULT_PROFILE_ID: ProfileId = "distributor";
const DEFAULT_SCENARIO_KIND: ScenarioKind = "branch";
const MINIMUM_RESERVE_MMK = 2_500_000;
const BRANCH_OUTLAY_MMK = SCENARIO_PRESETS.branch.upfrontCostMmk;

const profileCopy: Record<
  ProfileId,
  { readonly nameMm: string; readonly shortMm: string }
> = {
  "tea-shop": {
    nameMm: "ရွှေပြည် လက်ဖက်ရည်ဆိုင်",
    shortMm: "လက်ဖက်ရည်ဆိုင်",
  },
  "clothing-retailer": {
    nameMm: "မင်္ဂလာ ဖက်ရှင်",
    shortMm: "အဝတ်အထည်ဆိုင်",
  },
  distributor: {
    nameMm: "အောင်မင်္ဂလာ ဖြန့်ချိရေး",
    shortMm: "ဖြန့်ချိရေးလုပ်ငန်း",
  },
};

const scenarioCopy: Record<
  ScenarioKind,
  { readonly mm: string; readonly en: string }
> = {
  hire: { mm: "ဝန်ထမ်းအသစ်ခန့်ရန်", en: "Hire an employee" },
  inventory: { mm: "ကုန်ပစ္စည်းထပ်ဝယ်ရန်", en: "Buy inventory" },
  branch: { mm: "ဆိုင်ခွဲအသစ်ဖွင့်ရန်", en: "Open a branch" },
  equipment: { mm: "စက်ပစ္စည်းဝယ်ရန်", en: "Buy equipment" },
  marketing: { mm: "မားကတ်တင်းလုပ်ရန်", en: "Run marketing" },
  "custom-expense": { mm: "အခြားအသုံးစရိတ်", en: "Custom expense" },
};

const signalTitleMm: Record<string, string> = {
  "cash-runway": "ငွေသားအသုံးခံကာလကို သတိထားပါ",
  "payables-exceed-cash": "ပေးရန်ရှိငွေက လက်ရှိငွေသားထက်များနေသည်",
  "overdue-receivables": "ရက်ကျော်ကြွေးကျန်များတွင် ငွေသားပိတ်မိနေသည်",
  "collection-opportunity": "အဓိကကြွေးများက ငွေသားကို အမြန်ဖွင့်ပေးနိုင်သည်",
  "revenue-momentum": "အရောင်းတိုးတက်မှုအားကောင်းနေသည်",
  "expense-growth": "အသုံးစရိတ်တိုးနှုန်းက အရောင်းထက်မြန်နေသည်",
  "self-funded-growth": "လုပ်ငန်းလည်ပတ်ငွေဖြင့် တိုးချဲ့နိုင်သည့်အခြေအနေ",
};

const suggestedQuestions = [
  "ဆိုင်ခွဲမဖွင့်ခင် ဘယ်ကြွေးတွေကို အရင်ကောက်သင့်လဲ?",
  "အခုချိန် ဆိုင်ခွဲဖွင့်ရင် ငွေသားအန္တရာယ်ဘယ်လောက်ရှိလဲ?",
  "ငွေသားအသုံးခံကာလ တိုးဖို့ အကောင်းဆုံးလုပ်ဆောင်ချက်ကဘာလဲ?",
] as const;

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
      readonly response: NormalizedAnalysis;
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

const bilingualText = (
  record: UnknownRecord,
  mmKey: string,
  enKey: string,
): string | undefined => {
  const mm = asText(record[mmKey]);
  const en = asText(record[enKey]);

  if (mm && en) {
    return `${mm} / ${en}`;
  }

  return mm ?? en;
};

const normalizeTextList = (value: unknown): readonly string[] => {
  if (!Array.isArray(value)) {
    const item = objectSummary(value);
    return item ? [item] : [];
  }

  return value
    .map((item) => {
      if (isRecord(item)) {
        const evidenceLabel =
          bilingualText(item, "labelMm", "labelEn") ??
          asText(item.label) ??
          asText(item.metric);
        const evidenceValue =
          asText(item.displayValue) ?? asText(item.value);
        if (evidenceLabel && evidenceValue) {
          return `${evidenceLabel}: ${evidenceValue}`;
        }

        return (
          bilingualText(item, "titleMm", "titleEn") ??
          bilingualText(item, "messageMm", "messageEn") ??
          bilingualText(item, "rationaleMm", "rationaleEn") ??
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

const normalizeFindings = (value: unknown): readonly NormalizedFinding[] => {
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
        bilingualText(item, "explanationMm", "explanationEn") ??
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
          bilingualText(item, "titleMm", "titleEn") ??
          asText(item.title) ??
          asText(item.label),
        detail,
        evidence: normalizeTextList(item.evidence),
      };
    })
    .filter((item): item is NormalizedFinding => item !== null);
};

const normalizeAnalysis = (value: unknown): NormalizedAnalysis => {
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
    findings: normalizeFindings(record.findings),
    nextBestActions: normalizeTextList(record.nextBestActions),
    limitations: normalizeTextList(record.limitations),
    degradationReasons: normalizeTextList(record.degradationReasons),
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

const formatDate = (isoDate: string): string => {
  const date = new Date(`${isoDate}T00:00:00.000Z`);

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
};

const formatMonth = (month: string): string => {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1, 1));

  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
};

const formatRunway = (months: number | null): string =>
  months === null ? "Self-funding" : `${months} months`;

const healthBand = (score: number) => {
  if (score >= 75) {
    return { mm: "တည်ငြိမ်", en: "Stable", tone: "positive" };
  }

  if (score >= 50) {
    return { mm: "သတိထားရန်", en: "Watch", tone: "warning" };
  }

  return { mm: "အရေးကြီး", en: "Critical", tone: "danger" };
};

const runwayCopy = (profile: BusinessProfile, months: number | null) =>
  months === null
    ? {
        mm: "လတ်တလော ငွေဝင်က ငွေထွက်ကို ကာမိနေသည်",
        en: "Recent cash inflow covers cash outflow",
      }
    : {
        mm: `လက်ရှိနှုန်းအရ ငွေသားအသုံးခံကာလ ${months} လခန့်ရှိသည်`,
        en: `Cash runway is about ${months} months at the recent run-rate`,
      };

const nextActionCopy = (
  profile: BusinessProfile,
  overdueCount: number,
  collectionValueMmk: number,
  signals: readonly FinancialSignal[],
) => {
  if (overdueCount > 0) {
    return {
      mm: `တိုးချဲ့မှုမလုပ်မီ ရက်ကျော်ကြွေး ${Math.min(3, overdueCount)} ခုမှ ${formatMmk(collectionValueMmk)} ကို အရင်ကောက်ပါ။`,
      en: `Collect ${formatMmk(collectionValueMmk)} from the top ${Math.min(3, overdueCount)} overdue invoices before expanding.`,
      support:
        "Collection timing protects the reserve without giving up the expansion option.",
    };
  }

  if (profile.payables.reduce((sum, item) => sum + item.outstandingAmountMmk, 0) >
    profile.currentCashMmk) {
    return {
      mm: "ပေးသွင်းသူငွေချေရက်ကို အတည်ပြုထားသော ငွေကောက်ရက်နှင့် အရင်ညှိပါ။",
      en: "Align supplier due dates with confirmed collections first.",
      support:
        signals[0]?.action ??
        "Protect current cash before committing to discretionary spending.",
    };
  }

  return {
    mm: "ငွေသားအရန်ကို ထိန်းထားပြီး ကန့်သတ်ထားသော ရင်းနှီးမြှုပ်နှံမှုတစ်ခုကိုသာ စမ်းပါ။",
    en: "Test one bounded investment while preserving the cash reserve.",
    support:
      signals[0]?.action ??
      "Use a small, reversible step and review the result before scaling.",
  };
};

function MetricCard({
  icon,
  labelMm,
  labelEn,
  value,
  detail,
  tone = "neutral",
}: {
  readonly icon: React.ReactNode;
  readonly labelMm: string;
  readonly labelEn: string;
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
        <span>
          <span lang="my">{labelMm}</span>
          <span className="metric-label-en" lang="en">
            {labelEn}
          </span>
        </span>
      </div>
      <strong className="metric-value">{value}</strong>
      <span className="metric-detail">{detail}</span>
    </article>
  );
}

function AnalysisPanel({
  state,
  onRetry,
}: {
  readonly state: AnalysisState;
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
            <strong lang="my">အချက်အလက်များကို စစ်ဆေးနေသည်…</strong>
            <span>Analyzing the selected business data.</span>
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
          <strong lang="my">အဖြေမရသေးပါ</strong>
          <p>{state.message}</p>
          <button className="text-button" type="button" onClick={onRetry}>
            <RefreshCw aria-hidden="true" />
            <span lang="my">ပြန်ကြိုးစားမည်</span>
            <span aria-hidden="true">·</span>
            <span>Retry</span>
          </button>
        </div>
      </section>
    );
  }

  const { response } = state;
  const mode = response.mode ?? "unknown";
  const isFallback = /fallback|degrad|determin/i.test(mode);
  const hasSummary = Boolean(response.summaryMm || response.summaryEn);

  return (
    <section className="analysis-panel card" aria-labelledby="analysis-title">
      <div className="section-heading analysis-heading">
        <div>
          <span className="eyebrow" lang="my">
            ThriveAI အဖြေ
          </span>
          <h2 id="analysis-title">ဆုံးဖြတ်ချက်အထောက်အကူ</h2>
          <p>Decision support for “{state.question}”</p>
        </div>
        <div className={`mode-badge ${isFallback ? "mode-fallback" : "mode-model"}`}>
          {isFallback ? <ShieldCheck aria-hidden="true" /> : <MessageCircle aria-hidden="true" />}
          <span>{mode}</span>
          {response.model ? <span>· {response.model}</span> : null}
        </div>
      </div>

      <div className="analysis-summary">
        {response.summaryMm ? (
          <p className="summary-mm" lang="my">
            {response.summaryMm}
          </p>
        ) : null}
        {response.summaryEn ? (
          <p className="summary-en" lang="en">
            {response.summaryEn}
          </p>
        ) : null}
        {!hasSummary ? (
          <p className="summary-en">
            The endpoint returned no summary text. Structured details are shown
            below where available.
          </p>
        ) : null}
      </div>

      <div className="analysis-meta">
        {response.status ? <span>Status: {response.status}</span> : null}
        {response.intent ? <span>Intent: {response.intent}</span> : null}
        {response.answerLanguage ? (
          <span>Language: {response.answerLanguage}</span>
        ) : null}
        {response.businessHealth ? (
          <span>Health: {response.businessHealth}</span>
        ) : null}
        {response.riskLevel ? <span>Risk: {response.riskLevel}</span> : null}
      </div>

      {response.findings.length > 0 ? (
        <div className="analysis-block">
          <h3>
            <span lang="my">တွေ့ရှိချက်</span>
            <span>Findings</span>
          </h3>
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
          <h3>
            <span lang="my">နောက်တစ်ဆင့်</span>
            <span>Next best actions</span>
          </h3>
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
            <span lang="my">ကန့်သတ်ချက်များ</span>
            <span>Limitations &amp; degradation</span>
          </summary>
          {response.degradationReasons.length > 0 ? (
            <>
              <strong>Degradation reasons</strong>
              <ul>
                {response.degradationReasons.map((reason, index) => (
                  <li key={`${reason}-${index}`}>{reason}</li>
                ))}
              </ul>
            </>
          ) : null}
          {response.limitations.length > 0 ? (
            <>
              <strong>Limitations</strong>
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
          preferredLanguage: "auto",
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
        response: normalizeAnalysis(payload),
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
  const band = healthBand(health.total);
  const payableGapMmk = Math.max(
    snapshot.liquidity.payablesMmk - profile.currentCashMmk,
    0,
  );
  const runway = runwayCopy(profile, snapshot.runway.months);
  const nextAction = nextActionCopy(
    profile,
    prioritizedInvoices.length,
    expectedCollectionsMmk,
    signals,
  );
  const growth = snapshot.growth.revenueGrowthPercent;

  return (
    <main className="workspace-shell">
      <header className="workspace-header">
        <a className="brand" href="#decision-snapshot" aria-label="ThriveAI home">
          <span className="brand-mark" aria-hidden="true">
            T
          </span>
          <span>
            <strong>ThriveAI</strong>
            <small>SME decision copilot</small>
          </span>
        </a>

        <div className="business-context">
          <label htmlFor="business-selector">
            <Building2 aria-hidden="true" />
            <span>
              <span lang="my">ရွေးချယ်ထားသောလုပ်ငန်း</span>
              <span>Selected SME</span>
            </span>
          </label>
          <div className="select-wrap">
            <select
              id="business-selector"
              value={selectedProfileId}
              onChange={(event) =>
                handleProfileChange(event.target.value as ProfileId)
              }
            >
              {businessProfiles.map((business) => (
                <option key={business.id} value={business.id}>
                  {profileCopy[business.id].nameMm} · {business.businessName}
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden="true" />
          </div>
        </div>
      </header>

      <section
        className="business-strip"
        aria-label="Selected business context"
      >
        <div>
          <span className="business-name-mm" lang="my">
            {profileCopy[profile.id].nameMm}
          </span>
          <span className="business-name-en">{profile.businessName}</span>
        </div>
        <div className="business-meta">
          <span>{profile.sector}</span>
          <span>{profile.location}</span>
          <span>
            Data as of <time dateTime={profile.asOfDate}>{formatDate(profile.asOfDate)}</time>
          </span>
        </div>
      </section>

      <section
        className="decision-snapshot card"
        id="decision-snapshot"
        aria-labelledby="snapshot-title"
      >
        <div className="score-block">
          <span className="eyebrow" lang="my">
            လုပ်ငန်းကျန်းမာရေး
          </span>
          <div className="score-value-row">
            <strong className="score-value">{health.total}</strong>
            <span className="score-denominator">/100</span>
          </div>
          <span className={`status-pill status-${band.tone}`}>
            <span lang="my">{band.mm}</span>
            <span aria-hidden="true">·</span>
            <span>{band.en}</span>
          </span>
          <span className="method-label">
            Deterministic · method v{health.methodologyVersion}
          </span>
        </div>

        <div className="snapshot-story">
          <span className="eyebrow" lang="my">
            ယခုဆုံးဖြတ်ရမည့်အချက်
          </span>
          <h1 id="snapshot-title" lang="my">
            {growth !== null && growth > 0
              ? `စာရင်းဝင်အရောင်း ${formatSignedPercent(growth)} တက်လာပေမယ့်`
              : "စာရင်းဝင်အရောင်းကို ထိန်းထားနိုင်ပေမယ့်"}{" "}
            {payableGapMmk > 0
              ? `ပေးရန်ရှိငွေက လက်ရှိငွေသားထက် ${formatMmk(payableGapMmk)} များနေသည်။`
              : runway.mm}
          </h1>
          <p className="snapshot-summary" lang="en">
            {growth !== null
              ? `Accrual revenue changed ${formatSignedPercent(growth)} month on month. `
              : ""}
            {payableGapMmk > 0
              ? `Supplier obligations exceed cash by ${formatMmk(payableGapMmk)}; ${runway.en.toLowerCase()}.`
              : `${runway.en}.`}
          </p>
        </div>

        <details className="score-disclosure">
          <summary>
            <Calculator aria-hidden="true" />
            <span lang="my">တွက်ချက်ပုံ</span>
            <span>How calculated</span>
            <ChevronDown className="disclosure-chevron" aria-hidden="true" />
          </summary>
          <div className="score-breakdown">
            <div>
              <span>Profitability · 30%</span>
              <strong>{health.subScores.profitability}/100</strong>
            </div>
            <div>
              <span>Liquidity · 25%</span>
              <strong>{health.subScores.liquidity}/100</strong>
            </div>
            <div>
              <span>Cash flow · 30%</span>
              <strong>{health.subScores.cashFlow}/100</strong>
            </div>
            <div>
              <span>Growth · 15%</span>
              <strong>{health.subScores.growth}/100</strong>
            </div>
          </div>
          <p>
            Weighted screening score: profitability 30% + liquidity 25% +
            cash flow 30% + growth 15%. It is not a credit score or accounting
            opinion.
          </p>
        </details>
      </section>

      <section className="metric-grid" aria-label="Four primary metrics">
        <MetricCard
          icon={<TrendingUp />}
          labelMm="နောက်ဆုံးလ အရောင်း"
          labelEn="Latest revenue"
          value={formatMmk(snapshot.revenueMmk)}
          detail={`${formatMonth(snapshot.month)} · ${formatSignedPercent(growth)} MoM`}
          tone={growth !== null && growth >= 0 ? "positive" : "warning"}
        />
        <MetricCard
          icon={<WalletCards />}
          labelMm="လက်ရှိငွေသား"
          labelEn="Cash now"
          value={formatMmk(profile.currentCashMmk)}
          detail={`Cash coverage ${snapshot.liquidity.cashCoverageRatio ?? "—"}×`}
          tone="neutral"
        />
        <MetricCard
          icon={<Clock3 />}
          labelMm="ငွေသားအသုံးခံကာလ"
          labelEn="Cash runway"
          value={formatRunway(snapshot.runway.months)}
          detail={`Recent monthly burn ${formatMmk(snapshot.runway.monthlyBurnMmk)}`}
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
          labelMm="ပေးရန်ရှိငွေ"
          labelEn="Outstanding payables"
          value={formatMmk(snapshot.liquidity.payablesMmk)}
          detail={`${profile.payables.length} supplier obligation${profile.payables.length === 1 ? "" : "s"}`}
          tone={
            snapshot.liquidity.payablesMmk > profile.currentCashMmk
              ? "danger"
              : "neutral"
          }
        />
      </section>

      <AnalysisPanel
        state={analysisState}
        onRetry={() => void submitQuestion(retryQuestion)}
      />

      <section className="decision-grid" aria-label="Recommended decision path">
        <article className="next-action card">
          <div className="section-heading">
            <div>
              <span className="eyebrow" lang="my">
                အကောင်းဆုံးနောက်တစ်ဆင့်
              </span>
              <h2>Next best action</h2>
            </div>
            <span className="section-icon icon-positive" aria-hidden="true">
              <ArrowRight />
            </span>
          </div>
          <p className="action-primary" lang="my">
            {nextAction.mm}
          </p>
          <p className="action-english">{nextAction.en}</p>
          <p className="action-support">{nextAction.support}</p>
          <div className="action-impact" aria-label="Cash bridge preview">
            <span>
              <small>Expand now</small>
              <strong>{formatMmk(cashBridgeNow.endingCashMmk)}</strong>
            </span>
            <ArrowRight aria-hidden="true" />
            <span>
              <small>Collect, then expand</small>
              <strong>{formatMmk(cashBridgeAfterCollections.endingCashMmk)}</strong>
            </span>
          </div>
          <button
            className="secondary-button"
            type="button"
            onClick={() => void submitQuestion(suggestedQuestions[0])}
          >
            <MessageCircle aria-hidden="true" />
            <span lang="my">ဒီအကြံပြုချက်ကို မေးမည်</span>
            <span>Ask ThriveAI</span>
          </button>
        </article>

        <article className="cash-bridge card">
          <div className="section-heading">
            <div>
              <span className="eyebrow" lang="my">
                ငွေသားအကူးအပြောင်း
              </span>
              <h2>Cash Bridge</h2>
              <p>Collect first, then decide—not a cash forecast.</p>
            </div>
            <span className="section-icon icon-warning" aria-hidden="true">
              <Calculator />
            </span>
          </div>

          <div className="assumption-row" aria-label="Cash bridge assumptions">
            <span>Top 3 overdue: {formatMmk(expectedCollectionsMmk)}</span>
            <span>Branch outlay: {formatMmk(BRANCH_OUTLAY_MMK)}</span>
            <span>Reserve: {formatMmk(MINIMUM_RESERVE_MMK)}</span>
          </div>

          <div className="bridge-paths">
            <div className="bridge-path bridge-risk">
              <div className="bridge-path-heading">
                <span lang="my">အခုတိုးချဲ့မည်</span>
                <span>Expand now</span>
              </div>
              <div className="bridge-equation">
                <span>{formatMmk(profile.currentCashMmk)}</span>
                <span aria-hidden="true">−</span>
                <span>{formatMmk(BRANCH_OUTLAY_MMK)}</span>
                <span aria-hidden="true">=</span>
                <strong>{formatMmk(cashBridgeNow.endingCashMmk)}</strong>
              </div>
              <p>
                Reserve gap: <strong>{formatMmk(cashBridgeNow.reserveGapMmk)}</strong>
              </p>
            </div>

            <div className="bridge-arrow" aria-hidden="true">
              <ArrowRight />
            </div>

            <div className="bridge-path bridge-safe">
              <div className="bridge-path-heading">
                <span lang="my">အရင်ကောက်ပြီး တိုးချဲ့မည်</span>
                <span>Collect, then expand</span>
              </div>
              <div className="bridge-equation">
                <span>{formatMmk(profile.currentCashMmk)}</span>
                <span aria-hidden="true">+</span>
                <span>{formatMmk(expectedCollectionsMmk)}</span>
                <span aria-hidden="true">−</span>
                <span>{formatMmk(BRANCH_OUTLAY_MMK)}</span>
                <span aria-hidden="true">=</span>
                <strong>
                  {formatMmk(cashBridgeAfterCollections.endingCashMmk)}
                </strong>
              </div>
              <p>
                {cashBridgeAfterCollections.reserveProtected
                  ? `Reserve protected · ${formatMmk(cashBridgeAfterCollections.surplusAboveReserveMmk)} above minimum`
                  : `Reserve gap · ${formatMmk(cashBridgeAfterCollections.reserveGapMmk)}`}
              </p>
            </div>
          </div>

          <div className="bridge-decision">
            <AlertCircle aria-hidden="true" />
            <p>
              <span lang="my">
                အရန်ငွေကို ကာကွယ်ရန် အနည်းဆုံး{" "}
                <strong>{formatMmk(cashBridgeNow.requiredCollectionsMmk)}</strong>{" "}
                အရင်ကောက်ရန်လိုသည်။
              </span>
              <span>
                Collect at least{" "}
                <strong>{formatMmk(cashBridgeNow.requiredCollectionsMmk)}</strong>{" "}
                before the outlay to protect the minimum reserve.
              </span>
            </p>
          </div>

          <details className="calculation-disclosure">
            <summary>
              <ChevronDown aria-hidden="true" />
              <span lang="my">တွက်ချက်ပုံနှင့် ယူဆချက်များ</span>
              <span>How calculated</span>
            </summary>
            <div>
              <p>
                Ending cash = current cash + expected collections − decision
                outlay.
              </p>
              <p>
                Required collection = max(0, outlay + minimum reserve − current
                cash).
              </p>
              <p>
                Expected collections use only the top three invoices already
                overdue as of the profile&apos;s data date. Collection is an
                assumption, not a guarantee.
              </p>
            </div>
          </details>
        </article>

        <article className="why-card card">
          <div className="section-heading">
            <div>
              <span className="eyebrow" lang="my">
                ဘာကြောင့်လဲ
              </span>
              <h2>Evidence behind the action</h2>
            </div>
            <span className="section-icon" aria-hidden="true">
              <ShieldCheck />
            </span>
          </div>

          <div className="signal-list">
            {signals.length > 0 ? (
              signals.map((signal) => (
                <div className="signal-row" key={signal.id}>
                  <span
                    className={`signal-dot signal-${signal.kind} signal-${signal.severity}`}
                    aria-hidden="true"
                  />
                  <div>
                    <strong lang="my">
                      {signalTitleMm[signal.id] ?? signal.title}
                    </strong>
                    <span>{signal.title}</span>
                    <p>{signal.explanation}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="empty-copy">No material finance signals found.</p>
            )}
          </div>

          <div className="invoice-block">
            <div className="subsection-heading">
              <h3>
                <span lang="my">ဦးစားပေးကောက်ရန်</span>
                <span>Priority overdue invoices</span>
              </h3>
              <strong>{formatMmk(expectedCollectionsMmk)}</strong>
            </div>
            {prioritizedInvoices.length > 0 ? (
              <ol className="invoice-list">
                {prioritizedInvoices.slice(0, 3).map((invoice) => (
                  <li key={invoice.id}>
                    <span className={`priority-tag priority-${invoice.priority}`}>
                      {invoice.priority}
                    </span>
                    <span>
                      <strong>{invoice.customerName}</strong>
                      <small>
                        {invoice.daysOverdue} days overdue · {invoice.id}
                      </small>
                    </span>
                    <strong>{formatMmk(invoice.outstandingAmountMmk)}</strong>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="empty-copy">
                No invoices are overdue as of {formatDate(profile.asOfDate)}.
              </p>
            )}
          </div>
        </article>
      </section>

      <section className="scenario-card card" aria-labelledby="scenario-title">
        <div className="section-heading scenario-heading">
          <div>
            <span className="eyebrow" lang="my">
              အခြေအနေစမ်းသပ်ရန်
            </span>
            <h2 id="scenario-title">Scenario simulator</h2>
            <p>
              Editable straight-line assumptions for comparison—not a forecast.
            </p>
          </div>
          <span className="not-forecast">
            <AlertCircle aria-hidden="true" />
            Assumptions only
          </span>
        </div>

        <div className="scenario-controls">
          <label>
            <span lang="my">စမ်းသပ်မည့်အခြေအနေ</span>
            <span>Scenario preset</span>
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
                      {scenarioCopy[kind].mm} · {scenarioCopy[kind].en}
                    </option>
                  ),
                )}
              </select>
              <ChevronDown aria-hidden="true" />
            </span>
          </label>

          <label>
            <span lang="my">အစပိုင်းကုန်ကျငွေ</span>
            <span>Upfront amount (MMK)</span>
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
                ? `Entered amount: ${formatMmk(upfrontMmk)}`
                : "Enter a valid amount of zero or more."}
            </small>
          </label>
        </div>

        {scenario && scenarioResult ? (
          <>
            <div className="scenario-comparison" aria-live="polite">
              <div>
                <span className="comparison-label">
                  <span lang="my">မလုပ်မီ</span>
                  <span>Baseline</span>
                </span>
                <dl>
                  <div>
                    <dt>Cash runway</dt>
                    <dd>{formatRunway(scenarioResult.baselineRunwayMonths)}</dd>
                  </div>
                  <div>
                    <dt>12-month ending cash</dt>
                    <dd>{formatMmk(scenarioResult.baselineEndingCashMmk)}</dd>
                  </div>
                </dl>
              </div>
              <ArrowRight className="comparison-arrow" aria-hidden="true" />
              <div className="scenario-after">
                <span className="comparison-label">
                  <span lang="my">လုပ်ပြီးနောက်</span>
                  <span>{scenarioCopy[scenarioKind].en}</span>
                </span>
                <dl>
                  <div>
                    <dt>Cash runway</dt>
                    <dd>{formatRunway(scenarioResult.scenarioRunwayMonths)}</dd>
                  </div>
                  <div>
                    <dt>12-month ending cash</dt>
                    <dd>{formatMmk(scenarioResult.scenarioEndingCashMmk)}</dd>
                  </div>
                </dl>
              </div>
              <div
                className={`scenario-impact impact-${scenarioResult.runwayDirection}`}
              >
                <span>12-month cash impact</span>
                <strong>{formatMmk(scenarioResult.endingCashImpactMmk)}</strong>
                <small>Runway {scenarioResult.runwayDirection}</small>
              </div>
            </div>

            <details className="scenario-assumptions">
              <summary>
                <ChevronDown aria-hidden="true" />
                <span lang="my">ယူဆချက်များကြည့်ရန်</span>
                <span>View assumptions</span>
              </summary>
              <div className="assumption-grid">
                <div>
                  <span>Monthly revenue change</span>
                  <strong>{formatMmk(scenario.monthlyRevenueChangeMmk)}</strong>
                  <small>Starts month {scenario.revenueChangeStartMonth}</small>
                </div>
                <div>
                  <span>Monthly expense change</span>
                  <strong>{formatMmk(scenario.monthlyExpenseChangeMmk)}</strong>
                  <small>Starts month {scenario.expenseChangeStartMonth}</small>
                </div>
                <div>
                  <span>Recent cash realization</span>
                  <strong>
                    {Math.round(scenarioResult.cashRealizationRate * 100)}%
                  </strong>
                  <small>Applied to added revenue</small>
                </div>
                <div>
                  <span>Baseline source</span>
                  <strong>
                    {snapshot.baseline30Day.sourceMonths.join(", ")}
                  </strong>
                  <small>Trailing three months</small>
                </div>
              </div>
              <ul className="caveat-list">
                {scenarioResult.caveats.map((caveat) => (
                  <li key={caveat}>{caveat}</li>
                ))}
              </ul>
            </details>
          </>
        ) : (
          <p className="scenario-error" role="alert">
            Enter a valid upfront MMK amount to run the scenario.
          </p>
        )}
      </section>

      <footer className="advisory-note">
        <ShieldCheck aria-hidden="true" />
        <p>
          <strong lang="my">အကြံပြုချက်အတွက်သာ။</strong>{" "}
          <span lang="my">
            ဤရလဒ်များသည် ရရှိထားသောလုပ်ငန်းဒေတာအပေါ်အခြေခံပြီး စာရင်းကိုင်၊
            ချေးငွေ သို့မဟုတ် ရင်းနှီးမြှုပ်နှံမှုအကြံပေးချက်မဟုတ်ပါ။
          </span>
          <span>
            Advisory only. Verify timing and amounts before making a financial
            commitment.
          </span>
        </p>
      </footer>

      <section className="question-dock" aria-labelledby="question-title">
        <div className="question-dock-heading">
          <div>
            <MessageCircle aria-hidden="true" />
            <span>
              <strong id="question-title" lang="my">
                ဘာသိချင်ပါသလဲ?
              </strong>
              <small>Ask about {profileCopy[profile.id].shortMm}</small>
            </span>
          </div>
          <span className="request-status" aria-live="polite">
            {analysisState.phase === "loading"
              ? "တွက်ချက်နေသည်…"
              : analysisState.phase === "answered"
                ? "အဖြေရရှိပြီး"
                : analysisState.phase === "error"
                  ? "ပြန်ကြိုးစားနိုင်သည်"
                  : "Burmese or English"}
          </span>
        </div>

        <div className="desktop-suggestions" aria-label="Suggested questions">
          {suggestedQuestions.map((suggestion) => (
            <button
              type="button"
              key={suggestion}
              disabled={analysisState.phase === "loading"}
              onClick={() => void submitQuestion(suggestion)}
              lang="my"
            >
              {suggestion}
            </button>
          ))}
        </div>

        <details className="mobile-suggestions">
          <summary>
            <ChevronDown aria-hidden="true" />
            <span lang="my">မေးခွန်းအကြံပြုချက်များ</span>
          </summary>
          <div>
            {suggestedQuestions.map((suggestion) => (
              <button
                type="button"
                key={suggestion}
                disabled={analysisState.phase === "loading"}
                onClick={() => void submitQuestion(suggestion)}
                lang="my"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </details>

        <form className="question-form" onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="business-question">
            Ask ThriveAI a question about the selected business
          </label>
          <textarea
            id="business-question"
            rows={1}
            value={question}
            placeholder="ဥပမာ — အခု ဆိုင်ခွဲဖွင့်သင့်လား?"
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
            <span lang="my">မေးမည်</span>
            <span className="send-en">Ask</span>
          </button>
        </form>
      </section>
    </main>
  );
}
