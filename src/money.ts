export const MONEY_TOLERANCE = 0.005;
export const MINIMUM_REPORTABLE_LIFETIME_SHORTFALL = 1;

export function normalizeMoney(value: number) {
  return Math.abs(value) <= MONEY_TOLERANCE ? 0 : value;
}

export function calculateMoneyShortfall(target: number, actual: number) {
  return Math.max(0, normalizeMoney(target - actual));
}

export function calculateMoneySurplus(target: number, actual: number) {
  return Math.max(0, normalizeMoney(actual - target));
}

export function isReportableLifetimeShortfall(value: number) {
  return value >= MINIMUM_REPORTABLE_LIFETIME_SHORTFALL;
}
