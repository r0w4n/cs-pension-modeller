import type { PensionSettings } from "./settings";
import { knowledgeLinks } from "./knowledgeLinks";

export type DateField = {
  id:
    | "startDate"
    | "dateOfBirth"
    | "statePensionDrawDate"
    | "alphaPensionAbsDate"
    | "alphaEpaStartDate"
    | "alphaEpaEndDate";
  label: string;
  type: "date" | "year";
  infoUrl?: string;
  infoLinkText?: string;
};

export type RangeField = {
  id:
    | "lifeExpectancy"
    | "statePensionCpiPercent"
    | "statePensionWageGrowthPercent"
    | "assumedCpiPercent"
    | "alphaAddedPensionMonthly"
    | "alphaPensionLeaveAge"
    | "pensionableEarnings"
    | "alphaPensionDrawAge"
    | "alphaEpaYearsBeforeNpa"
    | "sippDrawAge"
    | "sippMonthlyContribution"
    | "sippRealInterestPercent"
    | "sippWithdrawalPercent"
    | "isaDrawAge"
    | "isaMonthlyContribution"
    | "isaRealInterestPercent"
    | "isaWithdrawalPercent"
    | "taxBasicRatePercent"
    | "taxHigherRatePercent"
    | "taxAdditionalRatePercent"
    | "taxSippTaxFreeWithdrawalPercent";
  label: string;
  type: "range";
  min: number;
  max: number;
  step: number;
  format?: "currency";
  infoUrl?: string;
  infoLinkText?: string;
  valuePrefix?: string;
};

export type CheckboxField = {
  id:
    | "applyPensionIncreases"
    | "statePensionApplyFutureGrowth"
    | "alphaEpaEnabled"
    | "isaApplyRealInterest"
    | "sippApplyRealInterest";
  label: string;
  type: "checkbox";
  description: string;
  infoUrl?: string;
  infoLinkText?: string;
};

export type CurrencyInputField = {
  id:
    | "currentStatePension"
    | "accruedPensionAtLastAbs"
    | "desiredRetirementIncome"
    | "sippCurrentPot"
    | "isaCurrentPot"
    | "taxPersonalAllowance"
    | "taxPersonalAllowanceTaperThreshold"
    | "taxBasicRateLimit"
    | "taxAdditionalRateThreshold";
  label: string;
  type: "currency-input";
  min: number;
  max: number;
  step: number;
  format?: "currency";
  presets?: {
    value: number;
    label: string;
    description?: string;
  }[];
  infoUrl?: string;
  infoLinkText?: string;
};

export type SelectField = {
  id: "sippTaxReliefRate" | "sippWithdrawalStrategy" | "isaWithdrawalStrategy";
  label: string;
  type: "select";
  options: {
    value:
      | PensionSettings["sippTaxReliefRate"]
      | PensionSettings["sippWithdrawalStrategy"]
      | PensionSettings["isaWithdrawalStrategy"];
    label: string;
  }[];
  infoUrl?: string;
  infoLinkText?: string;
};

export type FieldDefinition =
  | DateField
  | RangeField
  | CurrencyInputField
  | CheckboxField
  | SelectField;

export type FieldGroup = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  fields: FieldDefinition[];
};

export type SettingsKey = keyof PensionSettings;

