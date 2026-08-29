import { describe, expect, it } from "vitest";

import { calculateCashBridge } from "@/lib/finance";
import type { CashBridgeInput } from "@/types";

const distributorBranchDecision: CashBridgeInput = {
  currentCashMmk: 4_300_000,
  expectedCollectionsMmk: 4_800_000,
  decisionOutlayMmk: 3_000_000,
  minimumReserveMmk: 2_500_000,
};

describe("cash bridge", () => {
  it("audits a distributor branch outlay with top-invoice collections", () => {
    expect(calculateCashBridge(distributorBranchDecision)).toEqual({
      endingCashMmk: 6_100_000,
      requiredCollectionsMmk: 1_200_000,
      reserveGapMmk: 0,
      surplusAboveReserveMmk: 3_600_000,
      reserveProtected: true,
    });
  });

  it("shows the reserve gap when no invoices are collected", () => {
    expect(
      calculateCashBridge({
        ...distributorBranchDecision,
        expectedCollectionsMmk: 0,
      }),
    ).toEqual({
      endingCashMmk: 1_300_000,
      requiredCollectionsMmk: 1_200_000,
      reserveGapMmk: 1_200_000,
      surplusAboveReserveMmk: 0,
      reserveProtected: false,
    });
  });

  it("does not mutate its input", () => {
    const input = Object.freeze({ ...distributorBranchDecision });
    const before = { ...input };

    calculateCashBridge(input);

    expect(input).toEqual(before);
  });

  it.each([
    "currentCashMmk",
    "expectedCollectionsMmk",
    "decisionOutlayMmk",
    "minimumReserveMmk",
  ] as const)("rejects non-finite %s", (field) => {
    expect(() =>
      calculateCashBridge({
        ...distributorBranchDecision,
        [field]: Number.NaN,
      }),
    ).toThrow(`${field} must be a finite number`);
  });

  it.each([
    "currentCashMmk",
    "expectedCollectionsMmk",
    "decisionOutlayMmk",
    "minimumReserveMmk",
  ] as const)("rejects negative %s", (field) => {
    expect(() =>
      calculateCashBridge({
        ...distributorBranchDecision,
        [field]: -1,
      }),
    ).toThrow(`${field} cannot be negative`);
  });
});
