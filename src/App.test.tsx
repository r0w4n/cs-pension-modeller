import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import type { PensionSummary, ProjectionRow } from "./projection";
import type { PensionSettings } from "./settings";

const projectionFixtures = vi.hoisted(() => {
  const baseRows = [
    {
      date: "2025-05-09",
      age: 40,
      ageMonths: 0,
      milestones: ["Calculation start"],
      milestoneDates: ["2025-05-09"],
      monthlyAddedPension: 0,
      lumpSumAddedPension: 0,
      annualStandardAlphaPension: 12000,
      annualEpaAlphaPension: 0,
      annualAccruedAlphaPension: 12000,
      annualAlphaPensionIncludingReduction: 12000,
      monthlyAlphaPensionGross: 900,
      annualNuvosPension: 0,
      annualNuvosPensionIncludingReduction: 0,
      monthlyNuvosPensionGross: 0,
      monthlyStatePension: 0,
      sippPot: 40000,
      monthlySippPension: 0,
      isaPot: 15000,
      monthlyIsaPension: 0,
      totalMonthlyIncomeBeforeTax: 900,
      monthlyIncomeTax: 0,
      totalMonthlyNetIncome: 900,
    },
    {
      date: "2050-06-01",
      age: 65,
      ageMonths: 1,
      milestones: [],
      milestoneDates: [],
      monthlyAddedPension: 0,
      lumpSumAddedPension: 0,
      annualStandardAlphaPension: 18000,
      annualEpaAlphaPension: 0,
      annualAccruedAlphaPension: 18000,
      annualAlphaPensionIncludingReduction: 18000,
      monthlyAlphaPensionGross: 1300,
      annualNuvosPension: 5000,
      annualNuvosPensionIncludingReduction: 5000,
      monthlyNuvosPensionGross: 416.67,
      monthlyStatePension: 0,
      sippPot: 35000,
      monthlySippPension: 200,
      isaPot: 12000,
      monthlyIsaPension: 100,
      totalMonthlyIncomeBeforeTax: 1600,
      monthlyIncomeTax: 0,
      totalMonthlyNetIncome: 1600,
    },
    {
      date: "2058-02-14",
      age: 72,
      ageMonths: 0,
      milestones: [
        "Starts Drawing Alpha Pension",
        "Starts Drawing State Pension",
        "Life expectancy",
      ],
      milestoneDates: ["2058-02-14"],
      monthlyAddedPension: 0,
      lumpSumAddedPension: 0,
      annualStandardAlphaPension: 22000,
      annualEpaAlphaPension: 0,
      annualAccruedAlphaPension: 22000,
      annualAlphaPensionIncludingReduction: 22000,
      monthlyAlphaPensionGross: 1600,
      annualNuvosPension: 6000,
      annualNuvosPensionIncludingReduction: 6000,
      monthlyNuvosPensionGross: 500,
      monthlyStatePension: 900,
      sippPot: 0,
      monthlySippPension: 300,
      isaPot: 0,
      monthlyIsaPension: 150,
      totalMonthlyIncomeBeforeTax: 2950,
      monthlyIncomeTax: 0,
      totalMonthlyNetIncome: 2950,
    },
  ];

  return { baseRows };
});

vi.mock("./projection", async () => {
  const actual =
    await vi.importActual<typeof import("./projection")>("./projection");
  const { validateSettings } =
    await vi.importActual<typeof import("./settings")>("./settings");

  return {
    ...actual,
    createProjectionTable: vi.fn(
      (settings: PensionSettings): ProjectionRow[] => {
        if (validateSettings(settings).length > 0) {
          return [];
        }

        return projectionFixtures.baseRows.map((row, index) => ({
          ...row,
          milestones:
            index === 2
              ? [
                  "Starts Drawing Alpha Pension",
                  ...(settings.showStatePension
                    ? ["Starts Drawing State Pension"]
                    : []),
                  "Life expectancy",
                ]
              : row.milestones,
          monthlyStatePension: settings.showStatePension
            ? row.monthlyStatePension
            : 0,
          monthlyNuvosPensionGross: settings.showNuvos
            ? row.monthlyNuvosPensionGross
            : 0,
          monthlySippPension: settings.showSipp ? row.monthlySippPension : 0,
          monthlyIsaPension: settings.showIsa ? row.monthlyIsaPension : 0,
          totalMonthlyIncomeBeforeTax:
            row.monthlyAlphaPensionGross +
            (settings.showNuvos ? row.monthlyNuvosPensionGross : 0) +
            (settings.showStatePension ? row.monthlyStatePension : 0) +
            (settings.showSipp ? row.monthlySippPension : 0) +
            (settings.showIsa ? row.monthlyIsaPension : 0),
          monthlyIncomeTax: settings.taxationEnabled ? 100 : 0,
          totalMonthlyNetIncome:
            row.monthlyAlphaPensionGross +
            (settings.showNuvos ? row.monthlyNuvosPensionGross : 0) +
            (settings.showStatePension ? row.monthlyStatePension : 0) +
            (settings.showSipp ? row.monthlySippPension : 0) +
            (settings.showIsa ? row.monthlyIsaPension : 0) -
            (settings.taxationEnabled ? 100 : 0),
        }));
      }
    ),
    generatePensionSummary: vi.fn(
      (rows: ProjectionRow[], settings: PensionSettings): PensionSummary => ({
        keyDates: {
          stopsAlphaAccrual: settings.startDate,
          startsAlphaPension: settings.startDate,
          stopsNuvosAccrual: settings.startDate,
          startsNuvosPension: settings.startDate,
          startsSippDraw: settings.startDate,
          startsIsaDraw: settings.startDate,
          startsStatePension: settings.statePensionDrawDate,
        },
        alphaPension: {
          annualAtDraw: rows.at(-1)?.annualAlphaPensionIncludingReduction ?? 0,
          monthlyAtDraw: rows.at(-1)?.monthlyAlphaPensionGross ?? 0,
          maximumAnnualAccrued: rows.at(-1)?.annualAccruedAlphaPension ?? 0,
          totalAddedAfterToday: rows.reduce(
            (total, row) =>
              total + row.monthlyAddedPension + row.lumpSumAddedPension,
            0
          ),
        },
        nuvosPension: {
          annualAtDraw: rows.at(-1)?.annualNuvosPensionIncludingReduction ?? 0,
          monthlyAtDraw: rows.at(-1)?.monthlyNuvosPensionGross ?? 0,
          maximumAnnualAccrued: rows.at(-1)?.annualNuvosPension ?? 0,
        },
        sippPension: {
          potAtDraw: rows.at(-1)?.sippPot ?? 0,
          monthlyAtDraw: rows.at(-1)?.monthlySippPension ?? 0,
          totalContributionsAfterTaxRelief: 0,
        },
        isaPension: {
          potAtDraw: rows.at(-1)?.isaPot ?? 0,
          monthlyAtDraw: rows.at(-1)?.monthlyIsaPension ?? 0,
          totalContributions: 0,
        },
        incomeOverTime: {
          monthlyAtAlphaStart: rows.at(-1)?.monthlyAlphaPensionGross ?? 0,
          monthlyAtStateStart: rows.at(-1)?.totalMonthlyNetIncome ?? 0,
          monthlyAfterStatePension: rows.at(-1)?.totalMonthlyNetIncome ?? 0,
          monthlyStatePension: rows.at(-1)?.monthlyStatePension ?? 0,
        },
        transitions: {
          yearsBetweenStoppingAccrualAndDrawingPension: 0,
          yearsBetweenAlphaPensionAndStatePension: 0,
        },
        calculated: {
          normalPensionAge: settings.normalPensionAge,
          statePensionAge: settings.normalPensionAge,
          earlyRetirementReductionPercent: 0,
        },
        retirementIncome: {
          sources: [
            {
              key: "alpha",
              label: "Alpha pension",
              monthlyIncome: rows.at(-1)?.monthlyAlphaPensionGross ?? 0,
              annualIncome: (rows.at(-1)?.monthlyAlphaPensionGross ?? 0) * 12,
            },
            ...(settings.showNuvos
              ? [
                  {
                    key: "nuvos" as const,
                    label: "nuvos pension",
                    monthlyIncome: rows.at(-1)?.monthlyNuvosPensionGross ?? 0,
                    annualIncome:
                      (rows.at(-1)?.monthlyNuvosPensionGross ?? 0) * 12,
                  },
                ]
              : []),
            ...(settings.showSipp
              ? [
                  {
                    key: "sipp" as const,
                    label: "SIPP",
                    monthlyIncome: rows.at(-1)?.monthlySippPension ?? 0,
                    annualIncome: (rows.at(-1)?.monthlySippPension ?? 0) * 12,
                  },
                ]
              : []),
            ...(settings.showIsa
              ? [
                  {
                    key: "isa" as const,
                    label: "ISA",
                    monthlyIncome: rows.at(-1)?.monthlyIsaPension ?? 0,
                    annualIncome: (rows.at(-1)?.monthlyIsaPension ?? 0) * 12,
                  },
                ]
              : []),
            ...(settings.showStatePension
              ? [
                  {
                    key: "statePension" as const,
                    label: "State Pension",
                    monthlyIncome: rows.at(-1)?.monthlyStatePension ?? 0,
                    annualIncome: (rows.at(-1)?.monthlyStatePension ?? 0) * 12,
                  },
                ]
              : []),
            ...(settings.taxationEnabled
              ? [
                  {
                    key: "incomeTax" as const,
                    label: "Estimated Income Tax",
                    monthlyIncome: -(rows.at(-1)?.monthlyIncomeTax ?? 0),
                    annualIncome: -(rows.at(-1)?.monthlyIncomeTax ?? 0) * 12,
                  },
                ]
              : []),
          ],
          totalMonthlyIncome: rows.at(-1)?.totalMonthlyNetIncome ?? 0,
          totalAnnualIncome: (rows.at(-1)?.totalMonthlyNetIncome ?? 0) * 12,
        },
      })
    ),
  };
});

import App, { APP_MODE_STORAGE_KEY, createRetirementIncomeSeries } from "./App";
import { createProjectionTable } from "./projection";
import {
  SETTINGS_STORAGE_KEY,
  calculateDateAge,
  defaultSettings,
  getTodayIsoDate,
} from "./settings";

