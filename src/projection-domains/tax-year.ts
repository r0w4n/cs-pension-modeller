import type { ProjectionRow } from "../projection-core";
import {
  getPreRetirementMonthlyEmploymentTaxContext,
  type PensionSettings,
} from "../settings";
import {
  calculateAnnualIncomeTax,
  calculateMonthlyTaxableRetirementIncome,
} from "./tax";

const TAX_RATE_TOLERANCE = 1e-12;

export function getProjectionTaxYearKey(date: string) {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const startYear = month >= 4 ? year : year - 1;

  return `${startYear}-${startYear + 1}`;
}

export type TaxYearIncomeEntry = {
  date: string;
  taxableIncome: number;
  // Income used to establish the tax-year effective rate but not shown or taxed
  // as part of the retirement-income cash flow for this row.
  taxableIncomeContext?: number;
};

export function calculateTaxYearIncomeTaxAllocation(
  entries: TaxYearIncomeEntry[],
  settings: PensionSettings
) {
  const effectiveRates = calculateTaxYearEffectiveRatesForEntries(
    entries,
    settings
  );
  const taxByDate = new Map<string, number>();

  entries.forEach((entry) => {
    taxByDate.set(
      entry.date,
      Math.max(0, entry.taxableIncome) *
        (effectiveRates.get(getProjectionTaxYearKey(entry.date)) ?? 0)
    );
  });

  return taxByDate;
}

export function calculateTaxYearEffectiveRatesForEntries(
  entries: TaxYearIncomeEntry[],
  settings: PensionSettings
) {
  const entriesByTaxYear = new Map<string, TaxYearIncomeEntry[]>();

  entries.forEach((entry) => {
    const key = getProjectionTaxYearKey(entry.date);
    entriesByTaxYear.set(key, [...(entriesByTaxYear.get(key) ?? []), entry]);
  });

  const finalEntry = entries.reduce<TaxYearIncomeEntry | undefined>(
    (latest, entry) => (!latest || entry.date > latest.date ? entry : latest),
    undefined
  );
  const finalTaxYearKey = finalEntry
    ? getProjectionTaxYearKey(finalEntry.date)
    : null;

  return new Map(
    [...entriesByTaxYear].map(([key, taxYearEntries]) => {
      const modelledTaxableIncome = taxYearEntries.reduce(
        (total, entry) =>
          total +
          Math.max(0, entry.taxableIncome) +
          Math.max(0, entry.taxableIncomeContext ?? 0),
        0
      );
      const terminalContinuationIncome =
        key === finalTaxYearKey && finalEntry
          ? Math.max(0, finalEntry.taxableIncome) *
            getRemainingMonthsInTaxYear(finalEntry.date)
          : 0;
      const annualTaxableIncome =
        modelledTaxableIncome + terminalContinuationIncome;
      const annualTax = calculateAnnualIncomeTax(settings, annualTaxableIncome);

      return [
        key,
        annualTaxableIncome > 0 ? annualTax / annualTaxableIncome : 0,
      ] as const;
    })
  );
}

export function getRemainingMonthsInTaxYear(date: string) {
  const month = Number(date.slice(5, 7));

  return month >= 4 ? 15 - month : 3 - month;
}

export function calculateProjectionRowTaxableIncome(
  row: ProjectionRow,
  settings: PensionSettings
) {
  return calculateMonthlyTaxableRetirementIncome({
    settings,
    monthlyAlphaPension: row.monthlyAlphaPensionGross,
    monthlyClassicPension: row.monthlyClassicPensionGross,
    monthlyClassicPlusPension: row.monthlyClassicPlusPensionGross,
    monthlyNuvosPension: row.monthlyNuvosPensionGross,
    monthlyPremiumPension: row.monthlyPremiumPensionGross,
    monthlyStatePension: row.monthlyStatePension,
    monthlySippPension: row.monthlySippPension,
    monthlyCsAvcPension: row.monthlyCsAvcPension,
    monthlySippTaxableOverride: row.monthlySippTaxableIncome,
    monthlyCsAvcTaxableOverride: row.monthlyCsAvcTaxableIncome,
    monthlyAdditionalGuaranteedIncomeTaxable:
      row.monthlyAdditionalGuaranteedIncomeTaxable,
    monthlyEmploymentIncome: row.monthlyEmploymentIncome ?? 0,
  });
}

export function applyTaxYearIncomeTax(
  rows: ProjectionRow[],
  settings: PensionSettings
) {
  if (!settings.taxationEnabled) {
    return rows.map((row) => ({
      ...row,
      monthlyIncomeTax: 0,
      totalMonthlyNetIncome: row.totalMonthlyIncomeBeforeTax,
    }));
  }

  const monthlyTaxByDate = calculateTaxYearIncomeTaxAllocation(
    rows
      .filter((row) => row.date >= settings.startDate)
      .map((row) => ({
        date: row.date,
        taxableIncome: calculateProjectionRowTaxableIncome(row, settings),
        taxableIncomeContext: Math.max(
          0,
          getPreRetirementMonthlyEmploymentTaxContext(settings, row.date) -
            (row.monthlyEmploymentIncome ?? 0)
        ),
      })),
    settings
  );

  return rows.map((row) => {
    const monthlyIncomeTax = monthlyTaxByDate.get(row.date) ?? 0;

    return {
      ...row,
      monthlyIncomeTax,
      totalMonthlyNetIncome: row.totalMonthlyIncomeBeforeTax - monthlyIncomeTax,
    };
  });
}

export function deriveTaxYearEffectiveRates(
  rows: ProjectionRow[],
  settings: PensionSettings
) {
  const totals = new Map<string, { tax: number; taxableIncome: number }>();

  rows.forEach((row) => {
    if (row.date < settings.startDate) {
      return;
    }

    const key = getProjectionTaxYearKey(row.date);
    const current = totals.get(key) ?? { tax: 0, taxableIncome: 0 };
    current.tax += row.monthlyIncomeTax;
    current.taxableIncome += calculateProjectionRowTaxableIncome(row, settings);
    totals.set(key, current);
  });

  return new Map(
    [...totals].map(([key, total]) => [
      key,
      total.taxableIncome > 0 ? total.tax / total.taxableIncome : 0,
    ])
  );
}

export function taxYearEffectiveRatesEqual(
  first: ReadonlyMap<string, number>,
  second: ReadonlyMap<string, number>
) {
  const keys = new Set([...first.keys(), ...second.keys()]);

  return [...keys].every(
    (key) =>
      Math.abs((first.get(key) ?? 0) - (second.get(key) ?? 0)) <=
      TAX_RATE_TOLERANCE
  );
}
