import type { ComparisonResult } from "../result-projection/comparison-result";
import type { PensionSettings } from "../settings";
import { formatDate, formatDecimalAge } from "../result-projection/formatting";

export type RetirementOutcomeStatus = "onTrack" | "shortfall" | "atRisk";

export type RetirementOutcomeBanner = {
  status: RetirementOutcomeStatus;
  label: "Looks workable" | "Shortfall" | "At risk" | "Needs checking";
  message: string;
  warning?: {
    heading: string;
    message: string;
  };
};

export function buildRetirementOutcomeBanner(
  result: ComparisonResult
): RetirementOutcomeBanner {
  if (result.household) {
    const assessment = result.household.assessment;
    if (!assessment.meetsTargetThroughout) {
      return {
        status: "shortfall",
        label: "Shortfall",
        message: buildHouseholdShortfallOutcomeMessage(result),
        warning: buildUnconfirmedStatePensionWarning(result),
      };
    }

    if (
      usesUnconfirmedStatePension(result.scenario.settings) &&
      result.statePensionAssumptionAffectsTarget
    ) {
      return {
        status: "atRisk",
        label: "Needs checking",
        message: buildHouseholdOnTrackOutcomeMessage(result),
        warning: buildUnconfirmedStatePensionWarning(result),
      };
    }

    return {
      status: "onTrack",
      label: "Looks workable",
      message: buildHouseholdOnTrackOutcomeMessage(result),
      warning: buildUnconfirmedStatePensionWarning(result),
    };
  }

  if (!result.assessment.meetsTargetThroughout) {
    return {
      status: "shortfall",
      label: "Shortfall",
      message: buildShortfallOutcomeMessage(result),
      warning: buildUnconfirmedStatePensionWarning(result),
    };
  }

  if (
    usesUnconfirmedStatePension(result.scenario.settings) &&
    result.statePensionAssumptionAffectsTarget
  ) {
    return {
      status: "atRisk",
      label: "Needs checking",
      message: buildOnTrackOutcomeMessage(result),
      warning: buildUnconfirmedStatePensionWarning(result),
    };
  }

  return {
    status: "onTrack",
    label: "Looks workable",
    message: buildOnTrackOutcomeMessage(result),
    warning: buildUnconfirmedStatePensionWarning(result),
  };
}

function usesUnconfirmedStatePension(settings: PensionSettings) {
  return getUnconfirmedStatePensions(settings).length > 0;
}

type UnconfirmedStatePension = {
  owner: "Your" | "Partner's";
  annualAmount: number;
};

function getUnconfirmedStatePensions(
  settings: PensionSettings
): UnconfirmedStatePension[] {
  return [
    ...(settings.showStatePension && !settings.statePensionForecastConfirmed
      ? [
          {
            owner: "Your" as const,
            annualAmount: settings.currentStatePension,
          },
        ]
      : []),
    ...(settings.jointRetirement.enabled &&
    settings.partner?.showStatePension &&
    !settings.partner.statePensionForecastConfirmed
      ? [
          {
            owner: "Partner's" as const,
            annualAmount: settings.partner.currentStatePension,
          },
        ]
      : []),
  ];
}

function formatStatePensionAssumptionList(
  assumptions: UnconfirmedStatePension[],
  style: "per-year" | "a-year"
) {
  const formatted = assumptions.map(
    ({ owner, annualAmount }) =>
      `${owner} assumed State Pension of ${
        style === "per-year"
          ? formatCurrencyWholePerYear(annualAmount)
          : `${formatCurrencyWhole(annualAmount)} a year`
      }`
  );

  return formatted.length === 2
    ? `${formatted[0]} and ${formatted[1]}`
    : (formatted[0] ?? "an unconfirmed State Pension amount");
}

