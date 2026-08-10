export const INCOME_TAX_RULES_TAX_YEAR = "2026/27";

export const UK_INCOME_TAX_COMMON_RULES = {
  taxYear: INCOME_TAX_RULES_TAX_YEAR,
  effectiveFrom: "2026-04-06",
  effectiveTo: "2027-04-05",
  personalAllowance: 12_570,
  personalAllowanceTaperThreshold: 100_000,
  personalAllowanceReductionPerExcessPound: 0.5,
  source: {
    publisher: "HM Revenue & Customs",
    title: "Income Tax rates and allowances for current and previous tax years",
    url: "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    lastUpdated: "2026-04-06",
  },
} as const;

export const REST_OF_UK_INCOME_TAX_RULES = {
  taxYear: INCOME_TAX_RULES_TAX_YEAR,
  effectiveFrom: "2026-04-06",
  effectiveTo: "2027-04-05",
  jurisdictions: ["England", "Wales", "Northern Ireland"],
  bands: [
    { name: "basic", upperTaxableIncome: 37_700, ratePercent: 20 },
    { name: "higher", upperTaxableIncome: 125_140, ratePercent: 40 },
    { name: "additional", upperTaxableIncome: null, ratePercent: 45 },
  ],
  source: UK_INCOME_TAX_COMMON_RULES.source,
} as const;

export const SCOTTISH_INCOME_TAX_RULES = {
  taxYear: INCOME_TAX_RULES_TAX_YEAR,
  effectiveFrom: "2026-04-06",
  effectiveTo: "2027-04-05",
  bands: [
    { name: "starter", upperTaxableIncome: 3_967, ratePercent: 19 },
    { name: "basic", upperTaxableIncome: 16_956, ratePercent: 20 },
    { name: "intermediate", upperTaxableIncome: 31_092, ratePercent: 21 },
    { name: "higher", upperTaxableIncome: 62_430, ratePercent: 42 },
    { name: "advanced", upperTaxableIncome: 125_140, ratePercent: 45 },
    { name: "top", upperTaxableIncome: null, ratePercent: 48 },
  ],
  sources: [
    {
      publisher: "Scottish Government",
      title: "Scottish Income Tax: rates and bands",
      url: "https://www.gov.scot/publications/scottish-income-tax-rates-and-bands/",
      lastUpdated: "2026-01-14",
    },
    {
      publisher: "HM Revenue & Customs",
      title: "Income Tax in Scotland: current rates",
      url: "https://www.gov.uk/scottish-income-tax",
      retrieved: "2026-08-08",
    },
  ],
} as const;

export const PENSION_WITHDRAWAL_TAX_RULES = {
  taxYear: INCOME_TAX_RULES_TAX_YEAR,
  usualMaximumTaxFreeSharePercent: 25,
  standardLumpSumAllowance: 268_275,
  moneyPurchaseAnnualAllowance: 10_000,
  sources: [
    {
      publisher: "HM Revenue & Customs",
      title: "Tax when you get a pension: What's tax-free",
      url: "https://www.gov.uk/tax-on-pension/tax-free",
      retrieved: "2026-08-10",
    },
    {
      publisher: "HM Revenue & Customs",
      title: "Tax when you get a pension: What's taxed",
      url: "https://www.gov.uk/tax-on-pension/taxed",
      retrieved: "2026-08-10",
    },
    {
      publisher: "HM Revenue & Customs",
      title: "Tax on your private pension contributions: Lump sum allowance",
      url: "https://www.gov.uk/tax-on-your-private-pension/lump-sum-allowance",
      retrieved: "2026-08-10",
    },
    {
      publisher: "HM Revenue & Customs",
      title: "How your State Pension is taxed",
      url: "https://www.gov.uk/guidance/how-your-state-pension-is-taxed",
      retrieved: "2026-08-10",
    },
    {
      publisher: "HM Revenue & Customs",
      title: "Check if you've gone above the money purchase annual allowance",
      url: "https://www.gov.uk/guidance/work-out-your-allowances-if-youve-flexibly-accessed-your-pension",
      retrieved: "2026-08-10",
    },
  ],
} as const;
