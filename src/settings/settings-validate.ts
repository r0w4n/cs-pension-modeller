import {
  getAlphaEpaDate,
  getLatestAlphaAddedPensionPurchaseDate,
  resolveAlphaAbsDate,
  validateAlphaPensionRules,
} from "./settings-domains/alpha-pension";
import { validateAdditionalGuaranteedIncomeRules } from "./settings-domains/additional-guaranteed-income";
import { validateClassicRules } from "./settings-domains/classic";
import { validateIsaRules } from "./settings-domains/isa";
import { validateLisaRules } from "./settings-domains/lisa";
import { validateNuvosRules } from "./settings-domains/nuvos";
import { validatePremiumRules } from "./settings-domains/premium";
import { validateStatePensionRules } from "./settings-domains/state-pension";
import {
  getPartialRetirementStartDate,
  validatePartialRetirementRules,
} from "./settings-domains/partial-retirement";
import { validatePersonalDetailsRules } from "./settings-domains/personal-details";
import { validateSippRules } from "./settings-domains/sipp";
import { validateCsAvcRules } from "./settings-domains/cs-avc";
import { addYearsToIsoDate } from "./settings-shared/date";
import { calculateStatePensionDrawDate } from "./settings-shared/state";
import {
  type AddedPensionLumpSum,
  type PensionSettings,
  type PensionValidationIssue,
} from "./settings-types";
import { MAX_SUPPORTED_MODELLING_AGE } from "../spending-smile";

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
  premiumDrawDate: string;
  sippDrawDate: string;
  csAvcDrawDate: string;
  isaDrawDate: string;
  lisaDrawDate: string;
  retirementDate: string;
  sippContributionStopDate: string;
  csAvcContributionStopDate: string;
  isaContributionStopDate: string;
  lisaContributionStopDate: string;
  sippWithdrawalTargetDate: string;
  csAvcWithdrawalTargetDate: string;
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
  const csAvcDrawDate = addYearsToIsoDate(
    settings.dateOfBirth,
    settings.csAvcDrawAge
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
    premiumDrawDate: addYearsToIsoDate(
      settings.dateOfBirth,
      settings.premiumDrawAge
    ),
    sippDrawDate,
    csAvcDrawDate,
    isaDrawDate,
    lisaDrawDate,
    retirementDate,
    sippContributionStopDate:
      sippDrawDate <= retirementDate ? sippDrawDate : retirementDate,
    csAvcContributionStopDate:
      csAvcDrawDate <= retirementDate ? csAvcDrawDate : retirementDate,
    isaContributionStopDate:
      isaDrawDate <= retirementDate ? isaDrawDate : retirementDate,
    lisaContributionStopDate:
      lisaDrawDate <= retirementDate ? lisaDrawDate : retirementDate,
    sippWithdrawalTargetDate: addYearsToIsoDate(
      settings.dateOfBirth,
      settings.sippWithdrawalTargetAge
    ),
    csAvcWithdrawalTargetDate: addYearsToIsoDate(
      settings.dateOfBirth,
      settings.csAvcWithdrawalTargetAge
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
    ...validatePremiumRules(context),
    ...validateSippRules(context),
    ...validateCsAvcRules(context),
    ...validateIsaRules(context),
    ...validateLisaRules(context),
    ...validatePartialRetirementRules(context),
    ...validateAdditionalGuaranteedIncomeRules(settings),
    ...validateSpendingSmileRules(settings),
    ...validateLumpSumRules(context),
  ];
}

function validateSpendingSmileRules(
  settings: PensionSettings
): PensionValidationIssue[] {
  if (settings.spendingStrategyType !== "SPENDING_SMILE") {
    return [];
  }

  const issues: PensionValidationIssue[] = [];

  (
    [
      ["Go-go", "goGoPercentage", settings.spendingSmile.goGoPercentage],
      ["Slow-go", "slowGoPercentage", settings.spendingSmile.slowGoPercentage],
      ["No-go", "noGoPercentage", settings.spendingSmile.noGoPercentage],
    ] as const
  ).forEach(([phase, itemId, percentage]) => {
    if (percentage <= 0) {
      issues.push({
        field: "spendingSmile",
        itemId,
        message: `${phase} percentage must be greater than 0%.`,
      });
    } else if (!Number.isInteger(percentage)) {
      issues.push({
        field: "spendingSmile",
        itemId,
        message: `${phase} percentage must be a whole number.`,
      });
    }
  });

  if (settings.spendingSmile.slowGoStartAge <= settings.requirementAge) {
    issues.push({
      field: "spendingSmile",
      itemId: "slowGoStartAge",
      message: "Slow-go years must start after your retirement age.",
    });
  }

  if (
    settings.spendingSmile.noGoStartAge <= settings.spendingSmile.slowGoStartAge
  ) {
    issues.push({
      field: "spendingSmile",
      itemId: "noGoStartAge",
      message: "No-go years must start after the Slow-go years.",
    });
  }

  const maximumPhaseAge = Math.min(
    MAX_SUPPORTED_MODELLING_AGE,
    settings.lifeExpectancy
  );
  (
    [
      ["Slow-go", "slowGoStartAge", settings.spendingSmile.slowGoStartAge],
      ["No-go", "noGoStartAge", settings.spendingSmile.noGoStartAge],
    ] as const
  ).forEach(([phase, itemId, startAge]) => {
    if (startAge > maximumPhaseAge) {
      issues.push({
        field: "spendingSmile",
        itemId,
        message:
          maximumPhaseAge < MAX_SUPPORTED_MODELLING_AGE
            ? `${phase} age cannot be later than your modelled life expectancy of age ${maximumPhaseAge}.`
            : `${phase} age cannot be later than age ${MAX_SUPPORTED_MODELLING_AGE}.`,
      });
    }
  });

  return issues;
}

function validateLumpSums(
  lumpSums: AddedPensionLumpSum[],
  options: {
    field:
      | "alphaAddedPensionLumpSums"
      | "sippLumpSums"
      | "csAvcLumpSums"
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
    field:
      | "alphaAddedPensionLumpSums"
      | "sippLumpSums"
      | "csAvcLumpSums"
      | "isaLumpSums";
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
            "SIPP lump sums must fall between the current date and the earlier of retirement age and SIPP draw start.",
        })
      : []),
    ...(settings.showCsAvc
      ? validateLumpSums(settings.csAvcLumpSums, {
          field: "csAvcLumpSums",
          label: "CS AVC lump sum",
          earliestDate: settings.startDate,
          latestDate: context.csAvcContributionStopDate,
          rangeMessage:
            "CS AVC lump sums must fall between the current date and the earlier of retirement age and CS AVC draw start.",
        })
      : []),
    ...(settings.showIsa
      ? validateLumpSums(settings.isaLumpSums, {
          field: "isaLumpSums",
          label: "ISA lump sum",
          earliestDate: settings.startDate,
          latestDate: context.isaContributionStopDate,
          rangeMessage:
            "ISA lump sums must fall between the current date and the earlier of retirement age and ISA draw start.",
        })
      : []),
    ...(settings.showLisa
      ? validateLumpSums(settings.lisaLumpSums, {
          field: "lisaLumpSums",
          label: "LISA lump sum",
          earliestDate: settings.startDate,
          latestDate: context.lisaContributionStopDate,
          rangeMessage:
            "LISA lump sums must fall between the current date and the earlier of retirement age and LISA draw start.",
        })
      : []),
  ];
}
