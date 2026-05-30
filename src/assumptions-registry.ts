import { fieldGroups, type SettingsKey } from "./fieldDefinitions";

export type GovernedAssumptionRule = {
  id:
    | "state-pension-age"
    | "state-pension-deferral"
    | "alpha-early-retirement"
    | "nuvos-early-retirement"
    | "minimum-pension-age";
  title: string;
  summary: string;
  sourceLabel: string;
  sourceUrl: string;
  effectiveDate: string;
  lastReviewedDate: string;
  affectedFields: readonly SettingsKey[];
};

export type GovernedAssumptionsRegistry = {
  version: string;
  releasedOn: string;
  assumptions: readonly GovernedAssumptionRule[];
};

export const GOVERNED_ASSUMPTIONS_REGISTRY: GovernedAssumptionsRegistry = {
  version: "2026.05",
  releasedOn: "2026-05-30",
  assumptions: [
    {
      id: "state-pension-age",
      title: "State Pension age",
      summary:
        "Date of birth is used to derive the modelled State Pension age and linked retirement dates.",
      sourceLabel: "GOV.UK State Pension age guidance",
      sourceUrl: "https://example.com/source-url-placeholder",
      effectiveDate: "2026-05-30",
      lastReviewedDate: "2026-05-30",
      affectedFields: ["dateOfBirth", "statePensionDrawDate", "alphaPensionDrawAge"],
    },
    {
      id: "state-pension-deferral",
      title: "State Pension deferral",
      summary:
        "The model allows the State Pension start date to move later than the derived default and treats that as a deferral scenario.",
      sourceLabel: "GOV.UK defer your State Pension guidance",
      sourceUrl: "https://example.com/source-url-placeholder",
      effectiveDate: "2026-05-30",
      lastReviewedDate: "2026-05-30",
      affectedFields: [
        "statePensionDrawDate",
        "currentStatePension",
        "statePensionApplyFutureGrowth",
      ],
    },
    {
      id: "alpha-early-retirement",
      title: "alpha early-retirement assumptions",
      summary:
        "alpha draw age is compared with the scheme’s normal pension age to determine whether early-retirement reductions apply.",
      sourceLabel: "Civil Service Pensions alpha early retirement factors",
      sourceUrl: "https://example.com/source-url-placeholder",
      effectiveDate: "2026-05-30",
      lastReviewedDate: "2026-05-30",
      affectedFields: [
        "dateOfBirth",
        "alphaPensionDrawAge",
        "alphaPensionLeaveAge",
        "alphaEpaEnabled",
        "alphaEpaYearsBeforeNpa",
      ],
    },
    {
      id: "nuvos-early-retirement",
      title: "nuvos early-retirement assumptions",
      summary:
        "nuvos draw age is tested against the scheme pension age assumption so the model can apply early-payment reductions where relevant.",
      sourceLabel: "Civil Service Pensions nuvos scheme rules",
      sourceUrl: "https://example.com/source-url-placeholder",
      effectiveDate: "2026-05-30",
      lastReviewedDate: "2026-05-30",
      affectedFields: ["nuvosPensionDrawAge", "nuvosPensionLeaveAge", "dateOfBirth"],
    },
    {
      id: "minimum-pension-age",
      title: "Minimum pension age",
      summary:
        "Date-of-birth-linked access rules constrain the earliest ages the modeller can use for flexible pension access assumptions.",
      sourceLabel: "HMRC minimum pension age guidance",
      sourceUrl: "https://example.com/source-url-placeholder",
      effectiveDate: "2026-05-30",
      lastReviewedDate: "2026-05-30",
      affectedFields: ["dateOfBirth", "sippDrawAge", "isaDrawAge"],
    },
  ],
};

const FIELD_LABELS_BY_ID = new Map<string, string>(
  fieldGroups.flatMap((group) => group.fields.map((field) => [field.id, field.label] as const)),
);

export function getGovernedAssumptionsLatestReviewDate() {
  return GOVERNED_ASSUMPTIONS_REGISTRY.assumptions.reduce(
    (latestDate, assumption) =>
      assumption.lastReviewedDate > latestDate
        ? assumption.lastReviewedDate
        : latestDate,
    GOVERNED_ASSUMPTIONS_REGISTRY.releasedOn,
  );
}

export function getAffectedFieldLabels(fieldIds: readonly SettingsKey[]) {
  return fieldIds.map((fieldId) => FIELD_LABELS_BY_ID.get(fieldId) ?? fieldId);
}
