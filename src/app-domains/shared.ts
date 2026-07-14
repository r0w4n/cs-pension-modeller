import type { PensionSettings } from "../settings";

export function formatDate(value: string) {
  if (!value) {
    return "Not set";
  }

  const parsed = new Date(`${value}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

export function formatCurrencyDetailed(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatShortfallOrSurplus(shortfall: number, surplus: number) {
  if (shortfall > 0) {
    return `${formatCurrencyDetailed(shortfall)} shortfall`;
  }

  if (surplus > 0) {
    return `${formatCurrencyDetailed(surplus)} surplus`;
  }

  return formatCurrencyDetailed(0);
}

export function formatPercent(rate: number) {
  return `${(rate * 100).toFixed(2).replace(/\.?0+$/, "")}%`;
}

export function formatModelledReturn(
  rate: number,
  projectionBasis: PensionSettings["projectionBasis"]
) {
  return projectionBasis === "real"
    ? `${formatPercent(rate)} real return`
    : formatPercent(rate);
}

export function addYearsToIsoDate(value: string, years: number) {
  const [year, month, day] = value.split("-").map(Number);
  const wholeYears = Math.floor(years);
  const remainingMonths = Math.round((years - wholeYears) * 12);
  const nextDate = new Date(
    Date.UTC(year + wholeYears, month - 1 + remainingMonths, day)
  );

  return [
    nextDate.getUTCFullYear(),
    String(nextDate.getUTCMonth() + 1).padStart(2, "0"),
    String(nextDate.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

export function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function formatAge(years: number, months: number) {
  return `${years}y ${months}m`;
}

export function formatDecimalAge(age: number) {
  const totalMonths = Math.round(age * 12);
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  return months === 0 ? `${years}` : `${years}y ${months}m`;
}

export function formatAgeValue(value: number) {
  return value.toFixed(2).replace(/\.00$/, "");
}

export function isSettingsGroupVisible(
  groupId: string,
  settings: PensionSettings
) {
  if (groupId === "alpha") {
    return settings.showAlpha;
  }

  if (groupId === "nuvos") {
    return settings.showNuvos;
  }

  if (groupId === "classic") {
    return settings.showClassic;
  }

  if (groupId === "classic-plus") {
    return settings.showClassicPlus;
  }

  if (groupId === "premium") {
    return settings.showPremium;
  }

  if (groupId === "state") {
    return settings.showStatePension;
  }

  if (groupId === "sipp") {
    return settings.showSipp;
  }

  if (groupId === "isa") {
    return settings.showIsa;
  }

  if (groupId === "lisa") {
    return settings.showLisa;
  }

  if (groupId === "additional-income") {
    return settings.showAdditionalGuaranteedIncome;
  }

  if (groupId === "tax") {
    return settings.taxationEnabled;
  }

  if (groupId === "partial-retirement") {
    return settings.partialRetirementEnabled;
  }

  return true;
}
