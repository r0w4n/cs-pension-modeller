import {
  LEGACY_UNVERSIONED_SETTINGS_SCHEMA_VERSION,
  SETTINGS_SCHEMA_VERSION,
  type StoredSettingsEnvelope,
} from "./settings-versions";
import { FLEXIBLE_FUND_ACCOUNT_IDS } from "./settings-types";
import { MODEL_AGE_SETTING_KEYS, roundModelAge } from "./settings-shared/age";

type SettingsMigration = (data: unknown) => unknown;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function migrateFromV1ToV2(data: unknown) {
  if (!isRecord(data)) {
    return {};
  }

  const { targetRetirementAge, ...remainingSettings } = data;
  const requirementAge =
    remainingSettings.requirementAge ?? targetRetirementAge ?? data.isaDrawAge;

  if (requirementAge === undefined) {
    return remainingSettings;
  }

  return {
    ...remainingSettings,
    requirementAge,
  };
}

export function migrateFromV2ToV3(data: unknown) {
  if (!isRecord(data)) {
    return {};
  }

  return {
    ...data,
    additionalGuaranteedIncomes: Array.isArray(data.additionalGuaranteedIncomes)
      ? data.additionalGuaranteedIncomes
      : [],
  };
}

export function migrateFromV3ToV4(data: unknown) {
  if (!isRecord(data)) {
    return {};
  }

  return {
    ...data,
    sippHasProtectedPensionAge:
      typeof data.sippHasProtectedPensionAge === "boolean"
        ? data.sippHasProtectedPensionAge
        : false,
    sippProtectedPensionAge:
      typeof data.sippProtectedPensionAge === "number"
        ? data.sippProtectedPensionAge
        : 55,
  };
}

export function migrateFromV4ToV5(data: unknown) {
  if (!isRecord(data)) {
    return {};
  }

  const requirementAge =
    typeof data.requirementAge === "number" ? data.requirementAge : 68;

  return {
    ...data,
    showCsAvc: typeof data.showCsAvc === "boolean" ? data.showCsAvc : false,
    csAvcCurrentPot:
      typeof data.csAvcCurrentPot === "number" ? data.csAvcCurrentPot : 0,
    csAvcMonthlyContribution:
      typeof data.csAvcMonthlyContribution === "number"
        ? data.csAvcMonthlyContribution
        : 0,
    csAvcHasProtectedPensionAge:
      typeof data.csAvcHasProtectedPensionAge === "boolean"
        ? data.csAvcHasProtectedPensionAge
        : false,
    csAvcProtectedPensionAge:
      typeof data.csAvcProtectedPensionAge === "number"
        ? data.csAvcProtectedPensionAge
        : 55,
    csAvcDrawAge:
      typeof data.csAvcDrawAge === "number"
        ? data.csAvcDrawAge
        : requirementAge,
    csAvcLumpSums: Array.isArray(data.csAvcLumpSums) ? data.csAvcLumpSums : [],
    csAvcRealInterestPercent:
      typeof data.csAvcRealInterestPercent === "number"
        ? data.csAvcRealInterestPercent
        : 5,
    csAvcWithdrawalStrategy:
      typeof data.csAvcWithdrawalStrategy === "string"
        ? data.csAvcWithdrawalStrategy
        : "use_by_age",
    csAvcWithdrawalPercent:
      typeof data.csAvcWithdrawalPercent === "number"
        ? data.csAvcWithdrawalPercent
        : 4,
    csAvcWithdrawalTargetAge:
      typeof data.csAvcWithdrawalTargetAge === "number"
        ? data.csAvcWithdrawalTargetAge
        : 75,
    taxCsAvcTaxFreeWithdrawalPercent:
      typeof data.taxCsAvcTaxFreeWithdrawalPercent === "number"
        ? data.taxCsAvcTaxFreeWithdrawalPercent
        : 25,
  };
}

export function migrateFromV5ToV6(data: unknown) {
  if (!isRecord(data)) {
    return {};
  }

  return {
    ...data,
    spendingStrategyType: "FLAT",
  };
}

export function migrateFromV6ToV7(data: unknown) {
  if (!isRecord(data)) {
    return {};
  }

  const legacyStrategy = isRecord(data.spendingSmile) ? data.spendingSmile : {};
  const targetIncome =
    typeof data.desiredRetirementIncome === "number"
      ? data.desiredRetirementIncome
      : 0;

  return {
    ...data,
    spendingSmile: {
      goGoPercentage: getMigratedPercentage(
        legacyStrategy.goGoPercentage,
        legacyStrategy.goGo,
        targetIncome,
        100
      ),
      slowGoStartAge:
        typeof legacyStrategy.slowGoStartAge === "number"
          ? legacyStrategy.slowGoStartAge
          : 75,
      slowGoPercentage: getMigratedPercentage(
        legacyStrategy.slowGoPercentage,
        legacyStrategy.slowGo,
        targetIncome,
        85
      ),
      noGoStartAge:
        typeof legacyStrategy.noGoStartAge === "number"
          ? legacyStrategy.noGoStartAge
          : 85,
      noGoPercentage: getMigratedPercentage(
        legacyStrategy.noGoPercentage,
        legacyStrategy.noGo,
        targetIncome,
        70
      ),
    },
  };
}

