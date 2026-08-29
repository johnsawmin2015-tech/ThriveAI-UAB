import {
  ACTION_CATALOG,
  INTENT_ACTIONS,
  INTENT_SIGNAL_IDS,
  SIGNAL_ACTION,
} from "./catalog";
import type { ActionCode, Intent, ModelDecision } from "./schemas";
import {
  evidenceForSuffixes,
  type EvidenceBundle,
  type EvidenceSignal,
} from "./snapshot";

const severityRank: Record<EvidenceSignal["severity"], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const signalsForIntent = (
  intent: Intent,
  bundle: EvidenceBundle,
): readonly EvidenceSignal[] => {
  const allowed = new Set(INTENT_SIGNAL_IDS[intent]);
  return bundle.signals
    .filter(({ id }) => allowed.has(id))
    .sort(
      (left, right) =>
        (left.kind === right.kind ? 0 : left.kind === "risk" ? -1 : 1) ||
        severityRank[left.severity] - severityRank[right.severity],
    );
};

const fallbackActionCodes = (
  intent: Intent,
  signals: readonly EvidenceSignal[],
): readonly ActionCode[] => {
  if (intent !== "cash_flow" && intent !== "priority_advice") {
    return INTENT_ACTIONS[intent];
  }

  const selected: ActionCode[] = [];
  for (const signal of signals) {
    const actionCode = SIGNAL_ACTION[signal.id];
    if (!selected.includes(actionCode)) {
      selected.push(actionCode);
    }
  }

  if (!selected.includes("PROTECT_CASH")) {
    selected.push("PROTECT_CASH");
  }

  return selected;
};

export const buildFallbackDecision = (
  intent: Intent,
  bundle: EvidenceBundle,
): ModelDecision => {
  const relevantSignals = signalsForIntent(intent, bundle);
  const selectedFindings = relevantSignals.slice(0, 4).map((signal) => ({
    signalId: signal.id,
    evidenceFactIds: [...signal.evidenceFactIds].slice(0, 6),
  }));

  const nextActions = fallbackActionCodes(intent, relevantSignals)
    .slice(0, 3)
    .map((actionCode, index) => {
      const catalog = ACTION_CATALOG[actionCode];
      const directlySupporting = relevantSignals
        .filter((signal) => SIGNAL_ACTION[signal.id] === actionCode)
        .map(({ id }) => id);
      const supportingSignalIds =
        directlySupporting.length > 0
          ? directlySupporting
          : relevantSignals.slice(0, 2).map(({ id }) => id);
      const evidenceFactIds = evidenceForSuffixes(
        bundle,
        catalog.evidenceSuffixes,
      )
        .map(({ id }) => id)
        .slice(0, 6);

      return {
        rank: index + 1,
        actionCode,
        rationaleCode: catalog.rationaleCode,
        supportingSignalIds,
        evidenceFactIds,
      };
    });

  return {
    intent,
    selectedFindings,
    nextActions,
  };
};
