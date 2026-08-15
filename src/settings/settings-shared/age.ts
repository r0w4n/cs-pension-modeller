export const MODEL_AGE_STEP = 0.25;

export const MODEL_AGE_SETTING_KEYS = [
  "lifeExpectancy",
  "requirementAge",
  "partialRetirementStartAge",
  "alphaPensionLeaveAge",
  "alphaPensionDrawAge",
  "classicPensionDrawAge",
  "classicPlusPensionDrawAge",
  "nuvosPensionLeaveAge",
  "nuvosPensionDrawAge",
  "premiumDrawAge",
  "premiumNormalPensionAge",
  "sippDrawAge",
  "sippWithdrawalTargetAge",
  "csAvcDrawAge",
  "csAvcWithdrawalTargetAge",
  "isaDrawAge",
  "isaWithdrawalTargetAge",
  "lisaDrawAge",
  "lisaWithdrawalTargetAge",
] as const;

export function roundModelAge(value: number) {
  return Math.round(value / MODEL_AGE_STEP) * MODEL_AGE_STEP;
}

export function isModelAge(value: number) {
  return (
    Number.isFinite(value) &&
    Math.abs(value - roundModelAge(value)) < Number.EPSILON * 100
  );
}

export function formatModelAge(value: number) {
  const totalQuarterYears = Math.round(value / MODEL_AGE_STEP);
  const years = Math.floor(totalQuarterYears / 4);
  const months = (totalQuarterYears % 4) * 3;

  if (months === 0) {
    return `${years} years`;
  }

  return `${years} years ${months} months`;
}

export function formatModelAgeCompact(value: number) {
  const totalQuarterYears = Math.round(value / MODEL_AGE_STEP);
  const years = Math.floor(totalQuarterYears / 4);
  const months = (totalQuarterYears % 4) * 3;

  return months === 0 ? `${years}` : `${years}y ${months}m`;
}