export function migrateFromV7ToV8(data: unknown) {
  if (!isRecord(data)) {
    return {};
  }

  return {
    ...data,
    flexibleWithdrawalPriority: [...FLEXIBLE_FUND_ACCOUNT_IDS],
  };
}

export function migrateFromV8ToV9(data: unknown) {
  if (!isRecord(data)) {
    return {};
  }

  return {
    ...data,
    taxRegime: "rest_of_uk",
  };
}

export function migrateFromV9ToV10(data: unknown) {
  if (!isRecord(data)) {
    return {};
  }

  return {
    ...data,
    taxationEnabled:
      typeof data.taxationEnabled === "boolean" ? data.taxationEnabled : false,
  };
}

export function migrateFromV10ToV11(data: unknown) {
  if (!isRecord(data)) {
    return {};
  }

  return {
    ...data,
    taxSippWithdrawalTreatment: "custom",
    taxCsAvcWithdrawalTreatment: "custom",
    taxTrackLumpSumAllowance: false,
    taxLumpSumAllowance: 268_275,
    taxLumpSumAllowanceUsed: 0,
  };
}

export function migrateFromV11ToV12(data: unknown) {
  if (!isRecord(data)) {
    return {};
  }

  const retirementIncomeTargetBasis =
    data.retirementIncomeTargetBasis === "gross" ||
    data.retirementIncomeTargetBasis === "after_tax"
      ? data.retirementIncomeTargetBasis
      : data.taxationEnabled === true
        ? "after_tax"
        : "gross";

  return {
    ...data,
    taxRegime: data.taxRegime === "scotland" ? "scotland" : "rest_of_uk",
    retirementIncomeTargetBasis,
    statePensionForecastConfirmed:
      typeof data.statePensionForecastConfirmed === "boolean"
        ? data.statePensionForecastConfirmed
        : false,
  };
}

export function migrateFromV12ToV13(data: unknown) {
  if (!isRecord(data)) {
    return {};
  }

  const targetAwareData = migrateFromV11ToV12(data);
  const hasLegacyEpa = data.alphaEpaEnabled === true;
  const yearsBeforeNpa =
    data.alphaEpaYearsBeforeNpa === 1 ||
    data.alphaEpaYearsBeforeNpa === 2 ||
    data.alphaEpaYearsBeforeNpa === 3
      ? data.alphaEpaYearsBeforeNpa
      : 3;

  return {
    ...targetAwareData,
    alphaEpaPeriods: Array.isArray(data.alphaEpaPeriods)
      ? data.alphaEpaPeriods
      : hasLegacyEpa &&
          typeof data.alphaEpaStartDate === "string" &&
          typeof data.alphaEpaEndDate === "string"
        ? [
            {
              id: "migrated-epa-period",
              yearsBeforeNpa,
              startDate: data.alphaEpaStartDate,
              endDate: data.alphaEpaEndDate,
            },
          ]
        : [],
  };
}

export function migrateFromV13ToV14(data: unknown) {
  if (!isRecord(data)) {
    return { journeys: {} };
  }

  return {
    journeys: {
      simple: data,
      bridge: data,
      expert: data,
    },
  };
}

export function migrateFromV14ToV15(data: unknown) {
  if (!isRecord(data) || !isRecord(data.journeys)) {
    return { journeys: {} };
  }

  return {
    ...data,
    journeys: Object.fromEntries(
      Object.entries(data.journeys).map(([journey, settings]) => [
        journey,
        migrateJourneyToQuarterYearAges(settings),
      ])
    ),
  };
}

export function migrateFromV15ToV16(data: unknown) {
  if (!isRecord(data) || !isRecord(data.journeys)) {
    return { journeys: {} };
  }

  return {
    ...data,
    journeys: {
      ...data.journeys,
      simple: materializeSimpleJourneyAssumptions(data.journeys.simple),
    },
  };
}

export function migrateFromV16ToV17(data: unknown) {
  if (!isRecord(data) || !isRecord(data.journeys)) {
    return { journeys: {} };
  }

  return {
    ...data,
    journeys: {
      ...data.journeys,
      expert: materializeAfterTaxTarget(data.journeys.expert),
    },
  };
}

