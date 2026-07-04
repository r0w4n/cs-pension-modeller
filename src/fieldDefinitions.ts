import {
  ALPHA_ADDED_PENSION_MONTHLY_MAX,
  LISA_MONTHLY_CONTRIBUTION_MAX,
  type PensionSettings,
} from "./settings";
import { knowledgeLinks } from "./knowledgeLinks";

export type FieldInfoLink = {
  href: string;
  text: string;
};

export type DateField = {
  id:
    | "startDate"
    | "dateOfBirth"
    | "statePensionDrawDate"
    | "alphaPensionAbsDate"
    | "nuvosPensionAbsDate"
    | "alphaEpaStartDate"
    | "alphaEpaEndDate";
  label: string;
  type: "date" | "month" | "year";
  description?: string;
  infoUrl?: string;
  infoLinkText?: string;
  infoLinks?: FieldInfoLink[];
};

export type RangeField = {
  id:
    | "lifeExpectancy"
    | "requirementAge"
    | "inflationRateAnnual"
    | "statePensionCpiPercent"
    | "statePensionWageGrowthPercent"
    | "partialRetirementStartAge"
    | "partialRetirementWorkPercent"
    | "alphaAddedPensionMonthly"
    | "alphaPensionLeaveAge"
    | "pensionableEarnings"
    | "alphaPayRisePercent"
    | "alphaPensionDrawAge"
    | "alphaEpaYearsBeforeNpa"
    | "nuvosPensionableEarnings"
    | "nuvosPensionLeaveAge"
    | "nuvosPensionDrawAge"
    | "nuvosAssumedCpiPercent"
    | "sippDrawAge"
    | "sippMonthlyContribution"
    | "sippRealInterestPercent"
    | "sippWithdrawalPercent"
    | "sippWithdrawalTargetAge"
    | "isaDrawAge"
    | "isaMonthlyContribution"
    | "isaRealInterestPercent"
    | "isaWithdrawalPercent"
    | "isaWithdrawalTargetAge"
    | "lisaDrawAge"
    | "lisaMonthlyContribution"
    | "lisaRealInterestPercent"
    | "lisaWithdrawalPercent"
    | "lisaWithdrawalTargetAge"
    | "taxBasicRatePercent"
    | "taxHigherRatePercent"
    | "taxAdditionalRatePercent"
    | "taxSippTaxFreeWithdrawalPercent";
  label: string;
  type: "range";
  min: number;
  max: number;
  step: number;
  inputStep?: number;
  format?: "currency";
  description?: string;
  infoUrl?: string;
  infoLinkText?: string;
  infoLinks?: FieldInfoLink[];
  valuePrefix?: string;
};

export type CheckboxField = {
  id:
    | "statePensionApplyFutureGrowth"
    | "alphaEpaEnabled"
    | "nuvosApplyPensionIncreases";
  label: string;
  type: "checkbox";
  description: string;
  infoUrl?: string;
  infoLinkText?: string;
  infoLinks?: FieldInfoLink[];
};

export type CurrencyInputField = {
  id:
    | "currentStatePension"
    | "accruedPensionAtLastAbs"
    | "nuvosAccruedPensionAtLastAbs"
    | "desiredRetirementIncome"
    | "fullSalary"
    | "sippCurrentPot"
    | "isaCurrentPot"
    | "lisaCurrentPot"
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
  description?: string;
  infoUrl?: string;
  infoLinkText?: string;
  infoLinks?: FieldInfoLink[];
};

