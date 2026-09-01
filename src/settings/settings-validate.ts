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
import { addYearsToIsoDate, isValidIsoDate } from "./settings-shared/date";
import { calculateStatePensionDrawDate } from "./settings-shared/state";
import {
  type AddedPensionLumpSum,
  type PensionSettings,
  type PensionValidationIssue,
  type SpendingSmileStrategy,
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
  const personalIssues = validatePersonalDetailsRules(
    settings,
    context.lifeExpectancyDate
  );
  const hasValidPersonalDates =
    isValidIsoDate(settings.dateOfBirth) && isValidIsoDate(settings.startDate);

  const ownIssues = [
    ...personalIssues,
    ...(hasValidPersonalDates
      ? [
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
        ]
      : []),
    ...validateAdditionalGuaranteedIncomeRules(settings),
    ...validateTaxRules(settings),
    // Joint mode owns its spending strategy under jointRetirement. A saved
    // single-person profile is deliberately inactive there, so it must not
    // prevent an otherwise valid household projection.
    ...(settings.jointRetirement.enabled || !hasValidPersonalDates
      ? []
      : validateSpendingSmileRules(settings)),
    ...(hasValidPersonalDates ? validateLumpSumRules(context) : []),
  ];

  if (!settings.jointRetirement.enabled) {
    return ownIssues;
  }

  if (!settings.partner) {
    return [
      ...ownIssues,
      {
        field: "jointRetirement",
        message:
          "Add Partner details before calculating a two-person household.",
      },
    ];
  }

  const partnerSettings = createPartnerIndividualSettings(settings);
  const partnerIssues = validateSettings(partnerSettings).map((issue) => ({
    ...issue,
    personId: "partner" as const,
  }));

  return [
    ...ownIssues.map((issue) => ({ ...issue, personId: "you" as const })),
    ...partnerIssues,
    ...(hasValidPersonalDates && isValidIsoDate(partnerSettings.dateOfBirth)
      ? validateJointHouseholdRules(settings, partnerSettings)
      : []),
  ];
}

/** Shared assumptions stay at household level; every other value is owned. */
export function createPartnerIndividualSettings(settings: PensionSettings) {
  if (!settings.partner) {
    throw new Error("Partner settings are required for a joint calculation.");
  }

  return {
    ...settings.partner,
    startDate: settings.startDate,
    projectionBasis: settings.projectionBasis,
    inflationRateAnnual: settings.inflationRateAnnual,
    taxationEnabled: settings.taxationEnabled,
    taxRegime: settings.taxRegime,
    taxPersonalAllowance: settings.taxPersonalAllowance,
    taxPersonalAllowanceTaperThreshold:
      settings.taxPersonalAllowanceTaperThreshold,
    taxBasicRateLimit: settings.taxBasicRateLimit,
    taxAdditionalRateThreshold: settings.taxAdditionalRateThreshold,
    taxBasicRatePercent: settings.taxBasicRatePercent,
    taxHigherRatePercent: settings.taxHigherRatePercent,
    taxAdditionalRatePercent: settings.taxAdditionalRatePercent,
    partner: undefined,
    jointRetirement: { ...settings.jointRetirement, enabled: false },
  };
}

/** Removes personal targets before the coordinated household funding pass. */
export function createPartnerCalculationSettings(settings: PensionSettings) {
  return {
    ...createPartnerIndividualSettings(settings),
    retirementIncomeTargetBasis: "after_tax" as const,
    desiredRetirementIncome: 0,
    spendingStrategyType: "FLAT" as const,
    flexibleWithdrawalPriority: [],
  };
}

