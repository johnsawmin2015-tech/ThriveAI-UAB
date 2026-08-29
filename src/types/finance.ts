/**
 * Monetary values are whole Myanmar kyat (MMK), never lakhs, millions, or
 * floating currency units. The alias documents units; runtime validation still
 * happens at the data boundary.
 */
export type MMK = number;

export type IsoDate = `${number}-${number}-${number}`;
export type MonthKey = `${number}-${number}`;
export type ProfileId = "tea-shop" | "clothing-retailer" | "distributor";

export interface CategoryTotal {
  readonly category: string;
  readonly amountMmk: MMK;
}

export interface MonthlyFinancialRecord {
  readonly month: MonthKey;
  readonly revenueByCategory: readonly CategoryTotal[];
  readonly expensesByCategory: readonly CategoryTotal[];
  /**
   * Cash movement is separate from accrual revenue and expenses so delayed
   * collections can create cash pressure even in a profitable month.
   */
  readonly cashInflowMmk: MMK;
  readonly cashOutflowMmk: MMK;
}

export interface Receivable {
  readonly id: string;
  readonly customerName: string;
  readonly issuedOn: IsoDate;
  readonly dueOn: IsoDate;
  readonly originalAmountMmk: MMK;
  readonly outstandingAmountMmk: MMK;
}

export interface Payable {
  readonly id: string;
  readonly supplierName: string;
  readonly dueOn: IsoDate;
  readonly outstandingAmountMmk: MMK;
}

export interface InventoryItem {
  readonly sku: string;
  readonly name: string;
  readonly category: string;
  readonly valueMmk: MMK;
}

export interface BusinessProfile {
  readonly id: ProfileId;
  readonly businessName: string;
  readonly sector: string;
  readonly location: string;
  readonly asOfDate: IsoDate;
  readonly currency: "MMK";
  readonly currentCashMmk: MMK;
  readonly monthlyHistory: readonly MonthlyFinancialRecord[];
  readonly receivables: readonly Receivable[];
  readonly payables: readonly Payable[];
  readonly inventory: readonly InventoryItem[];
  readonly context: readonly string[];
}

export interface GrowthMetrics {
  readonly revenueGrowthPercent: number | null;
  readonly expenseGrowthPercent: number | null;
}

export type CashRunwayStatus =
  | "critical"
  | "watch"
  | "stable"
  | "self-funding";

export interface CashRunway {
  /**
   * Null means recent cash inflow covers recent cash outflow; it does not mean
   * infinite business life.
   */
  readonly months: number | null;
  readonly monthlyBurnMmk: MMK;
  readonly status: CashRunwayStatus;
}

export interface LiquidityMetrics {
  readonly receivablesMmk: MMK;
  readonly inventoryMmk: MMK;
  readonly payablesMmk: MMK;
  readonly quickRatio: number | null;
  readonly currentRatio: number | null;
  readonly cashCoverageRatio: number | null;
  readonly netWorkingCapitalMmk: MMK;
}

export interface Baseline30Day {
  readonly sourceMonths: readonly MonthKey[];
  readonly averageRevenueMmk: MMK;
  readonly averageExpensesMmk: MMK;
  readonly operatingProfitMmk: MMK;
  readonly averageCashInflowMmk: MMK;
  readonly averageCashOutflowMmk: MMK;
  readonly netCashFlowMmk: MMK;
}

export interface FinancialSnapshot {
  readonly month: MonthKey;
  readonly revenueMmk: MMK;
  readonly expensesMmk: MMK;
  readonly operatingProfitMmk: MMK;
  readonly operatingMarginPercent: number | null;
  readonly growth: GrowthMetrics;
  readonly baseline30Day: Baseline30Day;
  readonly runway: CashRunway;
  readonly liquidity: LiquidityMetrics;
}

export interface HealthSubScores {
  readonly profitability: number;
  readonly liquidity: number;
  readonly cashFlow: number;
  readonly growth: number;
}

export interface HealthScore {
  readonly total: number;
  readonly subScores: HealthSubScores;
  readonly methodologyVersion: "1.0";
}

export type SignalKind = "risk" | "opportunity";
export type SignalSeverity = "high" | "medium" | "low";

export interface FinancialSignal {
  readonly id: string;
  readonly kind: SignalKind;
  readonly severity: SignalSeverity;
  readonly title: string;
  readonly explanation: string;
  readonly action: string;
  readonly amountMmk?: MMK;
}

export type InvoicePriority = "critical" | "high" | "watch";

export interface PrioritizedInvoice extends Receivable {
  readonly daysOverdue: number;
  readonly priority: InvoicePriority;
  readonly priorityReasons: readonly string[];
}

export interface CashBridgeInput {
  readonly currentCashMmk: MMK;
  readonly expectedCollectionsMmk: MMK;
  readonly decisionOutlayMmk: MMK;
  readonly minimumReserveMmk: MMK;
}

export interface CashBridgeResult {
  readonly endingCashMmk: MMK;
  readonly requiredCollectionsMmk: MMK;
  readonly reserveGapMmk: MMK;
  readonly surplusAboveReserveMmk: MMK;
  readonly reserveProtected: boolean;
}

export type ScenarioKind =
  | "hire"
  | "inventory"
  | "branch"
  | "equipment"
  | "marketing"
  | "custom-expense";

export interface ScenarioInput {
  readonly kind: ScenarioKind;
  readonly name: string;
  readonly upfrontCostMmk: MMK;
  readonly monthlyRevenueChangeMmk: MMK;
  /**
   * Positive values increase expense; negative values model recurring savings.
   */
  readonly monthlyExpenseChangeMmk: MMK;
  readonly revenueChangeStartMonth: number;
  readonly expenseChangeStartMonth: number;
  readonly horizonMonths: number;
}

export interface ScenarioMonth {
  readonly month: MonthKey;
  readonly baselineEndingCashMmk: MMK;
  readonly scenarioEndingCashMmk: MMK;
}

export type RunwayDirection = "improves" | "worsens" | "unchanged";

export interface ScenarioResult {
  readonly scenario: ScenarioInput;
  readonly cashRealizationRate: number;
  readonly baselineRunwayMonths: number | null;
  readonly scenarioRunwayMonths: number | null;
  readonly runwayChangeMonths: number | null;
  readonly runwayDirection: RunwayDirection;
  readonly baselineEndingCashMmk: MMK;
  readonly scenarioEndingCashMmk: MMK;
  readonly endingCashImpactMmk: MMK;
  readonly projection: readonly ScenarioMonth[];
  readonly caveats: readonly string[];
}
