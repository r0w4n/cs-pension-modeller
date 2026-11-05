import {
  isLocalStorageEnabled,
  parseStoredSettings,
  readStorageItem,
  removeStorageItem,
  writeStorageItem,
} from "../settings";
import type { ComparisonScenario } from "../result-projection/comparison-result";

const COMPARISON_SCENARIOS_STORAGE_KEY =
  "cs-pension-modeller.comparisonScenarios";
const MAX_COMPARISON_SCENARIOS = 5;

export function loadStoredComparisonScenarios(): ComparisonScenario[] {
  return loadStoredComparisonState().scenarios;
}

export function loadStoredComparisonState(): {
  scenarios: ComparisonScenario[];
  recoveryJson: string | null;
} {
  if (!isLocalStorageEnabled()) {
    return { scenarios: [], recoveryJson: null };
  }

  const storedScenarios = readStorageItem(COMPARISON_SCENARIOS_STORAGE_KEY);

  if (!storedScenarios) {
    return { scenarios: [], recoveryJson: null };
  }

  try {
    const parsed = JSON.parse(storedScenarios) as unknown;

    if (!Array.isArray(parsed)) {
      return { scenarios: [], recoveryJson: storedScenarios };
    }

    const normalized = parsed.map((scenario, index) => {
      try {
        return normalizeStoredComparisonScenario(scenario, index);
      } catch {
        return null;
      }
    });
    const scenarios = normalized
      .filter((scenario): scenario is ComparisonScenario => Boolean(scenario))
      .slice(0, MAX_COMPARISON_SCENARIOS);
    return {
      scenarios,
      recoveryJson: normalized.some((scenario) => scenario === null)
        ? storedScenarios
        : null,
    };
  } catch {
    return { scenarios: [], recoveryJson: storedScenarios };
  }
}

export function saveStoredComparisonScenarios(scenarios: ComparisonScenario[]) {
  if (!isLocalStorageEnabled()) {
    return false;
  }

  return writeStorageItem(
    COMPARISON_SCENARIOS_STORAGE_KEY,
    JSON.stringify(scenarios.slice(0, MAX_COMPARISON_SCENARIOS))
  );
}

export function clearStoredComparisonScenarios() {
  return removeStorageItem(COMPARISON_SCENARIOS_STORAGE_KEY);
}

export function createComparisonScenarioId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `scenario-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function normalizeStoredComparisonScenario(
  scenario: unknown,
  index: number
): ComparisonScenario | null {
  if (!scenario || typeof scenario !== "object") {
    return null;
  }

  const candidate = scenario as Partial<ComparisonScenario>;
  const settings = candidate.settings;

  if (!settings || typeof settings !== "object") {
    return null;
  }

  const now = new Date().toISOString();
  const parsedSettings = parseStoredSettings(settings);
  if (!parsedSettings) {
    return null;
  }

  return {
    id:
      typeof candidate.id === "string" && candidate.id
        ? candidate.id
        : createComparisonScenarioId(),
    name:
      typeof candidate.name === "string" && candidate.name.trim()
        ? candidate.name
        : `Scenario ${index + 1}`,
    settings: {
      ...parsedSettings,
      taxationEnabled: true,
      retirementIncomeTargetBasis: "after_tax",
    },
    createdAt:
      typeof candidate.createdAt === "string" && candidate.createdAt
        ? candidate.createdAt
        : now,
    updatedAt:
      typeof candidate.updatedAt === "string" && candidate.updatedAt
        ? candidate.updatedAt
        : now,
  };
}
