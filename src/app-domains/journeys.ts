import {
  fieldGroups,
  type CurrencyInputField,
  type FieldDefinition,
  type FieldGroup,
  type SettingsKey,
} from "../fieldDefinitions";
import { knowledgeLinks } from "../knowledgeLinks";
import type { PensionSettings } from "../settings";
import { isSettingsGroupVisible } from "./settings-group-visibility";

export const OPTIONAL_SECTION_TOGGLES = [
  {
    key: "showAlpha",
    label: "Alpha",
    description:
      "Models Alpha pension accrual, early retirement reductions, and income from the chosen draw date.",
  },
  {
    key: "partialRetirementEnabled",
    label: "Partial retirement",
    description:
      "Models reduced working hours before retirement and pro-rates regular accruals and contributions.",
  },
  {
    key: "showStatePension",
    label: "State Pension",
    description:
      "Adds estimated State Pension income from the selected State Pension start age.",
  },
  {
    key: "showClassic",
    label: "classic",
    description:
      "Models existing classic benefits separately from Alpha and nuvos, including automatic lump sum, CPI-linked increases, and age-60 early-payment reductions.",
  },
  {
    key: "showClassicPlus",
    label: "classic plus",
    description:
      "Models existing classic plus benefits with separate pre-2002 and post-2002 service and age-60 early-payment reductions.",
  },
  {
    key: "showNuvos",
    label: "nuvos",
    description:
      "Models existing nuvos pension benefits separately from Alpha, including CPI-linked increases and its own draw date.",
  },
  {
    key: "showPremium",
    label: "Premium",
    description:
      "Models preserved Premium pension benefits as a closed legacy pension with CPI-only revaluation and its own draw date.",
  },
  {
    key: "showSipp",
    label: "SIPP",
    description:
      "Models a SIPP pot, contributions, growth, lump sums, and flexible withdrawals.",
  },
  {
    key: "showCsAvc",
    label: "Civil Service AVC",
    description:
      "Models a Civil Service Additional Voluntary Contribution pot as a separate invested pension pot.",
  },
  {
    key: "showIsa",
    label: "ISA",
    description:
      "Models an ISA pot, contributions, growth, lump sums, and flexible withdrawals.",
  },
  {
    key: "showLisa",
    label: "LISA",
    description:
      "Models a Lifetime ISA pot, capped eligible additions, government bonus, growth, and tax-free retirement withdrawals from age 60.",
  },
  {
    key: "showAdditionalGuaranteedIncome",
    label: "Additional guaranteed income",
    description:
      "Includes known retirement income from outside the modelled Civil Service pensions, such as another DB pension, an annuity, or a guaranteed annual income.",
  },
] as const;

export type OptionalSectionToggleKey =
  (typeof OPTIONAL_SECTION_TOGGLES)[number]["key"];

const OPTIONAL_SECTION_TOGGLE_KEY_SET = new Set<OptionalSectionToggleKey>(
  OPTIONAL_SECTION_TOGGLES.map((toggle) => toggle.key)
);

export function isOptionalSectionToggleKey(
  key: SettingsKey
): key is OptionalSectionToggleKey {
  return OPTIONAL_SECTION_TOGGLE_KEY_SET.has(key as OptionalSectionToggleKey);
}

export type JourneyFieldLabels = Partial<Record<FieldDefinition["id"], string>>;
export type JourneyFieldDescriptions = Partial<
  Record<FieldDefinition["id"], string>
>;
export type JourneyCurrencyFieldPresentation = Partial<
  Record<
    CurrencyInputField["id"],
    Pick<
      CurrencyInputField,
      "displayDivisor" | "showAnnualEquivalent" | "presets"
    >
  >
>;
export type JourneyOptionalSectionCopy = Partial<
  Record<
    OptionalSectionToggleKey,
    {
      label: string;
      description: string;
    }
  >
>;

export type JourneySupportLink = {
  heading: string;
  description: string;
  href: string;
  label: string;
};

export type JourneyOptionalQuestion = {
  prompt: string;
  yesLabel: string;
  noLabel: string;
  showPrompt?: boolean;
  setting:
    | {
        id: "alphaAddedPensionMonthly";
        enabledWhen: "positive";
      }
    | {
        id: "alphaEpaEnabled";
        enabledWhen: "true";
      }
    | {
        id: "statePensionForecastConfirmed";
        enabledWhen: "true";
      };
};

export type JourneyResultsSection =
  | {
      id: "summary";
      presentation: "simple" | "standard" | "detailed";
    }
  | {
      id: "retirement-income-chart";
      presentation: "simple" | "standard" | "detailed";
    }
  | {
      id: "income-details";
      presentation: "simple";
    }
  | {
      id: "inflation-basis";
      presentation: "disclosure" | "expanded";
    }
  | { id: "comparison" }
  | { id: "projection-table" };

