# Deterministic finance engine

This module provides transparent, reproducible indicators for the ThriveAI
demo. It does not make accounting, lending, or investment decisions.

## Units and rounding

- Every field ending in `Mmk` is a whole Myanmar kyat (MMK) amount.
- Input data is never stored in lakhs or millions.
- Display-facing money results are rounded to the nearest MMK 10,000.
- Percentages, ratios, and runway are rounded to one decimal; health scores are
  whole numbers. This intentionally avoids unsupported precision.

## Core formulas

For the latest month:

- **Revenue** = sum of revenue category totals.
- **Expenses** = sum of expense category totals, including cost of inventory
  sold where applicable.
- **Operating profit** = revenue − expenses.
- **Operating margin** = operating profit ÷ revenue.
- **Revenue/expense growth** = (latest month − previous month) ÷ previous month.
  Growth is `null` when the previous value is zero.

The **30-day baseline** is the simple average of the latest three monthly
records. It is a run-rate, not a forecast.

**Cash runway** uses cash movement, not accrual profit:

`current cash ÷ max(average cash outflow − average cash inflow, 0)`

When recent inflow covers outflow, runway is `null` and labeled
`self-funding`; this does not claim that the business has infinite life.

Liquidity indicators use:

- **Quick ratio** = (cash + receivables) ÷ payables.
- **Current ratio** = (cash + receivables + inventory) ÷ payables.
- **Cash coverage** = cash ÷ payables.
- **Net working capital** = cash + receivables + inventory − payables.

Ratios are `null` when there are no payables rather than represented as
infinity.

## Health score

The score is a coarse screening indicator with visible thresholds:

- Profitability: 0% operating margin scores 0; 20% scores 100.
- Liquidity: 60% quick-ratio score (0.5 to 1.5) and 40% cash-coverage score
  (0.25 to 1.0).
- Cash flow: positive recent cash flow scores 100; otherwise, 0 to 9 months of
  runway maps to 0 to 100.
- Growth: −10% to +15% revenue growth maps to 0 to 100.

Total weights are profitability 30%, liquidity 25%, cash flow 30%, and growth
15%. Each component is capped from 0 to 100.

## Collections and signals

Only invoices with positive balances and due dates before the profile's as-of
date are overdue. Priority is based on explicit age and value bands, then
sorted by priority, age, and value. Signals are deterministic threshold checks;
they do not use AI-generated judgments.

## Cash bridge

The cash bridge audits whether expected collections can fund a decision while
protecting a stated minimum reserve:

- **Ending cash** = current cash + expected collections − decision outlay.
- **Required collections** = max(0, outlay + reserve − current cash).
- **Reserve gap** = max(0, reserve − ending cash).
- **Surplus above reserve** = max(0, ending cash − reserve).
- **Reserve protected** is true when ending cash is at least the reserve.

Expected collections are an explicit input, not a prediction. The utility is
pure and does not change a business profile.

## Scenario model

Each scenario has an upfront cost, monthly revenue change, monthly expense
change, start months, and horizon. Monthly scenario cash is:

`baseline net cash + (revenue change × recent cash-realization rate) − expense change`

The recent cash-realization rate is trailing cash inflow ÷ trailing accrual
revenue, capped from 0 to 1. Hire, inventory, branch, equipment, marketing, and
custom-expense presets are editable examples.

The model is straight-line and excludes taxes, financing, inflation,
seasonality, replenishment cycles, and probability. Scenario output is a
sensitivity comparison, not a forecast or recommendation.
