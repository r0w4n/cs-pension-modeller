import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import App from "./App";
import { createProjectionTable } from "./projection";
import {
  SETTINGS_STORAGE_KEY,
  defaultSettings,
  getTodayIsoDate,
} from "./settings";

function renderAcknowledgedApp() {
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "I understand" }));
}

describe("App settings form", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders sensible default values", () => {
    renderAcknowledgedApp();

    expect(screen.getByLabelText("Calculation Start Date")).toHaveValue(getTodayIsoDate());
    expect(screen.getByLabelText("Your Date of Birth")).toHaveValue(defaultSettings.dateOfBirth);
    expect(screen.getByLabelText("Age You Leave Alpha Scheme")).toHaveAttribute(
      "type",
      "range",
    );
    expect(screen.getByLabelText("Planned Alpha Pension Draw Age")).toHaveAttribute(
      "type",
      "range",
    );
    expect(screen.getByLabelText("Life Expectancy (Age)")).toHaveValue(
      defaultSettings.lifeExpectancy.toString(),
    );
    expect(screen.getByLabelText("Current Full State Pension (£ per year)")).toHaveValue(
      defaultSettings.currentStatePension,
    );
    expect(screen.getByLabelText("Apply Alpha pension increases")).not.toBeChecked();
    expect(screen.getByLabelText("Assumed CPI (%)")).toHaveValue("2");
    expect(screen.getByLabelText("Assumed CPI (%)")).toBeDisabled();
    expect(screen.getByLabelText("Assumed CPI (%) exact value")).toBeDisabled();
    expect(screen.getByLabelText("Last Annual Benifits Statement")).toHaveValue(
      "2025",
    );
    expect(
      screen.getByRole("heading", { name: "Monthly pension projection table" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", {
        name: "Total Monthly Pension take-home pay",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", {
        name: "Annual Alpha Pension Including Reduction",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", {
        name: "Age (years/months)",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Alpha Pension" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Pension Summary" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Alpha Pension" })).toBeInTheDocument();
    expect(screen.getByText("Annual Alpha Pension at retirement")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Calculated details" })).toBeInTheDocument();
    expect(screen.getByText("At State Pension start")).toBeInTheDocument();
    expect(screen.getAllByText("Starts Drawing Alpha Pension").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Calculation start").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Life expectancy").length).toBeGreaterThan(0);
    expect(screen.queryByLabelText("State Pension Age")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Your Normal Pension Age")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Last Annual Benifits Statement information" }),
    ).toHaveAttribute(
      "href",
      "https://www.civilservicepensionscheme.org.uk/memberhub/your-pension/yearly-pension-updates/annual-benefit-statement/",
    );
    expect(screen.getByRole("button", { name: "Add lump sum purchase" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Reset Current Full State Pension (£ per year) to default",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Reset assumed CPI to default" }),
    ).toBeInTheDocument();
  });

  it("updates settings and saves to local storage", () => {
    renderAcknowledgedApp();

    const birthDateInput = screen.getByLabelText("Your Date of Birth");

    fireEvent.change(birthDateInput, {
      target: { value: "1990-02-14" },
    });
    fireEvent.blur(birthDateInput);
    fireEvent.change(screen.getByLabelText("Current Full State Pension (£ per year)"), {
      target: { value: "11800" },
    });

    expect(screen.getAllByText(/14 Feb 2058/).length).toBeGreaterThan(0);
    expect(JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}")).toEqual(
      expect.objectContaining({
        dateOfBirth: "1990-02-14",
        currentStatePension: 11800,
      }),
    );
  });

  it("briefly confirms when changed parameters are saved", () => {
    vi.useFakeTimers();
    renderAcknowledgedApp();

    expect(screen.queryByText("Saved Locally")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Current Full State Pension (£ per year)"), {
      target: { value: "11800" },
    });

    expect(screen.getByText("Saved Locally")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1400);
    });

    expect(screen.queryByText("Saved Locally")).not.toBeInTheDocument();
  });

  it("stores the Alpha ABS date as just the selected year", () => {
    renderAcknowledgedApp();

    fireEvent.change(screen.getByLabelText("Last Annual Benifits Statement"), {
      target: { value: "2024" },
    });

    expect(JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}")).toEqual({
      dateOfBirth: defaultSettings.dateOfBirth,
      lifeExpectancy: defaultSettings.lifeExpectancy,
      currentStatePension: defaultSettings.currentStatePension,
      applyPensionIncreases: defaultSettings.applyPensionIncreases,
      assumedCpiPercent: defaultSettings.assumedCpiPercent,
      alphaPensionAbsDate: "2024",
      alphaAddedPensionMonthly: defaultSettings.alphaAddedPensionMonthly,
      alphaPensionLeaveAge: defaultSettings.alphaPensionLeaveAge,
      accruedPensionAtLastAbs: defaultSettings.accruedPensionAtLastAbs,
      pensionableEarnings: defaultSettings.pensionableEarnings,
      alphaPensionDrawAge: defaultSettings.alphaPensionDrawAge,
      alphaEpaEnabled: defaultSettings.alphaEpaEnabled,
      alphaEpaYearsBeforeNpa: defaultSettings.alphaEpaYearsBeforeNpa,
      alphaEpaStartDate: defaultSettings.alphaEpaStartDate,
      alphaEpaEndDate: defaultSettings.alphaEpaEndDate,
      alphaAddedPensionLumpSums: [],
    });
  });

  it("only commits date normalization after the field loses focus", () => {
    renderAcknowledgedApp();

    const birthDateInput = screen.getByLabelText("Your Date of Birth");

    fireEvent.change(birthDateInput, {
      target: { value: "1977-04-10" },
    });

    expect(birthDateInput).toHaveValue("1977-04-10");
    expect(JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}")).toEqual({
      dateOfBirth: defaultSettings.dateOfBirth,
      lifeExpectancy: defaultSettings.lifeExpectancy,
      currentStatePension: defaultSettings.currentStatePension,
      applyPensionIncreases: defaultSettings.applyPensionIncreases,
      assumedCpiPercent: defaultSettings.assumedCpiPercent,
      alphaPensionAbsDate: defaultSettings.alphaPensionAbsDate,
      alphaAddedPensionMonthly: defaultSettings.alphaAddedPensionMonthly,
      alphaPensionLeaveAge: defaultSettings.alphaPensionLeaveAge,
      accruedPensionAtLastAbs: defaultSettings.accruedPensionAtLastAbs,
      pensionableEarnings: defaultSettings.pensionableEarnings,
      alphaPensionDrawAge: defaultSettings.alphaPensionDrawAge,
      alphaEpaEnabled: defaultSettings.alphaEpaEnabled,
      alphaEpaYearsBeforeNpa: defaultSettings.alphaEpaYearsBeforeNpa,
      alphaEpaStartDate: defaultSettings.alphaEpaStartDate,
      alphaEpaEndDate: defaultSettings.alphaEpaEndDate,
      alphaAddedPensionLumpSums: [],
    });

    fireEvent.blur(birthDateInput);

    expect(JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}")).toEqual({
      dateOfBirth: "1977-04-10",
      lifeExpectancy: defaultSettings.lifeExpectancy,
      currentStatePension: defaultSettings.currentStatePension,
      applyPensionIncreases: defaultSettings.applyPensionIncreases,
      assumedCpiPercent: defaultSettings.assumedCpiPercent,
      alphaPensionAbsDate: defaultSettings.alphaPensionAbsDate,
      alphaAddedPensionMonthly: defaultSettings.alphaAddedPensionMonthly,
      alphaPensionLeaveAge: defaultSettings.alphaPensionLeaveAge,
      accruedPensionAtLastAbs: defaultSettings.accruedPensionAtLastAbs,
      pensionableEarnings: defaultSettings.pensionableEarnings,
      alphaPensionDrawAge: defaultSettings.alphaPensionDrawAge,
      alphaEpaEnabled: defaultSettings.alphaEpaEnabled,
      alphaEpaYearsBeforeNpa: defaultSettings.alphaEpaYearsBeforeNpa,
      alphaEpaStartDate: defaultSettings.alphaEpaStartDate,
      alphaEpaEndDate: defaultSettings.alphaEpaEndDate,
      alphaAddedPensionLumpSums: [],
    });
  });

  it("loads settings from local storage on first render", () => {
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        ...defaultSettings,
        startDate: "1999-01-01",
      }),
    );

    renderAcknowledgedApp();

    expect(screen.getByLabelText("Calculation Start Date")).toHaveValue(getTodayIsoDate());
    expect(screen.getAllByText(/At State Pension start/i).length).toBeGreaterThan(0);
  });

  it("resets the state pension slider back to its default value", () => {
    renderAcknowledgedApp();

    const statePensionSlider = screen.getByLabelText("Current Full State Pension (£ per year)");

    fireEvent.change(statePensionSlider, {
      target: { value: "13000" },
    });
    expect(statePensionSlider).toHaveValue(13000);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Reset Current Full State Pension (£ per year) to default",
      }),
    );

    expect(statePensionSlider).toHaveValue(defaultSettings.currentStatePension);
  });

  it("can apply pension increases and reset CPI to the default", () => {
    renderAcknowledgedApp();

    const applyIncreasesToggle = screen.getByLabelText("Apply Alpha pension increases");
    const cpiInput = screen.getByLabelText("Assumed CPI (%) exact value");

    fireEvent.click(applyIncreasesToggle);

    expect(screen.getByLabelText("Assumed CPI (%)")).not.toBeDisabled();
    fireEvent.change(cpiInput, {
      target: { value: "3.4" },
    });

    expect(applyIncreasesToggle).toBeChecked();
    expect(cpiInput).toHaveValue(3.4);
    expect(JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}")).toEqual(
      expect.objectContaining({
        applyPensionIncreases: true,
        assumedCpiPercent: 3.4,
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Reset assumed CPI to default" }));

    expect(cpiInput).toHaveValue(defaultSettings.assumedCpiPercent);
  });

  it("resets all parameters back to their defaults", () => {
    renderAcknowledgedApp();

    fireEvent.change(screen.getByLabelText("Your Date of Birth"), {
      target: { value: "1990-02-14" },
    });
    fireEvent.blur(screen.getByLabelText("Your Date of Birth"));
    fireEvent.change(screen.getByLabelText("Current Full State Pension (£ per year)"), {
      target: { value: "13000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add lump sum purchase" }));

    expect(screen.getByText("Lump sum #1")).toBeInTheDocument();
    expect(screen.getByLabelText("Your Date of Birth")).toHaveValue("1990-02-14");
    expect(screen.getByLabelText("Current Full State Pension (£ per year)")).toHaveValue(
      13000,
    );

    fireEvent.click(screen.getByRole("button", { name: "Reset parameters" }));

    expect(screen.getByLabelText("Calculation Start Date")).toHaveValue(getTodayIsoDate());
    expect(screen.getByLabelText("Your Date of Birth")).toHaveValue(defaultSettings.dateOfBirth);
    expect(screen.getByLabelText("Current Full State Pension (£ per year)")).toHaveValue(
      defaultSettings.currentStatePension,
    );
    expect(screen.queryByText("Lump sum #1")).not.toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}")).toEqual({
      dateOfBirth: defaultSettings.dateOfBirth,
      lifeExpectancy: defaultSettings.lifeExpectancy,
      currentStatePension: defaultSettings.currentStatePension,
      applyPensionIncreases: defaultSettings.applyPensionIncreases,
      assumedCpiPercent: defaultSettings.assumedCpiPercent,
      alphaPensionAbsDate: defaultSettings.alphaPensionAbsDate,
      alphaAddedPensionMonthly: defaultSettings.alphaAddedPensionMonthly,
      alphaPensionLeaveAge: defaultSettings.alphaPensionLeaveAge,
      accruedPensionAtLastAbs: defaultSettings.accruedPensionAtLastAbs,
      pensionableEarnings: defaultSettings.pensionableEarnings,
      alphaPensionDrawAge: defaultSettings.alphaPensionDrawAge,
      alphaEpaEnabled: defaultSettings.alphaEpaEnabled,
      alphaEpaYearsBeforeNpa: defaultSettings.alphaEpaYearsBeforeNpa,
      alphaEpaStartDate: defaultSettings.alphaEpaStartDate,
      alphaEpaEndDate: defaultSettings.alphaEpaEndDate,
      alphaAddedPensionLumpSums: [],
    });
  });

  it("supports exact numeric entry alongside sliders", () => {
    renderAcknowledgedApp();

    fireEvent.change(
      screen.getByLabelText("Current Pensionable Earnings (£ per year) exact value"),
      {
        target: { value: "56500" },
      },
    );

    expect(screen.getByLabelText("Current Pensionable Earnings (£ per year)")).toHaveValue(
      "56500",
    );
    expect(JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}")).toEqual(
      expect.objectContaining({
        pensionableEarnings: 56500,
      }),
    );
  });

  it("removes lump sum purchases from the form and saved settings", () => {
    renderAcknowledgedApp();

    fireEvent.click(screen.getByRole("button", { name: "Add lump sum purchase" }));
    fireEvent.change(screen.getByLabelText("Lump sum amount 1"), {
      target: { value: "12000" },
    });

    expect(screen.getByText("Lump sum #1")).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}")).toEqual(
      expect.objectContaining({
        alphaAddedPensionLumpSums: [
          expect.objectContaining({
            amount: 12000,
          }),
        ],
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Remove lump sum" }));

    expect(screen.queryByText("Lump sum #1")).not.toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}")).toEqual(
      expect.objectContaining({
        alphaAddedPensionLumpSums: [],
      }),
    );
  });

  it("only asks for a lump sum repeat end date when the cadence is yearly", () => {
    renderAcknowledgedApp();

    fireEvent.click(screen.getByRole("button", { name: "Add lump sum purchase" }));

    expect(screen.queryByLabelText("Lump sum end date 1")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Lump sum cadence 1"), {
      target: { value: "yearly" },
    });

    expect(screen.getByLabelText("Lump sum end date 1")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Lump sum cadence 1"), {
      target: { value: "once" },
    });

    expect(screen.queryByLabelText("Lump sum end date 1")).not.toBeInTheDocument();
  });

  it("normalizes unexpected stored values back to allowed settings", () => {
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
      }),
    );

    renderAcknowledgedApp();

    expect(screen.getByLabelText("Life Expectancy (Age)")).toHaveValue("100");
    expect(screen.getByLabelText("Current Full State Pension (£ per year)")).toHaveValue(0);
    expect(screen.getByLabelText("Added Alpha Pension (£ per month)")).toHaveValue("225");
    expect(screen.getByLabelText("Age You Leave Alpha Scheme")).toHaveValue("40");
    expect(
      screen.getByLabelText("Alpha Pension Accrued at Last Statement (£ per year)"),
    ).toHaveValue(12444);
    expect(screen.getByLabelText("Current Pensionable Earnings (£ per year)")).toHaveValue(
      "56500",
    );
    expect(screen.getByLabelText("Planned Alpha Pension Draw Age")).toHaveValue("70");
  });

  it("shows validation guidance and pauses the projection when stored settings are inconsistent", () => {
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        ...defaultSettings,
        alphaPensionDrawAge: 70,
      }),
    );

    renderAcknowledgedApp();

    expect(screen.getByRole("heading", { name: "Check these assumptions" })).toBeInTheDocument();
    expect(
      screen.getByText("No projection rows are available for the current settings."),
    ).toBeInTheDocument();
  });

  it("renders projection rows for the shared EPA settings", () => {
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        dateOfBirth: "1977-04-10",
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
      }),
    );

    renderAcknowledgedApp();

    expect(
      screen.queryByText("No projection rows are available for the current settings."),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/Showing \d+ of \d+ rows/)).toBeInTheDocument();
  });

  it("shows milestone rows by default and can expand to all rows", () => {
    const rows = createProjectionTable({
      ...defaultSettings,
      startDate: getTodayIsoDate(),
    });
    const milestoneRows = rows.filter((row) => row.milestones.length > 0);
    const nonMilestoneRow = rows.find((row) => row.milestones.length === 0);

    renderAcknowledgedApp();

    expect(
      screen.getByText(
        `Showing ${milestoneRows.length} of ${rows.length} rows (${milestoneRows.length} milestones).`,
      ),
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
      screen.getByText(`Showing ${rows.length} of ${rows.length} rows.`),
    ).toBeInTheDocument();
    expect(screen.getByText(nonMilestoneRowLabel)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Only show milestone rows" }));

    expect(
      screen.getByText(
        `Showing ${milestoneRows.length} of ${rows.length} rows (${milestoneRows.length} milestones).`,
      ),
    ).toBeInTheDocument();
  });
});
