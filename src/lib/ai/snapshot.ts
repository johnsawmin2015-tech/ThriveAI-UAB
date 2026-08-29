import type { BusinessProfile, FinancialSignal } from "@/types";
import {
  calculateFinancialSnapshot,
  calculateHealthScore,
  generateFinancialSignals,
  prioritizeOverdueInvoices,
  topOverdueCollectionValue,
} from "@/lib/finance";

import { SignalIdSchema, type BusinessId, type SignalId } from "./schemas";

export type EvidenceUnit =
  | "MMK"
  | "percent"
  | "ratio"
  | "months"
  | "count"
  | "score";

export interface EvidenceFact {
  readonly id: string;
  readonly suffix: string;
  readonly labelMm: string;
  readonly labelEn: string;
  readonly value: number;
  readonly displayValue: string;
  readonly unit: EvidenceUnit;
}

export interface EvidenceSignal {
  readonly id: SignalId;
  readonly kind: "risk" | "opportunity";
  readonly severity: "high" | "medium" | "low";
  readonly evidenceFactIds: readonly string[];
}

export interface EvidenceBundle {
  readonly businessId: BusinessId;
  readonly businessName: string;
  readonly asOfDate: string;
  readonly currency: "MMK";
  readonly businessHealth: {
    readonly score: number;
    readonly band: "strong" | "stable" | "watch" | "critical";
    readonly methodologyVersion: "1.0";
  };
  readonly riskLevel: "high" | "medium" | "low";
  readonly facts: readonly EvidenceFact[];
  readonly signals: readonly EvidenceSignal[];
}

const formatMmk = (value: number): string =>
  `MMK ${value.toLocaleString("en-US")}`;

const formatValue = (value: number, unit: EvidenceUnit): string => {
  switch (unit) {
    case "MMK":
      return formatMmk(value);
    case "percent":
      return `${value}%`;
    case "ratio":
      return `${value}x`;
    case "months":
      return `${value} months`;
    case "count":
      return value.toLocaleString("en-US");
    case "score":
      return `${value}/100`;
  }
};

const healthBand = (
  score: number,
): EvidenceBundle["businessHealth"]["band"] =>
  score >= 75
    ? "strong"
    : score >= 60
      ? "stable"
      : score >= 40
        ? "watch"
        : "critical";

const signalEvidenceSuffixes: Record<SignalId, readonly string[]> = {
  "cash-runway": [
    "cash.current",
    "cash.net-flow",
    "cash.monthly-burn",
    "cash.runway-months",
  ],
  "payables-exceed-cash": [
    "cash.current",
    "liquidity.payables",
    "liquidity.cash-coverage",
  ],
  "overdue-receivables": [
    "receivables.overdue-count",
    "receivables.overdue-value",
  ],
  "collection-opportunity": [
    "receivables.overdue-count",
    "receivables.top-collection",
  ],
  "revenue-momentum": [
    "revenue.latest",
    "growth.revenue",
    "profit.operating",
  ],
  "expense-growth": [
    "expenses.latest",
    "growth.expense",
    "growth.revenue",
    "profit.operating",
  ],
  "self-funded-growth": [
    "profit.margin",
    "cash.net-flow",
    "health.total",
  ],
};

const riskLevelFromSignals = (
  signals: readonly EvidenceSignal[],
): EvidenceBundle["riskLevel"] => {
  const risks = signals.filter(({ kind }) => kind === "risk");

  if (risks.some(({ severity }) => severity === "high")) {
    return "high";
  }
  if (risks.some(({ severity }) => severity === "medium")) {
    return "medium";
  }
  return "low";
};

