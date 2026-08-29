import type {
  ActionCode,
  Intent,
  RationaleCode,
  SignalId,
} from "./schemas";

interface LocalizedCopy {
  readonly mm: string;
  readonly en: string;
}

interface ActionCatalogEntry {
  readonly title: LocalizedCopy;
  readonly rationaleCode: RationaleCode;
  readonly rationale: LocalizedCopy;
  readonly evidenceSuffixes: readonly string[];
  readonly requiresHumanApproval: boolean;
}

export const SIGNAL_CATALOG: Record<
  SignalId,
  { readonly title: LocalizedCopy; readonly explanation: LocalizedCopy }
> = {
  "cash-runway": {
    title: {
      mm: "ငွေသားလည်ပတ်နိုင်ချိန်ကို သတိထားရန်လိုသည်",
      en: "Cash runway needs attention",
    },
    explanation: {
      mm: "လတ်တလော ငွေဝင်ငွေထွက်အရ လည်ပတ်နိုင်ချိန် ကန့်သတ်နေသည်။",
      en: "Recent cash movement indicates limited operating runway.",
    },
  },
  "payables-exceed-cash": {
    title: {
      mm: "ပေးရန်ရှိငွေက လက်ရှိငွေသားထက် များနေသည်",
      en: "Supplier obligations exceed current cash",
    },
    explanation: {
      mm: "ပေးချေရမည့်အချိန်နှင့် ကောက်ခံရမည့်အချိန်ကို ညှိရန်လိုသည်။",
      en: "Payment timing needs to be aligned with confirmed collections.",
    },
  },
  "overdue-receivables": {
    title: {
      mm: "ရက်ကျော်ရရန်ရှိငွေများက ငွေသားကို ချုပ်ထားသည်",
      en: "Overdue receivables are tying up cash",
    },
    explanation: {
      mm: "ရက်ကျော်ငွေတောင်းခံလွှာများကို ဦးစားပေးကောက်ခံရန်လိုသည်။",
      en: "Overdue invoices require prioritized collection.",
    },
  },
  "collection-opportunity": {
    title: {
      mm: "ဦးစားပေးငွေတောင်းခံလွှာများမှ ငွေသားရနိုင်သည်",
      en: "Priority invoices can unlock near-term cash",
    },
    explanation: {
      mm: "တန်ဖိုးမြင့်နှင့် ရက်အကြာဆုံးစာရင်းများကို အရင်လိုက်လံကောက်ခံနိုင်သည်။",
      en: "The oldest and highest-value invoices offer a near-term collection opportunity.",
    },
  },
  "revenue-momentum": {
    title: {
      mm: "ဝင်ငွေတိုးတက်မှု အားကောင်းနေသည်",
      en: "Revenue momentum is strong",
    },
    explanation: {
      mm: "ပြန်လည်လုပ်ဆောင်နိုင်သည့် တိုးတက်မှုအကြောင်းရင်းများကို ဖော်ထုတ်သင့်သည်။",
      en: "The repeatable drivers of recent growth should be identified.",
    },
  },
  "expense-growth": {
    title: {
      mm: "အသုံးစရိတ်တိုးနှုန်းက ဝင်ငွေတိုးနှုန်းထက် မြန်နေသည်",
      en: "Expenses are outpacing revenue",
    },
    explanation: {
      mm: "တိုးလာသည့် အသုံးစရိတ်အုပ်စုများကို ပြန်လည်စစ်ဆေးရန်လိုသည်။",
      en: "The expense categories driving the increase need review.",
    },
  },
  "self-funded-growth": {
    title: {
      mm: "လုပ်ငန်းလည်ပတ်ငွေဖြင့် အတိုင်းအတာရှိစွာ တိုးချဲ့နိုင်သည်",
      en: "Operations can support measured growth",
    },
    explanation: {
      mm: "ငွေသားအရန်ကို ထိန်းထားပြီး ကန့်သတ်ထားသည့် ရင်းနှီးမြှုပ်နှံမှုကို စမ်းသပ်နိုင်သည်။",
      en: "A bounded investment can be tested while preserving a cash reserve.",
    },
  },
};

