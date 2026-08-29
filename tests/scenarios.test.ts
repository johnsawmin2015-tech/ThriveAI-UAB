import { describe, expect, it } from "vitest";

import { distributorProfile } from "@/data";
import {
  createScenario,
  SCENARIO_PRESETS,
  simulateScenario,
} from "@/lib/finance";
import type { ScenarioKind } from "@/types";

describe("scenario simulation", () => {
  it("supports every required scenario kind", () => {
    const requiredKinds: ScenarioKind[] = [
      "hire",
      "inventory",
      "branch",
      "equipment",
      "marketing",
      "custom-expense",
    ];

    expect(Object.keys(SCENARIO_PRESETS)).toEqual(requiredKinds);

    for (const kind of requiredKinds) {
      const result = simulateScenario(
        distributorProfile,
        createScenario(kind),
      );

      expect(result.scenario.kind).toBe(kind);
      expect(result.projection).toHaveLength(12);
      expect(result.caveats.length).toBeGreaterThan(0);
    }
  });

  it("shows that branch expansion worsens distributor runway", () => {
    const result = simulateScenario(
      distributorProfile,
      createScenario("branch"),
    );

    expect(result.baselineRunwayMonths).toBe(3.1);
    expect(result.scenarioRunwayMonths).toBe(0.3);
    expect(result.runwayDirection).toBe("worsens");
    expect(result.runwayChangeMonths).toBe(-2.8);
    expect(result.endingCashImpactMmk).toBeLessThan(0);
  });

  it("accepts an explicit custom recurring expense", () => {
    const customExpense = createScenario("custom-expense", {
      name: "Additional warehouse security",
      upfrontCostMmk: 0,
      monthlyExpenseChangeMmk: 600_000,
      horizonMonths: 6,
    });
    const result = simulateScenario(distributorProfile, customExpense);

    expect(result.projection).toHaveLength(6);
    expect(result.endingCashImpactMmk).toBe(-3_600_000);
    expect(result.runwayDirection).toBe("worsens");
  });

  it("rejects non-finite or invalid scenario assumptions", () => {
    expect(() =>
      createScenario("marketing", { upfrontCostMmk: Number.NaN }),
    ).toThrow("upfrontCostMmk must be a finite number");
    expect(() =>
      createScenario("hire", { horizonMonths: 0 }),
    ).toThrow("horizonMonths must be a positive integer");
  });
});
