import { describe, expect, it } from "vitest";
import {
  createQuickCalculatorBaseSettings,
  runQuickCalculatorScenarios,
} from "../calculation/quick-calculator-scenarios";
import { createDefaultSettings } from "../settings";
import {
  projectQuickCalculatorResults,
  QUICK_CALCULATOR_RESULT_BASIS,
} from "./quick-calculator-results";

function readyBase(
  inputs: ReturnType<typeof createDefaultSettings>,
  calculationDate: string
) {
  const built = createQuickCalculatorBaseSettings({
    defaults: createDefaultSettings(),
    inputs,
    calculationDate,
  });
  if (built.status !== "ready") throw new Error("Expected valid quick inputs");
  return built.settings;
}

describe("quick calculator result projection", () => {
  it("combines Alpha and State Pension from one canonical dated row", () => {
    const defaults = createDefaultSettings();
    const inputs = {
      ...defaults,
      dateOfBirth: "1987-06-01",
      alphaPensionAbsDate: "2025",
      accruedPensionAtLastAbs: 5_000,
      pensionableEarnings: 42_000,
      alphaPensionDrawAge: 60,
      fullSalary: 250_000,
      currentStatePension: 12_000,
      statePensionForecastConfirmed: false,
    };
    const batch = runQuickCalculatorScenarios({
      baseSettings: readyBase(inputs, "2026-09-21"),
      calculationDate: "2026-09-21",
    });
    const projected = projectQuickCalculatorResults(batch);
    const card = projected.cards.find(
      (candidate) => candidate.id === "selected-standard"
    );
    const scenario = batch.scenarios.find(
      (candidate) => candidate.id === "selected-standard"
    );
    const row = scenario?.result?.rows.find(
      (candidate) => candidate.date >= (card?.combinedStartDate ?? "")
    );

    expect(card?.combinedAnnual).toBe(
      ((row?.monthlyAlphaPensionGross ?? 0) + (row?.monthlyStatePension ?? 0)) *
        12
    );
    expect(scenario?.settings.fullSalary).toBe(42_000);
    expect(row?.monthlyEmploymentIncome ?? 0).toBe(0);
    expect(card?.statePensionConfirmed).toBe(false);
    expect(card?.notes.join(" ")).toContain("not included before");
  });

  it("uses the exact transitional State Pension date and the first canonical row on or after it", () => {
    const defaults = createDefaultSettings();
    const inputs = {
      ...defaults,
      dateOfBirth: "1977-05-01",
      alphaPensionAbsDate: "2025",
      accruedPensionAtLastAbs: 5_000,
      pensionableEarnings: 42_000,
      alphaPensionDrawAge: 60,
      currentStatePension: 12_000,
      statePensionForecastConfirmed: false,
    };
    const batch = runQuickCalculatorScenarios({
      baseSettings: readyBase(inputs, "2026-09-22"),
      calculationDate: "2026-09-22",
    });
    const scenario = batch.scenarios.find(
      (candidate) => candidate.id === "selected-standard"
    );
    const card = projectQuickCalculatorResults(batch).cards.find(
      (candidate) => candidate.id === "selected-standard"
    );
    const expectedRow = scenario?.result?.rows.find(
      (row) => row.date >= "2044-05-06"
    );

    expect(scenario?.settings.statePensionDrawDate).toBe("2044-05-06");
    expect(expectedRow?.monthlyStatePension).toBeGreaterThan(0);
    expect(card?.combinedStartDate).toBe("2044-05-06");
    expect(card?.combinedAnnual).toBe(
      ((expectedRow?.monthlyAlphaPensionGross ?? 0) +
        (expectedRow?.monthlyStatePension ?? 0)) *
        12
    );
  });

  it("reports a missing combined milestone row as unavailable", () => {
    const defaults = createDefaultSettings();
    const batch = runQuickCalculatorScenarios({
      baseSettings: readyBase(
        {
          ...defaults,
          dateOfBirth: "1987-06-01",
          alphaPensionAbsDate: "2025",
          accruedPensionAtLastAbs: 5_000,
          pensionableEarnings: 42_000,
          alphaPensionDrawAge: 60,
        },
        "2026-09-21"
      ),
      calculationDate: "2026-09-21",
    });
    const first = batch.scenarios[0];
    if (!first?.result) {
      throw new Error("Expected a valid scenario fixture");
    }
    first.result.rows = first.result.rows.filter(
      (row) => row.date < first.result!.settings.statePensionDrawDate
    );

    const projected = projectQuickCalculatorResults(batch);
    expect(projected.cards[0]?.combinedAnnual).toBeNull();
    expect(projected.cards[0]?.notes.join(" ")).toContain(
      "unavailable within the supported planning horizon"
    );
  });

  it("keeps a valid zero estimate distinct from an unavailable scenario", () => {
    const defaults = createDefaultSettings();
    const inputs = {
      ...defaults,
      dateOfBirth: "1987-06-01",
      alphaPensionAbsDate: "2025",
      accruedPensionAtLastAbs: 0,
      pensionableEarnings: 0,
      alphaPensionDrawAge: 60,
      showStatePension: false,
    };
    const batch = runQuickCalculatorScenarios({
      baseSettings: readyBase(inputs, "2026-09-22"),
      calculationDate: "2026-09-22",
    });
    const card = projectQuickCalculatorResults(batch).cards.find(
      (candidate) => candidate.id === "selected-standard"
    );

    expect(card).toMatchObject({
      status: "available",
      alphaAnnual: 0,
      combinedAnnual: null,
    });
  });

  it("owns the annual, before-tax, real-terms presentation contract", () => {
    expect(QUICK_CALCULATOR_RESULT_BASIS).toEqual({
      period: "annual",
      tax: "before tax",
      value: "today's money",
      label: "Estimated annual income before tax, in today's money.",
    });
  });
});
