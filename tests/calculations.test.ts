import { describe, expect, it } from "vitest";

import {
  businessProfiles,
  distributorProfile,
} from "@/data";
import {
  calculate30DayBaseline,
  calculateFinancialSnapshot,
  calculateHealthScore,
  calculateLiquidity,
  totalExpenses,
  totalReceivables,
  totalRevenue,
} from "@/lib/finance";

describe("profile fixtures", () => {
  it("provides three differentiated SME profiles with complete balances", () => {
    expect(businessProfiles.map(({ id }) => id)).toEqual([
      "tea-shop",
      "clothing-retailer",
      "distributor",
    ]);

    for (const profile of businessProfiles) {
      expect(profile.currency).toBe("MMK");
      expect(profile.monthlyHistory).toHaveLength(6);
      expect(profile.receivables.length).toBeGreaterThan(0);
      expect(profile.payables.length).toBeGreaterThan(0);
      expect(profile.inventory.length).toBeGreaterThan(0);
    }
  });
});

describe("core financial calculations", () => {
  it("calculates the distributor killer-demo month from category totals", () => {
    const latest = distributorProfile.monthlyHistory.at(-1);

    expect(latest).toBeDefined();
    expect(totalRevenue(latest!)).toBe(42_750_000);
    expect(totalExpenses(latest!)).toBe(38_450_000);

    const snapshot = calculateFinancialSnapshot(distributorProfile);

    expect(snapshot.operatingProfitMmk).toBe(4_300_000);
    expect(snapshot.growth.revenueGrowthPercent).toBe(14);
    expect(snapshot.growth.expenseGrowthPercent).toBe(11.8);
  });

  it("uses the trailing three months for the 30-day cash baseline", () => {
    const baseline = calculate30DayBaseline(distributorProfile);

    expect(baseline.sourceMonths).toEqual([
      "2026-05",
      "2026-06",
      "2026-07",
    ]);
    expect(baseline.averageRevenueMmk).toBe(39_250_000);
    expect(baseline.averageCashInflowMmk).toBe(31_230_000);
    expect(baseline.averageCashOutflowMmk).toBe(32_600_000);
    expect(baseline.netCashFlowMmk).toBe(-1_370_000);
  });

  it("separates profitable operations from near-term cash pressure", () => {
    const snapshot = calculateFinancialSnapshot(distributorProfile);

    expect(snapshot.operatingProfitMmk).toBeGreaterThan(0);
    expect(snapshot.runway).toEqual({
      months: 3.1,
      monthlyBurnMmk: 1_370_000,
      status: "watch",
    });
  });

  it("calculates liquidity from explicit balance components", () => {
    expect(totalReceivables(distributorProfile)).toBe(12_000_000);
    expect(calculateLiquidity(distributorProfile)).toEqual({
      receivablesMmk: 12_000_000,
      inventoryMmk: 18_000_000,
      payablesMmk: 9_600_000,
      quickRatio: 1.7,
      currentRatio: 3.6,
      cashCoverageRatio: 0.4,
      netWorkingCapitalMmk: 24_700_000,
    });
  });

  it("returns bounded, reproducible health sub-scores and a total", () => {
    const first = calculateHealthScore(distributorProfile);
    const second = calculateHealthScore(distributorProfile);

    expect(first).toEqual(second);
    expect(first.methodologyVersion).toBe("1.0");
    expect(first.total).toBe(57);
    expect(Object.values(first.subScores)).toSatisfy(
      (scores: number[]) =>
        scores.every((score) => Number.isInteger(score) && score >= 0 && score <= 100),
    );
  });
});
