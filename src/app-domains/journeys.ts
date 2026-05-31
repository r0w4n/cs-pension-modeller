import type { FieldDefinition, SettingsKey } from "../fieldDefinitions";
import type { PensionSettings } from "../settings";

export const OPTIONAL_SECTION_TOGGLES = [
  {
    key: "showAlpha",
    label: "Alpha",
    description: "Show Alpha inputs and include Alpha pension values in the modeller.",
  },
  {
    key: "partialRetirementEnabled",
    label: "Partial retirement",
    description:
      "Show partial retirement inputs and pro-rate regular accruals and contributions.",
  },
  {
    key: "showStatePension",
    label: "State Pension",
    description:
      "Show State Pension inputs and include State Pension values in the modeller.",
  },
  {
    key: "showNuvos",
    label: "nuvos",
    description: "Show nuvos inputs and include nuvos values in the modeller.",
  },
  {
    key: "showSipp",
    label: "SIPP",
    description: "Show SIPP inputs and include SIPP values in the modeller.",
  },
  {
    key: "showIsa",
    label: "ISA",
    description: "Show ISA inputs and include ISA values in the modeller.",
  },
  {
    key: "taxationEnabled",
    label: "Taxation",
    description:
      "Show tax assumptions and estimate take-home income after Income Tax.",
  },
] as const;

export type OptionalSectionToggleKey = (typeof OPTIONAL_SECTION_TOGGLES)[number]["key"];

const OPTIONAL_SECTION_TOGGLE_KEY_SET = new Set<OptionalSectionToggleKey>(
  OPTIONAL_SECTION_TOGGLES.map((toggle) => toggle.key),
);

export function isOptionalSectionToggleKey(
  key: SettingsKey,
): key is OptionalSectionToggleKey {
  return OPTIONAL_SECTION_TOGGLE_KEY_SET.has(key as OptionalSectionToggleKey);
}

export type JourneyFieldLabels = Partial<Record<FieldDefinition["id"], string>>;

