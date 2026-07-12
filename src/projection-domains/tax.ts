import type { PensionSettings } from "../settings";

export function calculateMonthlyIncomeTax(input: {
  settings: PensionSettings;
  monthlyAlphaPension: number;
  monthlyClassicPension?: number;
  monthlyClassicPlusPension?: number;
  monthlyNuvosPension?: number;
  monthlyPremiumPension?: number;
  monthlyStatePension: number;
  monthlySippPension: number;
  monthlyAdditionalGuaranteedIncomeTaxable?: number;
}) {
  const {
    settings,
    monthlyAlphaPension,
    monthlyClassicPension = 0,
    monthlyClassicPlusPension = 0,
    monthlyNuvosPension = 0,
    monthlyPremiumPension = 0,
    monthlyStatePension,
    monthlySippPension,
    monthlyAdditionalGuaranteedIncomeTaxable = 0,
  } = input;

  if (!settings.taxationEnabled) {
    return 0;
  }

  const taxableSippShare = 1 - settings.taxSippTaxFreeWithdrawalPercent / 100;
  const annualTaxableIncome =
    (monthlyAlphaPension +
      monthlyClassicPension +
      monthlyClassicPlusPension +
      monthlyNuvosPension +
      monthlyPremiumPension +
      monthlyStatePension +
      monthlyAdditionalGuaranteedIncomeTaxable +
      monthlySippPension * taxableSippShare) *
    12;

  return calculateAnnualIncomeTax(settings, annualTaxableIncome) / 12;
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
  const basicBand = Math.max(0, settings.taxBasicRateLimit);
  const additionalThreshold = Math.max(
    settings.taxAdditionalRateThreshold,
    settings.taxPersonalAllowance
  );
  const higherBand = Math.max(
    0,
    additionalThreshold - personalAllowance - basicBand
  );
  const basicTaxable = Math.min(taxableAfterAllowance, basicBand);
  const higherTaxable = Math.min(
    Math.max(0, taxableAfterAllowance - basicBand),
    higherBand
  );
  const additionalTaxable = Math.max(
    0,
    taxableAfterAllowance - basicBand - higherBand
  );

  return (
    basicTaxable * (settings.taxBasicRatePercent / 100) +
    higherTaxable * (settings.taxHigherRatePercent / 100) +
    additionalTaxable * (settings.taxAdditionalRatePercent / 100)
  );
}

function calculateTaxPersonalAllowance(
  settings: PensionSettings,
  annualTaxableIncome: number
) {
  const taper = Math.max(
    0,
    annualTaxableIncome - settings.taxPersonalAllowanceTaperThreshold
  );

  return Math.max(0, settings.taxPersonalAllowance - taper / 2);
}