export const ACTION_CATALOG: Record<ActionCode, ActionCatalogEntry> = {
  PROTECT_CASH: {
    title: {
      mm: "မလိုအပ်သေးသည့် အသုံးစရိတ်ကို ခေတ္တရွှေ့ဆိုင်းပါ",
      en: "Defer non-essential spending",
    },
    rationaleCode: "PROTECT_LIQUIDITY",
    rationale: {
      mm: "နီးကပ်သည့် ပေးချေမှုများအတွက် ငွေသားကို ကာကွယ်ထားရန်ဖြစ်သည်။",
      en: "This protects liquidity for near-term obligations.",
    },
    evidenceSuffixes: [
      "cash.current",
      "cash.net-flow",
      "cash.runway-months",
      "liquidity.payables",
    ],
    requiresHumanApproval: true,
  },
  COLLECT_OVERDUE: {
    title: {
      mm: "ရက်ကျော်ငွေတောင်းခံလွှာများကို ဦးစားပေးကောက်ခံပါ",
      en: "Prioritize overdue collections",
    },
    rationaleCode: "UNLOCK_WORKING_CAPITAL",
    rationale: {
      mm: "လက်ရှိရရန်ရှိငွေမှ လုပ်ငန်းလည်ပတ်ငွေကို ပြန်လည်ရရှိစေနိုင်သည်။",
      en: "This can release working capital already owed to the business.",
    },
    evidenceSuffixes: [
      "receivables.overdue-count",
      "receivables.overdue-value",
      "receivables.top-collection",
    ],
    requiresHumanApproval: false,
  },
  ALIGN_PAYABLES: {
    title: {
      mm: "ပေးချေမည့်ရက်နှင့် ကောက်ခံမည့်ရက်ကို ညှိပါ",
      en: "Align supplier payments with collections",
    },
    rationaleCode: "PROTECT_LIQUIDITY",
    rationale: {
      mm: "ငွေဝင်မလာမီ ပေးချေရသည့် ဖိအားကို လျှော့ချရန်ဖြစ်သည်။",
      en: "This reduces timing pressure before expected cash arrives.",
    },
    evidenceSuffixes: [
      "cash.current",
      "liquidity.payables",
      "liquidity.cash-coverage",
    ],
    requiresHumanApproval: true,
  },
  REVIEW_EXPENSES: {
    title: {
      mm: "တိုးလာသည့် အသုံးစရိတ်အုပ်စုများကို စစ်ဆေးပါ",
      en: "Review the fastest-growing expense categories",
    },
    rationaleCode: "CONTROL_COST_GROWTH",
    rationale: {
      mm: "ထိန်းချုပ်နိုင်သည့် ကုန်ကျစရိတ်ကို အရင်ဖော်ထုတ်ရန်ဖြစ်သည်။",
      en: "This identifies controllable cost growth first.",
    },
    evidenceSuffixes: [
      "expenses.latest",
      "growth.expense",
      "growth.revenue",
      "profit.operating",
    ],
    requiresHumanApproval: false,
  },
  RUN_EXPANSION_SCENARIO: {
    title: {
      mm: "မတိုးချဲ့မီ ငွေသားအခြေအနေကို စမ်းသပ်တွက်ချက်ပါ",
      en: "Run a cash scenario before expanding",
    },
    rationaleCode: "VALIDATE_BEFORE_COMMITMENT",
    rationale: {
      mm: "ပြန်ပြင်ရခက်သည့် ကတိကဝတ်မတိုင်မီ ငွေသားသက်ရောက်မှုကို စစ်ဆေးရန်ဖြစ်သည်။",
      en: "This tests cash impact before an irreversible commitment.",
    },
    evidenceSuffixes: [
      "cash.current",
      "cash.net-flow",
      "cash.runway-months",
      "profit.operating",
      "health.total",
    ],
    requiresHumanApproval: true,
  },
  REVIEW_INVENTORY_MIX: {
    title: {
      mm: "ကုန်ပစ္စည်းလက်ကျန်နှင့် ငွေသားလိုအပ်ချက်ကို နှိုင်းယှဉ်ပါ",
      en: "Review inventory mix against cash needs",
    },
    rationaleCode: "MATCH_STOCK_TO_CASH",
    rationale: {
      mm: "ကုန်ပစ္စည်းထဲတွင် ချုပ်နေသည့်ငွေကို လုပ်ငန်းလိုအပ်ချက်နှင့် ညှိရန်ဖြစ်သည်။",
      en: "This aligns cash tied in stock with operating needs.",
    },
    evidenceSuffixes: [
      "inventory.total",
      "cash.current",
      "liquidity.payables",
      "liquidity.current-ratio",
    ],
    requiresHumanApproval: true,
  },
  RUN_HIRING_SCENARIO: {
    title: {
      mm: "ဝန်ထမ်းခန့်မီ လစာကုန်ကျစရိတ်အခြေအနေကို စမ်းသပ်ပါ",
      en: "Test hiring affordability before committing",
    },
    rationaleCode: "TEST_AFFORDABILITY",
    rationale: {
      mm: "ထပ်တိုးလစဉ်ကုန်ကျစရိတ်ကို လုပ်ငန်းက ခံနိုင်မခံနိုင် စစ်ဆေးရန်ဖြစ်သည်။",
      en: "This checks whether recurring payroll is affordable.",
    },
    evidenceSuffixes: [
      "cash.current",
      "cash.net-flow",
      "cash.runway-months",
      "profit.operating",
      "baseline.expenses",
    ],
    requiresHumanApproval: true,
  },
  PRESERVE_RESERVE: {
    title: {
      mm: "တိုးတက်မှုလုပ်ဆောင်ရာတွင် ငွေသားအရန်ထားပါ",
      en: "Preserve a cash reserve while investing",
    },
    rationaleCode: "PROTECT_LIQUIDITY",
    rationale: {
      mm: "တိုးတက်မှုနှင့် နေ့စဉ်ပေးချေမှုနှစ်ခုစလုံးကို ကာကွယ်ရန်ဖြစ်သည်။",
      en: "This protects both growth plans and daily obligations.",
    },
    evidenceSuffixes: [
      "cash.current",
      "cash.net-flow",
      "profit.margin",
      "health.total",
    ],
    requiresHumanApproval: true,
  },
  MONITOR_GROWTH_DRIVERS: {
    title: {
      mm: "ပြန်လည်လုပ်ဆောင်နိုင်သည့် ဝင်ငွေအကြောင်းရင်းများကို ဖော်ထုတ်ပါ",
      en: "Identify repeatable revenue drivers",
    },
    rationaleCode: "SCALE_REPEATABLE_GROWTH",
    rationale: {
      mm: "အတည်ပြုနိုင်သည့် တိုးတက်မှုကိုသာ အတိုင်းအတာတိုးရန်ဖြစ်သည်။",
      en: "This focuses investment on growth that can be repeated.",
    },
    evidenceSuffixes: [
      "revenue.latest",
      "growth.revenue",
      "profit.margin",
    ],
    requiresHumanApproval: false,
  },
};

