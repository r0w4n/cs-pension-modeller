import type { PensionSettings } from "../settings";
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
};

export function calculateMonthlyIncomeTax(input: MonthlyIncomeTaxInput) {
  if (!input.settings.taxationEnabled) {
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
  } = input;

  const taxableSippShare = 1 - settings.taxSippTaxFreeWithdrawalPercent / 100;
  const taxableCsAvcShare = 1 - settings.taxCsAvcTaxFreeWithdrawalPercent / 100;

  return (
    monthlyAlphaPension +
    monthlyClassicPension +
    monthlyClassicPlusPension +
    monthlyNuvosPension +
    monthlyPremiumPension +
    monthlyStatePension +
    monthlyAdditionalGuaranteedIncomeTaxable +
    monthlySippPension * taxableSippShare +
    monthlyCsAvcPension * taxableCsAvcShare
  );
}

export function calculateAnnualIncomeTax(
  settings: PensionSettings,
  annualTaxableIncome: number
) {
  if (!settings.taxationEnabled || annualTaxableIncome <= 0) {
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
