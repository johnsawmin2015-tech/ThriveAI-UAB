import type {
  BusinessProfile,
  MonthKey,
  RunwayDirection,
  ScenarioInput,
  ScenarioKind,
  ScenarioMonth,
  ScenarioResult,
} from "@/types";

import { calculateFinancialSnapshot } from "./calculations";
import { clamp, roundMmk, roundRatio, roundRunway } from "./math";

type ScenarioOverrides = Partial<Omit<ScenarioInput, "kind">>;

export const SCENARIO_PRESETS: Readonly<Record<ScenarioKind, ScenarioInput>> = {
  hire: {
    kind: "hire",
    name: "Hire an operations employee",
    upfrontCostMmk: 300_000,
    monthlyRevenueChangeMmk: 1_500_000,
    monthlyExpenseChangeMmk: 900_000,
    revenueChangeStartMonth: 3,
    expenseChangeStartMonth: 1,
    horizonMonths: 12,
  },
  inventory: {
    kind: "inventory",
    name: "Buy additional inventory",
    upfrontCostMmk: 4_000_000,
    monthlyRevenueChangeMmk: 2_500_000,
    monthlyExpenseChangeMmk: 0,
    revenueChangeStartMonth: 2,
    expenseChangeStartMonth: 1,
    horizonMonths: 12,
  },
  branch: {
    kind: "branch",
    name: "Open another branch",
    upfrontCostMmk: 3_000_000,
    monthlyRevenueChangeMmk: 4_000_000,
    monthlyExpenseChangeMmk: 3_000_000,
    revenueChangeStartMonth: 3,
    expenseChangeStartMonth: 1,
    horizonMonths: 12,
  },
  equipment: {
    kind: "equipment",
    name: "Purchase efficiency equipment",
    upfrontCostMmk: 5_000_000,
    monthlyRevenueChangeMmk: 0,
    monthlyExpenseChangeMmk: -700_000,
    revenueChangeStartMonth: 1,
    expenseChangeStartMonth: 2,
    horizonMonths: 12,
  },
  marketing: {
    kind: "marketing",
    name: "Run a marketing campaign",
    upfrontCostMmk: 500_000,
    monthlyRevenueChangeMmk: 2_000_000,
    monthlyExpenseChangeMmk: 800_000,
    revenueChangeStartMonth: 2,
    expenseChangeStartMonth: 1,
    horizonMonths: 12,
  },
  "custom-expense": {
    kind: "custom-expense",
    name: "Add a custom expense",
    upfrontCostMmk: 1_000_000,
    monthlyRevenueChangeMmk: 0,
    monthlyExpenseChangeMmk: 0,
    revenueChangeStartMonth: 1,
    expenseChangeStartMonth: 1,
    horizonMonths: 12,
  },
};

