import {
  DEFAULT_DATE_OF_BIRTH,
  NORMAL_MINIMUM_PENSION_AGE_INCREASE_DATE,
  STATE_PENSION_AGE_STEP,
} from "../settings-types";
import {
  addMonthsToIsoDate,
  addYearsToIsoDate,
  isIsoDateInRange,
  normalizeIsoDate,
  roundUpToStep,
} from "./date";
import { calculateDateAge } from "../settings-domains/personal-details";

const fixedStatePensionDateRules = [
  { from: "1953-12-06", to: "1954-01-05", statePensionDate: "2019-03-06" },
  { from: "1954-01-06", to: "1954-02-05", statePensionDate: "2019-05-06" },
  { from: "1954-02-06", to: "1954-03-05", statePensionDate: "2019-07-06" },
  { from: "1954-03-06", to: "1954-04-05", statePensionDate: "2019-09-06" },
  { from: "1954-04-06", to: "1954-05-05", statePensionDate: "2019-11-06" },
  { from: "1954-05-06", to: "1954-06-05", statePensionDate: "2020-01-06" },
  { from: "1954-06-06", to: "1954-07-05", statePensionDate: "2020-03-06" },
  { from: "1954-07-06", to: "1954-08-05", statePensionDate: "2020-05-06" },
  { from: "1954-08-06", to: "1954-09-05", statePensionDate: "2020-07-06" },
  { from: "1954-09-06", to: "1954-10-05", statePensionDate: "2020-09-06" },
  { from: "1977-04-06", to: "1977-05-05", statePensionDate: "2044-05-06" },
  { from: "1977-05-06", to: "1977-06-05", statePensionDate: "2044-07-06" },
  { from: "1977-06-06", to: "1977-07-05", statePensionDate: "2044-09-06" },
  { from: "1977-07-06", to: "1977-08-05", statePensionDate: "2044-11-06" },
  { from: "1977-08-06", to: "1977-09-05", statePensionDate: "2045-01-06" },
  { from: "1977-09-06", to: "1977-10-05", statePensionDate: "2045-03-06" },
  { from: "1977-10-06", to: "1977-11-05", statePensionDate: "2045-05-06" },
  { from: "1977-11-06", to: "1977-12-05", statePensionDate: "2045-07-06" },
  { from: "1977-12-06", to: "1978-01-05", statePensionDate: "2045-09-06" },
  { from: "1978-01-06", to: "1978-02-05", statePensionDate: "2045-11-06" },
  { from: "1978-02-06", to: "1978-03-05", statePensionDate: "2046-01-06" },
  { from: "1978-03-06", to: "1978-04-05", statePensionDate: "2046-03-06" },
] as const;

const statePensionAgeInMonthsRules = [
  { from: "1960-04-06", to: "1960-05-05", ageInMonths: 793 },
  { from: "1960-05-06", to: "1960-06-05", ageInMonths: 794 },
  { from: "1960-06-06", to: "1960-07-05", ageInMonths: 795 },
  { from: "1960-07-06", to: "1960-08-05", ageInMonths: 796 },
  { from: "1960-08-06", to: "1960-09-05", ageInMonths: 797 },
  { from: "1960-09-06", to: "1960-10-05", ageInMonths: 798 },
  { from: "1960-10-06", to: "1960-11-05", ageInMonths: 799 },
  { from: "1960-11-06", to: "1960-12-05", ageInMonths: 800 },
  { from: "1960-12-06", to: "1961-01-05", ageInMonths: 801 },
  { from: "1961-01-06", to: "1961-02-05", ageInMonths: 802 },
  { from: "1961-02-06", to: "1961-03-05", ageInMonths: 803 },
] as const;

export function calculateStatePensionDrawDate(dateOfBirth: string) {
  const normalizedDateOfBirth = normalizeIsoDate(
    dateOfBirth,
    DEFAULT_DATE_OF_BIRTH
  );
  const fixedDateRule = fixedStatePensionDateRules.find((rule) =>
    isIsoDateInRange(normalizedDateOfBirth, rule.from, rule.to)
  );

  if (fixedDateRule) {
    return fixedDateRule.statePensionDate;
  }

  if (normalizedDateOfBirth <= "1960-04-05") {
    return addYearsToIsoDate(normalizedDateOfBirth, 66);
  }

  const ageInMonthsRule = statePensionAgeInMonthsRules.find((rule) =>
    isIsoDateInRange(normalizedDateOfBirth, rule.from, rule.to)
  );

  if (ageInMonthsRule) {
    return addMonthsToIsoDate(
      normalizedDateOfBirth,
      ageInMonthsRule.ageInMonths
    );
  }

  if (normalizedDateOfBirth <= "1977-04-05") {
    return addYearsToIsoDate(normalizedDateOfBirth, 67);
  }

  if (normalizedDateOfBirth >= "1978-04-06") {
    return addYearsToIsoDate(normalizedDateOfBirth, 68);
  }

  return addYearsToIsoDate(normalizedDateOfBirth, 68);
}