function expectedStoredSettings(overrides: Record<string, unknown> = {}) {
  return {
    dateOfBirth: defaultSettings.dateOfBirth,
    lifeExpectancy: defaultSettings.lifeExpectancy,
    requirementAge: defaultSettings.requirementAge,
    showAlpha: defaultSettings.showAlpha,
    projectionBasis: defaultSettings.projectionBasis,
    inflationRateAnnual: defaultSettings.inflationRateAnnual,
    showNuvos: defaultSettings.showNuvos,
    showStatePension: defaultSettings.showStatePension,
    showSipp: defaultSettings.showSipp,
    showIsa: defaultSettings.showIsa,
    taxationEnabled: defaultSettings.taxationEnabled,
    partialRetirementEnabled: defaultSettings.partialRetirementEnabled,
    partialRetirementStartAge: defaultSettings.partialRetirementStartAge,
    partialRetirementWorkPercent: defaultSettings.partialRetirementWorkPercent,
    fullSalary: defaultSettings.fullSalary,
    currentStatePension: defaultSettings.currentStatePension,
    desiredRetirementIncome: defaultSettings.desiredRetirementIncome,
    statePensionDrawDate: defaultSettings.statePensionDrawDate,
    statePensionApplyFutureGrowth:
      defaultSettings.statePensionApplyFutureGrowth,
    statePensionCpiPercent: defaultSettings.statePensionCpiPercent,
    statePensionWageGrowthPercent:
      defaultSettings.statePensionWageGrowthPercent,
    applyPensionIncreases: defaultSettings.applyPensionIncreases,
    assumedCpiPercent: defaultSettings.assumedCpiPercent,
    alphaPensionAbsDate: defaultSettings.alphaPensionAbsDate,
    alphaAddedPensionMonthly: defaultSettings.alphaAddedPensionMonthly,
    alphaAddedPensionFactorType: defaultSettings.alphaAddedPensionFactorType,
    alphaPensionLeaveAge: defaultSettings.alphaPensionLeaveAge,
    accruedPensionAtLastAbs: defaultSettings.accruedPensionAtLastAbs,
    pensionableEarnings: defaultSettings.pensionableEarnings,
    alphaPensionDrawAge: defaultSettings.alphaPensionDrawAge,
    alphaEpaEnabled: defaultSettings.alphaEpaEnabled,
    alphaEpaYearsBeforeNpa: defaultSettings.alphaEpaYearsBeforeNpa,
    alphaEpaStartDate: defaultSettings.alphaEpaStartDate,
    alphaEpaEndDate: defaultSettings.alphaEpaEndDate,
    alphaAddedPensionLumpSums: [],
    nuvosPensionAbsDate: defaultSettings.nuvosPensionAbsDate,
    nuvosAccruedPensionAtLastAbs: defaultSettings.nuvosAccruedPensionAtLastAbs,
    nuvosPensionableEarnings: defaultSettings.nuvosPensionableEarnings,
    nuvosPensionLeaveAge: defaultSettings.nuvosPensionLeaveAge,
    nuvosPensionDrawAge: defaultSettings.nuvosPensionDrawAge,
    nuvosApplyPensionIncreases: defaultSettings.nuvosApplyPensionIncreases,
    nuvosAssumedCpiPercent: defaultSettings.nuvosAssumedCpiPercent,
    sippCurrentPot: defaultSettings.sippCurrentPot,
    sippMonthlyContribution: defaultSettings.sippMonthlyContribution,
    sippDrawAge: defaultSettings.sippDrawAge,
    sippLumpSums: defaultSettings.sippLumpSums,
    sippRealInterestPercent: defaultSettings.sippRealInterestPercent,
    sippTaxReliefRate: defaultSettings.sippTaxReliefRate,
    sippWithdrawalStrategy: defaultSettings.sippWithdrawalStrategy,
    sippWithdrawalPercent: defaultSettings.sippWithdrawalPercent,
    sippWithdrawalTargetAge: defaultSettings.sippWithdrawalTargetAge,
    isaCurrentPot: defaultSettings.isaCurrentPot,
    isaMonthlyContribution: defaultSettings.isaMonthlyContribution,
    isaDrawAge: defaultSettings.isaDrawAge,
    isaLumpSums: defaultSettings.isaLumpSums,
    isaRealInterestPercent: defaultSettings.isaRealInterestPercent,
    isaWithdrawalStrategy: defaultSettings.isaWithdrawalStrategy,
    isaWithdrawalPercent: defaultSettings.isaWithdrawalPercent,
    isaWithdrawalTargetAge: defaultSettings.isaWithdrawalTargetAge,
    taxPersonalAllowance: defaultSettings.taxPersonalAllowance,
    taxPersonalAllowanceTaperThreshold:
      defaultSettings.taxPersonalAllowanceTaperThreshold,
    taxBasicRateLimit: defaultSettings.taxBasicRateLimit,
    taxAdditionalRateThreshold: defaultSettings.taxAdditionalRateThreshold,
    taxBasicRatePercent: defaultSettings.taxBasicRatePercent,
    taxHigherRatePercent: defaultSettings.taxHigherRatePercent,
    taxAdditionalRatePercent: defaultSettings.taxAdditionalRatePercent,
    taxSippTaxFreeWithdrawalPercent:
      defaultSettings.taxSippTaxFreeWithdrawalPercent,
    ...overrides,
  };
}

function renderAcknowledgedApp(
  options: { mode?: "expert" | "bridge" | "simple" | null } = {}
) {
  const { mode = "expert" } = options;

  if (mode) {
    window.localStorage.setItem(APP_MODE_STORAGE_KEY, mode);
  }

  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "I understand" }));

  if (mode === "expert") {
    fireEvent.click(
      screen.getByRole("button", {
        name: /Work through every setting with full control/i,
      })
    );
  }

  if (mode === "bridge") {
    fireEvent.click(
      screen.getByRole("button", {
        name: /Work out what I need to retire early/i,
      })
    );
  }

  if (mode === "simple") {
    fireEvent.click(
      screen.getByRole("button", {
        name: /Simplified retirement journey/i,
      })
    );
  }
}

function advanceJourneyToResult() {
  for (let index = 0; index < 10; index += 1) {
    const nextButton =
      screen.queryByRole("button", { name: "Next" }) ??
      screen.queryByRole("button", { name: "Show my answer" });

    if (!nextButton) {
      return;
    }

    fireEvent.click(nextButton);
  }
}

function renderAcknowledgedExpertResult() {
  renderAcknowledgedApp();
  advanceJourneyToResult();
}

function openJourneyStep(name: string | RegExp) {
  fireEvent.click(screen.getByRole("button", { name }));
}

