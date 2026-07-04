import {
  getAlphaEpaDate,
  getLatestAlphaAddedPensionPurchaseDate,
  resolveAlphaAbsDate,
  validateAlphaPensionRules,
} from "./settings-domains/alpha-pension";
import { validateClassicRules } from "./settings-domains/classic";
import { validateIsaRules } from "./settings-domains/isa";
import { validateLisaRules } from "./settings-domains/lisa";
import { validateNuvosRules } from "./settings-domains/nuvos";
import { validateStatePensionRules } from "./settings-domains/state-pension";
import {
  getPartialRetirementStartDate,
  validatePartialRetirementRules,
} from "./settings-domains/partial-retirement";
import { validatePersonalDetailsRules } from "./settings-domains/personal-details";
import { validateSippRules } from "./settings-domains/sipp";
import { addYearsToIsoDate } from "./settings-shared/date";
import { calculateStatePensionDrawDate } from "./settings-shared/state";
import {
  type AddedPensionLumpSum,
  type PensionSettings,
  type PensionValidationIssue,
} from "./settings-types";

type ValidationContext = {
  settings: PensionSettings;
  lifeExpectancyDate: string;
  alphaDrawDate: string;
  alphaLeaveDate: string;
  alphaAccrualStopDate: string;
  alphaAbsDate: string;
  alphaEpaAgeDate: string;
  latestAlphaAddedPensionPurchaseDate: string;
  nuvosDrawDate: string;
  nuvosAbsDate: string;
  classicDrawDate: string;
  classicPlusDrawDate: string;
  sippDrawDate: string;
  isaDrawDate: string;
  lisaDrawDate: string;
  retirementDate: string;
  sippContributionStopDate: string;
  isaContributionStopDate: string;
  lisaContributionStopDate: string;
  sippWithdrawalTargetDate: string;
  isaWithdrawalTargetDate: string;
  lisaWithdrawalTargetDate: string;
  partialRetirementStartDate: string;
  defaultStatePensionDrawDate: string;
};

function createValidationContext(settings: PensionSettings): ValidationContext {
  const alphaDrawDate = addYearsToIsoDate(
    settings.dateOfBirth,
    settings.alphaPensionDrawAge
  );
  const alphaLeaveDate = addYearsToIsoDate(
    settings.dateOfBirth,
    settings.alphaPensionLeaveAge
  );
  const nuvosDrawDate = addYearsToIsoDate(
    settings.dateOfBirth,
    settings.nuvosPensionDrawAge
  );
  const classicDrawDate = addYearsToIsoDate(
    settings.dateOfBirth,
    settings.classicPensionDrawAge
  );
  const classicPlusDrawDate = addYearsToIsoDate(
    settings.dateOfBirth,
    settings.classicPlusPensionDrawAge
  );
  const sippDrawDate = addYearsToIsoDate(
    settings.dateOfBirth,
    settings.sippDrawAge
  );
  const isaDrawDate = addYearsToIsoDate(
    settings.dateOfBirth,
    settings.isaDrawAge
  );
  const lisaDrawDate = addYearsToIsoDate(
    settings.dateOfBirth,
    settings.lisaDrawAge
  );
  const retirementDate = addYearsToIsoDate(
    settings.dateOfBirth,
    settings.requirementAge
  );

  return {
    settings,
    lifeExpectancyDate: addYearsToIsoDate(
      settings.dateOfBirth,
      settings.lifeExpectancy
    ),
    alphaDrawDate,
    alphaLeaveDate,
    alphaAccrualStopDate:
      alphaDrawDate <= alphaLeaveDate ? alphaDrawDate : alphaLeaveDate,
    alphaAbsDate: resolveAlphaAbsDate(settings.alphaPensionAbsDate),
    alphaEpaAgeDate: getAlphaEpaDate(settings),
    latestAlphaAddedPensionPurchaseDate: getLatestAlphaAddedPensionPurchaseDate(
      settings.dateOfBirth
    ),
    nuvosDrawDate,
    nuvosAbsDate: resolveAlphaAbsDate(settings.nuvosPensionAbsDate),
    classicDrawDate,
    classicPlusDrawDate,
    sippDrawDate,
    isaDrawDate,
    lisaDrawDate,
    retirementDate,
    sippContributionStopDate:
      sippDrawDate <= retirementDate ? sippDrawDate : retirementDate,
    isaContributionStopDate:
      isaDrawDate <= retirementDate ? isaDrawDate : retirementDate,
    lisaContributionStopDate:
      lisaDrawDate <= retirementDate ? lisaDrawDate : retirementDate,
    sippWithdrawalTargetDate: addYearsToIsoDate(
      settings.dateOfBirth,
      settings.sippWithdrawalTargetAge
    ),
    isaWithdrawalTargetDate: addYearsToIsoDate(
      settings.dateOfBirth,
      settings.isaWithdrawalTargetAge
    ),
    lisaWithdrawalTargetDate: addYearsToIsoDate(
      settings.dateOfBirth,
      settings.lisaWithdrawalTargetAge
    ),
    partialRetirementStartDate: getPartialRetirementStartDate(settings),
    defaultStatePensionDrawDate: calculateStatePensionDrawDate(
      settings.dateOfBirth
    ),
  };
}

