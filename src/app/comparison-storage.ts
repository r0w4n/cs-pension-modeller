import {
  isLocalStorageEnabled,
  parseStoredSettings,
  readStorageItem,
  removeStorageItem,
  writeStorageItem,
} from "../settings";
import {
  clonePensionSettings,
  type ComparisonScenario,
} from "../app-domains/comparison";

const COMPARISON_SCENARIOS_STORAGE_KEY =
  "cs-pension-modeller.comparisonScenarios";
const MAX_COMPARISON_SCENARIOS = 5;

export function loadStoredComparisonScenarios(): ComparisonScenario[] {
  if (!isLocalStorageEnabled()) {
    return [];
  }

  const storedScenarios = readStorageItem(COMPARISON_SCENARIOS_STORAGE_KEY);

  if (!storedScenarios) {
    return [];
  }

  try {
    const parsed = JSON.parse(storedScenarios) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((scenario, index) =>
        normalizeStoredComparisonScenario(scenario, index)
      )
      .filter((scenario): scenario is ComparisonScenario => Boolean(scenario))
      .slice(0, MAX_COMPARISON_SCENARIOS);
  } catch {
    return [];
  }
}

export function saveStoredComparisonScenarios(scenarios: ComparisonScenario[]) {
  if (!isLocalStorageEnabled()) {
    return;
  }

  writeStorageItem(
    COMPARISON_SCENARIOS_STORAGE_KEY,
    JSON.stringify(scenarios.slice(0, MAX_COMPARISON_SCENARIOS))
  );
}

export function clearStoredComparisonScenarios() {
  removeStorageItem(COMPARISON_SCENARIOS_STORAGE_KEY);
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

  return {
    id:
      typeof candidate.id === "string" && candidate.id
        ? candidate.id
        : createComparisonScenarioId(),
    name:
      typeof candidate.name === "string" && candidate.name.trim()
        ? candidate.name
        : `Scenario ${index + 1}`,
    settings: parseStoredSettings(settings) ?? clonePensionSettings(settings),
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