function buildUnconfirmedStatePensionWarning(
  result: ComparisonResult
): RetirementOutcomeBanner["warning"] {
  const assumptions = getUnconfirmedStatePensions(result.scenario.settings);

  if (assumptions.length === 0) {
    return undefined;
  }

  const hasExistingShortfall = result.household
    ? !result.household.assessment.meetsTargetThroughout
    : !result.assessment.meetsTargetThroughout;
  const household = Boolean(result.household);
  const assumptionList = formatStatePensionAssumptionList(
    assumptions,
    "a-year"
  );
  if (!household && assumptions.length === 1) {
    return buildSinglePersonStatePensionWarning(
      assumptions[0],
      hasExistingShortfall,
      result.statePensionAssumptionAffectsTarget
    );
  }

  return {
    heading:
      assumptions.length === 1
        ? "State Pension amount not confirmed"
        : "State Pension amounts not confirmed",
    message: `${buildAttributedStatePensionMaterialitySentence({
      assumptionList,
      assumptionCount: assumptions.length,
      hasExistingShortfall,
      household,
      affectsTarget: result.statePensionAssumptionAffectsTarget,
    })} Review the relevant State Pension section and enter the personalised forecast when available.`,
  };
}

function buildSinglePersonStatePensionWarning(
  assumption: UnconfirmedStatePension,
  hasExistingShortfall: boolean,
  affectsTarget: boolean
): NonNullable<RetirementOutcomeBanner["warning"]> {
  const assumedAmount = `${formatCurrencyWhole(
    assumption.annualAmount
  )} a year`;
  let materialitySentence: string;

  if (hasExistingShortfall) {
    materialitySentence = `This projection includes an assumed State Pension of ${assumedAmount}. Your actual shortfall may differ once you enter your personalised forecast.`;
  } else if (affectsTarget) {
    materialitySentence = `This projection meets your target only when the assumed State Pension of ${assumedAmount} is included.`;
  } else {
    materialitySentence = `This projection includes an assumed State Pension of ${assumedAmount}. Your target is still met if this income is excluded, but figures that include it should be treated with caution until you check your personalised forecast.`;
  }

  return {
    heading: "State Pension amount not confirmed",
    message: `${materialitySentence} Review the State Pension section and enter your personalised forecast when available.`,
  };
}

function buildAttributedStatePensionMaterialitySentence({
  assumptionList,
  assumptionCount,
  hasExistingShortfall,
  household,
  affectsTarget,
}: {
  assumptionList: string;
  assumptionCount: number;
  hasExistingShortfall: boolean;
  household: boolean;
  affectsTarget: boolean;
}) {
  const hasOneAssumption = assumptionCount === 1;

  if (hasExistingShortfall) {
    return `This projection includes ${assumptionList}. ${
      household ? "The household's" : "Your"
    } actual shortfall may differ once the personalised forecast${
      hasOneAssumption ? " is" : "s are"
    } entered.`;
  }

  if (affectsTarget) {
    return `This projection meets ${
      household ? "the household target" : "your target"
    } only when ${assumptionList} ${hasOneAssumption ? "is" : "are"} included.`;
  }

  return `This projection includes ${assumptionList}. ${
    household ? "The household target" : "Your target"
  } is still met if ${
    hasOneAssumption ? "this income is" : "these incomes are"
  } excluded, but figures that include ${
    hasOneAssumption ? "it" : "them"
  } should be treated with caution until the personalised forecast${
    hasOneAssumption ? " is" : "s are"
  } checked.`;
}

function buildHouseholdOnTrackOutcomeMessage(result: ComparisonResult) {
  const household = result.household;
  if (!household) {
    return "";
  }

  const target = formatCurrencyWholePerYear(
    household.assessment.fullyRetiredAnnualTarget
  );
  return `Based on the information entered, this household scenario appears to provide the household target of ${target} once both people are retired through to ${formatDate(household.householdEndDate)}.`;
}

function buildHouseholdShortfallOutcomeMessage(result: ComparisonResult) {
  const household = result.household;
  if (!household) {
    return "";
  }

  const assessment = household.assessment;
  const firstShortfallDate = assessment.firstShortfallDate
    ? formatDate(assessment.firstShortfallDate)
    : "the start of the assessed period";
  return `Household shortfall from ${firstShortfallDate}. Based on the information entered, this household scenario does not provide the household target through to ${formatDate(household.householdEndDate)}.`;
}

