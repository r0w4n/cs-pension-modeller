import type { PensionSettings } from "./settings";

export type DateField = {
  id: "startDate" | "dateOfBirth" | "alphaPensionAbsDate";
  label: string;
  type: "date" | "year";
  infoUrl?: string;
};

export type RangeField = {
  id:
    | "lifeExpectancy"
    | "alphaAddedPensionMonthly"
    | "alphaPensionLeaveAge"
    | "accruedPensionAtLastAbs"
    | "pensionableEarnings"
    | "alphaPensionDrawAge";
  label: string;
  type: "range";
  min: number;
  max: number;
  step: number;
  format?: "currency";
  infoUrl?: string;
  valuePrefix?: string;
};

export type CurrencyInputField = {
  id: "currentStatePension";
  label: string;
  type: "currency-input";
  min: number;
  max: number;
  step: number;
  format?: "currency";
  infoUrl?: string;
};

export type FieldDefinition = DateField | RangeField | CurrencyInputField;

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
      },
      {
        id: "currentStatePension",
        label: "Current Full State Pension (£ per year)",
        type: "currency-input",
        min: 0,
        max: 15000,
        step: 0.01,
        format: "currency",
        infoUrl: "https://www.gov.uk/check-state-pension",
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
      },
      {
        id: "accruedPensionAtLastAbs",
        label: "Alpha Pension Accrued at Last Statement (£ per year)",
        type: "range",
        min: 0,
        max: 50000,
        step: 250,
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
    ],
  },
] as const;