export type JourneyStepDefinition =
  | {
      id: string;
      eyebrow: string;
      title: string;
      description: string;
      kind: "optional-sections";
      toggleKeys?: readonly OptionalSectionToggleKey[];
      toggleCopy?: JourneyOptionalSectionCopy;
      visible?: (settings: PensionSettings) => boolean;
    }
  | {
      id: string;
      eyebrow: string;
      title: string;
      description: string;
      kind: "fields";
      fieldIds: readonly FieldDefinition["id"][];
      groupId?: FieldGroup["id"];
      fieldLabels?: JourneyFieldLabels;
      fieldDescriptions?: JourneyFieldDescriptions;
      currencyFieldPresentation?: JourneyCurrencyFieldPresentation;
      hideFieldInfoLinks?: boolean;
      supportLink?: JourneySupportLink;
      supportLinkLayout?: "inline";
      optionalQuestion?: JourneyOptionalQuestion;
      addedPensionIncomeGoal?: boolean;
      showFlexibleWithdrawalInsights?: boolean;
      showFlexibleWithdrawalPriority?: boolean;
      showSpendingSmileEditor?: boolean;
      useNpaLinkedDefaults?: boolean;
      visible?: (settings: PensionSettings) => boolean;
    }
  | {
      id: string;
      eyebrow: string;
      title: string;
      description: string;
      kind: "review";
      presentation: "bridge-plan";
      visible?: (settings: PensionSettings) => boolean;
    }
  | {
      id: string;
      eyebrow: string;
      title: string;
      description: string;
      kind: "results";
      sections: readonly JourneyResultsSection[];
      visible?: (settings: PensionSettings) => boolean;
    };

export type JourneySettingsPresentation = {
  alignAlphaLeaveAgeToRetirement: boolean;
  dateOfBirthUpdate:
    | "preserve-retirement-ages"
    | "reset-retirement-ages-to-npa"
    | "relink-npa-defaults";
};

export const DEFAULT_JOURNEY_SETTINGS_PRESENTATION: JourneySettingsPresentation =
  {
    alignAlphaLeaveAgeToRetirement: false,
    dateOfBirthUpdate: "preserve-retirement-ages",
  };

export type JourneyDefinition = {
  id: string;
  title: string;
  description: string;
  settingsPresentation: JourneySettingsPresentation;
  steps: readonly JourneyStepDefinition[];
};

const MONTHLY_SPENDING_TARGET_STEP = {
  title: "What would you like to spend each month?",
  description:
    "Think about the money you would like available each month after estimated tax when you stop working. A rough answer is fine. You can change it later.",
  kind: "fields",
  fieldIds: ["desiredRetirementIncome", "taxRegime"],
  fieldLabels: {
    desiredRetirementIncome:
      "How much would you like available to spend each month after tax?",
    taxRegime: "Which UK tax rules should we use?",
  },
  fieldDescriptions: {
    desiredRetirementIncome:
      "Enter the amount you would like to have left each month after estimated tax. Use today’s prices, as if you were spending the money now. This is a rough planning amount, not a promise of what you will receive.",
    taxRegime:
      "Choose Scotland if you expect to pay Scottish Income Tax in retirement. Otherwise choose England, Wales or Northern Ireland.",
  },
  currencyFieldPresentation: {
    desiredRetirementIncome: {
      displayDivisor: 12,
      showAnnualEquivalent: true,
      presets: [
        {
          value: 13900,
          label: "Minimum — £1,158 a month",
          description: "One-person household example: £13,900 a year",
        },
        {
          value: 32700,
          label: "Moderate — £2,725 a month",
          description: "One-person household example: £32,700 a year",
        },
        {
          value: 45400,
          label: "Comfortable — £3,783 a month",
          description: "One-person household example: £45,400 a year",
        },
      ],
    },
  },
  hideFieldInfoLinks: true,
  supportLinkLayout: "inline",
  supportLink: {
    heading: "Not sure what amount to choose?",
    description:
      "These one-person household examples come from the Retirement Living Standards. Your housing costs, household and personal circumstances can make your spending different, so use them only as a starting point.",
    href: knowledgeLinks.retirementLivingStandards,
    label: "Help me choose a retirement income",
  },
} as const satisfies Omit<
  Extract<JourneyStepDefinition, { kind: "fields" }>,
  "id" | "eyebrow"
>;

const RETIREMENT_AGE_STEP = {
  title: "What age would you like to retire?",
  description:
    "Choose the age when you would like to stop working. This can be earlier than the age your Alpha pension can normally start.",
  kind: "fields",
  fieldIds: ["requirementAge"],
  fieldLabels: {
    requirementAge: "How old would you like to be when you retire?",
  },
  fieldDescriptions: {
    requirementAge:
      "We use this as the age you stop working and stop building more Alpha pension through your job. If your pension starts later, the results show the time between stopping work and receiving it.",
  },
  hideFieldInfoLinks: true,
} as const satisfies Omit<
  Extract<JourneyStepDefinition, { kind: "fields" }>,
  "id" | "eyebrow"
>;

