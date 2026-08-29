# ThriveAI — 90-second pitch and judge Q&A

## 90-second demo script

**0–12 seconds — Start with the contradiction**

“Aung Mingalar Distribution looks healthy: latest revenue is up **14%**. But
growth is not cash. The business has only **MMK 4.3M** in cash, **MMK 9.6M** in
payables, and **MMK 12M** tied up in receivables.”

**12–25 seconds — Reveal the practical opportunity**

“ThriveAI separates total receivables from what can be acted on now. The
next-best action leads with the amount: **MMK 4.8M** from the top three overdue
invoices. The owner does not need another dashboard—she needs to know what to
do first.”

Select the distributor and point to the health score (**57 / Watch**), metrics,
and amount-first recommendation.

**25–42 seconds — Show language mode, then ask**

Toggle **ENG | မြန်မာ** (default is Myanmar). Interface labels switch to one
language at a time; the preference is remembered.

In Myanmar mode, enter:

> အခုချိန် ဆိုင်ခွဲဖွင့်သင့်လား?

Or in English mode:

> Should I open another branch right now?

“The UI sends `preferredLanguage` with the request. When a model key is
configured, ThriveAI selects and ranks evidence-backed findings—it cannot invent
financial numbers. Without a key, or on failure, the same screen returns an
honestly labeled deterministic fallback.”

**42–65 seconds — Deliver the Cash Bridge moment**

“A new branch needs **MMK 3M**, and we want to preserve a **MMK 2.5M** minimum
reserve. Expanding now leaves only **MMK 1.3M**—a **MMK 1.2M** reserve gap.
That is also the minimum collection needed before committing.”

“Collecting the top overdue **MMK 4.8M** first changes the same decision to
**MMK 6.1M** ending cash. The safer path is clear: collect before expanding.”

Point to the risky vs safer ending-cash comparison, then open the calculation
disclosure if judges want the equation:

`4.3M current cash + 4.8M assumed collections − 3M outlay = 6.1M`

**65–80 seconds — Show controlled what-if analysis**

“Now we can compare branch, inventory, hiring, equipment, marketing, or a
custom expense. These are editable sensitivity assumptions using a
three-month cash run-rate and recent cash-realization rate. They are not
forecasts, probabilities, or guarantees.”

Change one scenario input and show the baseline remains unchanged.

**80–90 seconds — Close on value**

“ThriveAI turns fragmented SME figures into one explainable next action. For
the owner, that means a safer decision in her language. For UAB, it creates a
potential consent-based bridge to better prepared, more productive SME
conversations—without pretending to make a lending decision.”

## Why does this need AI?

Deterministic code should calculate revenue, runway, liquidity, and scenario
cash. AI is valuable for a different job: interpreting Burmese or
mixed-language questions, understanding which business concern is relevant,
and contextually ranking the most useful signals and actions.

The model is therefore constrained to selecting structured intent, signal,
evidence, action, and rationale codes from server-approved options. Zod and
semantic checks reject unsupported or cross-business selections. Reviewed
bilingual text and deterministic values are added only after validation. The
product still works through an explicit rule-based fallback when OpenAI/Gemini
is not configured or fails.

## Why UAB?

UAB is positioned at the point where SME financial behavior, business
ambition, and access to appropriate banking support meet. A future,
consent-based ThriveAI could help an SME arrive at a conversation with clearer
cash needs, receivable priorities, and scenario assumptions. It could also
give relationship teams a more consistent starting context.

This prototype does not access UAB systems, recommend a UAB product, score
credit, or approve a loan. The opportunity is better decision preparation and
financial engagement—not automated underwriting.

## Concise judge Q&A

### Why not just use Excel?

Excel is excellent for calculations, and ThriveAI does not replace it. The
prototype adds a consistent financial methodology, overdue prioritization,
auditable scenarios, Burmese/English locale mode, mixed-language intent, and
evidence-backed action ranking. Today the data is synthetic; real spreadsheet
import would be a future integration.

### How do you prevent hallucinations?

The model is instructed not to calculate or output financial figures. It may
select only approved IDs and codes. Its JSON is schema-validated, checked
against the selected business and allowed evidence, and repaired at most once.
Any timeout, malformed output, invalid evidence, or provider failure switches
to the deterministic fallback.

### Is this forecasting?

No. The 30-day baseline is the simple average of the latest three monthly
records. Scenario cash uses:

`baseline net cash + (assumed revenue change × recent cash-realization rate) − assumed expense change`

It is a straight-line sensitivity comparison. Inputs are assumptions, not
predictions; the model excludes taxes, financing, inflation, seasonality,
replenishment cycles, probability, and shocks.

### What data did you use?

Three synthetic Myanmar SME profiles: a Mandalay tea shop, a Yangon clothing
retailer, and a Yangon/Bago FMCG distributor. Each has six months of category
totals and cash flows plus receivables, payables, inventory, and business
context. No external, customer, or bank dataset is used.

### What is the value to an SME?

It connects accounting-style facts to a concrete decision. In the distributor
demo, the owner sees that revenue growth does not remove liquidity pressure,
identifies MMK 4.8M of overdue collections, and learns that at least MMK 1.2M
must be collected to protect the stated reserve before opening a branch.

### What is the value to a bank?

Potentially, clearer consent-based SME conversations, better-articulated cash
needs, and standardized evidence behind business questions. This could improve
engagement and preparation, but the current prototype is not a bank dashboard,
risk model, or underwriting system.

### Does ThriveAI recommend or approve loans?

No. It performs no lending, credit, eligibility, affordability, pricing, or
approval decision. It provides illustrative business decision support only.

### Can it use real data?

Not in this prototype. A production path could add consented accounting,
invoice, spreadsheet, or transaction connectors with validation, access
controls, encryption, retention policies, audit logs, and reconciliation.
Those controls must exist before real customer data is used.

### How would this scale?

The calculation engine, profile data, AI selection layer, and interface are
separate. That supports adding sector-specific rules, data adapters, languages,
and evaluated action catalogs without allowing the model to own the ledger.
Production scale would still require secure tenancy, persistent storage,
observability, model evaluation, accounting review, privacy governance, and
regulatory assessment.
