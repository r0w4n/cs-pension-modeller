import {
  usesAfterTaxRetirementIncomeTarget,
  type FlexibleFundAccountId,
  type PensionSettings,
  type PensionWithdrawalTaxTreatment,
} from "../settings";
import {
  SCOTTISH_INCOME_TAX_RULES,
  UK_INCOME_TAX_COMMON_RULES,
} from "../data/income-tax-rules";

export type MonthlyIncomeTaxInput = {
  settings: PensionSettings;
  monthlyAlphaPension: number;
  monthlyClassicPension?: number;
  monthlyClassicPlusPension?: number;
  monthlyNuvosPension?: number;
  monthlyPremiumPension?: number;
  monthlyStatePension: number;
  monthlySippPension: number;
  monthlyCsAvcPension?: number;
  monthlyAdditionalGuaranteedIncomeTaxable?: number;
  monthlyAdditionalGuaranteedIncomeNonTaxable?: number;
  monthlyIsaPension?: number;
  monthlyLisaPension?: number;
  monthlyEmploymentIncome?: number;
  monthlySippTaxableOverride?: number;
  monthlyCsAvcTaxableOverride?: number;
};

export type PensionLumpSumAllowanceState = {
  remaining: number;
  trackingEnabled: boolean;
};

export type PensionWithdrawalTaxBreakdown = {
  sippTaxFree: number;
  sippTaxable: number;
  csAvcTaxFree: number;
  csAvcTaxable: number;
  allowanceRemaining: number;
};

export function calculateMonthlyIncomeTax(input: MonthlyIncomeTaxInput) {
  if (
    !input.settings.taxationEnabled &&
    !usesAfterTaxRetirementIncomeTarget(input.settings)
  ) {
    return 0;
  }

  const annualTaxableIncome =
    calculateMonthlyTaxableRetirementIncome(input) * 12;

  return calculateAnnualIncomeTax(input.settings, annualTaxableIncome) / 12;
}

export function calculateMonthlyTaxableRetirementIncome(
  input: MonthlyIncomeTaxInput
) {
  const {
    settings,
    monthlyAlphaPension,
    monthlyClassicPension = 0,
    monthlyClassicPlusPension = 0,
    monthlyNuvosPension = 0,
    monthlyPremiumPension = 0,
    monthlyStatePension,
    monthlySippPension,
    monthlyCsAvcPension = 0,
    monthlyAdditionalGuaranteedIncomeTaxable = 0,
    monthlyEmploymentIncome = 0,
    monthlySippTaxableOverride,
    monthlyCsAvcTaxableOverride,
  } = input;
  const withdrawalTax = calculatePensionWithdrawalTaxBreakdown({
    settings,
    sippWithdrawal: monthlySippPension,
    csAvcWithdrawal: monthlyCsAvcPension,
  });

  return (
    monthlyAlphaPension +
    monthlyClassicPension +
    monthlyClassicPlusPension +
    monthlyNuvosPension +
    monthlyPremiumPension +
    monthlyStatePension +
    monthlyEmploymentIncome +
    monthlyAdditionalGuaranteedIncomeTaxable +
    (monthlySippTaxableOverride ?? withdrawalTax.sippTaxable) +
    (monthlyCsAvcTaxableOverride ?? withdrawalTax.csAvcTaxable)
  );
}

export function createPensionLumpSumAllowanceState(
  settings: PensionSettings
): PensionLumpSumAllowanceState {
  return {
    trackingEnabled: settings.taxTrackLumpSumAllowance,
    remaining: settings.taxTrackLumpSumAllowance
      ? Math.max(
          0,
          settings.taxLumpSumAllowance - settings.taxLumpSumAllowanceUsed
        )
      : Number.POSITIVE_INFINITY,
  };
}

export function consumePensionLumpSumAllowance(
  state: PensionLumpSumAllowanceState,
  requestedTaxFreeCash: number
) {
  const requested = Math.max(0, requestedTaxFreeCash);
  const taxFreeCash = state.trackingEnabled
    ? Math.min(requested, state.remaining)
    : requested;

  return {
    taxFreeCash,
    nextState: {
      ...state,
      remaining: state.trackingEnabled
        ? Math.max(0, state.remaining - taxFreeCash)
        : state.remaining,
    },
  };
}

