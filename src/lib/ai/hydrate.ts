import {
  ACTION_CATALOG,
  LIMITATION_CATALOG,
  SIGNAL_CATALOG,
} from "./catalog";
import {
  AnalysisResponseSchema,
  type AnalysisResponse,
  type AnswerLanguage,
  type DegradationReason,
  type ModelDecision,
} from "./schemas";
import type { EvidenceBundle, EvidenceFact } from "./snapshot";

const hydrateEvidence = (
  factIds: readonly string[],
  factsById: ReadonlyMap<string, EvidenceFact>,
) =>
  factIds.map((factId) => {
    const fact = factsById.get(factId);
    if (!fact) {
      throw new Error(`Validated evidence fact is unavailable: ${factId}`);
    }

    return {
      factId: fact.id,
      labelMm: fact.labelMm,
      labelEn: fact.labelEn,
      displayValue: fact.displayValue,
      unit: fact.unit,
    };
  });

const limitationsFor = (
  decision: ModelDecision,
  mode: AnalysisResponse["mode"],
) => {
  const codes: (keyof typeof LIMITATION_CATALOG)[] = ["ADVISORY_ONLY"];

  if (mode === "deterministic_fallback") {
    codes.push("MODEL_FALLBACK");
  }
  if (decision.intent === "inventory") {
    codes.push("INVENTORY_VELOCITY_UNAVAILABLE");
  }
  if (decision.intent === "expansion" || decision.intent === "hiring") {
    codes.push("SCENARIO_INPUTS_REQUIRED");
  }

  return codes.map((code) => ({
    code,
    messageMm: LIMITATION_CATALOG[code].mm,
    messageEn: LIMITATION_CATALOG[code].en,
  }));
};

export const hydrateAnalysisResponse = (
  bundle: EvidenceBundle,
  decision: ModelDecision,
  answerLanguage: AnswerLanguage,
  mode: AnalysisResponse["mode"],
  degradationReasons: readonly DegradationReason[],
): AnalysisResponse => {
  const factsById = new Map(bundle.facts.map((fact) => [fact.id, fact]));
  const signalsById = new Map(bundle.signals.map((signal) => [signal.id, signal]));
  const findings = decision.selectedFindings.map((selected) => {
    const signal = signalsById.get(selected.signalId);
    if (!signal) {
      throw new Error(`Validated financial signal is unavailable: ${selected.signalId}`);
    }
    const copy = SIGNAL_CATALOG[selected.signalId];

    return {
      signalId: selected.signalId,
      kind: signal.kind,
      severity: signal.severity,
      titleMm: copy.title.mm,
      titleEn: copy.title.en,
      explanationMm: copy.explanation.mm,
      explanationEn: copy.explanation.en,
      evidence: hydrateEvidence(selected.evidenceFactIds, factsById),
    };
  });
  const nextBestActions = decision.nextActions.map((selected) => {
    const copy = ACTION_CATALOG[selected.actionCode];
    return {
      rank: selected.rank,
      actionCode: selected.actionCode,
      titleMm: copy.title.mm,
      titleEn: copy.title.en,
      rationaleCode: selected.rationaleCode,
      rationaleMm: copy.rationale.mm,
      rationaleEn: copy.rationale.en,
      evidence: hydrateEvidence(selected.evidenceFactIds, factsById),
      requiresHumanApproval: copy.requiresHumanApproval,
    };
  });
  const leadFinding = findings[0];
  const summaryMm = leadFinding
    ? `${leadFinding.titleMm}။ ${leadFinding.explanationMm}`
    : "အရေးပေါ် ငွေကြေးသတိပေးချက် မတွေ့ရသေးပါ။ ငွေသား၊ ကုန်ကျစရိတ်နှင့် ကတိကဝတ်များကို ဆက်လက်စောင့်ကြည့်ပါ။";
  const summaryEn = leadFinding
    ? `${leadFinding.titleEn}. ${leadFinding.explanationEn}`
    : "No material deterministic warning was identified. Continue monitoring cash, costs, and commitments.";

  return AnalysisResponseSchema.parse({
    status: mode === "model" ? "ok" : "degraded",
    mode,
    intent: decision.intent,
    answerLanguage,
    businessHealth: bundle.businessHealth,
    riskLevel: bundle.riskLevel,
    summaryMm,
    summaryEn,
    findings,
    nextBestActions,
    limitations: limitationsFor(decision, mode),
    degradationReasons: [...new Set(degradationReasons)],
    advisory: {
      advisoryOnly: true,
      figuresSource: "deterministic_finance_engine",
      businessId: bundle.businessId,
      asOfDate: bundle.asOfDate,
      currency: bundle.currency,
      modelUsed: mode === "model",
    },
  });
};