function validateJointHouseholdRules(
  settings: PensionSettings,
  partner: PensionSettings
): PensionValidationIssue[] {
  const youRetirementDate = toCalendarMonth(
    addYearsToIsoDate(settings.dateOfBirth, settings.requirementAge)
  );
  const partnerRetirementDate = toCalendarMonth(
    addYearsToIsoDate(partner.dateOfBirth, partner.requirementAge)
  );
  const issues: PensionValidationIssue[] = [];

  if (
    youRetirementDate !== partnerRetirementDate &&
    settings.jointRetirement.transitionDesiredRetirementIncome <= 0
  ) {
    issues.push({
      field: "jointRetirement",
      message:
        "Enter a positive household target for the period when one person is retired.",
    });
  }
  if (settings.jointRetirement.fullyRetiredDesiredRetirementIncome <= 0) {
    issues.push({
      field: "jointRetirement",
      message:
        "Enter a positive household target for when both people are retired.",
    });
  }

  const reference =
    partnerRetirementDate >= youRetirementDate
      ? { settings: partner, label: "Partner's" }
      : { settings, label: "your" };
  issues.push(
    ...validateSpendingSmileStrategy({
      strategyType: settings.jointRetirement.spendingStrategyType,
      strategy: settings.jointRetirement.spendingSmile,
      retirementAge: reference.settings.requirementAge,
      lifeExpectancy: reference.settings.lifeExpectancy,
      field: "jointRetirement",
      retirementReferenceLabel: reference.label,
    })
  );

  return issues;
}

function validateTaxRules(settings: PensionSettings): PensionValidationIssue[] {
  if (
    !settings.taxationEnabled ||
    !settings.taxTrackLumpSumAllowance ||
    settings.taxLumpSumAllowanceUsed <= settings.taxLumpSumAllowance
  ) {
    return [];
  }

  return [
    {
      field: "taxLumpSumAllowanceUsed",
      message:
        "Pension lump-sum allowance already used cannot exceed the total allowance entered.",
    },
  ];
}

function toCalendarMonth(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date.slice(0, 7)}-01` : date;
}

function validateSpendingSmileRules(
  settings: PensionSettings
): PensionValidationIssue[] {
  return validateSpendingSmileStrategy({
    strategyType: settings.spendingStrategyType,
    strategy: settings.spendingSmile,
    retirementAge: settings.requirementAge,
    lifeExpectancy: settings.lifeExpectancy,
    field: "spendingSmile",
    retirementReferenceLabel: "your",
  });
}

function validateSpendingSmileStrategy({
  strategyType,
  strategy,
  retirementAge,
  lifeExpectancy,
  field,
  retirementReferenceLabel,
}: {
  strategyType: PensionSettings["spendingStrategyType"];
  strategy: SpendingSmileStrategy;
  retirementAge: number;
  lifeExpectancy: number;
  field: PensionValidationIssue["field"];
  retirementReferenceLabel: string;
}): PensionValidationIssue[] {
  if (strategyType !== "SPENDING_SMILE") {
    return [];
  }

  const issues: PensionValidationIssue[] = [];

  (
    [
      ["Go-go", "goGoPercentage", strategy.goGoPercentage],
      ["Slow-go", "slowGoPercentage", strategy.slowGoPercentage],
      ["No-go", "noGoPercentage", strategy.noGoPercentage],
    ] as const
  ).forEach(([phase, itemId, percentage]) => {
    if (percentage <= 0) {
      issues.push({
        field,
        itemId,
        message: `${phase} percentage must be greater than 0%.`,
      });
    } else if (!Number.isInteger(percentage)) {
      issues.push({
        field,
        itemId,
        message: `${phase} percentage must be a whole number.`,
      });
    }
  });

  if (strategy.slowGoStartAge <= retirementAge) {
    issues.push({
      field,
      itemId: "slowGoStartAge",
      message: `Slow-go years must start after ${retirementReferenceLabel} retirement age.`,
    });
  }

  if (strategy.noGoStartAge <= strategy.slowGoStartAge) {
    issues.push({
      field,
      itemId: "noGoStartAge",
      message: "No-go years must start after the Slow-go years.",
    });
  }

  const maximumPhaseAge = Math.min(MAX_SUPPORTED_MODELLING_AGE, lifeExpectancy);
  (
    [
      ["Slow-go", "slowGoStartAge", strategy.slowGoStartAge],
      ["No-go", "noGoStartAge", strategy.noGoStartAge],
    ] as const
  ).forEach(([phase, itemId, startAge]) => {
    if (startAge > maximumPhaseAge) {
      issues.push({
        field,
        itemId,
        message:
          maximumPhaseAge < MAX_SUPPORTED_MODELLING_AGE
            ? `${phase} age cannot be later than ${retirementReferenceLabel} modelled life expectancy of age ${maximumPhaseAge}.`
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
