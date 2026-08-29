import type {
  Baseline30Day,
  BusinessProfile,
  CashRunway,
  FinancialSnapshot,
  GrowthMetrics,
  LiquidityMetrics,
  MMK,
  MonthlyFinancialRecord,
} from "@/types";

import {
  average,
  roundMmk,
  roundPercent,
  roundRatio,
  roundRunway,
  sumMmk,
} from "./math";

const sortedHistory = (
  profile: BusinessProfile,
): readonly MonthlyFinancialRecord[] =>
  [...profile.monthlyHistory].sort((left, right) =>
    left.month.localeCompare(right.month),
  );

export const totalRevenue = (record: MonthlyFinancialRecord): MMK =>
  sumMmk(record.revenueByCategory.map(({ amountMmk }) => amountMmk));

export const totalExpenses = (record: MonthlyFinancialRecord): MMK =>
  sumMmk(record.expensesByCategory.map(({ amountMmk }) => amountMmk));

export const operatingProfit = (record: MonthlyFinancialRecord): MMK =>
  totalRevenue(record) - totalExpenses(record);

export const calculateOperatingMarginPercent = (
  record: MonthlyFinancialRecord,
): number | null => {
  const revenueMmk = totalRevenue(record);

  if (revenueMmk === 0) {
    return null;
  }

  return roundPercent((operatingProfit(record) / revenueMmk) * 100);
};

export const calculateGrowthRatePercent = (
  currentValue: number,
  previousValue: number,
): number | null => {
  if (previousValue === 0) {
    return null;
  }

  return roundPercent(((currentValue - previousValue) / previousValue) * 100);
};

export const calculateGrowthMetrics = (
  profile: BusinessProfile,
): GrowthMetrics => {
  const history = sortedHistory(profile);

  if (history.length < 2) {
    return {
      revenueGrowthPercent: null,
      expenseGrowthPercent: null,
    };
  }

  const previous = history.at(-2);
  const latest = history.at(-1);

  if (!previous || !latest) {
    throw new Error("Expected two financial history records.");
  }

  return {
    revenueGrowthPercent: calculateGrowthRatePercent(
      totalRevenue(latest),
      totalRevenue(previous),
    ),
    expenseGrowthPercent: calculateGrowthRatePercent(
      totalExpenses(latest),
      totalExpenses(previous),
    ),
  };
};

/**
 * Uses the latest three monthly records as a simple 30-day run-rate. This is a
 * baseline, not a forecast: seasonality and future contracts are not inferred.
 */
export const calculate30DayBaseline = (
  profile: BusinessProfile,
  trailingMonths = 3,
): Baseline30Day => {
  if (!Number.isInteger(trailingMonths) || trailingMonths < 1) {
    throw new Error("trailingMonths must be a positive integer.");
  }

  const history = sortedHistory(profile);
  const sourceRecords = history.slice(-trailingMonths);

  if (sourceRecords.length === 0) {
    throw new Error(`${profile.businessName} has no monthly history.`);
  }

  const averageRevenueMmk = roundMmk(
    average(sourceRecords.map(totalRevenue)),
  );
  const averageExpensesMmk = roundMmk(
    average(sourceRecords.map(totalExpenses)),
  );
  const averageCashInflowMmk = roundMmk(
    average(sourceRecords.map(({ cashInflowMmk }) => cashInflowMmk)),
  );
  const averageCashOutflowMmk = roundMmk(
    average(sourceRecords.map(({ cashOutflowMmk }) => cashOutflowMmk)),
  );

  return {
    sourceMonths: sourceRecords.map(({ month }) => month),
    averageRevenueMmk,
    averageExpensesMmk,
    operatingProfitMmk: roundMmk(averageRevenueMmk - averageExpensesMmk),
    averageCashInflowMmk,
    averageCashOutflowMmk,
    netCashFlowMmk: roundMmk(
      averageCashInflowMmk - averageCashOutflowMmk,
    ),
  };
};

export const calculateCashRunway = (
  profile: BusinessProfile,
  baseline = calculate30DayBaseline(profile),
): CashRunway => {
  const monthlyBurnMmk = Math.max(-baseline.netCashFlowMmk, 0);

  if (monthlyBurnMmk === 0) {
    return {
      months: null,
      monthlyBurnMmk: 0,
      status: "self-funding",
    };
  }

  const months = roundRunway(profile.currentCashMmk / monthlyBurnMmk);

  return {
    months,
    monthlyBurnMmk,
    status: months <= 3 ? "critical" : months <= 6 ? "watch" : "stable",
  };
};

export const totalReceivables = (profile: BusinessProfile): MMK =>
  sumMmk(
    profile.receivables.map(({ outstandingAmountMmk }) => outstandingAmountMmk),
  );

export const totalPayables = (profile: BusinessProfile): MMK =>
  sumMmk(
    profile.payables.map(({ outstandingAmountMmk }) => outstandingAmountMmk),
  );

export const totalInventory = (profile: BusinessProfile): MMK =>
  sumMmk(profile.inventory.map(({ valueMmk }) => valueMmk));

export const calculateLiquidity = (
  profile: BusinessProfile,
): LiquidityMetrics => {
  const receivablesMmk = totalReceivables(profile);
  const inventoryMmk = totalInventory(profile);
  const payablesMmk = totalPayables(profile);
  const quickAssetsMmk = profile.currentCashMmk + receivablesMmk;
  const currentAssetsMmk = quickAssetsMmk + inventoryMmk;

  return {
    receivablesMmk,
    inventoryMmk,
    payablesMmk,
    quickRatio:
      payablesMmk === 0 ? null : roundRatio(quickAssetsMmk / payablesMmk),
    currentRatio:
      payablesMmk === 0 ? null : roundRatio(currentAssetsMmk / payablesMmk),
    cashCoverageRatio:
      payablesMmk === 0
        ? null
        : roundRatio(profile.currentCashMmk / payablesMmk),
    netWorkingCapitalMmk: roundMmk(currentAssetsMmk - payablesMmk),
  };
};

export const calculateFinancialSnapshot = (
  profile: BusinessProfile,
): FinancialSnapshot => {
  const latest = sortedHistory(profile).at(-1);

  if (!latest) {
    throw new Error(`${profile.businessName} has no monthly history.`);
  }

  const revenueMmk = totalRevenue(latest);
  const expensesMmk = totalExpenses(latest);
  const baseline30Day = calculate30DayBaseline(profile);

  return {
    month: latest.month,
    revenueMmk,
    expensesMmk,
    operatingProfitMmk: revenueMmk - expensesMmk,
    operatingMarginPercent: calculateOperatingMarginPercent(latest),
    growth: calculateGrowthMetrics(profile),
    baseline30Day,
    runway: calculateCashRunway(profile, baseline30Day),
    liquidity: calculateLiquidity(profile),
  };
};
