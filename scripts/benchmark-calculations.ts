import {
  calculateRetirementPlan,
  type RetirementPlanCalculationOptions,
} from "../src/calculation/retirement-plan";
import {
  createDefaultPartnerSettings,
  createDefaultSettings,
  normalizeSettings,
  type PensionSettings,
} from "../src/settings";

const SAMPLE_COUNT = 10;
const WARMUP_COUNT = 3;

type Scenario = {
  name: string;
  settings: PensionSettings;
};

type Measurement = {
  medianMs: number;
  minMs: number;
  maxMs: number;
  rows: number;
  previews: number;
};

const scenarios = createScenarios();

for (const scenario of scenarios) {
  const fast = measureScenario(scenario, {
    includeTargetBasedWithdrawalPreviews: false,
  });
  const full = measureScenario(scenario, {
    includeTargetBasedWithdrawalPreviews: true,
  });

  printMeasurement(scenario.name, "main", fast);
  printMeasurement(scenario.name, "with previews", full);
}

function measureScenario(
  scenario: Scenario,
  options: RetirementPlanCalculationOptions
): Measurement {
  for (let index = 0; index < WARMUP_COUNT; index += 1) {
    calculateRetirementPlan(scenario.settings, options);
  }

  const durations: number[] = [];
  let rows = 0;
  let previews = 0;

  for (let index = 0; index < SAMPLE_COUNT; index += 1) {
    const start = performance.now();
    const result = calculateRetirementPlan(scenario.settings, options);
    const end = performance.now();

    durations.push(end - start);
    rows = result.rows.length;
    previews = result.targetBasedWithdrawalPreviews.length;
  }

  durations.sort((first, second) => first - second);

  return {
    medianMs: durations[Math.floor(durations.length / 2)] ?? 0,
    minMs: durations[0] ?? 0,
    maxMs: durations.at(-1) ?? 0,
    rows,
    previews,
  };
}

function printMeasurement(
  scenarioName: string,
  phase: string,
  measurement: Measurement
) {
  console.log(
    [
      scenarioName.padEnd(28),
      phase.padEnd(13),
      `median=${measurement.medianMs.toFixed(2)}ms`,
      `min=${measurement.minMs.toFixed(2)}ms`,
      `max=${measurement.maxMs.toFixed(2)}ms`,
      `rows=${measurement.rows}`,
      `previews=${measurement.previews}`,
    ].join("  ")
  );
}

function createScenarios(): Scenario[] {
  return [
    {
      name: "no flexible funds",
      settings: baseScenario({
        showSipp: false,
        showIsa: false,
        showLisa: false,
        showCsAvc: false,
      }),
    },
    {
      name: "SIPP + ISA",
      settings: baseScenario({
        showSipp: true,
        sippCurrentPot: 125_000,
        sippMonthlyContribution: 600,
        sippWithdrawalStrategy: "zero_at_death",
        showIsa: true,
        isaCurrentPot: 40_000,
        isaMonthlyContribution: 250,
        isaWithdrawalStrategy: "zero_at_death",
      }),
    },
    {
      name: "target SIPP + ISA",
      settings: baseScenario({
        showSipp: true,
        sippCurrentPot: 125_000,
        sippMonthlyContribution: 600,
        sippWithdrawalStrategy: "meet_income_target",
        showIsa: true,
        isaCurrentPot: 40_000,
        isaMonthlyContribution: 250,
        isaWithdrawalStrategy: "meet_income_target",
        flexibleWithdrawalPriority: ["isa", "sipp", "lisa", "csAvc"],
      }),
    },
    {
      name: "four accounts",
      settings: baseScenario({
        showSipp: true,
        sippCurrentPot: 125_000,
        sippMonthlyContribution: 600,
        sippWithdrawalStrategy: "percentage",
        sippWithdrawalPercent: 6,
        showIsa: true,
        isaCurrentPot: 50_000,
        isaMonthlyContribution: 250,
        isaWithdrawalStrategy: "percentage",
        isaWithdrawalPercent: 7,
        showLisa: true,
        lisaCurrentPot: 20_000,
        lisaMonthlyContribution: 200,
        lisaWithdrawalStrategy: "percentage",
        lisaWithdrawalPercent: 7,
        showCsAvc: true,
        csAvcCurrentPot: 30_000,
        csAvcMonthlyContribution: 250,
        csAvcWithdrawalStrategy: "percentage",
        csAvcWithdrawalPercent: 7,
      }),
    },
    {
      name: "household",
      settings: householdScenario(),
    },
  ];
}

function baseScenario(patch: Partial<PensionSettings> = {}) {
  return normalizeSettings({
    ...createDefaultSettings(),
    startDate: "2026-04-01",
    dateOfBirth: "1986-04-01",
    alphaPensionAbsDate: "2026",
    accruedPensionAtLastAbs: 12_000,
    pensionableEarnings: 52_000,
    alphaPensionLeaveAge: 58,
    alphaPensionDrawAge: 60,
    requirementAge: 60,
    lifeExpectancy: 90,
    desiredRetirementIncome: 32_700,
    currentStatePension: 12_548,
    statePensionDrawDate: "2054-04-01",
    taxationEnabled: true,
    ...patch,
  });
}

function householdScenario() {
  const settings = baseScenario({
    showSipp: true,
    sippCurrentPot: 100_000,
    sippWithdrawalStrategy: "meet_income_target",
    showIsa: true,
    isaCurrentPot: 40_000,
    isaWithdrawalStrategy: "meet_income_target",
    flexibleWithdrawalPriority: ["isa", "sipp", "lisa", "csAvc"],
  });

  return normalizeSettings({
    ...settings,
    jointRetirement: {
      ...settings.jointRetirement,
      enabled: true,
      transitionDesiredRetirementIncome: 45_400,
      fullyRetiredDesiredRetirementIncome: 45_400,
    },
    partner: {
      ...createDefaultPartnerSettings(),
      dateOfBirth: "1988-04-01",
      alphaPensionAbsDate: "2026",
      accruedPensionAtLastAbs: 9_000,
      pensionableEarnings: 45_000,
      alphaPensionLeaveAge: 60,
      alphaPensionDrawAge: 62,
      requirementAge: 62,
      lifeExpectancy: 92,
      showSipp: true,
      sippCurrentPot: 80_000,
      sippWithdrawalStrategy: "meet_income_target",
      showIsa: true,
      isaCurrentPot: 35_000,
      isaWithdrawalStrategy: "meet_income_target",
      currentStatePension: 12_548,
      statePensionDrawDate: "2056-04-01",
    },
  });
}