export const JOURNEY_DEFINITIONS = [
  {
    id: "early-retirement-bridge",
    title: "Work out what I need to retire early",
    description:
      "Build a retirement income plan using your Civil Service pension, State Pension, SIPP, ISA, LISA and other savings. See how your bridging pots could support you before your main pensions start.",
    settingsPresentation: {
      alignAlphaLeaveAgeToRetirement: false,
      dateOfBirthUpdate: "preserve-retirement-ages",
    },
    steps: [
      {
        id: "personal",
        eyebrow: "Step 1",
        title: "Your personal details",
        description:
          "Start with the details that determine your current age, pension access ages, and how long this illustration should run.",
        kind: "fields",
        fieldIds: ["dateOfBirth", "lifeExpectancy"],
      },
      {
        id: "target",
        eyebrow: "Step 2",
        ...MONTHLY_SPENDING_TARGET_STEP,
      },
      {
        id: "retirement-age",
        eyebrow: "Step 3",
        ...RETIREMENT_AGE_STEP,
      },
      {
        id: "include",
        eyebrow: "Step 4",
        title: "Your Civil Service pensions",
        description:
          "We include State Pension by default. Tell us which Civil Service pensions you have. Settings you have entered are kept if you hide a section and come back later.",
        kind: "optional-sections",
        toggleKeys: [
          "showAlpha",
          "showClassic",
          "showClassicPlus",
          "showNuvos",
          "showPremium",
        ],
      },
      {
        id: "alpha",
        eyebrow: "Pension details",
        title: "Your Alpha pension",
        description:
          "Add the Alpha pension you have built up and the age you would prefer to draw it.",
        kind: "fields",
        groupId: "alpha",
        fieldIds: [
          "alphaPensionDrawAge",
          "alphaPensionAbsDate",
          "accruedPensionAtLastAbs",
          "pensionableEarnings",
          "alphaAddedPensionMonthly",
          "alphaEpaEnabled",
        ],
        visible: (settings) => settings.showAlpha,
      },
      {
        id: "classic",
        eyebrow: "Optional",
        title: "Your classic pension",
        description:
          "Add classic benefits if they should be part of the bridge calculation.",
        kind: "fields",
        fieldIds: [
          "classicPensionDrawAge",
          "classicCalculationMode",
          "classicFinalSalaryLink",
          "classicCurrentFinalPensionableEarnings",
          "classicPreservedFinalPensionableEarnings",
          "classicReckonableServiceYears",
          "classicAnnualPension",
          "classicAutomaticLumpSum",
          "classicApplyPensionIncreases",
        ],
        visible: (settings) => settings.showClassic,
      },
      {
        id: "classic-plus",
        eyebrow: "Optional",
        title: "Your classic plus pension",
        description:
          "Add classic plus benefits if they should be part of the bridge calculation.",
        kind: "fields",
        fieldIds: [
          "classicPlusPensionDrawAge",
          "classicPlusCalculationMode",
          "classicPlusFinalSalaryLink",
          "classicPlusCurrentFinalPensionableEarnings",
          "classicPlusPreservedFinalPensionableEarnings",
          "classicPlusPre2002ServiceYears",
          "classicPlusPost2002ServiceYears",
          "classicPlusAnnualPension",
          "classicPlusAutomaticLumpSum",
          "classicPlusApplyPensionIncreases",
        ],
        visible: (settings) => settings.showClassicPlus,
      },
      {
        id: "nuvos",
        eyebrow: "Optional",
        title: "Your nuvos pension",
        description:
          "Add nuvos benefits if they should be part of the bridge calculation.",
        kind: "fields",
        fieldIds: [
          "nuvosPensionDrawAge",
          "nuvosPensionAbsDate",
          "nuvosAccruedPensionAtLastAbs",
          "nuvosApplyPensionIncreases",
          "nuvosAssumedCpiPercent",
        ],
        visible: (settings) => settings.showNuvos,
      },
      {
        id: "premium",
        eyebrow: "Optional",
        title: "Your Premium pension",
        description:
          "Add preserved Premium benefits if they should be part of the bridge calculation.",
        kind: "fields",
        fieldIds: [
          "premiumAnnualPensionAtValuationDate",
          "premiumValuationDate",
          "premiumDrawAge",
          "premiumNormalPensionAge",
          "premiumEarliestAccessAge",
          "premiumHasNpa65",
        ],
        visible: (settings) => settings.showPremium,
      },
      {
        id: "state",
        eyebrow: "Optional",
        title: "State Pension",
        description:
          "Check your State Pension forecast and the date it becomes available.",
        kind: "fields",
        fieldIds: [
          "currentStatePension",
          "statePensionForecastConfirmed",
          "statePensionDrawDate",
          "statePensionApplyFutureGrowth",
          "statePensionCpiPercent",
          "statePensionWageGrowthPercent",
        ],
        visible: (settings) => settings.showStatePension,
        fieldLabels: {
          currentStatePension: "State Pension forecast (£ per year)",
        },
      },
      {
        id: "pots",
        eyebrow: "Bridge funding",
        title: "Your bridging money",
        description:
          "Select the flexible savings, pension pots, and other guaranteed income that could support your retirement. ISA, LISA and SIPP are included initially; untick anything you do not have or do not want to use in this scenario. Values you entered are kept if you hide an option and select it again later.",
        kind: "optional-sections",
        toggleKeys: [
          "showIsa",
          "showLisa",
          "showSipp",
          "showCsAvc",
          "showAdditionalGuaranteedIncome",
        ],
        toggleCopy: {
          showIsa: {
            label: "ISA",
            description:
              "Include an ISA that could provide tax-free withdrawals before your pensions start.",
          },
          showLisa: {
            label: "Lifetime ISA (LISA)",
            description:
              "Include a Lifetime ISA that could provide tax-free retirement withdrawals from age 60.",
          },
          showSipp: {
            label: "SIPP or personal pension",
            description:
              "Include a defined contribution pension pot that you manage outside the Civil Service defined benefit schemes.",
          },
          showCsAvc: {
            label: "Civil Service AVC",
            description:
              "Include a separate invested pension pot built through Civil Service Additional Voluntary Contributions.",
          },
          showAdditionalGuaranteedIncome: {
            label: "Other guaranteed income",
            description:
              "Include known retirement income outside the modelled Civil Service pensions, such as another defined benefit pension or an annuity.",
          },
        },
      },
      {
        id: "bridge-strategy",
        eyebrow: "Withdrawal plan",
        title: "How should your bridging money be used?",
        description:
          "Choose whether your spending target changes later in retirement, then set the withdrawal instruction for each selected pot and the order for pots used to meet your income target.",
        kind: "fields",
        fieldIds: [],
        showSpendingSmileEditor: true,
        showFlexibleWithdrawalPriority: true,
      },
      {
        id: "additional-income",
        eyebrow: "Optional",
        title: "Additional guaranteed income",
        description:
          "Add known retirement income from outside the modelled Civil Service pensions, such as another DB pension, an annuity, or a guaranteed annual income.",
        kind: "fields",
        groupId: "additional-income",
        fieldIds: [],
        visible: (settings) => settings.showAdditionalGuaranteedIncome,
      },
      {
        id: "isa",
        eyebrow: "Optional",
        title: "Your ISA",
        description:
          "Add the ISA balance and contributions that could help fund the period before your pensions start.",
        kind: "fields",
        fieldIds: [
          "isaCurrentPot",
          "isaMonthlyContribution",
          "isaDrawAge",
          "isaRealInterestPercent",
          "isaWithdrawalPercent",
          "isaWithdrawalTargetAge",
        ],
        fieldLabels: {
          isaCurrentPot: "Current ISA balance (£)",
          isaMonthlyContribution:
            "Planned monthly ISA contribution before retirement",
        },
        visible: (settings) => settings.showIsa,
      },
      {
        id: "lisa",
        eyebrow: "Optional",
        title: "Your Lifetime ISA",
        description:
          "Add the Lifetime ISA balance and contributions that could help fund retirement from age 60.",
        kind: "fields",
        fieldIds: [
          "lisaCurrentPot",
          "lisaMonthlyContribution",
          "lisaDrawAge",
          "lisaRealInterestPercent",
          "lisaWithdrawalPercent",
          "lisaWithdrawalTargetAge",
        ],
        fieldLabels: {
          lisaCurrentPot: "Current LISA balance (£)",
          lisaMonthlyContribution:
            "Planned monthly LISA contribution before age 50",
          lisaDrawAge: "LISA access age",
        },
        visible: (settings) => settings.showLisa,
      },
      {
        id: "sipp",
        eyebrow: "Optional",
        title: "Your SIPP or personal pension",
        description:
          "Add the personal pension balance and contributions that could help fund retirement once the pot is accessible.",
        kind: "fields",
        fieldIds: [
          "sippCurrentPot",
          "sippMonthlyContribution",
          "sippDrawAge",
          "sippHasProtectedPensionAge",
          "sippTaxReliefRate",
          "sippRealInterestPercent",
          "sippWithdrawalPercent",
          "sippWithdrawalTargetAge",
        ],
        fieldLabels: {
          sippCurrentPot: "Current SIPP balance (£)",
          sippMonthlyContribution:
            "Planned monthly SIPP contribution before retirement",
          sippDrawAge: "SIPP access age",
        },
        visible: (settings) => settings.showSipp,
      },
      {
        id: "cs-avc",
        eyebrow: "Optional",
        title: "Your Civil Service AVC",
        description:
          "Add the Civil Service AVC balance and contributions that could help fund retirement once the pot is accessible.",
        kind: "fields",
        fieldIds: [
          "csAvcCurrentPot",
          "csAvcMonthlyContribution",
          "csAvcDrawAge",
          "csAvcHasProtectedPensionAge",
          "csAvcRealInterestPercent",
          "csAvcWithdrawalPercent",
          "csAvcWithdrawalTargetAge",
        ],
        fieldLabels: {
          csAvcCurrentPot: "Current CS AVC balance (£)",
          csAvcMonthlyContribution:
            "Planned monthly CS AVC contribution before retirement",
          csAvcDrawAge: "CS AVC access age",
        },
        visible: (settings) => settings.showCsAvc,
      },
      {
        id: "pot-tax",
        eyebrow: "Optional",
        title: "Your pension pot tax assumptions",
        description:
          "Confirm how withdrawals from your selected pension pots should be treated for estimated Income Tax and tax-free cash.",
        kind: "fields",
        fieldIds: [
          "taxSippWithdrawalTreatment",
          "taxSippTaxFreeWithdrawalPercent",
          "taxCsAvcWithdrawalTreatment",
          "taxCsAvcTaxFreeWithdrawalPercent",
          "taxTrackLumpSumAllowance",
          "taxLumpSumAllowance",
          "taxLumpSumAllowanceUsed",
        ],
        visible: (settings) => settings.showSipp || settings.showCsAvc,
      },
      {
        id: "check-plan",
        eyebrow: "Review",
        title: "Check your plan",
        description:
          "Review the choices the model will use. Go back to change any section, then calculate and view this planning illustration.",
        kind: "review",
        presentation: "bridge-plan",
      },
      {
        id: "answer",
        eyebrow: "Result",
        title: "Your results",
        description:
          "Review your projected income, flexible withdrawals, key dates, and assumptions.",
        kind: "results",
        sections: [
          { id: "summary", presentation: "standard" },
          { id: "retirement-income-chart", presentation: "standard" },
          { id: "inflation-basis", presentation: "expanded" },
          { id: "comparison" },
          { id: "projection-table" },
        ],
      },
    ],
  },
  {
    id: "simple-early-retirement",
    title: "Simplified retirement journey",
    description:
      "A short, step-by-step guide to help you understand your Alpha pension and estimate what your retirement income could look like.",
    settingsPresentation: {
      alignAlphaLeaveAgeToRetirement: true,
      dateOfBirthUpdate: "reset-retirement-ages-to-npa",
    },
    steps: [
      {
        id: "personal",
        eyebrow: "Step 1",
        title: "A little about you",
        description:
          "We use your date of birth to work out your current age and when your Alpha pension can normally start.",
        kind: "fields",
        fieldIds: ["dateOfBirth"],
        fieldLabels: {
          dateOfBirth: "Your date of birth",
        },
      },
      {
        id: "target",
        eyebrow: "Step 2",
        ...MONTHLY_SPENDING_TARGET_STEP,
      },
      {
        id: "retirement-age",
        eyebrow: "Step 3",
        ...RETIREMENT_AGE_STEP,
      },
      {
        id: "alpha",
        eyebrow: "Step 4",
        title: "Add your Alpha pension details",
        description:
          "Use the Alpha section of your latest Annual Benefit Statement. You only need three figures, and you can change them later.",
        kind: "fields",
        fieldIds: [
          "alphaPensionAbsDate",
          "accruedPensionAtLastAbs",
          "pensionableEarnings",
        ],
        fieldLabels: {
          alphaPensionAbsDate: "What year is your latest pension statement?",
          accruedPensionAtLastAbs: "Yearly Alpha pension built up so far (£)",
          pensionableEarnings:
            "Yearly pay used to build your Alpha pension (£)",
        },
        fieldDescriptions: {
          alphaPensionAbsDate:
            "Copy the year shown on your latest Annual Benefit Statement. We use it as the starting point for the estimate.",
          accruedPensionAtLastAbs:
            "Copy the yearly Alpha pension amount from your statement. It may be called ‘accrued pension’. Do not enter a total pot value.",
          pensionableEarnings:
            "Copy the yearly pay figure used for your Alpha pension. Your statement may call it ‘pensionable earnings’. If you cannot find it, ask your employer which pay figure Alpha uses.",
        },
        hideFieldInfoLinks: true,
        supportLink: {
          heading: "Where can I find these figures?",
          description:
            "Look for the Alpha section of your latest Annual Benefit Statement. If you cannot find your current pensionable pay, your employer can tell you which parts of your pay count towards Alpha.",
          href: knowledgeLinks.annualBenefitStatement,
          label: "Help me find my Annual Benefit Statement",
        },
        visible: (settings) => settings.showAlpha,
      },
      {
        id: "state-pension-forecast",
        eyebrow: "Step 5",
        title: "Do you know your State Pension forecast?",
        description:
          "Your State Pension amount is personal to you. If you have checked it on GOV.UK, enter the yearly amount shown there. If not, we can use a temporary amount.",
        kind: "fields",
        fieldIds: ["currentStatePension"],
        fieldLabels: {
          currentStatePension:
            "How much State Pension does your forecast show each year?",
        },
        fieldDescriptions: {
          currentStatePension:
            "Enter the yearly amount from your personalised forecast. If it shows a weekly amount, multiply it by 52.",
        },
        hideFieldInfoLinks: true,
        supportLink: {
          heading: "Check your personalised forecast",
          description:
            "GOV.UK can show how much State Pension you could get, when you can get it and whether you may be able to increase it.",
          href: knowledgeLinks.statePensionForecast,
          label: "Check my State Pension forecast",
        },
        optionalQuestion: {
          prompt: "Do you know your State Pension forecast?",
          noLabel: "No — use £12,548 a year for now",
          yesLabel: "Yes, enter my forecast",
          showPrompt: true,
          setting: {
            id: "statePensionForecastConfirmed",
            enabledWhen: "true",
          },
        },
        visible: (settings) => settings.showStatePension,
      },
      {
        id: "include",
        eyebrow: "Step 6",
        title: "Do you have any other Civil Service pensions?",
        description:
          "Alpha is always included in this simplified journey. Select any older Civil Service pension or Civil Service AVC savings shown on your pension statement. If you are not sure, leave it off for now — you can come back later.",
        kind: "optional-sections",
        toggleKeys: [
          "showClassic",
          "showClassicPlus",
          "showNuvos",
          "showPremium",
          "showCsAvc",
        ],
        toggleCopy: {
          showClassic: {
            label: "classic pension",
            description:
              "Choose this if your pension statement says classic. It is an older pension based on your salary and usually includes a lump sum when you take it.",
          },
          showClassicPlus: {
            label: "classic plus pension",
            description:
              "Choose this if your pension statement says classic plus. It uses one set of rules for your earlier service and another for your later service, so the modeller asks for both.",
          },
          showNuvos: {
            label: "nuvos pension",
            description:
              "Choose this if your pension statement says nuvos. It is an older pension that built up a little at a time from your pay each year.",
          },
          showPremium: {
            label: "premium pension",
            description:
              "Choose this if your pension statement says premium. It is an older pension based on your salary. It does not normally pay a lump sum automatically, although you can usually choose to take one by giving up some yearly pension.",
          },
          showCsAvc: {
            label: "Civil Service AVC savings",
            description:
              "Choose this if you made extra pension payments called Additional Voluntary Contributions. This money went into a separate pension pot, and its value depends on how much was paid in and how its investments performed.",
          },
        },
      },
      {
        id: "classic",
        eyebrow: "Optional",
        title: "Copy your classic pension amounts",
        description:
          "Use the classic section of your pension statement. Copy the yearly pension and one-off payment shown there, then choose when you want the pension to start.",
        kind: "fields",
        fieldIds: [
          "classicAnnualPension",
          "classicAutomaticLumpSum",
          "classicPensionDrawAge",
          "classicApplyPensionIncreases",
        ],
        fieldLabels: {
          classicAnnualPension:
            "Yearly classic pension shown on your statement (£)",
          classicAutomaticLumpSum:
            "One-off classic payment shown on your statement (£)",
          classicPensionDrawAge:
            "How old would you like to be when this pension starts?",
          classicApplyPensionIncreases:
            "Allow for this pension rising with prices?",
        },
        fieldDescriptions: {
          classicAnnualPension:
            "Copy the yearly pension amount from the classic section of your statement.",
          classicAutomaticLumpSum:
            "Copy the automatic lump sum from your statement. This is the one-off amount paid when the pension starts.",
          classicPensionDrawAge:
            "Starting it before age 60 will usually make the yearly amount smaller. The estimate applies that reduction.",
          classicApplyPensionIncreases:
            "Leave this on if you want the estimate to allow for yearly increases before and after the pension starts.",
        },
        hideFieldInfoLinks: true,
        visible: (settings) => settings.showClassic,
      },
      {
        id: "classic-plus",
        eyebrow: "Optional",
        title: "Copy your classic plus pension amounts",
        description:
          "Use the classic plus section of your pension statement. Copy the yearly pension and one-off payment shown there, then choose when you want the pension to start.",
        kind: "fields",
        fieldIds: [
          "classicPlusAnnualPension",
          "classicPlusAutomaticLumpSum",
          "classicPlusPensionDrawAge",
          "classicPlusApplyPensionIncreases",
        ],
        fieldLabels: {
          classicPlusAnnualPension:
            "Yearly classic plus pension shown on your statement (£)",
          classicPlusAutomaticLumpSum:
            "One-off classic plus payment shown on your statement (£)",
          classicPlusPensionDrawAge:
            "How old would you like to be when this pension starts?",
          classicPlusApplyPensionIncreases:
            "Allow for this pension rising with prices?",
        },
        fieldDescriptions: {
          classicPlusAnnualPension:
            "Copy the yearly pension amount from the classic plus section of your statement.",
          classicPlusAutomaticLumpSum:
            "Copy the automatic lump sum from your statement. This is the one-off amount paid when the pension starts.",
          classicPlusPensionDrawAge:
            "Starting it before age 60 will usually make the yearly amount smaller. The estimate applies that reduction.",
          classicPlusApplyPensionIncreases:
            "Leave this on if you want the estimate to allow for yearly increases before and after the pension starts.",
        },
        hideFieldInfoLinks: true,
        visible: (settings) => settings.showClassicPlus,
      },
      {
        id: "nuvos",
        eyebrow: "Optional",
        title: "Copy your nuvos pension amount",
        description:
          "Use the nuvos section of your pension statement. Copy the statement year and yearly pension amount, then choose when you want the pension to start.",
        kind: "fields",
        fieldIds: [
          "nuvosPensionAbsDate",
          "nuvosAccruedPensionAtLastAbs",
          "nuvosPensionDrawAge",
          "nuvosApplyPensionIncreases",
          "nuvosAssumedCpiPercent",
        ],
        fieldLabels: {
          nuvosPensionAbsDate: "Year shown on your nuvos statement",
          nuvosAccruedPensionAtLastAbs:
            "Yearly nuvos pension shown on your statement (£)",
          nuvosPensionDrawAge:
            "How old would you like to be when this pension starts?",
          nuvosApplyPensionIncreases:
            "Allow for this pension rising with prices?",
          nuvosAssumedCpiPercent: "How much might prices rise each year? (%)",
        },
        fieldDescriptions: {
          nuvosPensionAbsDate:
            "Copy the year printed on the nuvos section of your latest pension statement.",
          nuvosAccruedPensionAtLastAbs:
            "Copy the yearly pension amount from the nuvos section of your statement.",
          nuvosPensionDrawAge:
            "Starting it before its usual pension age will normally make the yearly amount smaller. The estimate applies that reduction.",
          nuvosApplyPensionIncreases:
            "Leave this on if you want the estimate to allow for yearly increases before and after the pension starts.",
          nuvosAssumedCpiPercent:
            "This is a guess for how much prices, and this pension, may rise each year.",
        },
        hideFieldInfoLinks: true,
        visible: (settings) => settings.showNuvos,
      },
      {
        id: "premium",
        eyebrow: "Optional",
        title: "Copy your Premium pension amount",
        description:
          "Use the Premium section of your pension statement. Copy the yearly pension and statement date, then answer the questions about when it can start.",
        kind: "fields",
        fieldIds: [
          "premiumAnnualPensionAtValuationDate",
          "premiumValuationDate",
          "premiumDrawAge",
          "premiumNormalPensionAge",
          "premiumEarliestAccessAge",
          "premiumHasNpa65",
        ],
        fieldLabels: {
          premiumAnnualPensionAtValuationDate:
            "Yearly Premium pension shown on your statement (£)",
          premiumValuationDate: "Date shown beside that Premium amount",
          premiumDrawAge:
            "How old would you like to be when this pension starts?",
          premiumHasNpa65:
            "Does your statement say this pension normally starts at 65?",
          premiumNormalPensionAge:
            "Age your statement says this pension normally starts",
          premiumEarliestAccessAge:
            "Earliest age your statement says you can take it",
        },
        fieldDescriptions: {
          premiumAnnualPensionAtValuationDate:
            "Copy the yearly pension amount from the Premium section of your statement.",
          premiumValuationDate:
            "Copy the date that the statement says this pension amount was worked out for.",
          premiumDrawAge:
            "Starting it before its usual age will normally make the yearly amount smaller.",
          premiumHasNpa65:
            "Choose yes only if your pension record says age 65. Most Premium pensions normally start at 60.",
          premiumNormalPensionAge: "Copy this age from your pension record.",
          premiumEarliestAccessAge:
            "Choose age 50 only if your pension record confirms it. Otherwise choose 55.",
        },
        hideFieldInfoLinks: true,
        visible: (settings) => settings.showPremium,
      },
      {
        id: "cs-avc",
        eyebrow: "Optional",
        title: "Copy your Civil Service AVC savings",
        description:
          "Use your latest Civil Service AVC statement for the current value, then add what you pay each month and when you want to start using the money.",
        kind: "fields",
        fieldIds: [
          "csAvcCurrentPot",
          "csAvcMonthlyContribution",
          "csAvcDrawAge",
          "csAvcHasProtectedPensionAge",
          "csAvcRealInterestPercent",
        ],
        fieldLabels: {
          csAvcCurrentPot:
            "Current value shown on your Civil Service AVC statement (£)",
          csAvcMonthlyContribution:
            "How much do you pay into it each month? (£)",
          csAvcDrawAge:
            "How old would you like to be when you start using this money?",
          csAvcHasProtectedPensionAge:
            "Does your statement confirm that you can use it before the normal minimum age?",
          csAvcRealInterestPercent:
            "How much might this money grow each year after price rises? (%)",
        },
        fieldDescriptions: {
          csAvcCurrentPot:
            "Copy the current value from your latest Civil Service AVC statement.",
          csAvcMonthlyContribution:
            "Enter the amount that normally leaves your pay each month. Enter £0 if you no longer pay into it.",
          csAvcDrawAge:
            "This is the age when the estimate starts using this money as retirement income.",
          csAvcHasProtectedPensionAge:
            "Choose yes only if your provider has confirmed this in writing.",
          csAvcRealInterestPercent:
            "This is a guess for investment growth after allowing for prices rising.",
        },
        hideFieldInfoLinks: true,
        visible: (settings) => settings.showCsAvc,
      },
      {
        id: "answer",
        eyebrow: "Result",
        title: "Your results",
        description:
          "See how much money you may have each month and where it may come from.",
        kind: "results",
        sections: [
          { id: "summary", presentation: "simple" },
          { id: "retirement-income-chart", presentation: "simple" },
          { id: "income-details", presentation: "simple" },
          { id: "inflation-basis", presentation: "disclosure" },
        ],
      },
    ],
  },
  {
    id: "expert-journey",
    title: "Expert journey",
    description:
      "This journey gives you more control over your retirement projection, including detailed assumptions for pensions, savings, tax, inflation, investment growth and partial retirement.",
    settingsPresentation: {
      alignAlphaLeaveAgeToRetirement: false,
      dateOfBirthUpdate: "relink-npa-defaults",
    },
    steps: createExpertJourneySteps(),
  },
] as const satisfies readonly JourneyDefinition[];

