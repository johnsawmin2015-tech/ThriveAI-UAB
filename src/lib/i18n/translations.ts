import type { Locale } from "./types";

export const translations = {
  en: {
    brand: {
      name: "ThriveAI",
      tagline: "AI Financial Copilot for Myanmar SMEs",
      homeAria: "ThriveAI home",
    },
    language: {
      groupAria: "Interface language",
      en: "ENG",
      my: "မြန်မာ",
      enAria: "English",
      myAria: "Myanmar",
    },
    selector: {
      label: "Selected business",
      aria: "Choose a business profile",
    },
    business: {
      dataAsOf: "Data as of",
    },
    profiles: {
      distributor: {
        name: "Aung Mingalar Distribution",
        short: "Distributor",
        sector: "FMCG distribution",
        location: "Yangon and Bago",
      },
      "tea-shop": {
        name: "Shwe Pyi Tea House",
        short: "Tea shop",
        sector: "Tea shop and quick-service food",
        location: "Mandalay",
      },
      "clothing-retailer": {
        name: "Mingalar Fashion",
        short: "Clothing retail",
        sector: "Clothing retail",
        location: "Yangon",
      },
    },
    snapshot: {
      eyebrow: "Business Health",
      decisionEyebrow: "Decision snapshot",
      method: "Deterministic score",
      howCalculated: "How this score is calculated",
      profitability: "Profitability · 30%",
      liquidity: "Liquidity · 25%",
      cashFlow: "Cash flow · 30%",
      growth: "Growth · 15%",
      methodNote:
        "Weighted screening score only. It is not a credit score, forecast, or accounting opinion.",
      growthUp: (growth: string) =>
        `Latest revenue is up ${growth}, but cash is not keeping pace.`,
      growthFlat: "Revenue is holding, but cash timing is the constraint.",
      payableGap: (gap: string) =>
        `Supplier obligations exceed cash by ${gap}.`,
      bands: {
        stable: "Stable",
        watch: "Watch",
        critical: "Critical",
      },
    },
    metrics: {
      aria: "Four primary metrics",
      revenue: "Latest revenue",
      cash: "Cash now",
      runway: "Cash runway",
      payables: "Outstanding payables",
      mom: "vs prior month",
      cashCoverage: (ratio: string) => `Cash coverage ${ratio}×`,
      monthlyBurn: (amount: string) => `Recent monthly burn ${amount}`,
      supplierCount: (count: number) =>
        `${count} supplier obligation${count === 1 ? "" : "s"}`,
      selfFunding: "Self-funding",
      months: (value: number) => `${value} months`,
    },
    action: {
      eyebrow: "Recommended next step",
      title: "Next best action",
      collectHeadline: "of overdue invoices",
      collectDetail: (count: number) =>
        `Collect from the top ${count} overdue invoices before expanding.`,
      alignPayables:
        "Align supplier due dates with confirmed collections first.",
      boundedTest:
        "Test one bounded investment while preserving the cash reserve.",
      collectSupport:
        "Collection timing protects the reserve without giving up the expansion option.",
      impactAria: "Cash available after this decision",
      expandNow: "Expand now",
      collectThen: "Collect first, then expand",
      ask: "Ask ThriveAI about this",
      pathAria: "Recommended decision path",
      whyMatters: "Why this matters",
    },
    bridge: {
      eyebrow: "Financial impact",
      title: "Cash Bridge",
      subtitle: "Compare the risky path with the safer sequence. Not a forecast.",
      cashAfter: "Cash available after this decision",
      versus: "vs",
      topOverdue: "Top 3 overdue",
      branchOutlay: "Branch outlay",
      reserve: "Minimum reserve",
      riskyPath: "Riskier path",
      saferPath: "Safer path",
      expandNow: "Expand now",
      collectThen: "Collect first → expand",
      reserveGap: "Reserve gap",
      reserveProtected: "Reserve protected",
      aboveMinimum: "above minimum",
      required: (amount: string) =>
        `Collect at least ${amount} before the outlay to protect the minimum reserve.`,
      how: "How this is calculated",
      formula1:
        "Cash after the decision = current cash + expected collections − outlay.",
      formula2:
        "Required collection = max(0, outlay + minimum reserve − current cash).",
      formula3:
        "Expected collections use only the top three invoices already overdue. Collection is an assumption, not a guarantee.",
    },
    evidence: {
      eyebrow: "Why this recommendation",
      title: "Evidence",
      empty: "No material finance signals found.",
      invoices: "Priority overdue invoices",
      daysOverdue: (days: number) => `${days} days overdue`,
      noneOverdue: (date: string) => `No invoices are overdue as of ${date}.`,
      kinds: {
        risk: "Risk",
        opportunity: "Opportunity",
      },
      priorities: {
        critical: "Critical",
        high: "High",
        watch: "Watch",
      },
    },
    signals: {
      "cash-runway": {
        title: "Cash runway needs attention",
        explanation:
          "Recent cash movement implies a short runway at the current run-rate.",
      },
      "payables-exceed-cash": {
        title: "Supplier obligations exceed cash",
        explanation:
          "Payables are larger than cash on hand, so payment timing is the constraint.",
      },
      "overdue-receivables": {
        title: "Overdue invoices are tying up cash",
        explanation:
          "Collectible receivables are sitting past due instead of funding operations.",
      },
      "collection-opportunity": {
        title: "Top invoices can unlock near-term cash",
        explanation:
          "The highest-value overdue invoices can cover the reserve gap if collected first.",
      },
      "revenue-momentum": {
        title: "Revenue momentum is strong",
        explanation:
          "Latest monthly revenue grew strongly. Growth is not the same as cash.",
      },
      "expense-growth": {
        title: "Expenses are outpacing revenue",
        explanation:
          "Cost growth is faster than sales growth, which can consume cash.",
      },
      "self-funded-growth": {
        title: "Operations can fund measured improvements",
        explanation:
          "Operating cash flow is supporting a bounded next step, not an open-ended expansion.",
      },
    },
    scenario: {
      eyebrow: "What-if",
      title: "Scenario simulator",
      subtitle: "Straight-line comparison of one decision. Not a forecast.",
      badge: "Simulation / estimate",
      preset: "Scenario",
      amount: "Upfront amount (MMK)",
      entered: (amount: string) => `Entered amount: ${amount}`,
      invalid: "Enter a valid amount of zero or more.",
      invalidAlert: "Enter a valid upfront MMK amount to run the scenario.",
      before: "Before this decision",
      after: "After this decision",
      runway: "Cash runway",
      endingCash: "12-month ending cash",
      impact: "12-month cash impact",
      runwayImproves: "runway improves",
      runwayWorsens: "runway shortens",
      runwayUnchanged: "runway unchanged",
      assumptions: "View assumptions",
      revenueChange: "Monthly revenue change",
      expenseChange: "Monthly expense change",
      startsMonth: (month: number) => `Starts month ${month}`,
      realization: "Recent cash realization",
      appliedRevenue: "Applied to added revenue",
      baselineSource: "Baseline source",
      trailing: "Trailing three months",
      caveats: [
        "Uses a straight-line trailing three-month baseline.",
        "Revenue changes become cash at the recent collection rate.",
        "Does not infer tax, financing, seasonality, inflation, or uncertainty.",
        "Preset assumptions are editable examples, not recommendations.",
      ],
    },
    scenarios: {
      hire: "Hire an employee",
      inventory: "Buy inventory",
      branch: "Open a branch",
      equipment: "Buy equipment",
      marketing: "Run marketing",
      "custom-expense": "Custom expense",
    },
    runway: {
      covers: "Recent cash inflow currently covers cash outflow.",
      months: (months: number) =>
        `Cash runway is about ${months} months at the recent run-rate.`,
    },
    analysis: {
      eyebrow: "ThriveAI answer",
      title: "Decision support",
      forQuestion: (question: string) => `For “${question}”`,
      loadingTitle: "Analyzing your business data…",
      loadingDetail: "Checking the selected profile against trusted figures.",
      errorTitle: "We couldn't complete the analysis.",
      errorRetry: "Please try again.",
      retry: "Retry",
      findings: "Findings",
      actions: "Next best actions",
      limitations: "Limitations & degradation",
      degradation: "Degradation reasons",
      emptySummary:
        "The endpoint returned no summary text. Structured details are shown below where available.",
      status: "Status",
      intent: "Intent",
      language: "Language",
      health: "Health",
      risk: "Risk",
      fallback: "Deterministic fallback",
      model: "Model",
    },
    assistant: {
      title: "Ask ThriveAI about this business",
      subtitle: (name: string) => `Questions stay scoped to ${name}`,
      suggestionsAria: "Suggested questions",
      suggestions: "Suggested questions",
      placeholder: "Example — Should I open another branch right now?",
      fieldLabel: "Ask ThriveAI a question about the selected business",
      send: "Ask",
      sending: "Sending",
      idle: "English or Burmese",
      loading: "Analyzing…",
      answered: "Answer ready",
      error: "Try again",
      prompts: [
        "Which overdue invoices should I collect before opening a new branch?",
        "How risky is it for my cash position if I open a branch now?",
        "What is the best action to improve my cash runway?",
      ],
    },
    advisory:
      "For decision support only. Not financial, accounting, lending, or investment advice. Verify timing and amounts before committing.",
  },
  my: {
    brand: {
      name: "ThriveAI",
      tagline: "မြန်မာ SME များအတွက် AI ငွေကြေးဆုံးဖြတ်ချက် အထောက်အကူ",
      homeAria: "ThriveAI ပင်မစာမျက်နှာ",
    },
    language: {
      groupAria: "ဘာသာစကားရွေးချယ်ရန်",
      en: "ENG",
      my: "မြန်မာ",
      enAria: "အင်္ဂလိပ်",
      myAria: "မြန်မာ",
    },
    selector: {
      label: "ရွေးချယ်ထားသောလုပ်ငန်း",
      aria: "လုပ်ငန်းပရိုဖိုင်ရွေးချယ်ရန်",
    },
    business: {
      dataAsOf: "ဒေတာရက်စွဲ",
    },
    profiles: {
      distributor: {
        name: "အောင်မင်္ဂလာ ဖြန့်ချိရေး",
        short: "ဖြန့်ချိရေးလုပ်ငန်း",
        sector: "ကုန်စည်ဖြန့်ချိရေး",
        location: "ရန်ကုန်နှင့် ပဲခူး",
      },
      "tea-shop": {
        name: "ရွှေပြည် လက်ဖက်ရည်ဆိုင်",
        short: "လက်ဖက်ရည်ဆိုင်",
        sector: "လက်ဖက်ရည်ဆိုင်နှင့် အမြန်စားသောက်",
        location: "မန္တလေး",
      },
      "clothing-retailer": {
        name: "မင်္ဂလာ ဖက်ရှင်",
        short: "အဝတ်အထည်ဆိုင်",
        sector: "အဝတ်အထည်လက်လီ",
        location: "ရန်ကုန်",
      },
    },
    snapshot: {
      eyebrow: "လုပ်ငန်းကျန်းမာရေး",
      decisionEyebrow: "ယခုဆုံးဖြတ်ရမည့်အချက်",
      method: "သတ်မှတ်ထားသော အမှတ်ပေးစနစ်",
      howCalculated: "တွက်ချက်ပုံ",
      profitability: "အမြတ်အစွန်း · ၃၀%",
      liquidity: "ငွေဖြစ်လွယ်မှု · ၂၅%",
      cashFlow: "ငွေသားစီးဆင်းမှု · ၃၀%",
      growth: "တိုးတက်မှု · ၁၅%",
      methodNote:
        "စစ်ဆေးရန် အလေးချိန်အမှတ်သာဖြစ်သည်။ ချေးငွေအဆင့်၊ ခန့်မှန်းချက် သို့မဟုတ် စာရင်းကိုင်ထင်မြင်ချက်မဟုတ်ပါ။",
      growthUp: (growth: string) =>
        `စာရင်းဝင်အရောင်း ${growth} တက်လာသော်လည်း ငွေသားမလိုက်နိုင်သေးပါ။`,
      growthFlat: "အရောင်းကို ထိန်းထားနိုင်သော်လည်း ငွေသားအချိန်ကိုက်မှုက အဓိကကန့်သတ်ချက်ဖြစ်သည်။",
      payableGap: (gap: string) =>
        `ပေးရန်ရှိငွေက လက်ရှိငွေသားထက် ${gap} များနေသည်။`,
      bands: {
        stable: "တည်ငြိမ်",
        watch: "သတိထားရန်",
        critical: "အရေးကြီး",
      },
    },
    metrics: {
      aria: "အဓိကညွှန်းကိန်း လေးခု",
      revenue: "နောက်ဆုံးလ အရောင်း",
      cash: "လက်ရှိငွေသား",
      runway: "ငွေသားအသုံးခံကာလ",
      payables: "ပေးရန်ရှိငွေ",
      mom: "ယခင်လနှင့်နှိုင်းယှဉ်",
      cashCoverage: (ratio: string) => `ငွေသားဖုံးအုပ်မှု ${ratio}×`,
      monthlyBurn: (amount: string) => `လတ်တလော လစဉ်ငွေထွက် ${amount}`,
      supplierCount: (count: number) => `ပေးသွင်းသူ တာဝန် ${count} ခု`,
      selfFunding: "ကိုယ်တိုင်ကာမိနေသည်",
      months: (value: number) => `${value} လ`,
    },
    action: {
      eyebrow: "အကောင်းဆုံးနောက်တစ်ဆင့်",
      title: "ယခုလုပ်သင့်သည်",
      collectHeadline: "ရက်ကျော်ကြွေးမှ",
      collectDetail: (count: number) =>
        `တိုးချဲ့မှုမလုပ်မီ ထိပ်တန်း ရက်ကျော်ကြွေး ${count} ခုကို အရင်ကောက်ပါ။`,
      alignPayables:
        "ပေးသွင်းသူငွေချေရက်ကို အတည်ပြုထားသော ငွေကောက်ရက်နှင့် အရင်ညှိပါ။",
      boundedTest:
        "ငွေသားအရန်ကို ထိန်းထားပြီး ကန့်သတ်ထားသော ရင်းနှီးမြှုပ်နှံမှုတစ်ခုကိုသာ စမ်းပါ။",
      collectSupport:
        "အရင်ကောက်ခြင်းက တိုးချဲ့ခွင့်ကို မစွန့်ဘဲ အရန်ငွေကို ကာကွယ်ပေးသည်။",
      impactAria: "ဤဆုံးဖြတ်ချက်အပြီး ကျန်ရှိမည့်ငွေသား",
      expandNow: "အခုတိုးချဲ့မည်",
      collectThen: "အရင်ကောက်ပြီး တိုးချဲ့မည်",
      ask: "ဤအကြံပြုချက်ကို မေးမည်",
      pathAria: "အကြံပြုထားသော ဆုံးဖြတ်ချက်လမ်းကြောင်း",
      whyMatters: "ဘာကြောင့်အရေးကြီးသလဲ",
    },
    bridge: {
      eyebrow: "ငွေကြေးသက်ရောက်မှု",
      title: "ငွေသားအကူးအပြောင်း",
      subtitle: "အန္တရာယ်များသောလမ်းနှင့် ပိုလုံခြုံသောအစဉ်ကို နှိုင်းယှဉ်ပါ။ ခန့်မှန်းချက်မဟုတ်ပါ။",
      cashAfter: "ဤဆုံးဖြတ်ချက်အပြီး ကျန်ရှိမည့်ငွေသား",
      versus: "နှင့်",
      topOverdue: "ရက်ကျော်ကြွေး ထိပ်တန်း ၃ ခု",
      branchOutlay: "ဆိုင်ခွဲကုန်ကျငွေ",
      reserve: "အနည်းဆုံးအရန်ငွေ",
      riskyPath: "အန္တရာယ်ပိုများသောလမ်း",
      saferPath: "ပိုလုံခြုံသောလမ်း",
      expandNow: "အခုတိုးချဲ့မည်",
      collectThen: "အရင်ကောက် → တိုးချဲ့",
      reserveGap: "အရန်ငွေလိုအပ်ချက်",
      reserveProtected: "အရန်ငွေကာကွယ်ပြီး",
      aboveMinimum: "အနည်းဆုံးထက်ပို",
      required: (amount: string) =>
        `အရန်ငွေကို ကာကွယ်ရန် အနည်းဆုံး ${amount} အရင်ကောက်ရန်လိုသည်။`,
      how: "တွက်ချက်ပုံနှင့် ယူဆချက်များ",
      formula1:
        "ဆုံးဖြတ်ချက်အပြီးငွေသား = လက်ရှိငွေသား + မျှော်မှန်းကောက်ငွေ − ကုန်ကျငွေ။",
      formula2:
        "လိုအပ်သောကောက်ငွေ = max(0, ကုန်ကျငွေ + အနည်းဆုံးအရန် − လက်ရှိငွေသား)။",
      formula3:
        "မျှော်မှန်းကောက်ငွေသည် ရက်ကျော်ပြီးသော ထိပ်တန်းငွေတောင်းခံလွှာ ၃ ခုသာဖြစ်သည်။ ကောက်နိုင်သည်ဟု အာမမခံပါ။",
    },
    evidence: {
      eyebrow: "ဘာကြောင့်လဲ",
      title: "အထောက်အထား",
      empty: "ထင်ရှားသော ငွေကြေးအချက်အလက် မတွေ့ပါ။",
      invoices: "ဦးစားပေးကောက်ရန်",
      daysOverdue: (days: number) => `${days} ရက်ကျော်`,
      noneOverdue: (date: string) => `${date} အထိ ရက်ကျော်ကြွေးမရှိပါ။`,
      kinds: {
        risk: "အန္တရာယ်",
        opportunity: "အခွင့်အလမ်း",
      },
      priorities: {
        critical: "အရေးကြီး",
        high: "မြင့်",
        watch: "စောင့်ကြည့်",
      },
    },
    signals: {
      "cash-runway": {
        title: "ငွေသားအသုံးခံကာလကို သတိထားပါ",
        explanation:
          "လတ်တလော ငွေသားလှုပ်ရှားမှုအရ လက်ရှိနှုန်းတွင် အသုံးခံကာလ တိုနေသည်။",
      },
      "payables-exceed-cash": {
        title: "ပေးရန်ရှိငွေက လက်ရှိငွေသားထက်များနေသည်",
        explanation:
          "ပေးသွင်းသူတာဝန်က လက်ရှိငွေသားထက်ကြီးသဖြင့် ငွေချေချိန်ကိုက်မှုက အဓိကကန့်သတ်ချက်ဖြစ်သည်။",
      },
      "overdue-receivables": {
        title: "ရက်ကျော်ကြွေးကျန်များတွင် ငွေသားပိတ်မိနေသည်",
        explanation:
          "ကောက်သင့်သောကြွေးများက လုပ်ငန်းလည်ပတ်ငွေမဖြစ်သေးဘဲ ရက်ကျော်နေသည်။",
      },
      "collection-opportunity": {
        title: "အဓိကကြွေးများက ငွေသားကို အမြန်ဖွင့်ပေးနိုင်သည်",
        explanation:
          "တန်ဖိုးအမြင့်ဆုံး ရက်ကျော်ကြွေးများကို အရင်ကောက်ပါက အရန်ငွေလိုအပ်ချက်ကို ဖြည့်နိုင်သည်။",
      },
      "revenue-momentum": {
        title: "အရောင်းတိုးတက်မှုအားကောင်းနေသည်",
        explanation:
          "နောက်ဆုံးလ အရောင်းသိသိသာသာတက်သည်။ တိုးတက်မှုသည် ငွေသားနှင့် မတူပါ။",
      },
      "expense-growth": {
        title: "အသုံးစရိတ်တိုးနှုန်းက အရောင်းထက်မြန်နေသည်",
        explanation:
          "ကုန်ကျစရိတ်တိုးနှုန်းက အရောင်းထက်မြန်သဖြင့် ငွေသားကို စားသုံးနိုင်သည်။",
      },
      "self-funded-growth": {
        title: "လုပ်ငန်းလည်ပတ်ငွေဖြင့် တိုးချဲ့နိုင်သည့်အခြေအနေ",
        explanation:
          "လည်ပတ်ငွေစီးဆင်းမှုက ကန့်သတ်ထားသော နောက်တစ်ဆင့်ကို ပံ့ပိုးနိုင်သည်။ အကန့်အသတ်မရှိ တိုးချဲ့ရန်မဟုတ်ပါ။",
      },
    },
    scenario: {
      eyebrow: "ဖြစ်နိုင်ခြေစမ်းသပ်ရန်",
      title: "အခြေအနေစမ်းသပ်ကိရိယာ",
      subtitle: "ဆုံးဖြတ်ချက်တစ်ခုကို မျဉ်းဖြောင့်နှိုင်းယှဉ်ခြင်းသာဖြစ်သည်။ ခန့်မှန်းချက်မဟုတ်ပါ။",
      badge: "စမ်းသပ်တွက်ချက်မှု / ခန့်မှန်းချက်မဟုတ်",
      preset: "စမ်းသပ်မည့်အခြေအနေ",
      amount: "အစပိုင်းကုန်ကျငွေ (MMK)",
      entered: (amount: string) => `ထည့်သွင်းသောပမာဏ: ${amount}`,
      invalid: "သုညနှင့်အထက် တရားဝင်ပမာဏ ထည့်ပါ။",
      invalidAlert: "အခြေအနေတွက်ရန် တရားဝင် ကုန်ကျငွေ ထည့်ပါ။",
      before: "မလုပ်မီ",
      after: "လုပ်ပြီးနောက်",
      runway: "ငွေသားအသုံးခံကာလ",
      endingCash: "၁၂ လအကုန် ငွေသား",
      impact: "၁၂ လ ငွေသားသက်ရောက်မှု",
      runwayImproves: "အသုံးခံကာလ တိုးလာသည်",
      runwayWorsens: "အသုံးခံကာလ တိုလာသည်",
      runwayUnchanged: "အသုံးခံကာလ မပြောင်းလဲပါ",
      assumptions: "ယူဆချက်များကြည့်ရန်",
      revenueChange: "လစဉ်အရောင်းပြောင်းလဲမှု",
      expenseChange: "လစဉ်အသုံးစရိတ်ပြောင်းလဲမှု",
      startsMonth: (month: number) => `လ ${month} မှစတင်`,
      realization: "လတ်တလော ငွေသားပြောင်းနှုန်း",
      appliedRevenue: "တိုးလာသောအရောင်းအပေါ် သက်ရောက်",
      baselineSource: "အခြေခံဒေတာ",
      trailing: "နောက်ဆုံး ၃ လ",
      caveats: [
        "နောက်ဆုံး ၃ လကို မျဉ်းဖြောင့်အခြေခံအဖြစ် သုံးသည်။",
        "အရောင်းပြောင်းလဲမှုသည် လတ်တလော ကောက်နှုန်းဖြင့် ငွေသားဖြစ်သည်။",
        "အခွန်၊ ငွေကြေးထောက်ပံ့မှု၊ ရာသီအလိုက်၊ ငွေကြေးဖောင်းပွမှု သို့မဟုတ် မသေချာမှုကို မခန့်မှန်းပါ။",
        "ကြိုတင်သတ်မှတ်ချက်များသည် တည်းဖြတ်နိုင်သော ဥပမာများသာဖြစ်ပြီး အကြံပြုချက်မဟုတ်ပါ။",
      ],
    },
    scenarios: {
      hire: "ဝန်ထမ်းအသစ်ခန့်ရန်",
      inventory: "ကုန်ပစ္စည်းထပ်ဝယ်ရန်",
      branch: "ဆိုင်ခွဲအသစ်ဖွင့်ရန်",
      equipment: "စက်ပစ္စည်းဝယ်ရန်",
      marketing: "မားကတ်တင်းလုပ်ရန်",
      "custom-expense": "အခြားအသုံးစရိတ်",
    },
    runway: {
      covers: "လတ်တလော ငွေဝင်က ငွေထွက်ကို ကာမိနေသည်။",
      months: (months: number) =>
        `လက်ရှိနှုန်းအရ ငွေသားအသုံးခံကာလ ${months} လခန့်ရှိသည်။`,
    },
    analysis: {
      eyebrow: "ThriveAI အဖြေ",
      title: "ဆုံးဖြတ်ချက်အထောက်အကူ",
      forQuestion: (question: string) => `“${question}” အတွက်`,
      loadingTitle: "လုပ်ငန်းဒေတာကို စစ်ဆေးနေသည်…",
      loadingDetail: "ရွေးထားသောလုပ်ငန်း၏ ယုံကြည်ရသော ကိန်းဂဏန်းများကို စစ်နေသည်။",
      errorTitle: "ခွဲခြမ်းစိတ်ဖြာမှု မပြီးမြောက်ပါ။",
      errorRetry: "ထပ်မံကြိုးစားပါ။",
      retry: "ပြန်ကြိုးစားမည်",
      findings: "တွေ့ရှိချက်",
      actions: "နောက်တစ်ဆင့်",
      limitations: "ကန့်သတ်ချက်များ",
      degradation: "အဆင့်လျှော့ရသည့်အကြောင်း",
      emptySummary:
        "အကျဉ်းချုပ်စာသား မပါလာပါ။ ရရှိသော အချက်အလက်များကို အောက်တွင် ပြထားသည်။",
      status: "အခြေအနေ",
      intent: "ရည်ရွယ်ချက်",
      language: "ဘာသာစကား",
      health: "ကျန်းမာရေး",
      risk: "အန္တရာယ်",
      fallback: "သတ်မှတ်ထားသော အရန်အဖြေ",
      model: "မော်ဒယ်",
    },
    assistant: {
      title: "ဤလုပ်ငန်းအကြောင်း ThriveAI ကိုမေးပါ",
      subtitle: (name: string) => `မေးခွန်းများသည် ${name} တွင်သာ ကန့်သတ်ထားသည်`,
      suggestionsAria: "အကြံပြုမေးခွန်းများ",
      suggestions: "မေးခွန်းအကြံပြုချက်များ",
      placeholder: "ဥပမာ — အခု ဆိုင်ခွဲဖွင့်သင့်လား?",
      fieldLabel: "ရွေးထားသောလုပ်ငန်းအကြောင်း ThriveAI ကိုမေးရန်",
      send: "မေးမည်",
      sending: "ပို့နေသည်",
      idle: "မြန်မာ သို့မဟုတ် အင်္ဂလိပ်",
      loading: "စစ်ဆေးနေသည်…",
      answered: "အဖြေရရှိပြီး",
      error: "ပြန်ကြိုးစားနိုင်သည်",
      prompts: [
        "ဆိုင်ခွဲမဖွင့်ခင် ဘယ်ကြွေးတွေကို အရင်ကောက်သင့်လဲ?",
        "အခုချိန် ဆိုင်ခွဲဖွင့်ရင် ငွေသားအန္တရာယ်ဘယ်လောက်ရှိလဲ?",
        "ငွေသားအသုံးခံကာလ တိုးဖို့ အကောင်းဆုံးလုပ်ဆောင်ချက်ကဘာလဲ?",
      ],
    },
    advisory:
      "ဆုံးဖြတ်ချက်အထောက်အကူအတွက်သာ။ စာရင်းကိုင်၊ ချေးငွေ သို့မဟုတ် ရင်းနှီးမြှုပ်နှံမှုအကြံပေးချက်မဟုတ်ပါ။ ကတိမပြုမီ အချိန်နှင့် ပမာဏကို စစ်ဆေးပါ။",
  },
} as const;

export type TranslationCopy = (typeof translations)[Locale];