export const INTENT_ACTIONS: Record<Intent, readonly ActionCode[]> = {
  cash_flow: ["COLLECT_OVERDUE", "ALIGN_PAYABLES", "PROTECT_CASH"],
  expense_analysis: ["REVIEW_EXPENSES", "PROTECT_CASH"],
  expansion: ["RUN_EXPANSION_SCENARIO", "PRESERVE_RESERVE"],
  inventory: ["REVIEW_INVENTORY_MIX", "PRESERVE_RESERVE"],
  hiring: ["RUN_HIRING_SCENARIO", "PRESERVE_RESERVE"],
  priority_advice: [
    "COLLECT_OVERDUE",
    "ALIGN_PAYABLES",
    "PROTECT_CASH",
    "REVIEW_EXPENSES",
    "MONITOR_GROWTH_DRIVERS",
    "PRESERVE_RESERVE",
  ],
};

export const SIGNAL_ACTION: Record<SignalId, ActionCode> = {
  "cash-runway": "PROTECT_CASH",
  "payables-exceed-cash": "ALIGN_PAYABLES",
  "overdue-receivables": "COLLECT_OVERDUE",
  "collection-opportunity": "COLLECT_OVERDUE",
  "revenue-momentum": "MONITOR_GROWTH_DRIVERS",
  "expense-growth": "REVIEW_EXPENSES",
  "self-funded-growth": "PRESERVE_RESERVE",
};

export const INTENT_SIGNAL_IDS: Record<Intent, readonly SignalId[]> = {
  cash_flow: [
    "cash-runway",
    "payables-exceed-cash",
    "overdue-receivables",
    "collection-opportunity",
    "self-funded-growth",
  ],
  expense_analysis: [
    "expense-growth",
    "cash-runway",
    "self-funded-growth",
  ],
  expansion: [
    "cash-runway",
    "payables-exceed-cash",
    "revenue-momentum",
    "self-funded-growth",
  ],
  inventory: [
    "cash-runway",
    "payables-exceed-cash",
    "expense-growth",
    "self-funded-growth",
  ],
  hiring: [
    "cash-runway",
    "payables-exceed-cash",
    "expense-growth",
    "self-funded-growth",
  ],
  priority_advice: [
    "cash-runway",
    "payables-exceed-cash",
    "overdue-receivables",
    "collection-opportunity",
    "expense-growth",
    "revenue-momentum",
    "self-funded-growth",
  ],
};

export const LIMITATION_CATALOG = {
  ADVISORY_ONLY: {
    mm: "ဤအကြံပြုချက်သည် စီမံခန့်ခွဲမှုဆုံးဖြတ်ချက်ကို အစားမထိုးပါ။",
    en: "This guidance does not replace management judgment.",
  },
  MODEL_FALLBACK: {
    mm: "AI မရရှိသဖြင့် သတ်မှတ်ထားသည့် ငွေကြေးစည်းမျဉ်းများဖြင့် အဖြေထုတ်ထားသည်။",
    en: "The model was unavailable, so deterministic finance rules produced this answer.",
  },
  INVENTORY_VELOCITY_UNAVAILABLE: {
    mm: "ကုန်ပစ္စည်းရောင်းထွက်နှုန်းနှင့် ပစ္စည်းတစ်မျိုးချင်း အရွယ်သက်တမ်း မပါဝင်သေးပါ။",
    en: "SKU velocity and inventory aging are not available.",
  },
  SCENARIO_INPUTS_REQUIRED: {
    mm: "ဆုံးဖြတ်ချက်အတည်ပြုရန် ကုန်ကျစရိတ်နှင့် အကျိုးအမြတ်ခန့်မှန်းချက် လိုအပ်သည်။",
    en: "Decision-specific cost and benefit assumptions are required before approval.",
  },
} as const;