function createExpertJourneySteps(): JourneyStepDefinition[] {
  return [
    {
      id: "optional-sections",
      eyebrow: "Step 1",
      title: "Optional sections",
      description:
        "Choose which parts of the modeller are in this scenario. Hidden sections keep their saved values, and later stages update automatically when you include or remove a section.",
      kind: "optional-sections",
      toggleKeys: OPTIONAL_SECTION_TOGGLES.map((toggle) => toggle.key),
    },
    ...fieldGroups.map(createExpertJourneyFieldStep),
    {
      id: "answer",
      eyebrow: "Result",
      title: "Your results",
      description:
        "Review your projected income, flexible withdrawals, saved scenarios, and the full month-by-month projection table.",
      kind: "results",
      sections: [
        { id: "summary", presentation: "detailed" },
        { id: "retirement-income-chart", presentation: "detailed" },
        { id: "inflation-basis", presentation: "expanded" },
        { id: "comparison" },
        { id: "projection-table" },
      ],
    },
  ];
}

function createExpertJourneyFieldStep(
  group: FieldGroup
): JourneyStepDefinition {
  return {
    id: `expert-${group.id}`,
    eyebrow: group.eyebrow,
    title: group.title,
    description: group.description,
    kind: "fields",
    groupId: group.id,
    fieldIds: group.fields.map((field) => field.id),
    showFlexibleWithdrawalInsights: true,
    showFlexibleWithdrawalPriority: group.id === "retirement-target",
    showSpendingSmileEditor: group.id === "retirement-target",
    useNpaLinkedDefaults: true,
    visible: isExpertJourneyGroupVisible(group.id),
  };
}

