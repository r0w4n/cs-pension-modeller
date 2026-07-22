import {
  fieldGroups,
  type FieldDefinition,
  type FieldGroup,
  type SettingsKey,
} from "../fieldDefinitions";
import type { PensionSettings } from "../settings";
import { isSettingsGroupVisible } from "./shared";

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
  {
    key: "taxationEnabled",
    label: "Taxation",
    description:
      "Estimates take-home retirement income after Income Tax using the selected tax assumptions.",
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

export type JourneyStepDefinition =
  | {
      id: string;
      eyebrow: string;
      title: string;
      description: string;
      kind: "optional-sections" | "answer" | "bridge-answer" | "expert-answer";
      hideInactiveLegendItems?: boolean;
      hideBridgeFundingSection?: boolean;
      hideFlexibleAssetsSection?: boolean;
      showProjectionTable?: boolean;
      toggleKeys?: readonly OptionalSectionToggleKey[];
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
      visible?: (settings: PensionSettings) => boolean;
    };

export type JourneyDefinition = {
  id: string;
  title: string;
  description: string;
  steps: readonly JourneyStepDefinition[];
};

export const JOURNEY_DEFINITIONS = [
  {
    id: "early-retirement-bridge",
    title: "Work out what I need to retire early",
    description:
      "Build a retirement income plan using your Civil Service pension, State Pension, SIPP, ISA, LISA and other savings. See how your bridging pots could support you before your main pensions start.",
    steps: [
      {
        id: "target",
        eyebrow: "Step 1",
        title: "Your retirement target",
        description:
          "Set the age you want to stop work and the income you want that retirement to support.",
        kind: "fields",
        fieldIds: ["requirementAge", "desiredRetirementIncome"],
        fieldLabels: {
          requirementAge: "Target retirement age",
          desiredRetirementIncome: "Income you want in retirement (£ per year)",
        },
      },
      {
        id: "personal",
        eyebrow: "Step 2",
        title: "Your personal details",
        description:
          "Set the details that define current age, access ages, and the length of the bridge.",
        kind: "fields",
        fieldIds: ["dateOfBirth", "lifeExpectancy"],
      },
      {
        id: "include",
        eyebrow: "Step 3",
        title: "Your Civil Service pensions",
        description:
          "We include State Pension, ISA, LISA and SIPP by default. Tell us which Civil Service pensions you have. Settings you have entered are kept if you hide a section and come back later.",
        kind: "optional-sections",
        toggleKeys: [
          "showAlpha",
          "showClassic",
          "showClassicPlus",
          "showNuvos",
          "showPremium",
          "showCsAvc",
        ],
      },
      {
        id: "alpha",
        eyebrow: "Step 4",
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
          "alphaEpaYearsBeforeNpa",
          "alphaEpaStartDate",
          "alphaEpaEndDate",
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
        id: "additional-income",
        eyebrow: "Optional",
        title: "Additional guaranteed income",
        description:
          "Add known retirement income from outside the modelled Civil Service pensions, such as another DB pension, an annuity, or a guaranteed annual income.",
        kind: "fields",
        groupId: "additional-income",
        fieldIds: [],
      },
      {
        id: "pots",
        eyebrow: "Step 5",
        title: "Your bridging pots",
        description:
          "Bridge pots are flexible savings and pensions used to cover income gaps before pension income fully starts. Keep Civil Service AVC, ISA, LISA and SIPP separate so the model respects tax relief, access ages, bonuses, and drawdown timing.",
        kind: "fields",
        fieldIds: [
          "isaCurrentPot",
          "isaMonthlyContribution",
          "isaDrawAge",
          "isaRealInterestPercent",
          "lisaCurrentPot",
          "lisaMonthlyContribution",
          "lisaDrawAge",
          "lisaRealInterestPercent",
          "sippCurrentPot",
          "sippMonthlyContribution",
          "sippDrawAge",
          "sippHasProtectedPensionAge",
          "sippTaxReliefRate",
          "sippRealInterestPercent",
          "csAvcCurrentPot",
          "csAvcMonthlyContribution",
          "csAvcDrawAge",
          "csAvcHasProtectedPensionAge",
          "csAvcRealInterestPercent",
        ],
        fieldLabels: {
          isaCurrentPot: "Current ISA balance (£)",
          isaMonthlyContribution:
            "Planned monthly ISA contribution before retirement",
          lisaCurrentPot: "Current LISA balance (£)",
          lisaMonthlyContribution:
            "Planned monthly LISA contribution before age 50",
          lisaDrawAge: "LISA access age",
          sippCurrentPot: "Current SIPP balance (£)",
          sippMonthlyContribution:
            "Planned monthly SIPP contribution before retirement",
          sippDrawAge: "SIPP access age",
          csAvcCurrentPot: "Current CS AVC balance (£)",
          csAvcMonthlyContribution:
            "Planned monthly CS AVC contribution before retirement",
          csAvcDrawAge: "CS AVC access age",
        },
      },
      {
        id: "answer",
        eyebrow: "Result",
        title: "Your results",
        description:
          "Review your projected income, bridge funding, key dates, and assumptions.",
        kind: "bridge-answer",
        showProjectionTable: true,
      },
    ],
  },
  {
    id: "simple-early-retirement",
    title: "Simplified retirement journey",
    description:
      "Answer a smaller set of questions to see what your retirement could look like financially, then review your projected income, key dates, and assumptions.",
    steps: [
      {
        id: "basics",
        eyebrow: "Step 1",
        title: "About you and your target",
        description:
          "Start with your date of birth and the income you want the plan to support. The simplified journey assumes retirement at your Normal Pension Age.",
        kind: "fields",
        fieldIds: ["dateOfBirth", "desiredRetirementIncome"],
        fieldLabels: {
          dateOfBirth: "Date of birth",
          desiredRetirementIncome: "Target retirement income (£ per year)",
        },
      },
      {
        id: "include",
        eyebrow: "Step 2",
        title: "Your Civil Service pensions",
        description:
          "Tell us which Civil Service pensions you have. Settings you have entered are kept if you hide a section and come back later.",
        kind: "optional-sections",
        toggleKeys: [
          "showAlpha",
          "showClassic",
          "showClassicPlus",
          "showNuvos",
          "showPremium",
          "showCsAvc",
        ],
      },
      {
        id: "alpha",
        eyebrow: "Step 3",
        title: "Your Alpha pension",
        description:
          "Enter the main figures from your latest statement. The simplified journey assumes you leave and draw Alpha at your Normal Pension Age.",
        kind: "fields",
        fieldIds: [
          "alphaPensionAbsDate",
          "accruedPensionAtLastAbs",
          "pensionableEarnings",
        ],
        fieldLabels: {
          alphaPensionAbsDate: "Annual Benefits Statement year",
          accruedPensionAtLastAbs: "Accrued pension to date (£ per year)",
          pensionableEarnings: "Pensionable earnings (£ per year)",
        },
        visible: (settings) => settings.showAlpha,
      },
      {
        id: "alpha-options",
        eyebrow: "Step 4",
        title: "Added pension",
        description:
          "Add monthly added pension purchases you want reflected in the plan. Lump sum purchases are not included in the simplified journey.",
        kind: "fields",
        fieldIds: ["alphaAddedPensionMonthly"],
        fieldLabels: {
          alphaAddedPensionMonthly: "Monthly added pension payments (£)",
        },
        visible: (settings) => settings.showAlpha,
      },
      {
        id: "alpha-epa",
        eyebrow: "Optional",
        title: "Alpha EPA",
        description:
          "Set the EPA period and the number of years before Normal Pension Age that the EPA portion is intended to be available without early-payment reduction.",
        kind: "fields",
        fieldIds: [
          "alphaEpaEnabled",
          "alphaEpaYearsBeforeNpa",
          "alphaEpaStartDate",
          "alphaEpaEndDate",
        ],
        visible: (settings) => settings.showAlpha,
      },
      {
        id: "partial-retirement",
        eyebrow: "Optional",
        title: "Reduced hours",
        description:
          "Model a reduced-hours period before full retirement if that is part of your plan.",
        kind: "fields",
        fieldIds: [
          "partialRetirementStartAge",
          "fullSalary",
          "partialRetirementWorkPercent",
        ],
        fieldLabels: {
          partialRetirementStartAge: "Reduced hours age",
          fullSalary: "Full salary before reduced hours (£ per year)",
          partialRetirementWorkPercent: "Reduced hours percentage",
        },
        visible: (settings) => settings.partialRetirementEnabled,
      },
      {
        id: "classic",
        eyebrow: "Optional",
        title: "classic pension",
        description:
          "Add classic benefits if they should be part of the projection.",
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
        title: "classic plus pension",
        description:
          "Add classic plus benefits if they should be part of the projection.",
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
        title: "nuvos pension",
        description:
          "Add nuvos benefits if they should be part of the projection.",
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
        title: "Premium pension",
        description:
          "Add preserved Premium benefits if they should be part of the projection.",
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
        id: "cs-avc",
        eyebrow: "Optional",
        title: "Civil Service AVC",
        description:
          "Add your Civil Service Additional Voluntary Contribution pot if it should be part of the projection.",
        kind: "fields",
        fieldIds: [
          "csAvcCurrentPot",
          "csAvcMonthlyContribution",
          "csAvcDrawAge",
          "csAvcHasProtectedPensionAge",
          "csAvcRealInterestPercent",
        ],
        fieldLabels: {
          csAvcCurrentPot: "Current CS AVC balance (£)",
          csAvcMonthlyContribution: "Monthly CS AVC contribution (£)",
          csAvcDrawAge: "CS AVC access age",
        },
        visible: (settings) => settings.showCsAvc,
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
      },
      {
        id: "answer",
        eyebrow: "Result",
        title: "Your results",
        description:
          "Review your projected income, key dates, and assumptions.",
        kind: "bridge-answer",
        hideInactiveLegendItems: true,
        hideBridgeFundingSection: true,
        hideFlexibleAssetsSection: true,
        showProjectionTable: false,
      },
    ],
  },
  {
    id: "expert-journey",
    title: "Expert journey",
    description:
      "This journey gives you more control over your retirement projection, including detailed assumptions for pensions, savings, tax, inflation, investment growth and partial retirement.",
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
    },
    ...fieldGroups.map(createExpertJourneyFieldStep),
    {
      id: "answer",
      eyebrow: "Result",
      title: "Your results",
      description:
        "Review your projected income, bridge funding, saved scenarios, and the full month-by-month projection table.",
      kind: "expert-answer",
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
    taxationEnabled: false,
    partialRetirementEnabled: false,
  };
}

export function applySimpleJourneyDefaults(
  settings: PensionSettings
): PensionSettings {
  const normalPensionAge = settings.normalPensionAge;

  return {
    ...settings,
    requirementAge: normalPensionAge,
    alphaPensionLeaveAge: normalPensionAge,
    alphaPensionDrawAge: normalPensionAge,
    nuvosPensionDrawAge: settings.nuvosPensionDrawAge,
    assumedCpiPercent: 0,
    showStatePension: true,
    showNuvos: settings.showNuvos,
    showClassic: settings.showClassic,
    showClassicPlus: settings.showClassicPlus,
    showPremium: settings.showPremium,
  };
}

export function applySimpleJourneyAssumptions(
  settings: PensionSettings
): PensionSettings {
  return {
    ...settings,
    showStatePension: true,
    showSipp: false,
    showCsAvc: settings.showCsAvc,
    showIsa: false,
    showLisa: false,
    showNuvos: settings.showNuvos,
    showClassic: settings.showClassic,
    showClassicPlus: settings.showClassicPlus,
    showPremium: settings.showPremium,
    alphaAddedPensionFactorType: "self",
    statePensionApplyFutureGrowth: false,
    assumedCpiPercent: 0,
    taxationEnabled: false,
    partialRetirementEnabled: false,
    alphaAddedPensionLumpSums: [],
  };
}

export function mergeSimpleJourneySettings(
  currentSettings: PensionSettings,
  nextSettings: PensionSettings
): PensionSettings {
  return {
    ...nextSettings,
    showSipp: currentSettings.showSipp,
    showIsa: currentSettings.showIsa,
    showLisa: currentSettings.showLisa,
    alphaAddedPensionFactorType: currentSettings.alphaAddedPensionFactorType,
    statePensionApplyFutureGrowth:
      currentSettings.statePensionApplyFutureGrowth,
    applyPensionIncreases: true,
    assumedCpiPercent: 0,
    taxationEnabled: currentSettings.taxationEnabled,
    partialRetirementEnabled: currentSettings.partialRetirementEnabled,
    alphaEpaEnabled: nextSettings.alphaEpaEnabled,
    alphaAddedPensionLumpSums: currentSettings.alphaAddedPensionLumpSums,
  };
}
