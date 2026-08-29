import type {
  BusinessProfile,
  FinancialSnapshot,
  HealthScore,
} from "@/types";

import { calculateFinancialSnapshot } from "./calculations";
import { clamp } from "./math";

const scoreRange = (
  value: number,
  minimum: number,
  maximum: number,
): number =>
  Math.round(clamp(((value - minimum) / (maximum - minimum)) * 100, 0, 100));

/**
 * A transparent screening score, not a credit score or accounting opinion.
 *
 * Thresholds are deliberately broad:
 * - profitability: 0% margin = 0, 20% = 100
 * - liquidity: 60% quick-ratio score and 40% cash-coverage score
 * - cash flow: 9 months of runway = 100; positive cash flow = 100
 * - growth: -10% = 0, +15% = 100
 */
export const calculateHealthScore = (
  profile: BusinessProfile,
  snapshot: FinancialSnapshot = calculateFinancialSnapshot(profile),
): HealthScore => {
  const profitability =
    snapshot.operatingMarginPercent === null
      ? 0
      : scoreRange(snapshot.operatingMarginPercent, 0, 20);

  const quickRatioScore =
    snapshot.liquidity.quickRatio === null
      ? 100
      : scoreRange(snapshot.liquidity.quickRatio, 0.5, 1.5);
  const cashCoverageScore =
    snapshot.liquidity.cashCoverageRatio === null
      ? 100
      : scoreRange(snapshot.liquidity.cashCoverageRatio, 0.25, 1);
  const liquidity = Math.round(
    quickRatioScore * 0.6 + cashCoverageScore * 0.4,
  );

  const cashFlow =
    snapshot.runway.months === null
      ? 100
      : scoreRange(snapshot.runway.months, 0, 9);

  const growth =
    snapshot.growth.revenueGrowthPercent === null
      ? 50
      : scoreRange(snapshot.growth.revenueGrowthPercent, -10, 15);

  const total = Math.round(
    profitability * 0.3 +
      liquidity * 0.25 +
      cashFlow * 0.3 +
      growth * 0.15,
  );

  return {
    total,
    subScores: {
      profitability,
      liquidity,
      cashFlow,
      growth,
    },
    methodologyVersion: "1.0",
  };
};
