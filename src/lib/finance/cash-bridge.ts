import type {
  CashBridgeInput,
  CashBridgeResult,
  MMK,
} from "@/types";

import { roundMmk } from "./math";

const INPUT_FIELDS = [
  "currentCashMmk",
  "expectedCollectionsMmk",
  "decisionOutlayMmk",
  "minimumReserveMmk",
] as const satisfies readonly (keyof CashBridgeInput)[];

const validateInput = (name: keyof CashBridgeInput, value: MMK): void => {
  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be a finite number.`);
  }

  if (value < 0) {
    throw new Error(`${name} cannot be negative.`);
  }
};

/**
 * Reconciles a proposed cash decision against expected collections and a
 * minimum reserve. This is a pure bridge: it neither mutates a profile nor
 * assumes that expected collections are guaranteed.
 */
export const calculateCashBridge = (
  input: CashBridgeInput,
): CashBridgeResult => {
  for (const name of INPUT_FIELDS) {
    validateInput(name, input[name]);
  }

  const {
    currentCashMmk,
    expectedCollectionsMmk,
    decisionOutlayMmk,
    minimumReserveMmk,
  } = input;
  const rawEndingCashMmk =
    currentCashMmk + expectedCollectionsMmk - decisionOutlayMmk;

  return {
    endingCashMmk: roundMmk(rawEndingCashMmk),
    requiredCollectionsMmk: roundMmk(
      Math.max(
        0,
        decisionOutlayMmk + minimumReserveMmk - currentCashMmk,
      ),
    ),
    reserveGapMmk: roundMmk(
      Math.max(0, minimumReserveMmk - rawEndingCashMmk),
    ),
    surplusAboveReserveMmk: roundMmk(
      Math.max(0, rawEndingCashMmk - minimumReserveMmk),
    ),
    reserveProtected: rawEndingCashMmk >= minimumReserveMmk,
  };
};