export function calculatePensionWithdrawalTaxBreakdown(input: {
  settings: PensionSettings;
  sippWithdrawal: number;
  csAvcWithdrawal: number;
  allowanceState?: PensionLumpSumAllowanceState;
  accountOrder?: readonly FlexibleFundAccountId[];
}): PensionWithdrawalTaxBreakdown {
  let state =
    input.allowanceState ?? createPensionLumpSumAllowanceState(input.settings);
  const result = {
    sippTaxFree: 0,
    sippTaxable: Math.max(0, input.sippWithdrawal),
    csAvcTaxFree: 0,
    csAvcTaxable: Math.max(0, input.csAvcWithdrawal),
  };
  const accountOrder = input.accountOrder ?? ["sipp", "csAvc"];

  for (const accountId of accountOrder) {
    if (accountId !== "sipp" && accountId !== "csAvc") {
      continue;
    }

    const withdrawal =
      accountId === "sipp"
        ? Math.max(0, input.sippWithdrawal)
        : Math.max(0, input.csAvcWithdrawal);
    const treatment =
      accountId === "sipp"
        ? input.settings.taxSippWithdrawalTreatment
        : input.settings.taxCsAvcWithdrawalTreatment;
    const customPercent =
      accountId === "sipp"
        ? input.settings.taxSippTaxFreeWithdrawalPercent
        : input.settings.taxCsAvcTaxFreeWithdrawalPercent;
    const requestedTaxFreeCash =
      withdrawal *
      (getTaxFreeWithdrawalPercent(treatment, customPercent) / 100);
    const consumed = consumePensionLumpSumAllowance(
      state,
      requestedTaxFreeCash
    );

    state = consumed.nextState;
    if (accountId === "sipp") {
      result.sippTaxFree = consumed.taxFreeCash;
      result.sippTaxable = withdrawal - consumed.taxFreeCash;
    } else {
      result.csAvcTaxFree = consumed.taxFreeCash;
      result.csAvcTaxable = withdrawal - consumed.taxFreeCash;
    }
  }

  return {
    ...result,
    allowanceRemaining: state.remaining,
  };
}

function getTaxFreeWithdrawalPercent(
  treatment: PensionWithdrawalTaxTreatment,
  customPercent: number
) {
  if (treatment === "ufpls") {
    return 25;
  }

  if (treatment === "custom") {
    return Math.min(25, Math.max(0, customPercent));
  }

  return 0;
}

export function calculateAnnualIncomeTax(
  settings: PensionSettings,
  annualTaxableIncome: number
) {
  if (
    (!settings.taxationEnabled &&
      !usesAfterTaxRetirementIncomeTarget(settings)) ||
    annualTaxableIncome <= 0
  ) {
    return 0;
  }

  const personalAllowance = calculateTaxPersonalAllowance(
    settings,
    annualTaxableIncome
  );
  const taxableAfterAllowance = Math.max(
    0,
    annualTaxableIncome - personalAllowance
  );

  if (settings.taxRegime === "scotland") {
    return calculateScottishIncomeTax(taxableAfterAllowance);
  }

  return calculateRestOfUkIncomeTax(settings, taxableAfterAllowance);
}

function calculateRestOfUkIncomeTax(
  settings: PensionSettings,
  taxableAfterAllowance: number
) {
  const basicBand = Math.max(0, settings.taxBasicRateLimit);
  const additionalThreshold = Math.max(
    basicBand,
    settings.taxAdditionalRateThreshold
  );

  return calculateIncomeTaxAcrossBands(taxableAfterAllowance, [
    {
      upperTaxableIncome: basicBand,
      ratePercent: settings.taxBasicRatePercent,
    },
    {
      upperTaxableIncome: additionalThreshold,
      ratePercent: settings.taxHigherRatePercent,
    },
    {
      upperTaxableIncome: null,
      ratePercent: settings.taxAdditionalRatePercent,
    },
  ]);
}

function calculateScottishIncomeTax(taxableAfterAllowance: number) {
  return calculateIncomeTaxAcrossBands(
    taxableAfterAllowance,
    SCOTTISH_INCOME_TAX_RULES.bands
  );
}

function calculateIncomeTaxAcrossBands(
  taxableIncome: number,
  bands: readonly {
    upperTaxableIncome: number | null;
    ratePercent: number;
  }[]
) {
  let tax = 0;
  let lowerLimit = 0;

  for (const band of bands) {
    const upperLimit = band.upperTaxableIncome ?? Number.POSITIVE_INFINITY;
    const amountInBand = Math.max(
      0,
      Math.min(taxableIncome, upperLimit) - lowerLimit
    );

    tax += amountInBand * (band.ratePercent / 100);

    if (taxableIncome <= upperLimit) {
      break;
    }

    lowerLimit = upperLimit;
  }

  return tax;
}

function calculateTaxPersonalAllowance(
  settings: PensionSettings,
  annualTaxableIncome: number
) {
  const taper = Math.max(
    0,
    annualTaxableIncome - settings.taxPersonalAllowanceTaperThreshold
  );

  return Math.max(
    0,
    settings.taxPersonalAllowance -
      taper *
        UK_INCOME_TAX_COMMON_RULES.personalAllowanceReductionPerExcessPound
  );
}