export type JourneyStepDefinition =
  | {
      id: string;
      eyebrow: string;
      title: string;
      description: string;
      kind: "optional-sections" | "answer" | "bridge-answer";
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
      fieldLabels?: JourneyFieldLabels;
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
      "Test whether your chosen retirement age works, then see the ISA and SIPP bridge needed before secure pension income is fully in place.",
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
          "Set the dates that define current age, access ages, and the length of the bridge.",
        kind: "fields",
        fieldIds: ["startDate", "dateOfBirth", "lifeExpectancy"],
        fieldLabels: {
          startDate: "Start modelling from",
        },
      },
      {
        id: "include",
        eyebrow: "Step 3",
        title: "Your Civil Service pensions",
        description:
          "We include State Pension, ISA and SIPP by default. Tell us which Civil Service pensions you have. Settings you have entered are kept if you hide a section and come back later.",
        kind: "optional-sections",
        toggleKeys: ["showAlpha", "showNuvos"],
      },
      {
        id: "alpha",
        eyebrow: "Step 4",
        title: "Your Alpha pension",
        description:
          "Add the Alpha pension you have built up and the age you would prefer to draw it.",
        kind: "fields",
        fieldIds: [
          "alphaPensionDrawAge",
          "alphaPensionAbsDate",
          "accruedPensionAtLastAbs",
          "pensionableEarnings",
          "alphaAddedPensionMonthly",
          "applyPensionIncreases",
          "assumedCpiPercent",
        ],
        visible: (settings) => settings.showAlpha,
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
          "nuvosPensionableEarnings",
          "nuvosApplyPensionIncreases",
          "nuvosAssumedCpiPercent",
        ],
        visible: (settings) => settings.showNuvos,
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
        id: "pots",
        eyebrow: "Step 5",
        title: "Your bridging pots",
        description:
          "Bridge pots are flexible savings used to cover income gaps before pension income fully starts. Keep ISA and SIPP separate so the model respects tax relief, access ages, and drawdown timing.",
        kind: "fields",
        fieldIds: [
          "isaCurrentPot",
          "isaMonthlyContribution",
          "isaRealInterestPercent",
          "sippCurrentPot",
          "sippMonthlyContribution",
          "sippDrawAge",
          "sippTaxReliefRate",
          "sippRealInterestPercent",
        ],
        fieldLabels: {
          isaCurrentPot: "Current ISA balance (£)",
          isaMonthlyContribution: "Planned monthly ISA contribution before retirement",
          sippCurrentPot: "Current SIPP balance (£)",
          sippMonthlyContribution: "Planned monthly SIPP contribution before retirement",
          sippDrawAge: "SIPP access age",
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
      "Answer a smaller set of questions to see what your retirement could look like financially, then review your projected income, key dates, funding gaps, and assumptions.",
    steps: [
      {
        id: "basics",
        eyebrow: "Step 1",
        title: "About you and your target",
        description:
          "Start with your date of birth, the age you want to retire, and the income you want the plan to support.",
        kind: "fields",
        fieldIds: ["dateOfBirth", "requirementAge", "desiredRetirementIncome"],
        fieldLabels: {
          dateOfBirth: "Date of birth",
          requirementAge: "Retirement age",
          desiredRetirementIncome: "Target retirement income (£ per year)",
        },
      },
      {
        id: "alpha",
        eyebrow: "Step 2",
        title: "Your Alpha pension",
        description:
          "Enter the main figures from your latest statement together with the age you expect to leave and draw Alpha.",
        kind: "fields",
        fieldIds: [
          "alphaPensionAbsDate",
          "accruedPensionAtLastAbs",
          "pensionableEarnings",
          "alphaPensionLeaveAge",
          "alphaPensionDrawAge",
        ],
        fieldLabels: {
          alphaPensionAbsDate: "Annual Benefits Statement year",
          accruedPensionAtLastAbs: "Accrued pension to date (£ per year)",
          pensionableEarnings: "Pensionable earnings (£ per year)",
          alphaPensionLeaveAge: "Age you leave Alpha",
          alphaPensionDrawAge: "Alpha pension draw age",
        },
      },
      {
        id: "alpha-options",
        eyebrow: "Step 3",
        title: "Added pension and EPA",
        description:
          "Add any monthly added pension and EPA choices you want reflected in the plan.",
        kind: "fields",
        fieldIds: [
          "alphaAddedPensionMonthly",
          "alphaAddedPensionFactorType",
          "alphaEpaEnabled",
          "alphaEpaYearsBeforeNpa",
        ],
        fieldLabels: {
          alphaAddedPensionMonthly: "Monthly added pension payments (£)",
          alphaAddedPensionFactorType: "Added pension type",
        },
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
          "nuvosPensionableEarnings",
          "nuvosApplyPensionIncreases",
          "nuvosAssumedCpiPercent",
        ],
        visible: (settings) => settings.showNuvos,
      },
      {
        id: "pots",
        eyebrow: "Optional",
        title: "ISA and SIPP",
        description:
          "Add personal pots only if you want the chart to show how they help bridge the gap to secure pension income.",
        kind: "fields",
        fieldIds: [
          "isaCurrentPot",
          "isaMonthlyContribution",
          "isaRealInterestPercent",
          "sippCurrentPot",
          "sippMonthlyContribution",
          "sippDrawAge",
          "sippTaxReliefRate",
          "sippRealInterestPercent",
        ],
        fieldLabels: {
          isaCurrentPot: "Current ISA balance (£)",
          isaMonthlyContribution: "Monthly ISA contribution (£)",
          sippCurrentPot: "Current SIPP balance (£)",
          sippMonthlyContribution: "Monthly SIPP contribution (£)",
          sippDrawAge: "SIPP access age",
        },
        visible: (settings) => settings.showIsa || settings.showSipp,
      },
      {
        id: "answer",
        eyebrow: "Result",
        title: "Your results",
        description:
          "Review your projected income, bridge funding, key dates, and assumptions.",
        kind: "bridge-answer",
        showProjectionTable: false,
      },
    ],
  },
] as const satisfies readonly JourneyDefinition[];

export function applyBridgeJourneyDefaults(settings: PensionSettings): PensionSettings {
  return {
    ...settings,
    showStatePension: true,
    showSipp: true,
    showIsa: true,
    taxationEnabled: false,
    partialRetirementEnabled: false,
  };
}

export function applySimpleJourneyDefaults(settings: PensionSettings): PensionSettings {
  return {
    ...settings,
    showStatePension: true,
    showSipp: false,
    showIsa: false,
    showNuvos: false,
    statePensionApplyFutureGrowth: false,
    applyPensionIncreases: true,
    assumedCpiPercent: 0,
    taxationEnabled: false,
    partialRetirementEnabled: false,
  };
}