describe("App settings form", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("shows the journey chooser without opening a journey after the notice", () => {
    renderAcknowledgedApp({ mode: null });

    expect(
      screen.getByRole("heading", { name: "Choose the level of detail" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Simplified retirement journey" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", {
        name: "Work out what I need to retire early",
      })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Optional sections" })
    ).not.toBeInTheDocument();
  });

  it("saves the selected modeller mode locally", () => {
    renderAcknowledgedApp({ mode: null });

    fireEvent.click(
      screen.getByRole("button", {
        name: /Work through every setting with full control/i,
      })
    );

    expect(window.localStorage.getItem(APP_MODE_STORAGE_KEY)).toBe("expert");
  });

  it("does not restore a previously selected mode on reload", () => {
    window.localStorage.setItem(APP_MODE_STORAGE_KEY, "expert");

    renderAcknowledgedApp({ mode: null });

    expect(
      screen.getByRole("button", {
        name: /Work through every setting with full control/i,
      })
    ).toHaveAttribute("aria-pressed", "false");
    expect(
      screen.getByRole("heading", { name: "Choose the level of detail" })
    ).toBeInTheDocument();
  });

  it("does not auto-open a journey for legacy journey mode values", () => {
    window.localStorage.setItem(APP_MODE_STORAGE_KEY, "journey");

    renderAcknowledgedApp({ mode: null });

    expect(
      screen.getByRole("heading", { name: "Choose the level of detail" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Simplified retirement journey" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", {
        name: "Work out what I need to retire early",
      })
    ).not.toBeInTheDocument();
  });

  it("keeps working when local storage is unavailable", () => {
    vi.spyOn(window.localStorage, "getItem").mockImplementation(() => {
      throw new Error("Storage is unavailable.");
    });
    vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
      throw new Error("Storage quota exceeded.");
    });

    expect(() => render(<App />)).not.toThrow();

    fireEvent.click(screen.getByRole("button", { name: "I understand" }));
    fireEvent.click(
      screen.getByRole("button", {
        name: /Work through every setting with full control/i,
      })
    );

    expect(
      screen.getAllByRole("heading", { name: "Optional sections" }).length
    ).toBeGreaterThan(0);
  });

  it("does not show the retired third mode option", () => {
    renderAcknowledgedApp({ mode: null });

    expect(document.querySelectorAll(".mode-card")).toHaveLength(3);
  });

  it("uses the simplified early retirement journey by default", () => {
    renderAcknowledgedApp({ mode: "simple" });

    expect(
      screen.getByRole("heading", { name: "About you and your target" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /About you and your target/i })
    ).toHaveAttribute("aria-current", "step");
    expect(
      screen.getByRole("button", { name: /Your Alpha pension/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Added pension/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Your results/i })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Date of birth month")).toHaveValue("06");
    expect(screen.getByLabelText("Date of birth year")).toHaveValue("1987");
    expect(
      screen.getByLabelText("Target retirement income (£ per year)")
    ).toHaveValue(defaultSettings.desiredRetirementIncome);
    expect(screen.queryByLabelText("Retirement age")).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Age you leave Alpha")
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Alpha pension draw age")
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("What else should we include?")
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "State Pension" })
    ).not.toBeInTheDocument();
    expect(window.localStorage.getItem(APP_MODE_STORAGE_KEY)).toBe("simple");
  });

  it("hides EPA and lump sum controls in the simple journey added pension step", () => {
    renderAcknowledgedApp({ mode: "simple" });

    fireEvent.click(screen.getByRole("button", { name: /Added pension/i }));

    expect(screen.queryByLabelText("Add EPA")).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("EPA years before NPA")
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Lump sum purchases" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Add lump sum purchase" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Added pension type")
    ).not.toBeInTheDocument();
  });

  it("reapplies simple-mode NPA assumptions from saved settings", () => {
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify(
        expectedStoredSettings({
          requirementAge: 60,
          alphaPensionLeaveAge: 61,
          alphaPensionDrawAge: 62,
          alphaEpaEnabled: true,
          alphaAddedPensionLumpSums: [
            {
              amount: 5000,
              startDate: "2026-05-01",
              cadence: "once",
              factorType: "self",
            },
          ],
        })
      )
    );

    renderAcknowledgedApp({ mode: "simple" });

    const storedSettings = JSON.parse(
      window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}"
    ) as Record<string, unknown>;
    expect(storedSettings).toEqual(
      expect.objectContaining({
        requirementAge: 60,
        alphaPensionLeaveAge: 61,
        alphaPensionDrawAge: 62,
        alphaEpaEnabled: true,
        alphaAddedPensionLumpSums: [
          expect.objectContaining({
            amount: 5000,
            startDate: "2026-05-01",
            cadence: "once",
            factorType: "self",
          }),
        ],
      })
    );
  });

  it("keeps bridge journey values after visiting the simple journey", () => {
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify(
        expectedStoredSettings({
          requirementAge: 60,
          alphaPensionDrawAge: 61,
          alphaAddedPensionFactorType: "self_plus_beneficiaries",
        })
      )
    );

    renderAcknowledgedApp({ mode: "simple" });

    fireEvent.click(
      screen.getByRole("button", {
        name: /Work out what I need to retire early/i,
      })
    );

    expect(screen.getByLabelText("Target retirement age")).toHaveValue("60");

    openJourneyStep(/Your Alpha pension/i);

    expect(screen.getByLabelText("Planned Alpha Pension Draw Age")).toHaveValue(
      "61"
    );
    expect(
      JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}")
    ).toEqual(
      expect.objectContaining({
        alphaAddedPensionFactorType: "self_plus_beneficiaries",
      })
    );
  });

  it("lets simple-mode chart markers move without changing the bridge journey settings", () => {
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify(
        expectedStoredSettings({
          requirementAge: 60,
          alphaPensionLeaveAge: 61,
          alphaPensionDrawAge: 62,
        })
      )
    );

    renderAcknowledgedApp({ mode: "simple" });
    advanceJourneyToResult();

    fireEvent.keyDown(screen.getByLabelText("Retire, age 68"), {
      key: "ArrowLeft",
    });
    fireEvent.keyDown(screen.getByLabelText("Leave Alpha, age 68"), {
      key: "ArrowLeft",
    });
    fireEvent.keyDown(screen.getByLabelText("Start Alpha, age 68"), {
      key: "ArrowLeft",
    });
    fireEvent.keyDown(screen.getByLabelText("Start State, age 68"), {
      key: "ArrowRight",
    });

    expect(screen.getByLabelText("Retire, age 67.75")).toBeInTheDocument();
    expect(screen.getByLabelText("Leave Alpha, age 67.75")).toBeInTheDocument();
    expect(screen.getByLabelText("Start Alpha, age 67.75")).toBeInTheDocument();
    expect(screen.getByLabelText("Start State, age 68.25")).toBeInTheDocument();
    expect(
      JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}")
    ).toEqual(
      expect.objectContaining({
        requirementAge: 60,
        alphaPensionLeaveAge: 61,
        alphaPensionDrawAge: 62,
      })
    );
  });

  it("restores the original early retirement journey as a separate route", () => {
    renderAcknowledgedApp({ mode: "bridge" });

    expect(
      screen.getByRole("heading", {
        name: "Work out what I need to retire early",
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Your retirement target" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Target retirement age")).toHaveValue(
      defaultSettings.requirementAge.toString()
    );
  });

  it("finishes the simple journey on the shared comparison result interface", async () => {
    renderAcknowledgedApp({ mode: "simple" });

    advanceJourneyToResult();

    expect(
      await screen.findByRole("region", { name: "Comparison results" })
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: "Scenario comparison" })
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("columnheader", { name: "Current model" }).length
    ).toBeGreaterThan(0);
    expect(
      screen.getByRole("heading", { name: "Pension Summary" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Plan status" })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "This summary uses your current journey assumptions and shows your projected annual income before tax."
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Planning tool only" })
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Planning and privacy disclaimer")
    ).toHaveTextContent(
      "Results depend on your inputs, so check important decisions against your official pension statement"
    );
    expect(
      screen.queryByLabelText("Toggle chart ISA bridge source")
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Toggle chart SIPP bridge source")
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Toggle chart nuvos pension source")
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Toggle chart partial retirement source")
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Assumptions version/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", {
        name: "Monthly pension projection table",
      })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Action required" })
    ).not.toBeInTheDocument();
  });

  it("finishes the bridge journey on the shared comparison result interface", async () => {
    renderAcknowledgedApp({ mode: "bridge" });

    advanceJourneyToResult();

    expect(
      await screen.findByRole("region", { name: "Comparison results" })
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: "Scenario comparison" })
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("columnheader", { name: "Current model" }).length
    ).toBeGreaterThan(0);
    expect(
      screen.getByRole("heading", { name: "Pension Summary" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Action required" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Later secure income check" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Scenario recap" })
    ).not.toBeInTheDocument();
    expect(
      await screen.findByRole("heading", {
        name: "Monthly pension projection table",
      })
    ).toBeInTheDocument();
  });

  it("shows non-empty summary results in the simple journey for a valid retirement-at-68 scenario", async () => {
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify(
        expectedStoredSettings({
          lifeExpectancy: 80,
          requirementAge: 68,
          showAlpha: true,
          showNuvos: false,
          showStatePension: true,
          showSipp: false,
          showIsa: false,
          taxationEnabled: false,
          partialRetirementEnabled: false,
          desiredRetirementIncome: 31700,
          applyPensionIncreases: true,
          assumedCpiPercent: 0,
          alphaPensionAbsDate: "2025",
          alphaPensionLeaveAge: 68,
          accruedPensionAtLastAbs: 16000,
          pensionableEarnings: 42000,
          alphaPensionDrawAge: 68,
        })
      )
    );

    renderAcknowledgedApp({ mode: "simple" });
    advanceJourneyToResult();

    expect(
      await screen.findByText("Monthly Alpha pension")
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Monthly retirement income before tax")
    ).not.toHaveTextContent("£0.00");
  });

  it("keeps the bridge target retirement age stable after slider release", () => {
    renderAcknowledgedApp({ mode: "bridge" });

    const targetAgeSlider = screen.getByLabelText("Target retirement age");

    fireEvent.change(targetAgeSlider, {
      target: { value: "55" },
    });
    expect(targetAgeSlider).toHaveValue("55");

    fireEvent.mouseUp(targetAgeSlider);

    expect(targetAgeSlider).toHaveValue("55");
    expect(
      screen.getByLabelText("Target retirement age exact value")
    ).toHaveValue(55);
    expect(
      JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}")
    ).toEqual(
      expect.objectContaining({
        requirementAge: 55,
      })
    );
  });

  it("renders sensible default values", async () => {
    renderAcknowledgedApp();

    expect(
      screen.getByRole("button", {
        name: /Work through every setting with full control/i,
      })
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("SIPP")).toBeChecked();
    expect(screen.getByLabelText("State Pension")).toBeChecked();
    expect(screen.getByLabelText("ISA")).toBeChecked();
    expect(screen.getByLabelText("Taxation")).not.toBeChecked();
    expect(
      screen.queryByLabelText("State Pension Age")
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Your Normal Pension Age")
    ).not.toBeInTheDocument();

    openJourneyStep(/Personal details/i);

    expect(screen.getByLabelText("Calculation Start Date")).toHaveValue(
      getTodayIsoDate()
    );
    expect(
      screen.getByLabelText("Your Birth Month and Year month")
    ).toHaveValue("06");
    expect(screen.getByLabelText("Your Birth Month and Year year")).toHaveValue(
      "1987"
    );
    expect(screen.getByLabelText("Life Expectancy (Age)")).toHaveValue(
      defaultSettings.lifeExpectancy.toString()
    );
    expect(screen.getByLabelText("Requirement age")).toHaveValue(
      defaultSettings.requirementAge.toString()
    );
    expect(
      screen.getByLabelText("Retirement living standard target (£ per year)")
    ).toHaveValue(defaultSettings.desiredRetirementIncome);
    expect(
      screen.getByRole("link", { name: "Estimate life expectancy" })
    ).toHaveAttribute(
      "href",
      "https://www.ons.gov.uk/peoplepopulationandcommunity/healthandsocialcare/healthandlifeexpectancies/articles/lifeexpectancycalculator/2019-06-07"
    );
    expect(
      screen.getByRole("link", { name: "Retirement Living Standards" })
    ).toHaveAttribute("href", "https://www.retirementlivingstandards.org.uk/");

    openJourneyStep(/Inflation and projection basis/i);

    expect(
      screen.getByLabelText("How should the modeller treat inflation?")
    ).toHaveValue("real");
    expect(screen.getByLabelText("Long-term inflation assumption")).toHaveValue(
      "2.5"
    );
    expect(
      screen.queryByRole("heading", { name: "Tax assumptions" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Personal Allowance (£ per year)")
    ).not.toBeInTheDocument();

    openJourneyStep(/State pension details/i);

    expect(
      screen.getByLabelText("Current Full State Pension (£ per year)")
    ).toHaveValue(defaultSettings.currentStatePension);
    expect(
      screen.getByLabelText("Project State Pension future growth")
    ).not.toBeChecked();
    expect(
      screen.getByLabelText("State Pension wage growth (%)")
    ).toBeDisabled();
    expect(
      screen.queryByLabelText("State Pension CPI (%)")
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Check State Pension" })
    ).toHaveAttribute("href", "https://www.gov.uk/check-state-pension");
    expect(
      screen.getByRole("link", { name: "What is the triple lock?" })
    ).toHaveAttribute(
      "href",
      "https://commonslibrary.parliament.uk/research-briefings/cbp-7812/"
    );
    expect(
      screen.getByRole("link", { name: "Defer State Pension" })
    ).toHaveAttribute(
      "href",
      "https://www.gov.uk/deferring-state-pension/if-you-reach-state-pension-age-on-or-after-6-april-2016"
    );
    expect(
      screen.getByRole("button", {
        name: "Reset Current Full State Pension (£ per year) to default value",
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Reset State Pension start age to default value",
      })
    ).toBeInTheDocument();

    openJourneyStep(/Alpha pension details/i);

    expect(screen.getByLabelText("Age You Leave Alpha Scheme")).toHaveAttribute(
      "type",
      "range"
    );
    expect(
      screen.getByLabelText("Planned Alpha Pension Draw Age")
    ).toHaveAttribute("type", "range");
    expect(screen.getByLabelText("Last Annual Benefits Statement")).toHaveValue(
      "2025"
    );
    expect(
      screen.getByLabelText("Apply Alpha pension increases")
    ).not.toBeChecked();
    expect(
      screen.getByRole("link", { name: "Annual Benefit Statement guide" })
    ).toHaveAttribute(
      "href",
      "https://www.civilservicepensionscheme.org.uk/memberhub/your-pension/yearly-pension-updates/annual-benefit-statement/"
    );
    expect(
      screen.getByRole("link", { name: "Alpha accrual rate" })
    ).toHaveAttribute(
      "href",
      "https://www.civilservicepensionscheme.org.uk/memberhub/kbarticle/?id=KA-01107"
    );
    expect(
      screen.getByRole("link", { name: "Reduction factors" })
    ).toHaveAttribute(
      "href",
      "https://gadfactorguidancehub.co.uk/guidance/csps_gb/erf-and-lrf/csps_gb__csops__early-payment-reduction-normal-health-and-age-addition/tables"
    );
    expect(
      screen.getByRole("link", { name: "Added pension factors" })
    ).toHaveAttribute(
      "href",
      "https://gadfactorguidancehub.co.uk/guidance/csps_gb/added-pension/csps_gb__csops__added-pension/tables"
    );
    expect(
      screen.getByRole("link", { name: "Alpha pension increases" })
    ).toHaveAttribute(
      "href",
      "https://www.civilservicepensionscheme.org.uk/memberhub/kbarticle/?id=KA-01215"
    );
    expect(
      screen.getByRole("button", { name: "Add lump sum purchase" })
    ).toBeInTheDocument();

    openJourneyStep(/SIPP details/i);

    expect(screen.getByLabelText("Current SIPP pot (£)")).toHaveValue(
      defaultSettings.sippCurrentPot
    );
    expect(
      screen.getByLabelText("Regular SIPP contribution (£ per month)")
    ).toHaveValue(defaultSettings.sippMonthlyContribution.toString());
    expect(screen.getByLabelText("SIPP draw start age")).toHaveValue(
      defaultSettings.sippDrawAge.toString()
    );
    expect(
      screen.getByRole("button", { name: "Add SIPP lump sum" })
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("SIPP tax relief on net additions")
    ).toHaveValue("20");
    expect(
      screen.getByLabelText("SIPP expected nominal return (%)")
    ).toBeEnabled();
    expect(
      screen.getByLabelText("SIPP expected nominal return (%) exact value")
    ).toBeEnabled();
    expect(screen.getByLabelText("SIPP withdrawal strategy")).toHaveValue(
      "zero_at_death"
    );
    expect(
      screen.queryByLabelText("SIPP withdrawal rate (%)")
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Check pension tax relief" })
    ).toHaveAttribute(
      "href",
      "https://www.gov.uk/tax-on-your-private-pension/pension-tax-relief"
    );

    openJourneyStep(/ISA details/i);

    expect(screen.getByLabelText("Current ISA pot (£)")).toHaveValue(
      defaultSettings.isaCurrentPot
    );
    expect(screen.getByLabelText("ISA draw start age")).toHaveValue(
      defaultSettings.isaDrawAge.toString()
    );

    advanceJourneyToResult();

    expect(
      screen.getByRole("heading", {
        name: "Projection basis: Real terms, today's money",
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Monthly pension projection table" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", {
        name: "Total monthly income before tax",
      })
    ).not.toBeInTheDocument();
    expect(
      await screen.findByRole("columnheader", {
        name: "Total monthly income before tax",
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", {
        name: "Annual Alpha Pension Including Reduction",
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", {
        name: "Monthly SIPP pension",
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", {
        name: "Age (years/months)",
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Retirement Income Modeller",
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Pension Summary" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Plan status" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Comparison results" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Review this result" })
    ).not.toBeInTheDocument();

    const titleSection = screen
      .getByRole("heading", {
        level: 1,
        name: "Retirement Income Modeller",
      })
      .closest("section");

    expect(titleSection).not.toBeNull();
    expect(
      within(titleSection as HTMLElement).getByRole("button", {
        name: /Work through every setting with full control/i,
      })
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Monthly Alpha pension")).toBeInTheDocument();
    expect(screen.getByText("Monthly SIPP")).toBeInTheDocument();
    expect(screen.getByText("Monthly ISA")).toBeInTheDocument();
    expect(screen.getByText("Monthly State Pension")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Monthly retirement income before tax")
    ).toHaveTextContent("£2,950.00");
    expect(
      screen.getByLabelText("Monthly target retirement income")
    ).toHaveTextContent("£2,641.67");
    expect(
      screen.getAllByText("Starts Drawing Alpha Pension").length
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("Calculation start").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Life expectancy").length).toBeGreaterThan(0);
  });

  it("enforces the same minimum Alpha and SIPP access age of 57 for someone born on 23 November 1977", () => {
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify(
        expectedStoredSettings({
          dateOfBirth: "1977-11-23",
          alphaPensionDrawAge: 55,
          sippDrawAge: 55,
          statePensionDrawDate: "2045-07-06",
        })
      )
    );

    renderAcknowledgedApp();

    openJourneyStep(/Alpha pension details/i);

    expect(screen.getByLabelText("Planned Alpha Pension Draw Age")).toHaveValue(
      "57"
    );
    expect(
      screen.getByLabelText("Planned Alpha Pension Draw Age")
    ).toHaveAttribute("min", "57");
    expect(
      screen.getByLabelText("Planned Alpha Pension Draw Age exact value")
    ).toHaveAttribute("min", "57");

    openJourneyStep(/SIPP details/i);

    expect(screen.getByLabelText("SIPP draw start age")).toHaveValue("57");
    expect(screen.getByLabelText("SIPP draw start age")).toHaveAttribute(
      "min",
      "57"
    );
    expect(
      screen.getByLabelText("SIPP draw start age exact value")
    ).toHaveAttribute("min", "57");

    openJourneyStep(/State pension details/i);

    expect(
      screen.getByLabelText("State Pension start age exact value")
    ).toHaveValue(67.75);
    expect(screen.getByLabelText("State Pension start age")).toHaveAttribute(
      "min",
      "67.75"
    );
  });

  it("exports parameters as a JSON download", () => {
    const createObjectURL = vi.fn(() => "blob:mock-export-url");
    const revokeObjectURL = vi.fn();
    const anchorClick = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    Object.defineProperty(window.URL, "createObjectURL", {
      configurable: true,
      writable: true,
      value: createObjectURL,
    });
    Object.defineProperty(window.URL, "revokeObjectURL", {
      configurable: true,
      writable: true,
      value: revokeObjectURL,
    });

    renderAcknowledgedApp();
    fireEvent.click(screen.getByRole("button", { name: "Export parameters" }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-export-url");
    expect(anchorClick).toHaveBeenCalledTimes(1);
    anchorClick.mockRestore();
  });

  it("orders optional section toggles like the assumptions sections", () => {
    renderAcknowledgedApp();

    const optionalSection = screen
      .getByRole("heading", {
        name: "Optional sections",
      })
      .closest("section");

    expect(
      Array.from(optionalSection?.querySelectorAll(".field-label") ?? []).map(
        (label) => label.textContent
      )
    ).toEqual([
      "Alpha",
      "Partial retirement",
      "State Pension",
      "nuvos",
      "SIPP",
      "ISA",
      "Taxation",
    ]);
  });

  it("shows concise modeller limitations on request", () => {
    renderAcknowledgedExpertResult();
    const summarySection = screen
      .getByRole("heading", { name: "Pension Summary" })
      .closest("section");

    expect(screen.queryByText(/Scottish tax bands/i)).not.toBeInTheDocument();

    expect(summarySection).not.toBeNull();

    fireEvent.click(
      within(summarySection as HTMLElement).getByRole("button", {
        name: "Show limitations",
      })
    );

    expect(
      screen.getByRole("button", { name: "Hide limitations" })
    ).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/Scottish tax bands/i)).toBeInTheDocument();
    expect(screen.getByText(/pre-2016 deferral rules/i)).toBeInTheDocument();
    expect(screen.getByText(/Scheme-specific edge cases/i)).toBeInTheDocument();

    fireEvent.click(
      within(summarySection as HTMLElement).getByRole("button", {
        name: "Hide limitations",
      })
    );

    expect(screen.queryByText(/Scottish tax bands/i)).not.toBeInTheDocument();
  });

  it("toggles the pension summary between monthly and annual values", () => {
    renderAcknowledgedExpertResult();

    fireEvent.click(screen.getByRole("button", { name: "Annual" }));

    expect(screen.getByText("Annual Alpha pension")).toBeInTheDocument();
    expect(screen.getByText("Annual SIPP")).toBeInTheDocument();
    expect(screen.getByText("Annual ISA")).toBeInTheDocument();
    expect(screen.getByText("Annual State Pension")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Annual retirement income before tax")
    ).toHaveTextContent("£35,400.00");
    expect(
      screen.getByLabelText("Annual target retirement income")
    ).toHaveTextContent("£31,700.00");
  });

  it("updates settings and saves to local storage", () => {
    renderAcknowledgedApp();

    openJourneyStep(/Personal details/i);

    fireEvent.change(screen.getByLabelText("Your Birth Month and Year month"), {
      target: { value: "02" },
    });
    fireEvent.change(screen.getByLabelText("Your Birth Month and Year year"), {
      target: { value: "1990" },
    });
    fireEvent.click(
      screen.getByRole("button", {
        name: "£43,900: Comfortable standard for one person household",
      })
    );

    openJourneyStep(/State pension details/i);

    fireEvent.change(
      screen.getByLabelText("Current Full State Pension (£ per year)"),
      {
        target: { value: "11800" },
      }
    );
    fireEvent.blur(
      screen.getByLabelText("Current Full State Pension (£ per year)")
    );
    expect(
      JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}")
    ).toEqual(
      expect.objectContaining({
        dateOfBirth: "1990-02-01",
        currentStatePension: 11800,
        desiredRetirementIncome: 43900,
        statePensionDrawDate: "2058-02-01",
      })
    );
  });

  it("allows a custom retirement living standard target", () => {
    renderAcknowledgedApp();

    openJourneyStep(/Personal details/i);

    const targetInput = screen.getByLabelText(
      "Retirement living standard target (£ per year)"
    );

    fireEvent.change(targetInput, {
      target: { value: "50000" },
    });
    fireEvent.blur(targetInput);

    expect(targetInput).toHaveValue(50000);
    expect(
      JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}")
    ).toEqual(
      expect.objectContaining({
        desiredRetirementIncome: 50000,
      })
    );
  });

  it("allows matching Alpha leave age when the draw age reaches the unsupported added pension range", () => {
    renderAcknowledgedApp();

    openJourneyStep(/Alpha pension details/i);

    fireEvent.change(
      screen.getByLabelText("Planned Alpha Pension Draw Age exact value"),
      {
        target: { value: "70" },
      }
    );
    fireEvent.blur(
      screen.getByLabelText("Planned Alpha Pension Draw Age exact value")
    );

    fireEvent.change(
      screen.getByLabelText("Age You Leave Alpha Scheme exact value"),
      {
        target: { value: "70" },
      }
    );
    fireEvent.blur(
      screen.getByLabelText("Age You Leave Alpha Scheme exact value")
    );

    expect(
      JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}")
    ).toEqual(
      expect.objectContaining({
        alphaPensionDrawAge: 70,
        alphaPensionLeaveAge: 70,
      })
    );
  });

  it("allows selecting a higher SIPP tax relief rate", () => {
    renderAcknowledgedApp();

    openJourneyStep(/SIPP details/i);

    const taxReliefSelect = screen.getByLabelText(
      "SIPP tax relief on net additions"
    );

    fireEvent.change(taxReliefSelect, {
      target: { value: "40" },
    });
    fireEvent.blur(taxReliefSelect);

    expect(taxReliefSelect).toHaveValue("40");
    expect(
      JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}")
    ).toEqual(
      expect.objectContaining({
        sippTaxReliefRate: "40",
      })
    );
  });

  it("allows selecting self and dependants cover for monthly added pension", () => {
    renderAcknowledgedApp();

    openJourneyStep(/Alpha pension details/i);

    const factorTypeSelect = screen.getByLabelText(
      "Monthly Added Alpha Pension cover"
    );

    fireEvent.change(factorTypeSelect, {
      target: { value: "self_plus_beneficiaries" },
    });
    fireEvent.blur(factorTypeSelect);

    expect(factorTypeSelect).toHaveValue("self_plus_beneficiaries");
    expect(
      JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}")
    ).toEqual(
      expect.objectContaining({
        alphaAddedPensionFactorType: "self_plus_beneficiaries",
      })
    );
  });

  it("allows selecting self and dependants cover for a lump sum purchase", () => {
    renderAcknowledgedApp();

    openJourneyStep(/Alpha pension details/i);

    fireEvent.click(
      screen.getByRole("button", { name: "Add lump sum purchase" })
    );

    const factorTypeSelect = screen.getByLabelText("Lump sum cover 1");

    expect(factorTypeSelect).toHaveValue("self");

    fireEvent.change(factorTypeSelect, {
      target: { value: "self_plus_beneficiaries" },
    });

    expect(factorTypeSelect).toHaveValue("self_plus_beneficiaries");
    expect(
      JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}")
    ).toEqual(
      expect.objectContaining({
        alphaAddedPensionLumpSums: [
          expect.objectContaining({
            factorType: "self_plus_beneficiaries",
          }),
        ],
      })
    );
  });

  it("briefly confirms when changed parameters are saved", () => {
    vi.useFakeTimers();
    renderAcknowledgedApp();

    openJourneyStep(/State pension details/i);

    expect(screen.queryByText("Saved Locally")).not.toBeInTheDocument();

    fireEvent.change(
      screen.getByLabelText("Current Full State Pension (£ per year)"),
      {
        target: { value: "11800" },
      }
    );

    expect(screen.queryByText("Saved Locally")).not.toBeInTheDocument();

    fireEvent.blur(
      screen.getByLabelText("Current Full State Pension (£ per year)")
    );

    expect(screen.getByText("Saved Locally")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1400);
    });

    expect(screen.queryByText("Saved Locally")).not.toBeInTheDocument();
  });

  it("stores the Alpha ABS date as just the selected year", () => {
    renderAcknowledgedApp();

    openJourneyStep(/Alpha pension details/i);

    fireEvent.change(screen.getByLabelText("Last Annual Benefits Statement"), {
      target: { value: "2024" },
    });
    fireEvent.blur(screen.getByLabelText("Last Annual Benefits Statement"));

    expect(
      JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}")
    ).toEqual({
      ...expectedStoredSettings({
        alphaPensionAbsDate: "2024",
      }),
    });
  });

  it("only commits date normalization after the field loses focus", () => {
    renderAcknowledgedApp();

    openJourneyStep(/Personal details/i);

    fireEvent.change(screen.getByLabelText("Your Birth Month and Year month"), {
      target: { value: "11" },
    });

    expect(
      JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}")
    ).toEqual(
      expectedStoredSettings({
        dateOfBirth: "1987-11-01",
        statePensionDrawDate: "2055-11-01",
      })
    );

    fireEvent.change(screen.getByLabelText("Your Birth Month and Year year"), {
      target: { value: "1977" },
    });

    expect(
      JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}")
    ).toEqual(
      expectedStoredSettings({
        dateOfBirth: "1977-11-01",
        statePensionDrawDate: "2045-08-01",
      })
    );
  });

  it("loads settings from local storage on first render", () => {
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        ...defaultSettings,
        startDate: "1999-01-01",
      })
    );

    renderAcknowledgedApp();

    openJourneyStep(/Personal details/i);

    expect(screen.getByLabelText("Calculation Start Date")).toHaveValue(
      getTodayIsoDate()
    );

    advanceJourneyToResult();

    expect(screen.getByText("Monthly State Pension")).toBeInTheDocument();
  });

  it("resets the state pension slider back to its default value", () => {
    renderAcknowledgedApp();

    openJourneyStep(/State pension details/i);

    const statePensionSlider = screen.getByLabelText(
      "Current Full State Pension (£ per year)"
    );

    fireEvent.change(statePensionSlider, {
      target: { value: "13000" },
    });
    expect(statePensionSlider).toHaveValue(13000);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Reset Current Full State Pension (£ per year) to default value",
      })
    );

    expect(statePensionSlider).toHaveValue(defaultSettings.currentStatePension);
  });

  it("can defer the State Pension start age and reset it to the DOB default", () => {
    renderAcknowledgedApp();

    openJourneyStep(/State pension details/i);

    const statePensionAgeSlider = screen.getByLabelText(
      "State Pension start age"
    );
    const statePensionAgeInput = screen.getByLabelText(
      "State Pension start age exact value"
    );

    expect(statePensionAgeSlider).toHaveValue("68");
    expect(statePensionAgeSlider).toHaveAttribute("min", "68");
    expect(statePensionAgeInput).toHaveValue(68);

    fireEvent.change(statePensionAgeInput, {
      target: { value: "69" },
    });
    fireEvent.blur(statePensionAgeInput);

    expect(
      screen.getByLabelText("State Pension start age exact value")
    ).toHaveValue(69);
    expect(
      JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}")
    ).toEqual(
      expect.objectContaining({
        statePensionDrawDate: "2056-06-01",
      })
    );

    fireEvent.change(
      screen.getByLabelText("State Pension start age exact value"),
      {
        target: { value: "67" },
      }
    );
    fireEvent.blur(
      screen.getByLabelText("State Pension start age exact value")
    );

    expect(
      screen.getByLabelText("State Pension start age exact value")
    ).toHaveValue(68);

    fireEvent.change(
      screen.getByLabelText("State Pension start age exact value"),
      {
        target: { value: "69" },
      }
    );
    fireEvent.blur(
      screen.getByLabelText("State Pension start age exact value")
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Reset State Pension start age to default value",
      })
    );

    expect(
      screen.getByLabelText("State Pension start age exact value")
    ).toHaveValue(68);
  });

  it("can apply pension increases using the global inflation assumption", () => {
    renderAcknowledgedApp();

    openJourneyStep(/Alpha pension details/i);

    const applyIncreasesToggle = screen.getByLabelText(
      "Apply Alpha pension increases"
    );

    fireEvent.click(applyIncreasesToggle);
    fireEvent.blur(applyIncreasesToggle);

    expect(applyIncreasesToggle).toBeChecked();

    openJourneyStep(/Inflation and projection basis/i);

    const inflationInput = screen.getByLabelText(
      "Long-term inflation assumption exact value"
    );

    fireEvent.change(inflationInput, {
      target: { value: "3.4" },
    });
    fireEvent.blur(inflationInput);

    expect(applyIncreasesToggle).toBeChecked();
    expect(inflationInput).toHaveValue(3.4);
    expect(
      JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}")
    ).toEqual(
      expect.objectContaining({
        applyPensionIncreases: true,
        inflationRateAnnual: 3.4,
      })
    );
  }, 20000);

  it("can reset the long-term inflation assumption to its default", () => {
    renderAcknowledgedApp();

    openJourneyStep(/Inflation and projection basis/i);

    const inflationInput = screen.getByLabelText(
      "Long-term inflation assumption exact value"
    );

    fireEvent.change(inflationInput, {
      target: { value: "3.4" },
    });
    fireEvent.blur(inflationInput);

    expect(inflationInput).toHaveValue(3.4);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Reset Long-term inflation assumption to default value",
      })
    );

    expect(
      screen.getByLabelText("Long-term inflation assumption exact value")
    ).toHaveValue(2.5);
    expect(
      JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}")
    ).toEqual(
      expect.objectContaining({
        inflationRateAnnual: 2.5,
      })
    );
  });

  it("uses the global inflation assumption for nuvos pension increases", () => {
    renderAcknowledgedApp();

    fireEvent.click(screen.getByLabelText("nuvos"));

    openJourneyStep(/Your nuvos pension/i);

    const applyNuvosIncreasesToggle = screen.getByLabelText(
      "Apply nuvos pension increases"
    );

    expect(applyNuvosIncreasesToggle).not.toBeChecked();
    expect(
      screen.queryByLabelText("nuvos assumed CPI (%)")
    ).not.toBeInTheDocument();

    fireEvent.click(applyNuvosIncreasesToggle);

    expect(applyNuvosIncreasesToggle).toBeChecked();

    openJourneyStep(/Inflation and projection basis/i);

    expect(
      screen.getByLabelText("Long-term inflation assumption")
    ).toBeInTheDocument();
  });

  it("can apply projected State Pension future growth", () => {
    renderAcknowledgedApp();

    openJourneyStep(/State pension details/i);

    const applyStateGrowthToggle = screen.getByLabelText(
      "Project State Pension future growth"
    );
    const wageGrowthInput = screen.getByLabelText(
      "State Pension wage growth (%) exact value"
    );

    fireEvent.click(applyStateGrowthToggle);
    fireEvent.change(wageGrowthInput, {
      target: { value: "4.2" },
    });
    fireEvent.blur(wageGrowthInput);

    expect(applyStateGrowthToggle).toBeChecked();
    expect(wageGrowthInput).toHaveValue(4.2);
    expect(
      JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}")
    ).toEqual(
      expect.objectContaining({
        statePensionApplyFutureGrowth: true,
        statePensionWageGrowthPercent: 4.2,
      })
    );
  });

  it("shows draggable chart markers for ISA draw age and use-by ages", () => {
    renderAcknowledgedApp();

    openJourneyStep(/SIPP details/i);

    fireEvent.change(screen.getByLabelText("SIPP withdrawal strategy"), {
      target: { value: "use_by_age" },
    });
    fireEvent.blur(screen.getByLabelText("SIPP withdrawal strategy"));

    openJourneyStep(/ISA details/i);

    fireEvent.change(screen.getByLabelText("ISA withdrawal strategy"), {
      target: { value: "use_by_age" },
    });
    fireEvent.blur(screen.getByLabelText("ISA withdrawal strategy"));

    advanceJourneyToResult();

    expect(screen.getByLabelText("ISA start, age 68")).toBeInTheDocument();
    expect(screen.getByLabelText("SIPP stop, age 75")).toBeInTheDocument();
    expect(screen.getByLabelText("ISA stop, age 75")).toBeInTheDocument();
  });

  it("keeps the leave alpha marker visible when the build-up window hides earlier ages", () => {
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        ...defaultSettings,
        alphaPensionLeaveAge: 60,
      })
    );

    renderAcknowledgedApp({ mode: "bridge" });
    advanceJourneyToResult();

    expect(screen.getByLabelText("Leave Alpha, age 60")).toBeInTheDocument();
  });

  it("keeps the retirement marker from crossing the Alpha start marker", () => {
    renderAcknowledgedExpertResult();

    fireEvent.keyDown(screen.getByLabelText("Retire, age 68"), {
      key: "ArrowRight",
    });

    expect(
      JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}")
    ).toEqual(
      expect.objectContaining({
        requirementAge: 68,
      })
    );
  });

  it("renders the bridge chart with an inline warning when the projection is invalid", async () => {
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        ...defaultSettings,
        requirementAge: 61,
        alphaPensionDrawAge: 60,
      })
    );

    renderAcknowledgedApp({ mode: "bridge" });
    advanceJourneyToResult();

    expect(
      await screen.findByRole("region", { name: "Retirement income bridge" })
    ).toBeInTheDocument();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The chart is showing the current assumptions, but they do not produce a valid projection."
    );
    expect(
      document.querySelector(".bridge-chart-panel--invalid")
    ).not.toBeNull();
  });

  it("keeps the target income line across the build-up period without creating early shortfall", () => {
    const series = createRetirementIncomeSeries(projectionFixtures.baseRows, {
      ...defaultSettings,
      startDate: "2025-01-01",
    });

    expect(series[0]?.targetIncomeAnnual).toBe(
      defaultSettings.desiredRetirementIncome
    );
    expect(series[0]?.shortfallAnnual).toBe(0);
  });

  it("shows the current target value in the chart income axis title", () => {
    renderAcknowledgedExpertResult();

    expect(document.body.innerHTML).toContain(
      "Annual income (£) · Target £31,700"
    );
  });

  it("inserts an exact transition point so partial retirement and ISA do not overlap at handoff", () => {
    const settings: PensionSettings = {
      ...defaultSettings,
      startDate: "2039-06-01",
      dateOfBirth: "1985-01-15",
      requirementAge: 54.5,
      isaDrawAge: 54.5,
      lifeExpectancy: 60,
      showStatePension: false,
      showSipp: false,
      partialRetirementEnabled: true,
      partialRetirementStartAge: 51,
      partialRetirementWorkPercent: 50,
      pensionableEarnings: 42000,
    };
    const rows: ProjectionRow[] = [
      {
        ...projectionFixtures.baseRows[0],
        date: "2039-07-01",
        age: 54,
        ageMonths: 6,
        monthlyIsaPension: 100,
      },
      {
        ...projectionFixtures.baseRows[1],
        date: "2039-08-01",
        age: 54,
        ageMonths: 7,
        monthlyIsaPension: 100,
      },
    ];

    const series = createRetirementIncomeSeries(rows, settings);
    const preTransitionPoint = series.find(
      (point) => point.date === "2039-07-01"
    );
    const transitionPoint = series.find((point) => point.date === "2039-07-15");

    expect(preTransitionPoint?.partialRetirementIncomeAnnual).toBe(21000);
    expect(preTransitionPoint?.isaIncomeAnnual).toBe(0);
    expect(transitionPoint).toBeDefined();
    expect(transitionPoint?.partialRetirementIncomeAnnual).toBe(0);
    expect(transitionPoint?.isaIncomeAnnual).toBe(1200);
  });

  it("lets the target income line be adjusted directly in the chart", () => {
    renderAcknowledgedExpertResult();

    fireEvent.keyDown(screen.getByLabelText("Target income line"), {
      key: "ArrowUp",
    });

    expect(
      JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}")
    ).toEqual(
      expect.objectContaining({
        desiredRetirementIncome: 32400,
      })
    );
  });

  it("shows partial retirement timing and work percentage controls in the chart", () => {
    renderAcknowledgedApp();

    fireEvent.click(screen.getByLabelText("Partial retirement"));

    advanceJourneyToResult();

    expect(screen.getByLabelText("Start partial, age 55")).toBeInTheDocument();
    expect(
      screen.getAllByText("Partial retirement income").length
    ).toBeGreaterThan(0);

    const partialWorkSlider = screen.getByLabelText("Partial work");

    fireEvent.change(partialWorkSlider, {
      target: { value: "50" },
    });
    fireEvent.mouseUp(partialWorkSlider);

    expect(
      JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}")
    ).toEqual(
      expect.objectContaining({
        partialRetirementEnabled: true,
        partialRetirementWorkPercent: 50,
      })
    );
  });

  it("does not show a build-up slider in the chart controls", () => {
    renderAcknowledgedExpertResult();

    expect(screen.queryByLabelText("Build-up shown")).not.toBeInTheDocument();
  });

  it("can disable partial retirement from the chart controls", () => {
    renderAcknowledgedApp();

    fireEvent.click(screen.getByLabelText("Partial retirement"));

    advanceJourneyToResult();

    const partialRetirementKey = screen.getByLabelText(
      "Toggle chart partial retirement source"
    );

    expect(partialRetirementKey).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(partialRetirementKey);

    expect(
      JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}")
    ).toEqual(
      expect.objectContaining({
        partialRetirementEnabled: false,
      })
    );
    expect(partialRetirementKey).toHaveAttribute("aria-pressed", "false");
  });

  it("only commits chart control slider changes when the pointer is released", () => {
    renderAcknowledgedExpertResult();

    const alphaAddedPensionSlider = screen.getByLabelText(
      "Added Alpha pension"
    );

    fireEvent.change(alphaAddedPensionSlider, {
      target: { value: "275" },
    });

    expect(
      JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}")
    ).toEqual(
      expect.objectContaining({
        alphaAddedPensionMonthly: 0,
      })
    );

    fireEvent.mouseUp(alphaAddedPensionSlider);

    expect(
      JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}")
    ).toEqual(
      expect.objectContaining({
        alphaAddedPensionMonthly: 275,
      })
    );
  });

  it("can undo the last chart change with the standard keyboard shortcut", () => {
    renderAcknowledgedExpertResult();

    const alphaAddedPensionSlider = screen.getByLabelText(
      "Added Alpha pension"
    );
    const scenarioNameInput = screen.getByLabelText("Scenario name");

    expect(
      screen.queryByRole("button", { name: "Undo chart change" })
    ).not.toBeInTheDocument();

    fireEvent.change(alphaAddedPensionSlider, {
      target: { value: "275" },
    });
    fireEvent.mouseUp(alphaAddedPensionSlider);

    expect(
      JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}")
    ).toEqual(
      expect.objectContaining({
        alphaAddedPensionMonthly: 275,
      })
    );

    fireEvent.keyDown(scenarioNameInput, { key: "z", metaKey: true });

    expect(
      JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}")
    ).toEqual(
      expect.objectContaining({
        alphaAddedPensionMonthly: 275,
      })
    );

    fireEvent.keyDown(window, { key: "z", metaKey: true });

    expect(
      JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}")
    ).toEqual(
      expect.objectContaining({
        alphaAddedPensionMonthly: defaultSettings.alphaAddedPensionMonthly,
      })
    );
  });

  it("resets all parameters back to their defaults", () => {
    renderAcknowledgedApp();

    openJourneyStep(/Personal details/i);

    fireEvent.change(screen.getByLabelText("Your Birth Month and Year month"), {
      target: { value: "02" },
    });
    fireEvent.change(screen.getByLabelText("Your Birth Month and Year year"), {
      target: { value: "1990" },
    });

    openJourneyStep(/State pension details/i);

    fireEvent.change(
      screen.getByLabelText("Current Full State Pension (£ per year)"),
      {
        target: { value: "13000" },
      }
    );
    fireEvent.blur(
      screen.getByLabelText("Current Full State Pension (£ per year)")
    );

    openJourneyStep(/Alpha pension details/i);

    fireEvent.click(
      screen.getByRole("button", { name: "Add lump sum purchase" })
    );

    expect(screen.getByText("Lump sum #1")).toBeInTheDocument();

    openJourneyStep(/Personal details/i);

    expect(
      screen.getByLabelText("Your Birth Month and Year month")
    ).toHaveValue("02");
    expect(screen.getByLabelText("Your Birth Month and Year year")).toHaveValue(
      "1990"
    );

    openJourneyStep(/State pension details/i);

    expect(
      screen.getByLabelText("Current Full State Pension (£ per year)")
    ).toHaveValue(13000);

    openJourneyStep(/Optional sections/i);

    fireEvent.click(screen.getByRole("button", { name: "Reset parameters" }));

    openJourneyStep(/Personal details/i);

    expect(screen.getByLabelText("Calculation Start Date")).toHaveValue(
      getTodayIsoDate()
    );
    expect(
      screen.getByLabelText("Your Birth Month and Year month")
    ).toHaveValue("06");
    expect(screen.getByLabelText("Your Birth Month and Year year")).toHaveValue(
      "1987"
    );

    openJourneyStep(/State pension details/i);

    expect(
      screen.getByLabelText("Current Full State Pension (£ per year)")
    ).toHaveValue(defaultSettings.currentStatePension);

    openJourneyStep(/Alpha pension details/i);

    expect(screen.queryByText("Lump sum #1")).not.toBeInTheDocument();
    expect(
      JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}")
    ).toEqual(expectedStoredSettings());
  });

  it("supports exact numeric entry alongside sliders", () => {
    renderAcknowledgedApp();

    openJourneyStep(/Alpha pension details/i);

    fireEvent.change(
      screen.getByLabelText(
        "Current Pensionable Earnings (£ per year) exact value"
      ),
      {
        target: { value: "10001" },
      }
    );
    fireEvent.blur(
      screen.getByLabelText(
        "Current Pensionable Earnings (£ per year) exact value"
      )
    );

    expect(
      screen.getByLabelText("Current Pensionable Earnings (£ per year)")
    ).toHaveValue("10001");
    expect(
      JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}")
    ).toEqual(
      expect.objectContaining({
        pensionableEarnings: 10001,
      })
    );
  });

  it("waits until slider blur before saving range changes", () => {
    renderAcknowledgedApp();

    openJourneyStep(/Personal details/i);

    const lifeExpectancySlider = screen.getByLabelText("Life Expectancy (Age)");

    fireEvent.change(lifeExpectancySlider, {
      target: { value: "90" },
    });

    expect(lifeExpectancySlider).toHaveValue("90");
    expect(
      JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}")
    ).toEqual(
      expect.not.objectContaining({
        lifeExpectancy: 90,
      })
    );

    fireEvent.blur(lifeExpectancySlider);

    expect(
      JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}")
    ).toEqual(
      expect.objectContaining({
        lifeExpectancy: 90,
      })
    );
  });

  it("keeps partial exact numeric entry editable before saving a valid range value", () => {
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        ...defaultSettings,
        lifeExpectancy: 100,
      })
    );
    renderAcknowledgedApp();

    openJourneyStep(/Personal details/i);

    const exactLifeExpectancyInput = screen.getByLabelText(
      "Life Expectancy (Age) exact value"
    );

    fireEvent.focus(exactLifeExpectancyInput);
    fireEvent.change(exactLifeExpectancyInput, {
      target: { value: "9" },
    });

    expect(exactLifeExpectancyInput).toHaveValue(9);
    expect(screen.getByLabelText("Life Expectancy (Age)")).toHaveValue("100");

    fireEvent.change(exactLifeExpectancyInput, {
      target: { value: "90" },
    });

    expect(exactLifeExpectancyInput).toHaveValue(90);
    expect(screen.getByLabelText("Life Expectancy (Age)")).toHaveValue("90");
    expect(
      JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}")
    ).toEqual(
      expect.not.objectContaining({
        lifeExpectancy: 90,
      })
    );

    fireEvent.blur(exactLifeExpectancyInput);

    expect(
      JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}")
    ).toEqual(
      expect.objectContaining({
        lifeExpectancy: 90,
      })
    );
  });

  it("removes lump sum purchases from the form and saved settings", () => {
    renderAcknowledgedApp();

    openJourneyStep(/Alpha pension details/i);

    fireEvent.click(
      screen.getByRole("button", { name: "Add lump sum purchase" })
    );
    fireEvent.change(screen.getByLabelText("Lump sum amount 1"), {
      target: { value: "12000" },
    });

    expect(screen.getByText("Lump sum #1")).toBeInTheDocument();
    expect(
      JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}")
    ).toEqual(
      expect.objectContaining({
        alphaAddedPensionLumpSums: [
          expect.objectContaining({
            amount: 12000,
          }),
        ],
      })
    );

    fireEvent.click(screen.getByRole("button", { name: "Remove lump sum" }));

    expect(screen.queryByText("Lump sum #1")).not.toBeInTheDocument();
    expect(
      JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}")
    ).toEqual(
      expect.objectContaining({
        alphaAddedPensionLumpSums: [],
      })
    );
  });

  it("only asks for a lump sum repeat end date when the cadence is yearly", () => {
    renderAcknowledgedApp();

    openJourneyStep(/Alpha pension details/i);

    fireEvent.click(
      screen.getByRole("button", { name: "Add lump sum purchase" })
    );

    expect(
      screen.queryByLabelText("Lump sum end date 1")
    ).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Lump sum cadence 1"), {
      target: { value: "yearly" },
    });

    expect(screen.getByLabelText("Lump sum end date 1")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Lump sum cadence 1"), {
      target: { value: "once" },
    });

    expect(
      screen.queryByLabelText("Lump sum end date 1")
    ).not.toBeInTheDocument();
  });

  it("adds and removes SIPP lump sums from the form and saved settings", () => {
    renderAcknowledgedApp();

    openJourneyStep(/SIPP details/i);

    fireEvent.click(screen.getByRole("button", { name: "Add SIPP lump sum" }));
    fireEvent.change(screen.getByLabelText("SIPP lump sum amount 1"), {
      target: { value: "15000" },
    });
    fireEvent.change(screen.getByLabelText("SIPP lump sum cadence 1"), {
      target: { value: "yearly" },
    });

    expect(screen.getByText("SIPP lump sum #1")).toBeInTheDocument();
    expect(
      screen.getByLabelText("SIPP lump sum end date 1")
    ).toBeInTheDocument();
    expect(
      JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}")
    ).toEqual(
      expect.objectContaining({
        sippLumpSums: [
          expect.objectContaining({
            amount: 15000,
            cadence: "yearly",
          }),
        ],
      })
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Remove SIPP lump sum" })
    );

    expect(screen.queryByText("SIPP lump sum #1")).not.toBeInTheDocument();
    expect(
      JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}")
    ).toEqual(
      expect.objectContaining({
        sippLumpSums: [],
      })
    );
  });

  it("enables the SIPP withdrawal rate when using percentage drawdown", () => {
    renderAcknowledgedApp();

    openJourneyStep(/SIPP details/i);

    fireEvent.change(screen.getByLabelText("SIPP withdrawal strategy"), {
      target: { value: "percentage" },
    });
    fireEvent.blur(screen.getByLabelText("SIPP withdrawal strategy"));
    fireEvent.change(
      screen.getByLabelText("SIPP withdrawal rate (%) exact value"),
      {
        target: { value: "5.2" },
      }
    );
    fireEvent.blur(
      screen.getByLabelText("SIPP withdrawal rate (%) exact value")
    );

    expect(
      screen.getByLabelText("SIPP withdrawal rate (%)")
    ).not.toBeDisabled();
    expect(
      screen.getByLabelText("SIPP withdrawal rate (%) exact value")
    ).toHaveValue(5.2);
    expect(
      JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}")
    ).toEqual(
      expect.objectContaining({
        sippWithdrawalStrategy: "percentage",
        sippWithdrawalPercent: 5.2,
      })
    );
  });

  it("enables ISA settings and lump sums when included", async () => {
    renderAcknowledgedApp();

    openJourneyStep(/ISA details/i);

    fireEvent.change(screen.getByLabelText("Current ISA pot (£)"), {
      target: { value: "20000" },
    });
    fireEvent.blur(screen.getByLabelText("Current ISA pot (£)"));
    fireEvent.click(screen.getByRole("button", { name: "Add ISA lump sum" }));
    fireEvent.change(screen.getByLabelText("ISA lump sum amount 1"), {
      target: { value: "5000" },
    });

    advanceJourneyToResult();

    expect(screen.getByText("Monthly ISA")).toBeInTheDocument();
    expect(
      await screen.findByRole("columnheader", { name: "ISA" })
    ).toBeInTheDocument();
    expect(
      JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}")
    ).toEqual(
      expect.objectContaining({
        isaCurrentPot: 20000,
        isaLumpSums: [
          expect.objectContaining({
            amount: 5000,
          }),
        ],
      })
    );
  });

  it("can hide optional sections without losing their saved values", () => {
    renderAcknowledgedApp();

    openJourneyStep(/State pension details/i);

    fireEvent.change(
      screen.getByLabelText("Current Full State Pension (£ per year)"),
      {
        target: { value: "13000" },
      }
    );
    fireEvent.blur(
      screen.getByLabelText("Current Full State Pension (£ per year)")
    );

    openJourneyStep(/SIPP details/i);

    fireEvent.change(screen.getByLabelText("Current SIPP pot (£)"), {
      target: { value: "45000" },
    });
    fireEvent.blur(screen.getByLabelText("Current SIPP pot (£)"));

    openJourneyStep(/ISA details/i);

    fireEvent.change(screen.getByLabelText("Current ISA pot (£)"), {
      target: { value: "12000" },
    });
    fireEvent.blur(screen.getByLabelText("Current ISA pot (£)"));

    openJourneyStep(/Optional sections/i);

    openJourneyStep(/Optional sections/i);

    fireEvent.click(screen.getByLabelText("State Pension"));
    fireEvent.click(screen.getByLabelText("SIPP"));
    fireEvent.click(screen.getByLabelText("ISA"));

    expect(
      screen.queryByLabelText("Current Full State Pension (£ per year)")
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Current SIPP pot (£)")
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Current ISA pot (£)")
    ).not.toBeInTheDocument();
    expect(
      JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}")
    ).toEqual(
      expect.objectContaining({
        showStatePension: false,
        showSipp: false,
        showIsa: false,
        currentStatePension: 13000,
        sippCurrentPot: 45000,
        isaCurrentPot: 12000,
      })
    );

    advanceJourneyToResult();

    expect(
      screen.queryByText("At State Pension start")
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("SIPP at SIPP draw start")
    ).not.toBeInTheDocument();
    expect(screen.queryByText("ISA at ISA draw start")).not.toBeInTheDocument();
    expect(screen.queryByText("Monthly SIPP")).not.toBeInTheDocument();
    expect(screen.queryByText("Monthly ISA")).not.toBeInTheDocument();
    expect(screen.queryByText("Monthly State Pension")).not.toBeInTheDocument();
    expect(
      screen.getByLabelText("Monthly retirement income before tax")
    ).toHaveTextContent("£1,600.00");
    expect(
      screen.queryByRole("columnheader", { name: "Monthly State pension" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "Monthly SIPP pension" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "ISA" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Starts Drawing State Pension")
    ).not.toBeInTheDocument();

    openJourneyStep(/Optional sections/i);

    fireEvent.click(screen.getByLabelText("State Pension"));
    fireEvent.click(screen.getByLabelText("SIPP"));
    fireEvent.click(screen.getByLabelText("ISA"));

    openJourneyStep(/State pension details/i);

    expect(
      screen.getByLabelText("Current Full State Pension (£ per year)")
    ).toHaveValue(13000);

    openJourneyStep(/SIPP details/i);

    expect(screen.getByLabelText("Current SIPP pot (£)")).toHaveValue(45000);

    openJourneyStep(/ISA details/i);

    expect(screen.getByLabelText("Current ISA pot (£)")).toHaveValue(12000);
  });

  it("normalizes unexpected stored values back to allowed settings", () => {
    const currentPlanningAge = Math.ceil(
      calculateDateAge(defaultSettings.dateOfBirth, getTodayIsoDate())
    ).toString();

    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        ...defaultSettings,
        lifeExpectancy: 120,
        currentStatePension: -10,
        alphaAddedPensionMonthly: 233,
        alphaPensionLeaveAge: 10,
        accruedPensionAtLastAbs: 12444,
        pensionableEarnings: 56321,
        alphaPensionDrawAge: 200,
      })
    );

    renderAcknowledgedApp();

    openJourneyStep(/Personal details/i);

    expect(screen.getByLabelText("Life Expectancy (Age)")).toHaveValue("100");

    openJourneyStep(/State pension details/i);

    expect(
      screen.getByLabelText("Current Full State Pension (£ per year)")
    ).toHaveValue(0);

    openJourneyStep(/Alpha pension details/i);

    expect(
      screen.getByLabelText("Added Alpha Pension (£ per month)")
    ).toHaveValue("233");
    expect(screen.getByLabelText("Age You Leave Alpha Scheme")).toHaveValue(
      currentPlanningAge
    );
    expect(
      screen.getByLabelText(
        "Alpha Pension Accrued at Last Statement (£ per year)"
      )
    ).toHaveValue(12444);
    expect(
      screen.getByLabelText("Current Pensionable Earnings (£ per year)")
    ).toHaveValue("56321");
    expect(screen.getByLabelText("Planned Alpha Pension Draw Age")).toHaveValue(
      "70"
    );
  });

  it("shows validation guidance and pauses the projection when stored settings are inconsistent", async () => {
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        ...defaultSettings,
        alphaEpaEnabled: true,
        alphaEpaStartDate: "2030-01-01",
        alphaEpaEndDate: "2029-01-01",
      })
    );

    renderAcknowledgedExpertResult();

    expect(
      screen.getAllByRole("heading", { name: "Check these assumptions" }).length
    ).toBeGreaterThan(0);
    expect(
      await screen.findByText(
        "No projection rows are available for the current settings."
      )
    ).toBeInTheDocument();
  });

  it("shows inline validation when date of birth is not before the calculation start date", async () => {
    const [startYear, startMonth] = getTodayIsoDate().split("-").map(Number);
    const invalidBirthMonth =
      startMonth === 12 ? "12" : `${startMonth + 1}`.padStart(2, "0");
    const invalidBirthYear =
      startMonth === 12 ? `${startYear + 1}` : `${startYear}`;

    renderAcknowledgedApp();

    openJourneyStep(/Personal details/i);

    fireEvent.change(screen.getByLabelText("Your Birth Month and Year month"), {
      target: { value: invalidBirthMonth },
    });
    fireEvent.change(screen.getByLabelText("Your Birth Month and Year year"), {
      target: { value: invalidBirthYear },
    });

    expect(
      await screen.findAllByText(
        "Date of birth must be before the calculation start date."
      )
    ).not.toHaveLength(0);
    expect(
      screen.getByLabelText("Your Birth Month and Year month")
    ).toHaveAttribute("aria-invalid", "true");
    expect(
      screen.getByLabelText("Your Birth Month and Year year")
    ).toHaveAttribute("aria-invalid", "true");
    expect(
      screen.getAllByRole("heading", { name: "Check these assumptions" }).length
    ).toBeGreaterThan(0);
  });

  it("shows inline validation when the ABS year is after the calculation start date", async () => {
    renderAcknowledgedApp();

    openJourneyStep(/Personal details/i);

    fireEvent.change(screen.getByLabelText("Calculation Start Date"), {
      target: { value: "2026-03-31" },
    });
    fireEvent.blur(screen.getByLabelText("Calculation Start Date"));

    openJourneyStep(/Alpha pension details/i);

    fireEvent.change(screen.getByLabelText("Last Annual Benefits Statement"), {
      target: { value: "2026" },
    });
    fireEvent.blur(screen.getByLabelText("Last Annual Benefits Statement"));

    expect(
      await screen.findAllByText(
        "Last Annual Benefits Statement must be on or before the calculation start date."
      )
    ).not.toHaveLength(0);
    expect(
      screen.getByLabelText("Last Annual Benefits Statement")
    ).toHaveAttribute("aria-invalid", "true");
  });

  it("shows inline validation for invalid lump sum schedules", async () => {
    renderAcknowledgedApp();

    openJourneyStep(/Alpha pension details/i);

    fireEvent.click(
      screen.getByRole("button", { name: "Add lump sum purchase" })
    );
    fireEvent.change(screen.getByLabelText("Lump sum cadence 1"), {
      target: { value: "yearly" },
    });
    fireEvent.change(screen.getByLabelText("Lump sum start date 1"), {
      target: { value: "2030-01-01" },
    });

    expect(
      await screen.findAllByText(
        "Alpha lump sum repeat-until date must be on or after its start date."
      )
    ).not.toHaveLength(0);
    expect(screen.getByLabelText("Lump sum start date 1")).toHaveAttribute(
      "aria-invalid",
      "true"
    );
  });

  it("renders projection rows for the shared EPA settings", async () => {
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        dateOfBirth: "1977-11-23",
        lifeExpectancy: 90,
        currentStatePension: 12547.6,
        applyPensionIncreases: false,
        assumedCpiPercent: 3.2,
        alphaPensionAbsDate: "2021",
        alphaAddedPensionMonthly: 0,
        alphaPensionLeaveAge: 68,
        accruedPensionAtLastAbs: 27750,
        pensionableEarnings: 70000,
        alphaPensionDrawAge: 67,
        alphaEpaEnabled: true,
        alphaEpaYearsBeforeNpa: 2,
        alphaEpaStartDate: "2026-04-01",
        alphaEpaEndDate: "2047-03-31",
        alphaAddedPensionLumpSums: [
          {
            id: "2804c522-7db7-4acf-a6ee-5d428af449bb",
            amount: 500000,
            startDate: "2026-05-02",
            cadence: "once",
            endDate: "2026-05-02",
          },
        ],
      })
    );

    renderAcknowledgedExpertResult();

    expect(
      screen.queryByText(
        "No projection rows are available for the current settings."
      )
    ).not.toBeInTheDocument();
    expect(
      await screen.findByText(/Showing \d+ of \d+ rows/)
    ).toBeInTheDocument();
  });

  it("shows milestone rows by default and can expand to all rows", async () => {
    const rows = createProjectionTable({
      ...defaultSettings,
      startDate: getTodayIsoDate(),
    });
    const milestoneRows = rows.filter((row) => row.milestones.length > 0);
    const nonMilestoneRow = rows.find((row) => row.milestones.length === 0);

    renderAcknowledgedExpertResult();

    expect(
      await screen.findByText(
        `Showing ${milestoneRows.length} of ${rows.length} rows (${milestoneRows.length} milestones).`
      )
    ).toBeInTheDocument();

    if (!nonMilestoneRow) {
      throw new Error("Expected a non-milestone row for the collapse test.");
    }

    const nonMilestoneRowLabel = new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(`${nonMilestoneRow.date}T00:00:00`));

    expect(screen.queryByText(nonMilestoneRowLabel)).not.toBeInTheDocument();
    expect(screen.getAllByText("Calculation start").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Life expectancy").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Show all rows" }));

    expect(
      screen.getByText(`Showing ${rows.length} of ${rows.length} rows.`)
    ).toBeInTheDocument();
    expect(screen.getAllByText(nonMilestoneRowLabel).length).toBeGreaterThan(0);

    fireEvent.click(
      screen.getByRole("button", { name: "Only show milestone rows" })
    );

    expect(
      screen.getByText(
        `Showing ${milestoneRows.length} of ${rows.length} rows (${milestoneRows.length} milestones).`
      )
    ).toBeInTheDocument();
  });
});
