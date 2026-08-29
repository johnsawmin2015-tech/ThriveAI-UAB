import { z } from "zod";

export const BusinessIdSchema = z.enum([
  "tea-shop",
  "clothing-retailer",
  "distributor",
]);

export const IntentSchema = z.enum([
  "cash_flow",
  "expense_analysis",
  "expansion",
  "inventory",
  "hiring",
  "priority_advice",
]);

export const PreferredLanguageSchema = z.enum(["auto", "en", "my"]);
export const AnswerLanguageSchema = z.enum(["en", "my", "mixed"]);

export const TrustedAnalyzeRequestSchema = z
  .object({
    businessId: BusinessIdSchema,
    question: z.string().trim().min(1).max(2_000),
    preferredLanguage: PreferredLanguageSchema.optional().default("auto"),
  })
  .strict();

export const SignalIdSchema = z.enum([
  "cash-runway",
  "payables-exceed-cash",
  "overdue-receivables",
  "collection-opportunity",
  "revenue-momentum",
  "expense-growth",
  "self-funded-growth",
]);

export const ActionCodeSchema = z.enum([
  "PROTECT_CASH",
  "COLLECT_OVERDUE",
  "ALIGN_PAYABLES",
  "REVIEW_EXPENSES",
  "RUN_EXPANSION_SCENARIO",
  "REVIEW_INVENTORY_MIX",
  "RUN_HIRING_SCENARIO",
  "PRESERVE_RESERVE",
  "MONITOR_GROWTH_DRIVERS",
]);

export const RationaleCodeSchema = z.enum([
  "PROTECT_LIQUIDITY",
  "UNLOCK_WORKING_CAPITAL",
  "CONTROL_COST_GROWTH",
  "VALIDATE_BEFORE_COMMITMENT",
  "MATCH_STOCK_TO_CASH",
  "TEST_AFFORDABILITY",
  "SCALE_REPEATABLE_GROWTH",
  "ADDRESS_HIGHEST_SEVERITY",
]);

export const ModelDecisionSchema = z
  .object({
    intent: IntentSchema,
    selectedFindings: z
      .array(
        z
          .object({
            signalId: SignalIdSchema,
            evidenceFactIds: z.array(z.string().min(1).max(100)).min(1).max(6),
          })
          .strict(),
      )
      .max(4),
    nextActions: z
      .array(
        z
          .object({
            rank: z.number().int().min(1).max(3),
            actionCode: ActionCodeSchema,
            rationaleCode: RationaleCodeSchema,
            supportingSignalIds: z.array(SignalIdSchema).max(3),
            evidenceFactIds: z.array(z.string().min(1).max(100)).min(1).max(6),
          })
          .strict(),
      )
      .min(1)
      .max(3),
  })
  .strict();

export const DegradationReasonSchema = z.enum([
  "PROVIDER_DISABLED",
  "PROVIDER_NOT_CONFIGURED",
  "PROVIDER_TIMEOUT",
  "PROVIDER_ERROR",
  "EMPTY_RESPONSE",
  "MALFORMED_RESPONSE",
  "SCHEMA_INVALID",
  "SEMANTIC_INVALID",
  "REPAIR_FAILED",
]);

export const EvidenceSchema = z
  .object({
    factId: z.string(),
    labelMm: z.string(),
    labelEn: z.string(),
    displayValue: z.string(),
    unit: z.enum(["MMK", "percent", "ratio", "months", "count", "score"]),
  })
  .strict();

export const FindingSchema = z
  .object({
    signalId: SignalIdSchema,
    kind: z.enum(["risk", "opportunity"]),
    severity: z.enum(["high", "medium", "low"]),
    titleMm: z.string(),
    titleEn: z.string(),
    explanationMm: z.string(),
    explanationEn: z.string(),
    evidence: z.array(EvidenceSchema).min(1),
  })
  .strict();

export const NextBestActionSchema = z
  .object({
    rank: z.number().int().min(1).max(3),
    actionCode: ActionCodeSchema,
    titleMm: z.string(),
    titleEn: z.string(),
    rationaleCode: RationaleCodeSchema,
    rationaleMm: z.string(),
    rationaleEn: z.string(),
    evidence: z.array(EvidenceSchema).min(1),
    requiresHumanApproval: z.boolean(),
  })
  .strict();

export const LimitationSchema = z
  .object({
    code: z.enum([
      "ADVISORY_ONLY",
      "MODEL_FALLBACK",
      "INVENTORY_VELOCITY_UNAVAILABLE",
      "SCENARIO_INPUTS_REQUIRED",
    ]),
    messageMm: z.string(),
    messageEn: z.string(),
  })
  .strict();

export const AnalysisResponseSchema = z
  .object({
    status: z.enum(["ok", "degraded", "insufficient_data"]),
    mode: z.enum(["model", "deterministic_fallback"]),
    intent: IntentSchema,
    answerLanguage: AnswerLanguageSchema,
    businessHealth: z
      .object({
        score: z.number().int().min(0).max(100),
        band: z.enum(["strong", "stable", "watch", "critical"]),
        methodologyVersion: z.literal("1.0"),
      })
      .strict(),
    riskLevel: z.enum(["high", "medium", "low"]),
    summaryMm: z.string(),
    summaryEn: z.string(),
    findings: z.array(FindingSchema).max(4),
    nextBestActions: z.array(NextBestActionSchema).min(1).max(3),
    limitations: z.array(LimitationSchema),
    degradationReasons: z.array(DegradationReasonSchema),
    advisory: z
      .object({
        advisoryOnly: z.literal(true),
        figuresSource: z.literal("deterministic_finance_engine"),
        businessId: BusinessIdSchema,
        asOfDate: z.string(),
        currency: z.literal("MMK"),
        modelUsed: z.boolean(),
      })
      .strict(),
  })
  .strict();

export type ActionCode = z.infer<typeof ActionCodeSchema>;
export type AnalysisResponse = z.infer<typeof AnalysisResponseSchema>;
export type AnswerLanguage = z.infer<typeof AnswerLanguageSchema>;
export type BusinessId = z.infer<typeof BusinessIdSchema>;
export type DegradationReason = z.infer<typeof DegradationReasonSchema>;
export type Intent = z.infer<typeof IntentSchema>;
export type ModelDecision = z.infer<typeof ModelDecisionSchema>;
export type RationaleCode = z.infer<typeof RationaleCodeSchema>;
export type SignalId = z.infer<typeof SignalIdSchema>;
export type TrustedAnalyzeRequest = z.infer<typeof TrustedAnalyzeRequestSchema>;

export const MODEL_DECISION_JSON_SCHEMA = z.toJSONSchema(ModelDecisionSchema);
