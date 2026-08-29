import { businessProfilesById } from "@/data";

import { ACTION_CATALOG, INTENT_ACTIONS } from "./catalog";
import { buildFallbackDecision } from "./fallback";
import { hydrateAnalysisResponse } from "./hydrate";
import { classifyIntent, detectAnswerLanguage } from "./intent";
import {
  buildAnalysisPrompt,
  buildRepairPrompt,
} from "./prompt";
import {
  resolveAiTimeoutMs,
  resolveModelRuntime,
  type ModelProvider,
  type ModelRuntime,
} from "./provider";
import {
  ModelDecisionSchema,
  TrustedAnalyzeRequestSchema,
  type AnalysisResponse,
  type DegradationReason,
  type ModelDecision,
  type TrustedAnalyzeRequest,
} from "./schemas";
import {
  buildEvidenceBundle,
  evidenceForSuffixes,
  type EvidenceBundle,
} from "./snapshot";

interface AnalyzeOptions {
  readonly runtime?: ModelRuntime;
  readonly timeoutMs?: number;
}

type DecisionFailure =
  | "MALFORMED_RESPONSE"
  | "SCHEMA_INVALID"
  | "SEMANTIC_INVALID";

type ParsedDecision =
  | { readonly success: true; readonly decision: ModelDecision }
  | { readonly success: false; readonly reason: DecisionFailure };

class ProviderTimeoutError extends Error {
  constructor() {
    super("AI provider deadline exceeded.");
    this.name = "ProviderTimeoutError";
  }
}

export const validateDecisionSemantics = (
  decision: ModelDecision,
  bundle: EvidenceBundle,
): readonly string[] => {
  const errors: string[] = [];
  const factsById = new Map(bundle.facts.map((fact) => [fact.id, fact]));
  const signalsById = new Map(bundle.signals.map((signal) => [signal.id, signal]));
  const seenFindings = new Set<string>();
  const seenActions = new Set<string>();
  const selectedSignalIds = new Set(
    decision.selectedFindings.map(({ signalId }) => signalId),
  );
  const highRisks = bundle.signals.filter(
    ({ kind, severity }) => kind === "risk" && severity === "high",
  );
  const risks = bundle.signals.filter(({ kind }) => kind === "risk");

  if (
    highRisks.length > 0 &&
    !highRisks.some(({ id }) => selectedSignalIds.has(id))
  ) {
    errors.push("At least one high-severity risk must be selected.");
  } else if (
    risks.length > 0 &&
    !risks.some(({ id }) => selectedSignalIds.has(id))
  ) {
    errors.push("At least one available risk must be selected.");
  } else if (
    bundle.signals.length > 0 &&
    decision.selectedFindings.length === 0
  ) {
    errors.push("At least one available signal must be selected.");
  }

  for (const finding of decision.selectedFindings) {
    const signal = signalsById.get(finding.signalId);
    if (!signal) {
      errors.push(`Unknown signal: ${finding.signalId}`);
      continue;
    }
    if (seenFindings.has(finding.signalId)) {
      errors.push(`Duplicate signal: ${finding.signalId}`);
    }
    seenFindings.add(finding.signalId);

    const allowedEvidence = new Set(signal.evidenceFactIds);
    for (const factId of finding.evidenceFactIds) {
      if (!allowedEvidence.has(factId)) {
        errors.push(`Evidence ${factId} does not support ${finding.signalId}`);
      }
    }
  }

  const allowedActions = new Set(INTENT_ACTIONS[decision.intent]);
  const ranks = decision.nextActions.map(({ rank }) => rank);
  const expectedRanks = decision.nextActions.map((_, index) => index + 1);
  if (ranks.some((rank, index) => rank !== expectedRanks[index])) {
    errors.push("Action ranks must be unique and contiguous from one.");
  }

  for (const action of decision.nextActions) {
    if (seenActions.has(action.actionCode)) {
      errors.push(`Duplicate action: ${action.actionCode}`);
    }
    seenActions.add(action.actionCode);

    if (!allowedActions.has(action.actionCode)) {
      errors.push(
        `Action ${action.actionCode} is not allowed for ${decision.intent}`,
      );
    }

    const catalog = ACTION_CATALOG[action.actionCode];
    if (action.rationaleCode !== catalog.rationaleCode) {
      errors.push(`Invalid rationale for ${action.actionCode}`);
    }

    for (const signalId of action.supportingSignalIds) {
      if (!signalsById.has(signalId)) {
        errors.push(`Unknown supporting signal: ${signalId}`);
      }
    }

    const allowedEvidence = new Set(
      evidenceForSuffixes(bundle, catalog.evidenceSuffixes).map(({ id }) => id),
    );
    for (const factId of action.evidenceFactIds) {
      if (!factsById.has(factId)) {
        errors.push(`Unknown evidence fact: ${factId}`);
      } else if (!allowedEvidence.has(factId)) {
        errors.push(`Evidence ${factId} is not relevant to ${action.actionCode}`);
      }
    }
  }

  return errors;
};