function calculateNormalPensionAgeMonths(
  dateOfBirth: string,
  statePensionDrawDate: string
) {
  const [birthYear, birthMonth] = dateOfBirth.split("-").map(Number);
  const [drawYear, drawMonth] = statePensionDrawDate.split("-").map(Number);
  const monthDifference =
    (drawYear - birthYear) * 12 + (drawMonth - birthMonth);
  const dateAtMonthDifference = addMonthsToIsoDate(
    dateOfBirth,
    monthDifference
  );

  return dateAtMonthDifference >= statePensionDrawDate
    ? monthDifference
    : monthDifference + 1;
}

export function calculateNormalPensionAge(dateOfBirth: string) {
  const normalizedDateOfBirth = normalizeIsoDate(
    dateOfBirth,
    DEFAULT_DATE_OF_BIRTH
  );
  const statePensionDrawDate = calculateStatePensionDrawDate(
    normalizedDateOfBirth
  );

  return (
    calculateNormalPensionAgeMonths(
      normalizedDateOfBirth,
      statePensionDrawDate
    ) / 12
  );
}

export function calculateMinimumStatePensionDrawAge(dateOfBirth: string) {
  const normalizedDateOfBirth = normalizeIsoDate(
    dateOfBirth,
    DEFAULT_DATE_OF_BIRTH
  );
  const defaultDrawDate = calculateStatePensionDrawDate(normalizedDateOfBirth);

  return roundUpToStep(
    calculateDateAge(normalizedDateOfBirth, defaultDrawDate),
    STATE_PENSION_AGE_STEP
  );
}

export function normalizeStatePensionDrawAge(
  value: number,
  dateOfBirth: string
) {
  const minimumStatePensionDrawAge =
    calculateMinimumStatePensionDrawAge(dateOfBirth);
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    return minimumStatePensionDrawAge;
  }

  return roundUpToStep(
    Math.min(100, Math.max(minimumStatePensionDrawAge, parsedValue)),
    STATE_PENSION_AGE_STEP
  );
}

export function calculateStatePensionDrawAge(
  dateOfBirth: string,
  statePensionDrawDate: string
) {
  const normalizedDateOfBirth = normalizeIsoDate(
    dateOfBirth,
    DEFAULT_DATE_OF_BIRTH
  );
  const normalizedDrawDate = normalizeIsoDate(
    statePensionDrawDate,
    calculateStatePensionDrawDate(normalizedDateOfBirth)
  );

  return normalizeStatePensionDrawAge(
    calculateDateAge(normalizedDateOfBirth, normalizedDrawDate),
    normalizedDateOfBirth
  );
}

export function calculateStatePensionDrawDateFromAge(
  dateOfBirth: string,
  statePensionDrawAge: number
) {
  const normalizedDateOfBirth = normalizeIsoDate(
    dateOfBirth,
    DEFAULT_DATE_OF_BIRTH
  );
  const normalizedDrawAge = normalizeStatePensionDrawAge(
    statePensionDrawAge,
    normalizedDateOfBirth
  );

  return addYearsToIsoDate(normalizedDateOfBirth, normalizedDrawAge);
}

function normalizeMinimumPensionAccessAge(
  value: number,
  dateOfBirth: string,
  maxAge = 70
) {
  const normalizedDateOfBirth = normalizeIsoDate(
    dateOfBirth,
    DEFAULT_DATE_OF_BIRTH
  );
  const parsed = Number(value);
  const normalizedAge = Number.isFinite(parsed)
    ? Math.min(maxAge, Math.max(55, parsed))
    : 58;
  const sippDrawDate = addYearsToIsoDate(normalizedDateOfBirth, normalizedAge);

  if (
    sippDrawDate >= NORMAL_MINIMUM_PENSION_AGE_INCREASE_DATE &&
    normalizedAge < 57
  ) {
    return 57;
  }

  return normalizedAge;
}

export function calculateMinimumPensionAccessAge(dateOfBirth: string) {
  const normalizedDateOfBirth = normalizeIsoDate(
    dateOfBirth,
    DEFAULT_DATE_OF_BIRTH
  );

  return normalizeMinimumPensionAccessAge(55, normalizedDateOfBirth) > 55
    ? 57
    : 55;
}

export function calculateMinimumSippAccessAge(dateOfBirth: string) {
  return calculateMinimumPensionAccessAge(dateOfBirth);
}

export function normalizeAlphaPensionDrawAge(
  value: number,
  dateOfBirth: string
) {
  return normalizeMinimumPensionAccessAge(value, dateOfBirth);
}

export function normalizeSippDrawAge(value: number, dateOfBirth: string) {
  return normalizeMinimumPensionAccessAge(value, dateOfBirth, 100);
}
