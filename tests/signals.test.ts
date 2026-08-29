import { describe, expect, it } from "vitest";

import { distributorProfile } from "@/data";
import {
  generateFinancialSignals,
  prioritizeOverdueInvoices,
  topOverdueCollectionValue,
} from "@/lib/finance";

describe("invoice prioritization and signals", () => {
  it("prioritizes only overdue invoices by explicit age and value bands", () => {
    const prioritized = prioritizeOverdueInvoices(distributorProfile);

    expect(prioritized.map(({ id }) => id)).toEqual([
      "AMD-104",
      "AMD-111",
      "AMD-118",
    ]);
    expect(prioritized.map(({ daysOverdue }) => daysOverdue)).toEqual([
      51, 36, 21,
    ]);
    expect(prioritized.map(({ priority }) => priority)).toEqual([
      "critical",
      "critical",
      "high",
    ]);
  });

  it("shows that the top distributor invoices can release MMK 4.8M", () => {
    expect(topOverdueCollectionValue(distributorProfile)).toBe(4_800_000);
  });

  it("emits both cash risks and growth or collection opportunities", () => {
    const signals = generateFinancialSignals(distributorProfile);
    const byId = Object.fromEntries(signals.map((signal) => [signal.id, signal]));

    expect(byId["cash-runway"]?.kind).toBe("risk");
    expect(byId["payables-exceed-cash"]?.severity).toBe("high");
    expect(byId["overdue-receivables"]?.amountMmk).toBe(4_800_000);
    expect(byId["collection-opportunity"]).toMatchObject({
      kind: "opportunity",
      amountMmk: 4_800_000,
    });
    expect(byId["revenue-momentum"]).toMatchObject({
      kind: "opportunity",
      severity: "high",
    });
  });
});
