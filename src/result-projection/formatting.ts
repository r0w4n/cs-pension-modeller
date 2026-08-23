import { formatModelAgeCompact, type PensionSettings } from "../settings";

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
  return formatModelAgeCompact(value);
}
