import type { MMK } from "@/types";

export const MONEY_ROUNDING_UNIT_MMK = 10_000;

export const sumMmk = (values: readonly MMK[]): MMK =>
  values.reduce((total, value) => total + value, 0);

export const average = (values: readonly number[]): number => {
  if (values.length === 0) {
    throw new Error("Cannot calculate an average without values.");
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
};

export const roundMmk = (value: number): MMK =>
  Math.round(value / MONEY_ROUNDING_UNIT_MMK) * MONEY_ROUNDING_UNIT_MMK;

export const roundPercent = (value: number): number =>
  Math.round(value * 10) / 10;

export const roundRatio = (value: number): number =>
  Math.round(value * 10) / 10;

export const roundRunway = (value: number): number =>
  Math.round(value * 10) / 10;

export const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(Math.max(value, minimum), maximum);
