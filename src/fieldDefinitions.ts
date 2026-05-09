import type { PensionSettings } from "./settings";

export type DateField = {
  id:
    | "startDate"
    | "dateOfBirth"
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
    | "isaWithdrawalPercent";
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
    | "sippApplyRealInterest"
    | "sippApplyTaxRelief";
  label: string;
  type: "checkbox";
  description: string;
};

export type CurrencyInputField = {
  id:
    | "currentStatePension"
    | "accruedPensionAtLastAbs"
    | "sippCurrentPot"
    | "isaCurrentPot";
  label: string;
  type: "currency-input";
  min: number;
  max: number;
  step: number;
  format?: "currency";
  infoUrl?: string;
  infoLinkText?: string;
};

export type SelectField = {
  id: "sippWithdrawalStrategy" | "isaWithdrawalStrategy";
  label: string;
  type: "select";
  options: {
    value: PensionSettings["sippWithdrawalStrategy"] | PensionSettings["isaWithdrawalStrategy"];
    label: string;
  }[];
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
      },
      {
        id: "lifeExpectancy",
        label: "Life Expectancy (Age)",
        type: "range",
        min: 75,
        max: 100,
        step: 1,
        infoUrl:
          "https://www.ons.gov.uk/peoplepopulationandcommunity/healthandsocialcare/healthandlifeexpectancies/articles/lifeexpectancycalculator/2019-06-07",
        infoLinkText: "Estimate life expectancy",
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
        infoUrl: "https://www.gov.uk/check-state-pension",
        infoLinkText: "Check State Pension",
      },
      {
        id: "statePensionApplyFutureGrowth",
        label: "Project State Pension future growth",
        type: "checkbox",
        description:
          "Uprate the current forecast each year until State Pension age using the highest of CPI, wage growth, and 2.5%.",
      },
      {
        id: "statePensionCpiPercent",
        label: "State Pension CPI (%)",
        type: "range",
        min: 0,
        max: 10,
        step: 0.1,
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
        label: "Last Annual Benifits Statement",
        type: "year",
        infoUrl:
          "https://www.civilservicepensionscheme.org.uk/memberhub/your-pension/yearly-pension-updates/annual-benefit-statement/",
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
      },
      {
        id: "alphaPensionDrawAge",
        label: "Planned Alpha Pension Draw Age",
        type: "range",
        min: 55,
        max: 70,
        step: 1,
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
      },
      {
        id: "assumedCpiPercent",
        label: "Assumed CPI (%)",
        type: "range",
        min: 0,
        max: 10,
        step: 0.1,
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
        id: "sippApplyTaxRelief",
        label: "Apply 25% tax relief to SIPP additions",
        type: "checkbox",
        description:
          "Gross up regular and lump sum additions by 25%, matching basic-rate relief on a net contribution.",
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
] as const;