const assertFinite = (name: string, value: number): void => {
  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be a finite number.`);
  }
};

const validateScenario = (scenario: ScenarioInput): ScenarioInput => {
  assertFinite("upfrontCostMmk", scenario.upfrontCostMmk);
  assertFinite(
    "monthlyRevenueChangeMmk",
    scenario.monthlyRevenueChangeMmk,
  );
  assertFinite(
    "monthlyExpenseChangeMmk",
    scenario.monthlyExpenseChangeMmk,
  );

  if (scenario.name.trim().length === 0) {
    throw new Error("Scenario name cannot be empty.");
  }

  if (scenario.upfrontCostMmk < 0) {
    throw new Error("upfrontCostMmk cannot be negative.");
  }

  for (const [name, value] of [
    ["revenueChangeStartMonth", scenario.revenueChangeStartMonth],
    ["expenseChangeStartMonth", scenario.expenseChangeStartMonth],
    ["horizonMonths", scenario.horizonMonths],
  ] as const) {
    if (!Number.isInteger(value) || value < 1) {
      throw new Error(`${name} must be a positive integer.`);
    }
  }

  if (scenario.horizonMonths > 60) {
    throw new Error("horizonMonths cannot exceed 60.");
  }

  return scenario;
};

export const createScenario = (
  kind: ScenarioKind,
  overrides: ScenarioOverrides = {},
): ScenarioInput =>
  validateScenario({
    ...SCENARIO_PRESETS[kind],
    ...overrides,
    kind,
  });

const addMonths = (month: MonthKey, monthsToAdd: number): MonthKey => {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + monthsToAdd, 1));
  const resultYear = date.getUTCFullYear();
  const resultMonth = String(date.getUTCMonth() + 1).padStart(2, "0");

  return `${resultYear}-${resultMonth}` as MonthKey;
};

const monthlyScenarioCashChange = (
  baselineNetCashFlowMmk: number,
  scenario: ScenarioInput,
  monthNumber: number,
  cashRealizationRate: number,
): number => {
  const revenueChange =
    monthNumber >= scenario.revenueChangeStartMonth
      ? scenario.monthlyRevenueChangeMmk * cashRealizationRate
      : 0;
  const expenseChange =
    monthNumber >= scenario.expenseChangeStartMonth
      ? scenario.monthlyExpenseChangeMmk
      : 0;

  return baselineNetCashFlowMmk + revenueChange - expenseChange;
};

const estimateScenarioRunway = (
  startingCashMmk: number,
  baselineNetCashFlowMmk: number,
  scenario: ScenarioInput,
  cashRealizationRate: number,
): number | null => {
  let cashMmk = startingCashMmk - scenario.upfrontCostMmk;

  if (cashMmk <= 0) {
    return 0;
  }

  for (let monthNumber = 1; monthNumber <= 600; monthNumber += 1) {
    const monthlyChangeMmk = monthlyScenarioCashChange(
      baselineNetCashFlowMmk,
      scenario,
      monthNumber,
      cashRealizationRate,
    );

    if (monthlyChangeMmk < 0 && cashMmk + monthlyChangeMmk <= 0) {
      return roundRunway(
        monthNumber - 1 + cashMmk / Math.abs(monthlyChangeMmk),
      );
    }

    cashMmk += monthlyChangeMmk;
  }

  return null;
};

const compareRunways = (
  baselineRunwayMonths: number | null,
  scenarioRunwayMonths: number | null,
): RunwayDirection => {
  if (baselineRunwayMonths === null && scenarioRunwayMonths !== null) {
    return "worsens";
  }

  if (baselineRunwayMonths !== null && scenarioRunwayMonths === null) {
    return "improves";
  }

  if (baselineRunwayMonths === null || scenarioRunwayMonths === null) {
    return "unchanged";
  }

  if (scenarioRunwayMonths > baselineRunwayMonths) {
    return "improves";
  }

  if (scenarioRunwayMonths < baselineRunwayMonths) {
    return "worsens";
  }

  return "unchanged";
};

/**
 * Straight-line scenario comparison. Revenue changes are converted to cash at
 * the profile's recent collection rate; no compounding or probabilistic claims
 * are introduced.
 */
export const simulateScenario = (
  profile: BusinessProfile,
  input: ScenarioInput,
): ScenarioResult => {
  const scenario = validateScenario(input);
  const snapshot = calculateFinancialSnapshot(profile);
  const baseline = snapshot.baseline30Day;
  const rawRealizationRate =
    baseline.averageRevenueMmk === 0
      ? 0
      : baseline.averageCashInflowMmk / baseline.averageRevenueMmk;
  const cashRealizationRate = roundRatio(clamp(rawRealizationRate, 0, 1));
  const latestMonth = snapshot.month;
  let baselineCashMmk = profile.currentCashMmk;
  let scenarioCashMmk = profile.currentCashMmk - scenario.upfrontCostMmk;
  const projection: ScenarioMonth[] = [];

  for (
    let monthNumber = 1;
    monthNumber <= scenario.horizonMonths;
    monthNumber += 1
  ) {
    baselineCashMmk += baseline.netCashFlowMmk;
    scenarioCashMmk += monthlyScenarioCashChange(
      baseline.netCashFlowMmk,
      scenario,
      monthNumber,
      cashRealizationRate,
    );
    projection.push({
      month: addMonths(latestMonth, monthNumber),
      baselineEndingCashMmk: roundMmk(baselineCashMmk),
      scenarioEndingCashMmk: roundMmk(scenarioCashMmk),
    });
  }

  const baselineRunwayMonths = snapshot.runway.months;
  const scenarioRunwayMonths = estimateScenarioRunway(
    profile.currentCashMmk,
    baseline.netCashFlowMmk,
    scenario,
    cashRealizationRate,
  );
  const baselineEndingCashMmk = roundMmk(baselineCashMmk);
  const scenarioEndingCashMmk = roundMmk(scenarioCashMmk);

  return {
    scenario,
    cashRealizationRate,
    baselineRunwayMonths,
    scenarioRunwayMonths,
    runwayChangeMonths:
      baselineRunwayMonths === null || scenarioRunwayMonths === null
        ? null
        : roundRunway(scenarioRunwayMonths - baselineRunwayMonths),
    runwayDirection: compareRunways(
      baselineRunwayMonths,
      scenarioRunwayMonths,
    ),
    baselineEndingCashMmk,
    scenarioEndingCashMmk,
    endingCashImpactMmk: roundMmk(
      scenarioEndingCashMmk - baselineEndingCashMmk,
    ),
    projection,
    caveats: [
      "Uses a straight-line trailing three-month baseline.",
      "Revenue changes become cash at the recent collection rate.",
      "Does not infer tax, financing, seasonality, inflation, or uncertainty.",
      "Preset assumptions are editable examples, not recommendations.",
    ],
  };
};