export function validateSettings(
  settings: PensionSettings
): PensionValidationIssue[] {
  const context = createValidationContext(settings);

  return [
    ...validatePersonalDetailsRules(settings, context.lifeExpectancyDate),
    ...validateStatePensionRules(context),
    ...validateAlphaPensionRules(context),
    ...validateClassicRules(context),
    ...validateNuvosRules(context),
    ...validateSippRules(context),
    ...validateIsaRules(context),
    ...validateLisaRules(context),
    ...validatePartialRetirementRules(context),
    ...validateLumpSumRules(context),
  ];
}

function validateLumpSums(
  lumpSums: AddedPensionLumpSum[],
  options: {
    field:
      | "alphaAddedPensionLumpSums"
      | "sippLumpSums"
      | "isaLumpSums"
      | "lisaLumpSums";
    label: string;
    earliestDate: string;
    latestDate: string;
    rangeMessage: string;
  }
) {
  return lumpSums.flatMap((lumpSum) => {
    const issues: PensionValidationIssue[] = [];
    const scheduleEndDate =
      lumpSum.cadence === "yearly" ? lumpSum.endDate : lumpSum.startDate;

    if (lumpSum.cadence === "yearly" && lumpSum.endDate < lumpSum.startDate) {
      issues.push({
        field: options.field,
        itemId: lumpSum.id,
        message: `${options.label} repeat-until date must be on or after its start date.`,
      });
    }

    if (
      lumpSum.startDate < options.earliestDate ||
      scheduleEndDate > options.latestDate
    ) {
      issues.push({
        field: options.field,
        itemId: lumpSum.id,
        message: options.rangeMessage,
      });
    }

    return issues;
  });
}

function validateLumpSumScheduleEndsByDate(
  lumpSums: AddedPensionLumpSum[],
  options: {
    field: "alphaAddedPensionLumpSums" | "sippLumpSums" | "isaLumpSums";
    latestDate: string;
    message: string;
  }
) {
  return lumpSums.flatMap((lumpSum) => {
    const scheduleEndDate =
      lumpSum.cadence === "yearly" ? lumpSum.endDate : lumpSum.startDate;

    if (scheduleEndDate <= options.latestDate) {
      return [];
    }

    return [
      {
        field: options.field,
        itemId: lumpSum.id,
        message: options.message,
      },
    ];
  });
}

function validateLumpSumRules(
  context: ValidationContext
): PensionValidationIssue[] {
  const { settings } = context;

  return [
    ...(settings.showAlpha
      ? [
          ...validateLumpSums(settings.alphaAddedPensionLumpSums, {
            field: "alphaAddedPensionLumpSums",
            label: "Alpha lump sum",
            earliestDate: context.alphaAbsDate,
            latestDate: context.latestAlphaAddedPensionPurchaseDate,
            rangeMessage:
              "Alpha lump sums must fall between the last Annual Benefits Statement and the supported added pension factor ages.",
          }),
          ...validateLumpSumScheduleEndsByDate(
            settings.alphaAddedPensionLumpSums,
            {
              field: "alphaAddedPensionLumpSums",
              latestDate: context.alphaAccrualStopDate,
              message:
                "Alpha lump sums must be scheduled on or before Alpha pensionable service stops.",
            }
          ),
        ]
      : []),
    ...(settings.showSipp
      ? validateLumpSums(settings.sippLumpSums, {
          field: "sippLumpSums",
          label: "SIPP lump sum",
          earliestDate: settings.startDate,
          latestDate: context.sippContributionStopDate,
          rangeMessage:
            "SIPP lump sums must fall between the calculation start date and the earlier of retirement age and SIPP draw start.",
        })
      : []),
    ...(settings.showIsa
      ? validateLumpSums(settings.isaLumpSums, {
          field: "isaLumpSums",
          label: "ISA lump sum",
          earliestDate: settings.startDate,
          latestDate: context.isaContributionStopDate,
          rangeMessage:
            "ISA lump sums must fall between the calculation start date and the earlier of retirement age and ISA draw start.",
        })
      : []),
    ...(settings.showLisa
      ? validateLumpSums(settings.lisaLumpSums, {
          field: "lisaLumpSums",
          label: "LISA lump sum",
          earliestDate: settings.startDate,
          latestDate: context.lisaContributionStopDate,
          rangeMessage:
            "LISA lump sums must fall between the calculation start date and the earlier of retirement age and LISA draw start.",
        })
      : []),
  ];
}