export function migrateFromV17ToV18(data: unknown) {
  if (!isRecord(data) || !isRecord(data.journeys)) {
    return { journeys: {} };
  }

  return {
    ...data,
    journeys: Object.fromEntries(
      Object.entries(data.journeys).map(([journey, settings]) => [
        journey,
        isRecord(settings)
          ? {
              ...settings,
              jointRetirement: {
                enabled: false,
                transitionDesiredRetirementIncome:
                  typeof settings.desiredRetirementIncome === "number"
                    ? settings.desiredRetirementIncome
                    : 0,
                fullyRetiredDesiredRetirementIncome:
                  typeof settings.desiredRetirementIncome === "number"
                    ? settings.desiredRetirementIncome
                    : 0,
                spendingStrategyType: "FLAT",
                spendingSmile: settings.spendingSmile,
                flexibleWithdrawalPriority: [],
              },
            }
          : settings,
      ])
    ),
  };
}

const SETTINGS_MIGRATIONS: Record<number, SettingsMigration> = {
  [LEGACY_UNVERSIONED_SETTINGS_SCHEMA_VERSION]: migrateFromV1ToV2,
  2: migrateFromV2ToV3,
  3: migrateFromV3ToV4,
  4: migrateFromV4ToV5,
  5: migrateFromV5ToV6,
  6: migrateFromV6ToV7,
  7: migrateFromV7ToV8,
  8: migrateFromV8ToV9,
  9: migrateFromV9ToV10,
  10: migrateFromV10ToV11,
  11: migrateFromV11ToV12,
  12: migrateFromV12ToV13,
  13: migrateFromV13ToV14,
  14: migrateFromV14ToV15,
  15: migrateFromV15ToV16,
  16: migrateFromV16ToV17,
  17: migrateFromV17ToV18,
};

export function migrateSettingsToLatest(
  envelope: StoredSettingsEnvelope<unknown>
) {
  if (envelope.version === SETTINGS_SCHEMA_VERSION) {
    return envelope.data;
  }

  if (
    envelope.version < LEGACY_UNVERSIONED_SETTINGS_SCHEMA_VERSION ||
    envelope.version > SETTINGS_SCHEMA_VERSION
  ) {
    return {};
  }

  let migratedData = envelope.data;

  for (
    let version = envelope.version;
    version < SETTINGS_SCHEMA_VERSION;
    version += 1
  ) {
    const migrate = SETTINGS_MIGRATIONS[version];

    if (!migrate) {
      return {};
    }

    migratedData = migrate(migratedData);
  }

  return migratedData;
}

function migrateJourneyToQuarterYearAges(data: unknown) {
  if (!isRecord(data)) {
    return data;
  }

  const migrated = { ...data };

  for (const key of MODEL_AGE_SETTING_KEYS) {
    if (Object.hasOwn(migrated, key)) {
      migrated[key] = migrateAgeValue(migrated[key]);
    }
  }

  if (isRecord(data.spendingSmile)) {
    migrated.spendingSmile = {
      ...data.spendingSmile,
      slowGoStartAge: migrateAgeValue(data.spendingSmile.slowGoStartAge),
      noGoStartAge: migrateAgeValue(data.spendingSmile.noGoStartAge),
    };
  }

  if (Array.isArray(data.additionalGuaranteedIncomes)) {
    migrated.additionalGuaranteedIncomes = data.additionalGuaranteedIncomes.map(
      (income: unknown) =>
        isRecord(income)
          ? {
              ...income,
              ...(Object.hasOwn(income, "startAge")
                ? { startAge: migrateAgeValue(income.startAge) }
                : {}),
              ...(Object.hasOwn(income, "endAge")
                ? { endAge: migrateAgeValue(income.endAge) }
                : {}),
            }
          : income
    );
  }

  return migrated;
}

function materializeSimpleJourneyAssumptions(data: unknown) {
  if (!isRecord(data)) {
    return data;
  }

  return {
    ...data,
    showAlpha: true,
    showStatePension: true,
    showSipp: false,
    showIsa: false,
    showLisa: false,
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

function materializeAfterTaxTarget(data: unknown) {
  if (!isRecord(data)) {
    return data;
  }

  return {
    ...data,
    taxationEnabled: true,
    retirementIncomeTargetBasis: "after_tax",
  };
}

function migrateAgeValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? roundModelAge(value)
    : value;
}

function getMigratedPercentage(
  currentValue: unknown,
  legacyPhase: unknown,
  targetIncome: number,
  fallback: number
) {
  if (typeof currentValue === "number") {
    return currentValue;
  }
  if (!isRecord(legacyPhase)) {
    return fallback;
  }
  if (typeof legacyPhase.annualAmountReal === "number" && targetIncome > 0) {
    return roundPercentage((legacyPhase.annualAmountReal / targetIncome) * 100);
  }
  return typeof legacyPhase.percentageOfGoGo === "number"
    ? legacyPhase.percentageOfGoGo
    : fallback;
}

function roundPercentage(value: number) {
  return Math.round(value * 1_000_000) / 1_000_000;
}