function isExpertJourneyGroupVisible(groupId: string) {
  if (
    groupId === "alpha" ||
    groupId === "classic" ||
    groupId === "classic-plus" ||
    groupId === "nuvos" ||
    groupId === "premium" ||
    groupId === "state" ||
    groupId === "sipp" ||
    groupId === "cs-avc" ||
    groupId === "isa" ||
    groupId === "lisa" ||
    groupId === "tax" ||
    groupId === "additional-income" ||
    groupId === "partial-retirement"
  ) {
    return (settings: PensionSettings) =>
      isSettingsGroupVisible(groupId, settings);
  }

  return undefined;
}

export function applyBridgeJourneyDefaults(
  settings: PensionSettings
): PensionSettings {
  return {
    ...settings,
    showStatePension: true,
    showSipp: true,
    showCsAvc: settings.showCsAvc,
    showIsa: true,
    showLisa: true,
    sippWithdrawalStrategy: "use_by_age",
    csAvcWithdrawalStrategy: "use_by_age",
    isaWithdrawalStrategy: "use_by_age",
    lisaWithdrawalStrategy: "use_by_age",
    taxationEnabled: true,
    retirementIncomeTargetBasis: "after_tax",
    partialRetirementEnabled: false,
  };
}

export function applyExpertJourneyDefaults(
  settings: PensionSettings
): PensionSettings {
  return {
    ...settings,
    taxationEnabled: true,
    retirementIncomeTargetBasis: "after_tax",
  };
}