function buildOnTrackOutcomeMessage(result: ComparisonResult) {
  const settings = result.scenario.settings;
  const targetDescription =
    settings.retirementIncomeTargetBasis === "after_tax"
      ? "target spending after estimated tax"
      : "target income before tax";
  const sentences = [
    `Based on the information entered, this scenario appears to provide your ${targetDescription} of ${formatCurrencyWholePerYear(
      result.assessment.retirementAnnualTarget
    )} ${formatProjectionBasisPhrase(settings)} from age ${formatDecimalAge(
      settings.requirementAge
    )} until age ${formatDecimalAge(settings.lifeExpectancy)}.`,
    formatBridgeFundingSentence(result),
    formatCivilServicePensionStartSentence(result),
    formatStatePensionStartSentence(result),
  ];

  return sentences.filter(Boolean).join(" ");
}

function buildShortfallOutcomeMessage(result: ComparisonResult) {
  const settings = result.scenario.settings;
  const firstShortfallAge =
    result.assessment.firstShortfallAge ?? settings.requirementAge;
  const firstShortfallSentence = ` The first shortfall is ${formatCurrencyWholePerYear(
    result.assessment.firstShortfallAnnualAmount
  )} ${formatProjectionBasisPhrase(settings)}.`;

  const targetDescription =
    settings.retirementIncomeTargetBasis === "after_tax"
      ? "target spending after estimated tax"
      : "target income before tax";

  return `Shortfall from age ${formatDecimalAge(
    firstShortfallAge
  )}. Based on the information entered, this scenario does not provide your ${targetDescription} of ${formatCurrencyWholePerYear(
    result.assessment.firstShortfallAnnualTarget
  )} through to age ${formatDecimalAge(
    settings.lifeExpectancy
  )}.${firstShortfallSentence}`;
}

function formatBridgeFundingSentence(result: ComparisonResult) {
  const bridgeWithdrawals = result.summary.retirementIncome.bridgeWithdrawals;

  if (bridgeWithdrawals.length === 0) {
    return "";
  }

  const startAge = Math.min(
    ...bridgeWithdrawals.map((withdrawal) => withdrawal.startAge)
  );
  const endAges = bridgeWithdrawals
    .map((withdrawal) => withdrawal.endAge)
    .filter((age): age is number => age !== null);
  const endAge = endAges.length > 0 ? Math.max(...endAges) : null;
  const labels = bridgeWithdrawals.map((withdrawal) => withdrawal.label);

  return `Bridge pots (${formatList(labels)}) cover ages ${formatDecimalAge(
    startAge
  )}${endAge === null ? " onwards" : `-${formatDecimalAge(endAge)}`}.`;
}

function formatCivilServicePensionStartSentence(result: ComparisonResult) {
  const settings = result.scenario.settings;
  const civilServiceStartAges = [
    ...(settings.showAlpha ? [settings.alphaPensionDrawAge] : []),
    ...(settings.showNuvos ? [settings.nuvosPensionDrawAge] : []),
  ];

  if (civilServiceStartAges.length === 0) {
    return "";
  }

  return `Civil Service pension income starts at age ${formatDecimalAge(
    Math.min(...civilServiceStartAges)
  )}.`;
}

function formatStatePensionStartSentence(result: ComparisonResult) {
  const settings = result.scenario.settings;

  if (!settings.showStatePension) {
    return "";
  }

  return `State Pension starts at age ${formatDecimalAge(
    result.summary.calculated.statePensionAge
  )}.`;
}

function formatCurrencyWholePerYear(value: number) {
  return `${formatCurrencyWhole(value)}/year`;
}

function formatCurrencyWhole(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatProjectionBasisPhrase(settings: PensionSettings) {
  return settings.projectionBasis === "real"
    ? "in today's money"
    : "in nominal terms";
}

function formatList(values: string[]) {
  const uniqueValues = Array.from(new Set(values));

  if (uniqueValues.length <= 1) {
    return uniqueValues[0] ?? "selected pots";
  }

  return `${uniqueValues.slice(0, -1).join(", ")} and ${uniqueValues.at(-1)}`;
}
