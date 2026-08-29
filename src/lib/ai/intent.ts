import type {
  AnswerLanguage,
  Intent,
  TrustedAnalyzeRequest,
} from "./schemas";

const MYANMAR_SCRIPT = /[\u1000-\u109f]/u;
const LATIN_SCRIPT = /[a-z]/iu;

const intentKeywords: Record<Exclude<Intent, "priority_advice">, readonly string[]> =
  {
    cash_flow: [
      "cash flow",
      "cash",
      "runway",
      "liquidity",
      "working capital",
      "receivable",
      "payable",
      "collection",
      "ငွေသား",
      "ငွေစီးဆင်း",
      "ငွေလည်ပတ်",
      "ရရန်ရှိငွေ",
      "ပေးရန်ရှိငွေ",
      "ကောက်ခံ",
    ],
    expense_analysis: [
      "expense",
      "cost",
      "spending",
      "burn",
      "ကုန်ကျစရိတ်",
      "အသုံးစရိတ်",
      "စရိတ်",
    ],
    expansion: [
      "expansion",
      "expand",
      "new branch",
      "growth investment",
      "တိုးချဲ့",
      "ဆိုင်ခွဲ",
      "လုပ်ငန်းချဲ့",
    ],
    inventory: [
      "inventory",
      "stock",
      "sku",
      "warehouse",
      "ကုန်ပစ္စည်း",
      "စတော့",
      "လက်ကျန်ပစ္စည်း",
      "သိုလှောင်",
    ],
    hiring: [
      "hire",
      "hiring",
      "staff",
      "employee",
      "payroll",
      "recruit",
      "ဝန်ထမ်း",
      "အလုပ်ခန့်",
      "ခန့်အပ်",
      "လစာ",
    ],
  };

const priorityKeywords = [
  "priority",
  "prioritize",
  "first",
  "most important",
  "urgent",
  "what should",
  "recommend",
  "ဦးစားပေး",
  "အရင်",
  "ဘာလုပ်သင့်",
  "အရေးကြီး",
] as const;

export const detectAnswerLanguage = (
  request: TrustedAnalyzeRequest,
): AnswerLanguage => {
  if (request.preferredLanguage !== "auto") {
    return request.preferredLanguage;
  }

  const hasMyanmar = MYANMAR_SCRIPT.test(request.question);
  const hasLatin = LATIN_SCRIPT.test(request.question);

  if (hasMyanmar && hasLatin) {
    return "mixed";
  }
  return hasMyanmar ? "my" : "en";
};

export const classifyIntent = (question: string): Intent => {
  const normalized = question.toLocaleLowerCase("en-US");
  const matchedDomains = (
    Object.entries(intentKeywords) as [
      Exclude<Intent, "priority_advice">,
      readonly string[],
    ][]
  )
    .filter(([, keywords]) =>
      keywords.some((keyword) => normalized.includes(keyword)),
    )
    .map(([intent]) => intent);
  const asksForPriority = priorityKeywords.some((keyword) =>
    normalized.includes(keyword),
  );

  if (matchedDomains.length === 1) {
    return matchedDomains[0]!;
  }
  if (matchedDomains.length > 1 || asksForPriority) {
    return "priority_advice";
  }
  return "priority_advice";
};