export function applySimpleJourneyDefaults(
  settings: PensionSettings
): PensionSettings {
  const normalPensionAge = settings.normalPensionAge;

  return {
    ...settings,
    showAlpha: true,
    requirementAge: normalPensionAge,
    alphaPensionLeaveAge: normalPensionAge,
    alphaPensionDrawAge: normalPensionAge,
    nuvosPensionDrawAge: settings.nuvosPensionDrawAge,
    showStatePension: true,
    showSipp: false,
    showCsAvc: settings.showCsAvc,
    showIsa: false,
    showLisa: false,
    showNuvos: settings.showNuvos,
    showClassic: settings.showClassic,
    showClassicPlus: settings.showClassicPlus,
    showPremium: settings.showPremium,
    alphaAddedPensionMonthly: 0,
    classicCalculationMode: "manual",
    classicPlusCalculationMode: "manual",
    alphaAddedPensionFactorType: "self",
    statePensionApplyFutureGrowth: false,
    assumedCpiPercent: 0,
    spendingStrategyType: "FLAT",
    sippWithdrawalStrategy: "use_by_age",
    csAvcWithdrawalStrategy: "use_by_age",
    isaWithdrawalStrategy: "use_by_age",
    lisaWithdrawalStrategy: "use_by_age",
    taxationEnabled: true,
    retirementIncomeTargetBasis: "after_tax",
    partialRetirementEnabled: false,
    alphaEpaEnabled: false,
    showAdditionalGuaranteedIncome: false,
    alphaAddedPensionLumpSums: [],
  };
}
