import type {
  RetirementIncomeChartParameters,
  RetirementIncomeMilestone,
  RetirementIncomeMilestoneKey,
} from "./retirement-income-chart-model";
import { sourceMeta } from "./retirement-income-chart-layout";

export type RetirementIncomeMilestoneCapability = RetirementIncomeMilestone & {
  sourceType: string;
  sourceLabel: string;
};

type MilestoneDefinition = {
  key: RetirementIncomeMilestoneKey;
  label: string;
  shortLabel: string;
  sourceType: string;
  sourceLabel: string;
  colour: string;
  enabled: (parameters: RetirementIncomeMilestoneParameters) => boolean;
  editable?: (statePensionEditable: boolean) => boolean;
};

export type RetirementIncomeMilestoneParameters = Pick<
  RetirementIncomeChartParameters,
  | RetirementIncomeMilestoneKey
  | "spendingSmileEnabled"
  | "partialRetirementEnabled"
  | "showAlpha"
  | "showIsa"
  | "showLisa"
  | "showNuvos"
  | "showPremium"
  | "showSipp"
  | "showStatePension"
  | "sippUseByAgeEnabled"
  | "isaUseByAgeEnabled"
  | "lisaUseByAgeEnabled"
>;

/**
 * Metadata for the timing controls supported by the established retirement
 * chart. Household presentation consumes the same registry, so ownership and
 * filtering do not introduce product-specific rendering branches.
 */
const milestoneDefinitions: readonly MilestoneDefinition[] = [
  {
    key: "retirementAge",
    label: "Retire",
    shortLabel: "Retire",
    sourceType: "retirement",
    sourceLabel: "Retirement",
    colour: "#0f6f72",
    enabled: () => true,
  },
  {
    key: "slowGoStartAge",
    label: "Start Slow-go",
    shortLabel: "Slow-go",
    sourceType: "target",
    sourceLabel: "Income target",
    colour: "#2563a8",
    enabled: (parameters) => parameters.spendingSmileEnabled,
  },
  {
    key: "noGoStartAge",
    label: "Start No-go",
    shortLabel: "No-go",
    sourceType: "target",
    sourceLabel: "Income target",
    colour: "#0b4dc2",
    enabled: (parameters) => parameters.spendingSmileEnabled,
  },
  {
    key: "alphaLeaveAge",
    label: "Leave Alpha",
    shortLabel: "Leave alpha",
    sourceType: "alpha",
    sourceLabel: "Alpha pension",
    colour: "#b45309",
    enabled: (parameters) => parameters.showAlpha,
  },
  {
    key: "sippAccessAge",
    label: "SIPP start",
    shortLabel: "SIPP start",
    sourceType: "sipp",
    sourceLabel: "SIPP",
    colour: sourceMeta.sippIncomeAnnual.colour,
    enabled: (parameters) => parameters.showSipp,
  },
  {
    key: "sippUseByAge",
    label: "SIPP stop",
    shortLabel: "SIPP stop",
    sourceType: "sipp",
    sourceLabel: "SIPP",
    colour: sourceMeta.sippIncomeAnnual.colour,
    enabled: (parameters) =>
      parameters.showSipp && parameters.sippUseByAgeEnabled,
  },
  {
    key: "isaAccessAge",
    label: "ISA start",
    shortLabel: "ISA start",
    sourceType: "isa",
    sourceLabel: "ISA",
    colour: sourceMeta.isaIncomeAnnual.colour,
    enabled: (parameters) => parameters.showIsa,
  },
  {
    key: "lisaAccessAge",
    label: "LISA start",
    shortLabel: "LISA start",
    sourceType: "lisa",
    sourceLabel: "LISA",
    colour: sourceMeta.lisaIncomeAnnual.colour,
    enabled: (parameters) => parameters.showLisa,
  },
  {
    key: "partialRetirementStartAge",
    label: "Start partial",
    shortLabel: "Start partial",
    sourceType: "partial-retirement",
    sourceLabel: "Partial retirement",
    colour: "#c2410c",
    enabled: (parameters) => parameters.partialRetirementEnabled,
  },
  {
    key: "alphaStartAge",
    label: "Start Alpha",
    shortLabel: "Start Alpha",
    sourceType: "alpha",
    sourceLabel: "Alpha pension",
    colour: sourceMeta.alphaIncomeAnnual.colour,
    enabled: (parameters) => parameters.showAlpha,
  },
  {
    key: "nuvosStartAge",
    label: "Start Nuvos",
    shortLabel: "Start Nuvos",
    sourceType: "nuvos",
    sourceLabel: "Nuvos pension",
    colour: sourceMeta.nuvosIncomeAnnual.colour,
    enabled: (parameters) => parameters.showNuvos,
  },
  {
    key: "premiumStartAge",
    label: "Start Premium",
    shortLabel: "Start Premium",
    sourceType: "premium",
    sourceLabel: "Premium pension",
    colour: sourceMeta.premiumIncomeAnnual.colour,
    enabled: (parameters) => parameters.showPremium,
  },
  {
    key: "isaUseByAge",
    label: "ISA stop",
    shortLabel: "ISA stop",
    sourceType: "isa",
    sourceLabel: "ISA",
    colour: sourceMeta.isaIncomeAnnual.colour,
    enabled: (parameters) =>
      parameters.showIsa && parameters.isaUseByAgeEnabled,
  },
  {
    key: "lisaUseByAge",
    label: "LISA stop",
    shortLabel: "LISA stop",
    sourceType: "lisa",
    sourceLabel: "LISA",
    colour: sourceMeta.lisaIncomeAnnual.colour,
    enabled: (parameters) =>
      parameters.showLisa && parameters.lisaUseByAgeEnabled,
  },
  {
    key: "statePensionAge",
    label: "Start State",
    shortLabel: "Start State",
    sourceType: "state-pension",
    sourceLabel: "State Pension",
    colour: sourceMeta.statePensionIncomeAnnual.colour,
    enabled: (parameters) => parameters.showStatePension,
    editable: (statePensionEditable) => statePensionEditable,
  },
];

export function createRetirementIncomeMilestones(
  parameters: RetirementIncomeMilestoneParameters,
  statePensionEditable: boolean
): RetirementIncomeMilestoneCapability[] {
  return milestoneDefinitions
    .filter((definition) => definition.enabled(parameters))
    .map((definition) => ({
      key: definition.key,
      label: definition.label,
      shortLabel: definition.shortLabel,
      age: parameters[definition.key],
      colour: definition.colour,
      editable: definition.editable?.(statePensionEditable) ?? true,
      sourceType: definition.sourceType,
      sourceLabel: definition.sourceLabel,
    }));
}