export type SelectField = {
  id:
    | "projectionBasis"
    | "alphaAddedPensionFactorType"
    | "sippTaxReliefRate"
    | "sippWithdrawalStrategy"
    | "isaWithdrawalStrategy"
    | "lisaWithdrawalStrategy";
  label: string;
  type: "select";
  options: {
    value:
      | PensionSettings["sippTaxReliefRate"]
      | PensionSettings["projectionBasis"]
      | PensionSettings["alphaAddedPensionFactorType"]
      | PensionSettings["sippWithdrawalStrategy"]
      | PensionSettings["isaWithdrawalStrategy"]
      | PensionSettings["lisaWithdrawalStrategy"];
    label: string;
  }[];
  description?: string;
  infoUrl?: string;
  infoLinkText?: string;
  infoLinks?: FieldInfoLink[];
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
    description:
      "Core personal dates and assumptions used across the modeller.",
    fields: [
      {
        id: "startDate",
        label: "Calculation Start Date",
        type: "date",
        description:
          "The date the projection starts from. Use today for a fresh plan, or a statement date if you are reconciling the model to a known figure.",
      },
      {
        id: "dateOfBirth",
        label: "Your Birth Month and Year",
        type: "month",
        description:
          "Sets your current age, State Pension age, Alpha Normal Pension Age, and the minimum ages at which pension pots can be accessed. The modeller assumes the first day of the selected month.",
      },
      {
        id: "lifeExpectancy",
        label: "Life Expectancy (Age)",
        type: "range",
        min: 75,
        max: 100,
        step: 1,
        inputStep: 1,
        description:
          "The age the projection runs to. This is a planning horizon rather than a prediction: a longer horizon usually asks more from ISA and SIPP pots, while defined benefit income keeps paying for as long as modelled.",
        infoUrl: knowledgeLinks.lifeExpectancy,
        infoLinkText: "Estimate life expectancy",
      },
      {
        id: "requirementAge",
        label: "Target retirement age",
        type: "range",
        min: 0,
        max: 70,
        step: 1,
        inputStep: 1,
        description:
          "The age from which you want the modeller to assess whether your retirement income target is being met. In the bridge journey this is your target retirement age, so an earlier age gives pots longer to cover.",
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
            value: 11250,
            label: "£11,250",
          },
          {
            value: 13900,
            label: "£13,900",
          },
          {
            value: 22700,
            label: "£22,700",
          },
          {
            value: 31350,
            label: "£31,350",
          },
          {
            value: 32700,
            label: "£32,700",
          },
          {
            value: 45400,
            label: "£45,400",
          },
        ],
        description:
          "Your annual spending goal before the modeller applies any tax setting. The presets come from retirement living standard benchmarks, but your own housing, care, travel and family costs may matter more.",
        infoUrl: knowledgeLinks.retirementLivingStandards,
        infoLinkText: "Retirement Living Standards",
      },
    ],
  },
  {
    id: "inflation",
    eyebrow: "Inflation",
    title: "Inflation and projection basis",
    description:
      "Choose whether the modeller shows today’s purchasing power or future inflated pound amounts.",
    fields: [
      {
        id: "projectionBasis",
        label: "How should the modeller treat inflation?",
        type: "select",
        options: [
          {
            value: "real",
            label: "Real terms - show everything in today's money",
          },
          {
            value: "nominal",
            label: "Nominal terms - show future values including inflation",
          },
        ],
        description:
          "Real terms shows figures in today's purchasing power, which makes future income easier to compare with retirement living standards. Nominal terms shows future cash amounts after inflation has been applied.",
        infoUrl: knowledgeLinks.inflationExplainer,
        infoLinkText: "What is inflation?",
      },
      {
        id: "inflationRateAnnual",
        label: "Long-term inflation assumption",
        type: "range",
        min: 0,
        max: 10,
        step: 0.1,
        description:
          "The long-term CPI-style assumption used when projecting income targets, pension increases, and nominal investment balances. The default of 2.5% aligns with the minimum annual increase used in the State Pension triple lock.",
        infoUrl: knowledgeLinks.inflationTarget,
        infoLinkText: "Inflation and the 2% target",
      },
    ],
  },
  {
    id: "partial-retirement",
    eyebrow: "Partial Retirement",
    title: "Partial retirement details",
    description:
      "Reduce regular Alpha accrual from pensionable earnings, and SIPP/ISA contributions from full salary, after partial retirement begins.",
    fields: [
      {
        id: "partialRetirementStartAge",
        label: "Partial retirement start age",
        type: "range",
        min: 40,
        max: 70,
        step: 1,
        inputStep: 1,
        description:
          "The age at which the modeller switches future regular accruals and contributions to a reduced work pattern.",
      },
      {
        id: "fullSalary",
        label: "Full salary before partial retirement (£ per year)",
        type: "currency-input",
        min: 0,
        max: 300000,
        step: 1,
        format: "currency",
        description:
          "Used for partial-retirement work income and SIPP/ISA contribution modelling. Alpha pension accrual still uses pensionable earnings, which may be different from full salary.",
      },
      {
        id: "partialRetirementWorkPercent",
        label: "Pro-rata work level (%)",
        type: "range",
        min: 0,
        max: 100,
        step: 1,
        description:
          "The share of full salary used for partial-retirement income and regular SIPP/ISA contribution modelling. Alpha accrual is pro-rated from pensionable earnings, so lower actual pensionable earnings reduce future 2.32% Alpha accrual.",
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
        description:
          "Use your latest GOV.UK forecast. This is separate from Civil Service pensions and depends on your National Insurance record, State Pension start date, and uprating rules.",
        infoUrl: knowledgeLinks.statePensionForecast,
        infoLinkText: "Check State Pension",
      },
      {
        id: "statePensionDrawDate",
        label: "State Pension start age",
        type: "date",
        description:
          "The date State Pension income begins in the projection. The default is based on your date of birth, but you can model deferral if needed. This timing is separate from any future-growth assumption.",
        infoUrl: knowledgeLinks.statePensionDeferral,
        infoLinkText: "Defer State Pension",
      },
      {
        id: "statePensionApplyFutureGrowth",
        label: "Project State Pension future growth",
        type: "checkbox",
        description:
          "Uprate the current forecast each year until State Pension age using the highest of the inflation assumption, wage growth, and 2.5%. The start date controls when income begins; this controls whether the current forecast is projected forward before then.",
        infoUrl: knowledgeLinks.statePensionTripleLock,
        infoLinkText: "What is the triple lock?",
      },
      {
        id: "statePensionCpiPercent",
        label: "State Pension CPI assumption (%)",
        type: "range",
        min: 0,
        max: 10,
        step: 0.1,
        description:
          "The inflation leg of the triple-lock style growth test. The modeller compares this with wage growth and 2.5% when future growth is enabled.",
      },
      {
        id: "statePensionWageGrowthPercent",
        label: "State Pension wage growth (%)",
        type: "range",
        min: 0,
        max: 10,
        step: 0.1,
        description:
          "The earnings-growth leg of the triple-lock style growth test. Set this to your long-term wage-growth assumption if projecting the forecast before State Pension age.",
      },
    ],
  },
  {
    id: "alpha",
    eyebrow: "Alpha Pension",
    title: "Alpha pension details",
    description:
      "Alpha is a defined benefit, career-average pension. Each scheme year adds 2.32% of your actual pensionable earnings to your annual pension; member contribution rates are a separate payroll cost.",
    fields: [
      {
        id: "alphaPensionAbsDate",
        label: "Last Annual Benefits Statement",
        type: "year",
        description:
          "The scheme year shown on your latest ABS. The modeller treats this as the known checkpoint before projecting future Alpha accrual.",
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
        description:
          "The annual Alpha pension already built up on your ABS. Alpha promises annual pension income worked out from scheme rules: it is a career-average defined benefit pension, not a savings pot or a defined contribution account invested in your name.",
        infoUrl: knowledgeLinks.annualBenefitStatement,
        infoLinkText: "ABS on the pension portal",
      },
      {
        id: "alphaPensionLeaveAge",
        label: "Age You Leave Alpha Scheme",
        type: "range",
        min: 0,
        max: 70,
        step: 1,
        inputStep: 1,
        description:
          "The age you stop active Alpha service. New 2.32% accrual stops here. Existing accrued Alpha pension continues to be revalued by CPI.",
      },
      {
        id: "pensionableEarnings",
        label: "Current Pensionable Earnings (£ per year)",
        type: "range",
        min: 10000,
        max: 150000,
        step: 500,
        format: "currency",
        description:
          "Used for Alpha pension accrual and modelling. Each full scheme year adds 2.32% of actual pensionable earnings to your annual Alpha pension, so £42,000 of pensionable earnings adds £974.40 before later revaluation. Member contributions are a separate payroll cost; the modeller does not multiply your pension by your employee contribution rate, and paying about 5% or 7% does not make the pension accrue at 5% or 7%.",
        infoUrl: knowledgeLinks.alphaAccrual,
        infoLinkText: "Alpha accrual rate",
        infoLinks: [
          {
            href: knowledgeLinks.alphaContributions,
            text: "Contribution rates",
          },
        ],
      },
      {
        id: "alphaPayRisePercent",
        label: "Expected pensionable earnings rise (% per year)",
        type: "range",
        min: 0,
        max: 15,
        step: 0.1,
        description:
          "The annual pay-rise assumption applied to current pensionable earnings before calculating future Alpha accrual. Set this to 0% to keep current pensionable earnings flat. The model compounds this once for each full year after the calculation start date.",
      },
      {
        id: "alphaPensionDrawAge",
        label: "Planned Alpha Pension Draw Age",
        type: "range",
        min: 55,
        max: 70,
        step: 1,
        inputStep: 1,
        description:
          "The age you plan to start taking Alpha. Alpha Normal Pension Age is linked to State Pension age or 65 if later, so draw age changes both when income starts and whether early-payment reductions apply. If you draw Alpha before Normal Pension Age, the model applies reduction factors.",
        infoUrl: knowledgeLinks.alphaEarlyRetirementFactors,
        infoLinkText: "Reduction factors",
      },
      {
        id: "alphaAddedPensionMonthly",
        label: "Added Alpha Pension (£ per month)",
        type: "range",
        min: 0,
        max: ALPHA_ADDED_PENSION_MONTHLY_MAX,
        step: 25,
        format: "currency",
        valuePrefix: "/mo",
        description:
          "Optional extra Alpha pension you choose to buy in addition to the pension you build up each year through normal Alpha service. This is separate from ordinary employee contributions and is calculated using added-pension factor tables.",
        infoUrl: knowledgeLinks.alphaAddedPensionFactors,
        infoLinkText: "Added pension factors",
      },
      {
        id: "alphaAddedPensionFactorType",
        label: "Monthly Added Alpha Pension cover",
        type: "select",
        options: [
          {
            value: "self",
            label: "Self only",
          },
          {
            value: "self_plus_beneficiaries",
            label: "Self and dependants",
          },
        ],
        description:
          "Controls which factor table is used for added pension purchases. It does not change standard Alpha accrual.",
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
        description:
          "The number of years before Normal Pension Age that the EPA portion is intended to be available without early-payment reduction.",
      },
      {
        id: "alphaEpaStartDate",
        label: "EPA Start Date",
        type: "date",
        description:
          "The date from which EPA purchases start in the model. This should overlap your Alpha pensionable service period.",
      },
      {
        id: "alphaEpaEndDate",
        label: "EPA End Date",
        type: "date",
        description:
          "The date EPA purchases stop in the model. This should not run beyond the Alpha service period you are modelling.",
      },
    ],
  },
  {
    id: "nuvos",
    eyebrow: "nuvos Pension",
    title: "Your nuvos pension",
    description:
      "nuvos is a legacy Civil Service defined benefit pension. Since pensionable-service accrual stopped after 31 March 2015, the modeller rolls forward your statement value using pension increases only.",
    fields: [
      {
        id: "nuvosPensionAbsDate",
        label: "nuvos Last Annual Benefits Statement",
        type: "year",
        description:
          "The scheme year shown on your latest nuvos statement. The modeller uses it as the known checkpoint before applying any later CPI-linked pension increases.",
        infoUrl: knowledgeLinks.annualBenefitStatement,
        infoLinkText: "Annual Benefit Statement guide",
      },
      {
        id: "nuvosAccruedPensionAtLastAbs",
        label: "nuvos Pension Accrued at Last Statement (£ per year)",
        type: "currency-input",
        min: 0,
        max: 50000,
        step: 1,
        format: "currency",
        description:
          "The annual nuvos pension already built up on your statement. Like Alpha, this is annual pension income rather than a pot balance.",
      },
      {
        id: "nuvosPensionDrawAge",
        label: "Planned nuvos Pension Draw Age",
        type: "range",
        min: 55,
        max: 70,
        step: 1,
        inputStep: 1,
        description:
          "The age you plan to start taking nuvos benefits. Taking benefits before the scheme pension age may reduce the annual amount.",
        infoUrl: knowledgeLinks.nuvosBenefits,
        infoLinkText: "nuvos pension age",
      },
      {
        id: "nuvosApplyPensionIncreases",
        label: "Apply nuvos pension increases",
        type: "checkbox",
        description:
          "Increase accrued nuvos pension by the selected inflation assumption each year, reflecting cost-of-living revaluation.",
        infoUrl: knowledgeLinks.nuvosBenefits,
        infoLinkText: "nuvos pension increases",
      },
    ],
  },
  {
    id: "sipp",
    eyebrow: "SIPP",
    title: "SIPP details",
    description:
      "Personal pension pot, contribution, relief, and real return assumptions.",
    fields: [
      {
        id: "sippCurrentPot",
        label: "Current SIPP pot (£)",
        type: "currency-input",
        min: 0,
        max: 2000000,
        step: 1,
        format: "currency",
        description:
          "The current defined contribution pension pot you control outside the Civil Service defined benefit schemes. Contributions, tax relief, investment growth, and withdrawals all change the projected balance.",
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
        description:
          "The regular amount you plan to add before drawdown. The model can gross this up for tax relief using the setting below, so this behaves differently from Alpha defined benefit accrual.",
      },
      {
        id: "sippDrawAge",
        label: "SIPP draw start age",
        type: "range",
        min: 55,
        max: 100,
        step: 1,
        inputStep: 1,
        description:
          "The age SIPP withdrawals can start in the model. This is constrained by private pension access rules based on your date of birth, so a SIPP may not be available at the first retirement age you want.",
        infoUrl: knowledgeLinks.pensionAccessAge,
        infoLinkText: "Private pension access",
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
        infoUrl: knowledgeLinks.pensionTaxRelief,
        infoLinkText: "Check pension tax relief",
        description:
          "How the modeller grosses up net SIPP contributions. This affects the SIPP pot projection, not Alpha defined benefit accrual.",
      },
      {
        id: "sippRealInterestPercent",
        label: "SIPP expected nominal return (%)",
        type: "range",
        min: -10,
        max: 10,
        step: 0.1,
        description:
          "Defaults to 5% as a simple long-term planning assumption for a diversified investment pot before inflation. Nominal return means the headline growth rate before removing inflation; in real-terms mode the modeller converts it to a return after inflation.",
      },
      {
        id: "sippWithdrawalStrategy",
        label: "SIPP withdrawal strategy",
        type: "select",
        options: [
          { value: "zero_at_death", label: "Zero at death" },
          { value: "percentage", label: "Annual percentage" },
          { value: "use_by_age", label: "Use by age" },
        ],
        description:
          "Controls how the SIPP pot is drawn down: spread to life expectancy, draw a fixed percentage, or run down by a chosen age.",
      },
      {
        id: "sippWithdrawalPercent",
        label: "SIPP withdrawal rate (%)",
        type: "range",
        min: 0,
        max: 15,
        step: 0.1,
        description:
          "The annual percentage withdrawn from the SIPP pot when the percentage strategy is selected.",
      },
      {
        id: "sippWithdrawalTargetAge",
        label: "SIPP use-by age",
        type: "range",
        min: 55,
        max: 100,
        step: 1,
        inputStep: 1,
        description:
          "The age by which the SIPP pot is intended to be used up when the use-by-age strategy is selected.",
      },
    ],
  },
  {
    id: "isa",
    eyebrow: "ISA",
    title: "ISA details",
    description:
      "ISA pot, contributions, investment return, and drawdown assumptions for flexible bridge spending.",
    fields: [
      {
        id: "isaCurrentPot",
        label: "Current ISA pot (£)",
        type: "currency-input",
        min: 0,
        max: 2000000,
        step: 1,
        format: "currency",
        description:
          "The current ISA balance available for tax-free bridge spending. It is modelled separately because ISA access is usually not tied to pension access ages.",
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
        description:
          "The regular ISA saving you plan to make before retirement. The modeller keeps this separate from pension contributions and tax relief.",
      },
      {
        id: "isaDrawAge",
        label: "ISA draw start age",
        type: "range",
        min: 0,
        max: 100,
        step: 1,
        inputStep: 1,
        description:
          "The age ISA drawdown starts. ISA money can usually be accessed earlier than pension money, which makes it useful for an early-retirement bridge.",
        infoUrl: knowledgeLinks.isaAllowance,
        infoLinkText: "ISA rules",
      },
      {
        id: "isaRealInterestPercent",
        label: "ISA expected nominal return (%)",
        type: "range",
        min: -10,
        max: 10,
        step: 0.1,
        description:
          "Defaults to 5% as a simple long-term planning assumption for a diversified investment pot before inflation. Nominal return means the headline growth rate before removing inflation; in real-terms mode the modeller converts it to a return after inflation.",
      },
      {
        id: "isaWithdrawalStrategy",
        label: "ISA withdrawal strategy",
        type: "select",
        options: [
          { value: "zero_at_death", label: "Zero at death" },
          { value: "percentage", label: "Annual percentage" },
          { value: "use_by_age", label: "Use by age" },
        ],
        description:
          "Controls how the ISA bridge is drawn down: spread to life expectancy, draw a fixed percentage, or run down by a chosen age.",
      },
      {
        id: "isaWithdrawalPercent",
        label: "ISA withdrawal rate (%)",
        type: "range",
        min: 0,
        max: 15,
        step: 0.1,
        description:
          "The annual percentage withdrawn from the ISA balance when the percentage strategy is selected.",
      },
      {
        id: "isaWithdrawalTargetAge",
        label: "ISA use-by age",
        type: "range",
        min: 0,
        max: 100,
        step: 1,
        inputStep: 1,
        description:
          "The age by which the ISA balance is intended to be used up when the use-by-age strategy is selected.",
      },
    ],
  },
  {
    id: "lisa",
    eyebrow: "LISA",
    title: "Lifetime ISA (LISA)",
    description:
      "Lifetime ISA pot, capped contributions, government bonus, investment return, and drawdown assumptions for later-life bridge spending.",
    fields: [
      {
        id: "lisaCurrentPot",
        label: "Current LISA pot (£)",
        type: "currency-input",
        min: 0,
        max: 2000000,
        step: 1,
        format: "currency",
        description:
          "The current Lifetime ISA balance available for later-life tax-free bridge spending. The modeller treats it separately because retirement withdrawals are usually available from age 60.",
      },
      {
        id: "lisaMonthlyContribution",
        label: "Regular LISA contribution (£ per month)",
        type: "range",
        min: 0,
        max: LISA_MONTHLY_CONTRIBUTION_MAX,
        step: 25,
        format: "currency",
        valuePrefix: "/mo",
        description:
          "The regular Lifetime ISA saving you plan to make before age 50. The model caps accepted additions at the LISA annual allowance and applies the government bonus to eligible additions until age 50.",
        infoUrl: knowledgeLinks.lifetimeIsa,
        infoLinkText: "Lifetime ISA rules",
      },
      {
        id: "lisaDrawAge",
        label: "LISA draw start age",
        type: "range",
        min: 60,
        max: 100,
        step: 1,
        inputStep: 1,
        description:
          "The age Lifetime ISA drawdown starts in the retirement model. This modeller assumes later-life withdrawals from age 60 and does not model first-home withdrawals or early-withdrawal charges.",
        infoUrl: knowledgeLinks.lifetimeIsa,
        infoLinkText: "Lifetime ISA rules",
      },
      {
        id: "lisaRealInterestPercent",
        label: "LISA expected nominal return (%)",
        type: "range",
        min: -10,
        max: 10,
        step: 0.1,
        description:
          "Defaults to 5% as a simple long-term planning assumption for a diversified investment pot before inflation. Nominal return means the headline growth rate before removing inflation; in real-terms mode the modeller converts it to a return after inflation.",
      },
      {
        id: "lisaWithdrawalStrategy",
        label: "LISA withdrawal strategy",
        type: "select",
        options: [
          { value: "zero_at_death", label: "Zero at death" },
          { value: "percentage", label: "Annual percentage" },
          { value: "use_by_age", label: "Use by age" },
        ],
        description:
          "Controls how the Lifetime ISA bridge is drawn down: spread to life expectancy, draw a fixed percentage, or run down by a chosen age.",
      },
      {
        id: "lisaWithdrawalPercent",
        label: "LISA withdrawal rate (%)",
        type: "range",
        min: 0,
        max: 15,
        step: 0.1,
        description:
          "The annual percentage withdrawn from the LISA balance when the percentage strategy is selected.",
      },
      {
        id: "lisaWithdrawalTargetAge",
        label: "LISA use-by age",
        type: "range",
        min: 60,
        max: 100,
        step: 1,
        inputStep: 1,
        description:
          "The age by which the LISA balance is intended to be used up when the use-by-age strategy is selected.",
      },
    ],
  },
  {
    id: "tax",
    eyebrow: "Tax",
    title: "Tax assumptions",
    description:
      "Optional simplified UK Income Tax estimate for planning sensitivity rather than tax advice.",
    fields: [
      {
        id: "taxPersonalAllowance",
        label: "Personal Allowance (£ per year)",
        type: "currency-input",
        min: 0,
        max: 50000,
        step: 1,
        format: "currency",
        description:
          "The amount of taxable income assumed before Income Tax is charged. Adjust this if your tax code or future allowance assumption differs.",
        infoUrl: knowledgeLinks.incomeTaxRates,
        infoLinkText: "Income Tax rates",
      },
      {
        id: "taxPersonalAllowanceTaperThreshold",
        label: "Personal Allowance taper threshold (£ per year)",
        type: "currency-input",
        min: 0,
        max: 200000,
        step: 1,
        format: "currency",
        description:
          "The income level above which the model starts reducing the Personal Allowance.",
        infoUrl: knowledgeLinks.incomeTaxRates,
        infoLinkText: "Income Tax rates",
      },
      {
        id: "taxBasicRateLimit",
        label: "Basic-rate taxable band (£ per year)",
        type: "currency-input",
        min: 0,
        max: 100000,
        step: 1,
        format: "currency",
        description:
          "The taxable-income band assumed to be charged at the basic rate before higher-rate tax starts.",
        infoUrl: knowledgeLinks.incomeTaxRates,
        infoLinkText: "Income Tax rates",
      },
      {
        id: "taxAdditionalRateThreshold",
        label: "Additional-rate threshold (£ per year)",
        type: "currency-input",
        min: 0,
        max: 300000,
        step: 1,
        format: "currency",
        description:
          "The taxable-income level at which the additional tax rate starts in this simplified tax model.",
        infoUrl: knowledgeLinks.incomeTaxRates,
        infoLinkText: "Income Tax rates",
      },
      {
        id: "taxBasicRatePercent",
        label: "Basic tax rate (%)",
        type: "range",
        min: 0,
        max: 100,
        step: 0.1,
        description:
          "The tax rate applied to income inside the basic-rate band.",
      },
      {
        id: "taxHigherRatePercent",
        label: "Higher tax rate (%)",
        type: "range",
        min: 0,
        max: 100,
        step: 0.1,
        description:
          "The tax rate applied to taxable income above the basic-rate band and below the additional-rate threshold.",
      },
      {
        id: "taxAdditionalRatePercent",
        label: "Additional tax rate (%)",
        type: "range",
        min: 0,
        max: 100,
        step: 0.1,
        description:
          "The tax rate applied to taxable income above the additional-rate threshold.",
      },
      {
        id: "taxSippTaxFreeWithdrawalPercent",
        label: "SIPP tax-free withdrawal share (%)",
        type: "range",
        min: 0,
        max: 25,
        step: 0.1,
        description:
          "The share of SIPP withdrawals the model treats as tax-free pension cash. Alpha, nuvos, State Pension and taxable SIPP withdrawals can be taxable income; ISA withdrawals are not modelled as taxable income.",
        infoUrl: knowledgeLinks.pensionTaxFree,
        infoLinkText: "Check pension tax-free rules",
      },
    ],
  },
] as const;