export const fieldGroups: FieldGroup[] = [
  {
    id: "personal",
    eyebrow: "Personal Details",
    title: "Personal details",
    description: "Core personal dates and assumptions used across the calculator.",
    fields: [
      {
        id: "startDate",
        label: "Calculation Start Date",
        type: "date",
      },
      {
        id: "dateOfBirth",
        label: "Your Date of Birth",
        type: "date",
        infoUrl: knowledgeLinks.statePensionAge,
        infoLinkText: "Check State Pension age",
      },
      {
        id: "lifeExpectancy",
        label: "Life Expectancy (Age)",
        type: "range",
        min: 75,
        max: 100,
        step: 1,
        infoUrl: knowledgeLinks.lifeExpectancy,
        infoLinkText: "Estimate life expectancy",
      },
      {
        id: "desiredRetirementIncome",
        label: "Retirement living standard target (£ per year)",
        type: "currency-input",
        min: 0,
        max: 200000,
        step: 1,
        format: "currency",
        presets: [
          {
            value: 13400,
            label: "£13,400",
            description: "Minimum standard for one person household",
          },
          {
            value: 21600,
            label: "£21,600",
            description: "Minimum standard for two person household",
          },
          {
            value: 31700,
            label: "£31,700",
            description: "Moderate standard for one person household",
          },
          {
            value: 43900,
            label: "£43,900",
            description: "Comfortable standard for one person household",
          },
          {
            value: 60600,
            label: "£60,600",
            description: "Comfortable standard for two person household",
          },
        ],
        infoUrl: knowledgeLinks.retirementLivingStandards,
        infoLinkText: "Retirement Living Standards",
      },
    ],
  },
  {
    id: "state",
    eyebrow: "State Pension",
    title: "State pension details",
    description: "Current forecast and optional future uprating assumptions.",
    fields: [
      {
        id: "currentStatePension",
        label: "Current Full State Pension (£ per year)",
        type: "currency-input",
        min: 0,
        max: 15000,
        step: 0.01,
        format: "currency",
        infoUrl: knowledgeLinks.statePensionForecast,
        infoLinkText: "Check State Pension",
      },
      {
        id: "statePensionDrawDate",
        label: "State Pension draw date",
        type: "date",
        infoUrl: knowledgeLinks.statePensionDeferral,
        infoLinkText: "Defer State Pension",
      },
      {
        id: "statePensionApplyFutureGrowth",
        label: "Project State Pension future growth",
        type: "checkbox",
        description:
          "Uprate the current forecast each year until State Pension age using the highest of CPI, wage growth, and 2.5%.",
        infoUrl: knowledgeLinks.statePensionTripleLock,
        infoLinkText: "What is the triple lock?",
      },
      {
        id: "statePensionCpiPercent",
        label: "State Pension CPI (%)",
        type: "range",
        min: 0,
        max: 10,
        step: 0.1,
        infoUrl: knowledgeLinks.statePensionTripleLock,
        infoLinkText: "State Pension uprating",
      },
      {
        id: "statePensionWageGrowthPercent",
        label: "State Pension wage growth (%)",
        type: "range",
        min: 0,
        max: 10,
        step: 0.1,
      },
    ],
  },
  {
    id: "alpha",
    eyebrow: "Alpha Pension",
    title: "Alpha pension details",
    description: "Alpha scheme dates, service assumptions, and current accrued values.",
    fields: [
      {
        id: "alphaPensionAbsDate",
        label: "Last Annual Benefits Statement",
        type: "year",
        infoUrl: knowledgeLinks.annualBenefitStatement,
        infoLinkText: "Annual Benefit Statement guide",
      },
      {
        id: "accruedPensionAtLastAbs",
        label: "Alpha Pension Accrued at Last Statement (£ per year)",
        type: "currency-input",
        min: 0,
        max: 50000,
        step: 1,
        format: "currency",
      },
      {
        id: "alphaPensionLeaveAge",
        label: "Age You Leave Alpha Scheme",
        type: "range",
        min: 40,
        max: 70,
        step: 1,
      },
      {
        id: "pensionableEarnings",
        label: "Current Pensionable Earnings (£ per year)",
        type: "range",
        min: 10000,
        max: 150000,
        step: 500,
        format: "currency",
        infoUrl: knowledgeLinks.alphaAccrual,
        infoLinkText: "Alpha accrual rate",
      },
      {
        id: "alphaPensionDrawAge",
        label: "Planned Alpha Pension Draw Age",
        type: "range",
        min: 55,
        max: 70,
        step: 1,
        infoUrl: knowledgeLinks.alphaEarlyRetirementFactors,
        infoLinkText: "Early retirement factors",
      },
      {
        id: "alphaAddedPensionMonthly",
        label: "Added Alpha Pension (£ per month)",
        type: "range",
        min: 0,
        max: 1000,
        step: 25,
        format: "currency",
        valuePrefix: "/mo",
        infoUrl: knowledgeLinks.alphaAddedPensionFactors,
        infoLinkText: "Added pension factors",
      },
      {
        id: "alphaEpaEnabled",
        label: "Add EPA",
        type: "checkbox",
        description:
          "Build an EPA portion of Alpha pension that can be taken unreduced before normal pension age.",
      },
      {
        id: "alphaEpaYearsBeforeNpa",
        label: "EPA years before NPA",
        type: "range",
        min: 1,
        max: 3,
        step: 1,
      },
      {
        id: "alphaEpaStartDate",
        label: "EPA Start Date",
        type: "date",
      },
      {
        id: "alphaEpaEndDate",
        label: "EPA End Date",
        type: "date",
      },
      {
        id: "applyPensionIncreases",
        label: "Apply Alpha pension increases",
        type: "checkbox",
        description:
          "Benefits increase annually by CPI + 1.6% while active, then by CPI after leaving Alpha service.",
        infoUrl: knowledgeLinks.alphaAccrual,
        infoLinkText: "Alpha pension increases",
      },
      {
        id: "assumedCpiPercent",
        label: "Assumed CPI (%)",
        type: "range",
        min: 0,
        max: 10,
        step: 0.1,
        infoUrl: knowledgeLinks.civilServicePensionIncreases,
        infoLinkText: "Pensions Increase CPI",
      },
    ],
  },
  {
    id: "sipp",
    eyebrow: "SIPP",
    title: "SIPP details",
    description: "Personal pension pot, contribution, relief, and real return assumptions.",
    fields: [
      {
        id: "sippCurrentPot",
        label: "Current SIPP pot (£)",
        type: "currency-input",
        min: 0,
        max: 2000000,
        step: 1,
        format: "currency",
      },
      {
        id: "sippMonthlyContribution",
        label: "Regular SIPP contribution (£ per month)",
        type: "range",
        min: 0,
        max: 5000,
        step: 25,
        format: "currency",
        valuePrefix: "/mo",
      },
      {
        id: "sippDrawAge",
        label: "SIPP draw start age",
        type: "range",
        min: 55,
        max: 70,
        step: 1,
      },
      {
        id: "sippTaxReliefRate",
        label: "SIPP tax relief on net additions",
        type: "select",
        options: [
          { value: "none", label: "No tax relief" },
          { value: "20", label: "20% basic-rate relief" },
          { value: "40", label: "40% higher-rate relief" },
        ],
        infoUrl: "https://www.gov.uk/tax-on-your-private-pension/pension-tax-relief",
        infoLinkText: "Check pension tax relief",
      },
      {
        id: "sippApplyRealInterest",
        label: "Apply real interest to SIPP pot",
        type: "checkbox",
        description: "Grow the projected SIPP pot using a real annual interest rate.",
      },
      {
        id: "sippRealInterestPercent",
        label: "SIPP real interest rate (%)",
        type: "range",
        min: -10,
        max: 10,
        step: 0.1,
      },
      {
        id: "sippWithdrawalStrategy",
        label: "SIPP withdrawal strategy",
        type: "select",
        options: [
          { value: "zero_at_death", label: "Zero at death" },
          { value: "percentage", label: "Annual percentage" },
        ],
      },
      {
        id: "sippWithdrawalPercent",
        label: "SIPP withdrawal rate (%)",
        type: "range",
        min: 0,
        max: 15,
        step: 0.1,
      },
    ],
  },
  {
    id: "isa",
    eyebrow: "ISA",
    title: "ISA details",
    description: "ISA pot, contributions, investment return, and drawdown assumptions.",
    fields: [
      {
        id: "isaCurrentPot",
        label: "Current ISA pot (£)",
        type: "currency-input",
        min: 0,
        max: 2000000,
        step: 1,
        format: "currency",
      },
      {
        id: "isaMonthlyContribution",
        label: "Regular ISA contribution (£ per month)",
        type: "range",
        min: 0,
        max: 5000,
        step: 25,
        format: "currency",
        valuePrefix: "/mo",
      },
      {
        id: "isaDrawAge",
        label: "ISA draw start age",
        type: "range",
        min: 55,
        max: 70,
        step: 1,
      },
      {
        id: "isaApplyRealInterest",
        label: "Apply real interest to ISA pot",
        type: "checkbox",
        description: "Grow the projected ISA pot using a real annual interest rate.",
      },
      {
        id: "isaRealInterestPercent",
        label: "ISA real interest rate (%)",
        type: "range",
        min: -10,
        max: 10,
        step: 0.1,
      },
      {
        id: "isaWithdrawalStrategy",
        label: "ISA withdrawal strategy",
        type: "select",
        options: [
          { value: "zero_at_death", label: "Zero at death" },
          { value: "percentage", label: "Annual percentage" },
        ],
      },
      {
        id: "isaWithdrawalPercent",
        label: "ISA withdrawal rate (%)",
        type: "range",
        min: 0,
        max: 15,
        step: 0.1,
      },
    ],
  },
  {
    id: "tax",
    eyebrow: "Tax",
    title: "Tax assumptions",
    description:
      "Optional Income Tax estimate using current standard UK assumptions for pension income.",
    fields: [
      {
        id: "taxPersonalAllowance",
        label: "Personal Allowance (£ per year)",
        type: "currency-input",
        min: 0,
        max: 50000,
        step: 1,
        format: "currency",
      },
      {
        id: "taxPersonalAllowanceTaperThreshold",
        label: "Personal Allowance taper threshold (£ per year)",
        type: "currency-input",
        min: 0,
        max: 200000,
        step: 1,
        format: "currency",
      },
      {
        id: "taxBasicRateLimit",
        label: "Basic-rate taxable band (£ per year)",
        type: "currency-input",
        min: 0,
        max: 100000,
        step: 1,
        format: "currency",
      },
      {
        id: "taxAdditionalRateThreshold",
        label: "Additional-rate threshold (£ per year)",
        type: "currency-input",
        min: 0,
        max: 300000,
        step: 1,
        format: "currency",
      },
      {
        id: "taxBasicRatePercent",
        label: "Basic tax rate (%)",
        type: "range",
        min: 0,
        max: 100,
        step: 0.1,
      },
      {
        id: "taxHigherRatePercent",
        label: "Higher tax rate (%)",
        type: "range",
        min: 0,
        max: 100,
        step: 0.1,
      },
      {
        id: "taxAdditionalRatePercent",
        label: "Additional tax rate (%)",
        type: "range",
        min: 0,
        max: 100,
        step: 0.1,
      },
      {
        id: "taxSippTaxFreeWithdrawalPercent",
        label: "SIPP tax-free withdrawal share (%)",
        type: "range",
        min: 0,
        max: 25,
        step: 0.1,
        infoUrl: "https://www.gov.uk/tax-on-pension/tax-free",
        infoLinkText: "Check pension tax-free rules",
      },
    ],
  },
] as const;