export const buildEvidenceBundle = (
  profile: BusinessProfile,
): EvidenceBundle => {
  const snapshot = calculateFinancialSnapshot(profile);
  const health = calculateHealthScore(profile, snapshot);
  const overdueInvoices = prioritizeOverdueInvoices(profile);
  const overdueValueMmk = overdueInvoices.reduce(
    (total, invoice) => total + invoice.outstandingAmountMmk,
    0,
  );
  const topCollectionMmk = topOverdueCollectionValue(profile);
  const facts: EvidenceFact[] = [];

  const addFact = (
    suffix: string,
    labelEn: string,
    labelMm: string,
    value: number | null,
    unit: EvidenceUnit,
  ): void => {
    if (value === null || !Number.isFinite(value)) {
      return;
    }

    facts.push({
      id: `${profile.id}.${suffix}`,
      suffix,
      labelMm,
      labelEn,
      value,
      displayValue: formatValue(value, unit),
      unit,
    });
  };

  addFact(
    "cash.current",
    "Current cash",
    "လက်ရှိငွေသား",
    profile.currentCashMmk,
    "MMK",
  );
  addFact(
    "revenue.latest",
    "Latest monthly revenue",
    "နောက်ဆုံးလ ဝင်ငွေ",
    snapshot.revenueMmk,
    "MMK",
  );
  addFact(
    "expenses.latest",
    "Latest monthly expenses",
    "နောက်ဆုံးလ အသုံးစရိတ်",
    snapshot.expensesMmk,
    "MMK",
  );
  addFact(
    "profit.operating",
    "Latest operating profit",
    "နောက်ဆုံးလ လုပ်ငန်းအမြတ်",
    snapshot.operatingProfitMmk,
    "MMK",
  );
  addFact(
    "profit.margin",
    "Operating margin",
    "လုပ်ငန်းအမြတ်ရာခိုင်နှုန်း",
    snapshot.operatingMarginPercent,
    "percent",
  );
  addFact(
    "growth.revenue",
    "Revenue growth",
    "ဝင်ငွေတိုးနှုန်း",
    snapshot.growth.revenueGrowthPercent,
    "percent",
  );
  addFact(
    "growth.expense",
    "Expense growth",
    "အသုံးစရိတ်တိုးနှုန်း",
    snapshot.growth.expenseGrowthPercent,
    "percent",
  );
  addFact(
    "baseline.revenue",
    "Average monthly revenue",
    "ပျမ်းမျှလစဉ်ဝင်ငွေ",
    snapshot.baseline30Day.averageRevenueMmk,
    "MMK",
  );
  addFact(
    "baseline.expenses",
    "Average monthly expenses",
    "ပျမ်းမျှလစဉ်အသုံးစရိတ်",
    snapshot.baseline30Day.averageExpensesMmk,
    "MMK",
  );
  addFact(
    "cash.net-flow",
    "Average monthly net cash flow",
    "ပျမ်းမျှလစဉ် အသားတင်ငွေစီးဆင်းမှု",
    snapshot.baseline30Day.netCashFlowMmk,
    "MMK",
  );
  addFact(
    "cash.monthly-burn",
    "Monthly cash burn",
    "လစဉ်ငွေသားလျော့ကျမှု",
    snapshot.runway.monthlyBurnMmk,
    "MMK",
  );
  addFact(
    "cash.runway-months",
    "Cash runway",
    "ငွေသားလည်ပတ်နိုင်ချိန်",
    snapshot.runway.months,
    "months",
  );
  addFact(
    "liquidity.receivables",
    "Total receivables",
    "စုစုပေါင်းရရန်ရှိငွေ",
    snapshot.liquidity.receivablesMmk,
    "MMK",
  );
  addFact(
    "inventory.total",
    "Inventory value",
    "ကုန်ပစ္စည်းလက်ကျန်တန်ဖိုး",
    snapshot.liquidity.inventoryMmk,
    "MMK",
  );
  addFact(
    "liquidity.payables",
    "Total payables",
    "စုစုပေါင်းပေးရန်ရှိငွေ",
    snapshot.liquidity.payablesMmk,
    "MMK",
  );
  addFact(
    "liquidity.quick-ratio",
    "Quick ratio",
    "အမြန်ငွေဖြစ်လွယ်မှုအချိုး",
    snapshot.liquidity.quickRatio,
    "ratio",
  );
  addFact(
    "liquidity.current-ratio",
    "Current ratio",
    "လက်ရှိငွေဖြစ်လွယ်မှုအချိုး",
    snapshot.liquidity.currentRatio,
    "ratio",
  );
  addFact(
    "liquidity.cash-coverage",
    "Cash coverage ratio",
    "ငွေသားလွှမ်းခြုံမှုအချိုး",
    snapshot.liquidity.cashCoverageRatio,
    "ratio",
  );
  addFact(
    "liquidity.working-capital",
    "Net working capital",
    "အသားတင်လုပ်ငန်းလည်ပတ်ငွေ",
    snapshot.liquidity.netWorkingCapitalMmk,
    "MMK",
  );
  addFact(
    "receivables.overdue-count",
    "Overdue invoice count",
    "ရက်ကျော်ငွေတောင်းခံလွှာအရေအတွက်",
    overdueInvoices.length,
    "count",
  );
  addFact(
    "receivables.overdue-value",
    "Overdue receivables value",
    "ရက်ကျော်ရရန်ရှိငွေတန်ဖိုး",
    overdueValueMmk,
    "MMK",
  );
  addFact(
    "receivables.top-collection",
    "Top overdue collection opportunity",
    "ဦးစားပေးရက်ကျော်ငွေ ကောက်ခံနိုင်သည့်တန်ဖိုး",
    topCollectionMmk,
    "MMK",
  );
  addFact(
    "health.total",
    "Business health score",
    "လုပ်ငန်းကျန်းမာရေးရမှတ်",
    health.total,
    "score",
  );

  const factIdsBySuffix = new Map(facts.map((fact) => [fact.suffix, fact.id]));
  const deterministicSignals = generateFinancialSignals(profile)
    .map((signal: FinancialSignal): EvidenceSignal | null => {
      const parsedId = SignalIdSchema.safeParse(signal.id);
      if (!parsedId.success) {
        return null;
      }

      return {
        id: parsedId.data,
        kind: signal.kind,
        severity: signal.severity,
        evidenceFactIds: signalEvidenceSuffixes[parsedId.data]
          .map((suffix) => factIdsBySuffix.get(suffix))
          .filter((id): id is string => id !== undefined),
      };
    })
    .filter((signal): signal is EvidenceSignal => signal !== null);

  return {
    businessId: profile.id,
    businessName: profile.businessName,
    asOfDate: profile.asOfDate,
    currency: profile.currency,
    businessHealth: {
      score: health.total,
      band: healthBand(health.total),
      methodologyVersion: health.methodologyVersion,
    },
    riskLevel: riskLevelFromSignals(deterministicSignals),
    facts,
    signals: deterministicSignals,
  };
};

export const evidenceForSuffixes = (
  bundle: EvidenceBundle,
  suffixes: readonly string[],
): readonly EvidenceFact[] => {
  const requested = new Set(suffixes);
  return bundle.facts.filter(({ suffix }) => requested.has(suffix));
};