const parseDecision = (
  rawOutput: string,
  bundle: EvidenceBundle,
): ParsedDecision => {
  let unknownDecision: unknown;
  try {
    unknownDecision = JSON.parse(rawOutput);
  } catch {
    return { success: false, reason: "MALFORMED_RESPONSE" };
  }

  const parsed = ModelDecisionSchema.safeParse(unknownDecision);
  if (!parsed.success) {
    return { success: false, reason: "SCHEMA_INVALID" };
  }

  if (validateDecisionSemantics(parsed.data, bundle).length > 0) {
    return { success: false, reason: "SEMANTIC_INVALID" };
  }

  return { success: true, decision: parsed.data };
};

const callWithinDeadline = async (
  provider: ModelProvider,
  prompt: string,
  deadline: number,
): Promise<string | undefined> => {
  const remainingMs = deadline - Date.now();
  if (remainingMs <= 0) {
    throw new ProviderTimeoutError();
  }

  const controller = new AbortController();
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  let didTimeout = false;

  try {
    return await Promise.race([
      provider.generate(prompt, controller.signal),
      new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          didTimeout = true;
          controller.abort();
          reject(new ProviderTimeoutError());
        }, remainingMs);
      }),
    ]);
  } catch (error) {
    if (didTimeout) {
      throw new ProviderTimeoutError();
    }
    throw error;
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
};

const fallbackResponse = (
  request: TrustedAnalyzeRequest,
  bundle: EvidenceBundle,
  deterministicIntent: ReturnType<typeof classifyIntent>,
  degradationReasons: readonly DegradationReason[],
): AnalysisResponse =>
  hydrateAnalysisResponse(
    bundle,
    buildFallbackDecision(deterministicIntent, bundle),
    detectAnswerLanguage(request),
    "deterministic_fallback",
    degradationReasons,
  );

const providerFailureReason = (error: unknown): DegradationReason =>
  error instanceof ProviderTimeoutError
    ? "PROVIDER_TIMEOUT"
    : "PROVIDER_ERROR";

export const analyzeBusiness = async (
  input: unknown,
  options: AnalyzeOptions = {},
): Promise<AnalysisResponse> => {
  const request = TrustedAnalyzeRequestSchema.parse(input);
  const profile = businessProfilesById[request.businessId];
  const bundle = buildEvidenceBundle(profile);
  const deterministicIntent = classifyIntent(request.question);
  const runtime = options.runtime ?? resolveModelRuntime();

  if (runtime.state === "disabled") {
    return fallbackResponse(request, bundle, deterministicIntent, [
      "PROVIDER_DISABLED",
    ]);
  }
  if (runtime.state === "not_configured") {
    return fallbackResponse(request, bundle, deterministicIntent, [
      "PROVIDER_NOT_CONFIGURED",
    ]);
  }

  const timeoutMs = Math.max(1, options.timeoutMs ?? resolveAiTimeoutMs());
  const deadline = Date.now() + timeoutMs;
  const prompt = buildAnalysisPrompt(request, bundle, deterministicIntent);

  let rawOutput: string | undefined;
  try {
    rawOutput = await callWithinDeadline(runtime.provider, prompt, deadline);
  } catch (error) {
    return fallbackResponse(request, bundle, deterministicIntent, [
      providerFailureReason(error),
    ]);
  }

  if (!rawOutput?.trim()) {
    return fallbackResponse(request, bundle, deterministicIntent, [
      "EMPTY_RESPONSE",
    ]);
  }

  const firstAttempt = parseDecision(rawOutput, bundle);
  if (firstAttempt.success) {
    return hydrateAnalysisResponse(
      bundle,
      firstAttempt.decision,
      detectAnswerLanguage(request),
      "model",
      [],
    );
  }

  if (deadline <= Date.now()) {
    return fallbackResponse(request, bundle, deterministicIntent, [
      firstAttempt.reason,
      "REPAIR_FAILED",
      "PROVIDER_TIMEOUT",
    ]);
  }

  const repairPrompt = buildRepairPrompt(
    request,
    bundle,
    deterministicIntent,
    rawOutput,
    firstAttempt.reason,
  );

  let repairedOutput: string | undefined;
  try {
    repairedOutput = await callWithinDeadline(
      runtime.provider,
      repairPrompt,
      deadline,
    );
  } catch (error) {
    return fallbackResponse(request, bundle, deterministicIntent, [
      firstAttempt.reason,
      "REPAIR_FAILED",
      providerFailureReason(error),
    ]);
  }

  if (!repairedOutput?.trim()) {
    return fallbackResponse(request, bundle, deterministicIntent, [
      firstAttempt.reason,
      "REPAIR_FAILED",
      "EMPTY_RESPONSE",
    ]);
  }

  const repairAttempt = parseDecision(repairedOutput, bundle);
  if (!repairAttempt.success) {
    return fallbackResponse(request, bundle, deterministicIntent, [
      firstAttempt.reason,
      repairAttempt.reason,
      "REPAIR_FAILED",
    ]);
  }

  return hydrateAnalysisResponse(
    bundle,
    repairAttempt.decision,
    detectAnswerLanguage(request),
    "model",
    [],
  );
};
