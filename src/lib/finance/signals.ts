import type {
  BusinessProfile,
  FinancialSignal,
  IsoDate,
  PrioritizedInvoice,
  SignalSeverity,
} from "@/types";

import {
  calculateFinancialSnapshot,
  totalPayables,
} from "./calculations";
import { roundMmk, sumMmk } from "./math";

const MILLISECONDS_PER_DAY = 86_400_000;

const toUtcTimestamp = (date: IsoDate): number =>
  Date.parse(`${date}T00:00:00.000Z`);

const severityRank: Record<SignalSeverity, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const priorityRank: Record<PrioritizedInvoice["priority"], number> = {
  critical: 0,
  high: 1,
  watch: 2,
};

export const prioritizeOverdueInvoices = (
  profile: BusinessProfile,
  asOfDate: IsoDate = profile.asOfDate,
): readonly PrioritizedInvoice[] => {
  const asOfTimestamp = toUtcTimestamp(asOfDate);

  if (Number.isNaN(asOfTimestamp)) {
    throw new Error(`Invalid as-of date: ${asOfDate}`);
  }

  return profile.receivables
    .filter(({ dueOn, outstandingAmountMmk }) => {
      const dueTimestamp = toUtcTimestamp(dueOn);
      return outstandingAmountMmk > 0 && dueTimestamp < asOfTimestamp;
    })
    .map((invoice): PrioritizedInvoice => {
      const daysOverdue = Math.floor(
        (asOfTimestamp - toUtcTimestamp(invoice.dueOn)) /
          MILLISECONDS_PER_DAY,
      );
      const priority =
        daysOverdue >= 30 || invoice.outstandingAmountMmk >= 2_000_000
          ? "critical"
          : daysOverdue >= 14 ||
              invoice.outstandingAmountMmk >= 1_000_000
            ? "high"
            : "watch";
      const priorityReasons = [
        `${daysOverdue} days overdue`,
        ...(invoice.outstandingAmountMmk >= 1_000_000
          ? ["Material cash value"]
          : []),
      ];

      return {
        ...invoice,
        daysOverdue,
        priority,
        priorityReasons,
      };
    })
    .sort(
      (left, right) =>
        priorityRank[left.priority] - priorityRank[right.priority] ||
        right.daysOverdue - left.daysOverdue ||
        right.outstandingAmountMmk - left.outstandingAmountMmk,
    );
};

export const topOverdueCollectionValue = (
  profile: BusinessProfile,
  limit = 3,
): number => {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error("limit must be a positive integer.");
  }

  return roundMmk(
    sumMmk(
      prioritizeOverdueInvoices(profile)
        .slice(0, limit)
        .map(({ outstandingAmountMmk }) => outstandingAmountMmk),
    ),
  );
};

export const generateFinancialSignals = (
  profile: BusinessProfile,
): readonly FinancialSignal[] => {
  const snapshot = calculateFinancialSnapshot(profile);
  const overdueInvoices = prioritizeOverdueInvoices(profile);
  const overdueMmk = sumMmk(
    overdueInvoices.map(({ outstandingAmountMmk }) => outstandingAmountMmk),
  );
  const topCollectionMmk = topOverdueCollectionValue(profile);
  const payablesMmk = totalPayables(profile);
  const signals: FinancialSignal[] = [];

  if (snapshot.runway.months !== null && snapshot.runway.months <= 6) {
    signals.push({
      id: "cash-runway",
      kind: "risk",
      severity: snapshot.runway.months <= 3 ? "high" : "medium",
      title: "Cash runway needs attention",
      explanation: `Recent cash movement implies about ${snapshot.runway.months} months of runway at the current run-rate.`,
      action: "Protect cash and review the timing of discretionary spending.",
    });
  }

  if (payablesMmk > profile.currentCashMmk) {
    signals.push({
      id: "payables-exceed-cash",
      kind: "risk",
      severity: payablesMmk >= profile.currentCashMmk * 2 ? "high" : "medium",
      title: "Supplier obligations exceed cash",
      explanation: `Outstanding payables are MMK ${payablesMmk.toLocaleString("en-US")}, above current cash of MMK ${profile.currentCashMmk.toLocaleString("en-US")}.`,
      action: "Align supplier due dates with confirmed customer collections.",
      amountMmk: payablesMmk - profile.currentCashMmk,
    });
  }

  if (overdueMmk > 0) {
    signals.push({
      id: "overdue-receivables",
      kind: "risk",
      severity:
        overdueMmk >= snapshot.baseline30Day.averageRevenueMmk * 0.2
          ? "high"
          : "medium",
      title: "Overdue invoices are tying up cash",
      explanation: `${overdueInvoices.length} overdue invoice${overdueInvoices.length === 1 ? " is" : "s are"} holding MMK ${overdueMmk.toLocaleString("en-US")}.`,
      action: "Contact the oldest and highest-value customers first.",
      amountMmk: overdueMmk,
    });
    signals.push({
      id: "collection-opportunity",
      kind: "opportunity",
      severity: topCollectionMmk >= profile.currentCashMmk ? "high" : "medium",
      title: "Top invoices can unlock near-term cash",
      explanation: `Collecting the top ${Math.min(3, overdueInvoices.length)} overdue invoices could release about MMK ${topCollectionMmk.toLocaleString("en-US")}.`,
      action: "Assign an owner and follow-up date to each priority invoice.",
      amountMmk: topCollectionMmk,
    });
  }

  const revenueGrowth = snapshot.growth.revenueGrowthPercent;
  if (revenueGrowth !== null && revenueGrowth >= 10) {
    signals.push({
      id: "revenue-momentum",
      kind: "opportunity",
      severity: "high",
      title: "Revenue momentum is strong",
      explanation: `Latest monthly revenue grew ${revenueGrowth}% from the prior month.`,
      action: "Identify which customers and categories drove repeatable growth.",
    });
  }

  const expenseGrowth = snapshot.growth.expenseGrowthPercent;
  if (
    revenueGrowth !== null &&
    expenseGrowth !== null &&
    expenseGrowth - revenueGrowth >= 5
  ) {
    signals.push({
      id: "expense-growth",
      kind: "risk",
      severity: "medium",
      title: "Expenses are outpacing revenue",
      explanation: `Expenses grew ${expenseGrowth}% versus revenue growth of ${revenueGrowth}%.`,
      action: "Review the expense categories with the largest month-on-month rise.",
    });
  }

  if (
    snapshot.operatingMarginPercent !== null &&
    snapshot.operatingMarginPercent >= 15 &&
    snapshot.runway.months === null
  ) {
    signals.push({
      id: "self-funded-growth",
      kind: "opportunity",
      severity: "low",
      title: "Operations can fund measured improvements",
      explanation: `The latest operating margin is ${snapshot.operatingMarginPercent}% and recent operating cash flow is positive.`,
      action: "Test one bounded investment while preserving a cash reserve.",
    });
  }

  return signals.sort(
    (left, right) =>
      (left.kind === right.kind ? 0 : left.kind === "risk" ? -1 : 1) ||
      severityRank[left.severity] - severityRank[right.severity] ||
      left.id.localeCompare(right.id),
  );
};
