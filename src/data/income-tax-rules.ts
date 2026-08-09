export const INCOME_TAX_RULES_TAX_YEAR = "2026/27";

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
