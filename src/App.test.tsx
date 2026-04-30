import { fireEvent, render, screen } from "@testing-library/react";
import App from "./App";
import { createProjectionTable } from "./projection";
import {
  SETTINGS_STORAGE_KEY,
  defaultSettings,
  getTodayIsoDate,
} from "./settings";

describe("App settings form", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders sensible default values", () => {
    render(<App />);

    expect(screen.getByLabelText("Calculation Start Date")).toHaveValue(getTodayIsoDate());
    expect(screen.getByLabelText("Your Date of Birth")).toHaveValue(defaultSettings.dateOfBirth);
    expect(screen.getByLabelText("Your Normal Pension Age")).toHaveAttribute("type", "range");
    expect(screen.getByLabelText("Age You Leave Alpha Pensionable Service")).toHaveAttribute(
      "type",
      "range",
    );
    expect(screen.getByLabelText("Planned Alpha Pension Draw Age")).toHaveAttribute(
      "type",
      "range",
    );
    expect(screen.getByLabelText("Assumed Life Expectancy (Age)")).toHaveValue(
      defaultSettings.lifeExpectancy.toString(),
    );
    expect(screen.getByLabelText("Your Normal Pension Age")).toHaveValue(
      defaultSettings.normalPensionAge.toString(),
    );
    expect(screen.getByLabelText("Current Full State Pension (£ per year)")).toHaveValue(
      defaultSettings.currentStatePension.toString(),
    );
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
    expect(screen.getAllByRole("heading", { name: "Pension Summary" })).toHaveLength(2);
    expect(screen.getByText("Monthly Alpha Pension at retirement")).toBeInTheDocument();
    expect(screen.getByText("Total Monthly Pension at State Pension start")).toBeInTheDocument();
    expect(screen.getAllByText("Starts Drawing Alpha Pension").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Calculation start").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Life expectancy").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "State Pension Age information" })).toHaveAttribute(
      "href",
      "https://www.gov.uk/state-pension-age",
    );
    expect(
      screen.getByRole("link", { name: "Last Annual Benifits Statement information" }),
    ).toHaveAttribute(
      "href",
      "https://www.civilservicepensionscheme.org.uk/memberhub/your-pension/yearly-pension-updates/annual-benefit-statement/",
    );
    expect(screen.getByRole("button", { name: "Add lump sum purchase" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset to default" })).toBeInTheDocument();
  });

  it("updates settings and saves to local storage", () => {
    render(<App />);

    const birthDateInput = screen.getByLabelText("Your Date of Birth");
    const statePensionDateInput = screen.getByLabelText("State Pension Age");

    fireEvent.change(birthDateInput, {
      target: { value: "1990-02-14" },
    });
    fireEvent.blur(birthDateInput);
    fireEvent.change(statePensionDateInput, {
      target: { value: "2058-02-14" },
    });
    fireEvent.blur(statePensionDateInput);
    fireEvent.change(screen.getByLabelText("Current Full State Pension (£ per year)"), {
      target: { value: "11800" },
    });

    expect(JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}")).toEqual(
      expect.objectContaining({
        dateOfBirth: "1990-02-14",
        currentStatePension: 11800,
        statePensionDrawDate: "2058-02-14",
      }),
    );
  });

  it("stores the Alpha ABS date as just the selected year", () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("Last Annual Benifits Statement"), {
      target: { value: "2024" },
    });

    expect(JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}")).toEqual({
      dateOfBirth: defaultSettings.dateOfBirth,
      lifeExpectancy: defaultSettings.lifeExpectancy,
      normalPensionAge: defaultSettings.normalPensionAge,
      currentStatePension: defaultSettings.currentStatePension,
      statePensionDrawDate: defaultSettings.statePensionDrawDate,
      alphaPensionAbsDate: "2024",
      alphaAddedPensionMonthly: defaultSettings.alphaAddedPensionMonthly,
      alphaPensionLeaveAge: defaultSettings.alphaPensionLeaveAge,
      accruedPensionAtLastAbs: defaultSettings.accruedPensionAtLastAbs,
      pensionableEarnings: defaultSettings.pensionableEarnings,
      alphaPensionDrawAge: defaultSettings.alphaPensionDrawAge,
      alphaAddedPensionLumpSums: [],
    });
  });

  it("only commits date normalization after the field loses focus", () => {
    render(<App />);

    const birthDateInput = screen.getByLabelText("Your Date of Birth");

    fireEvent.change(birthDateInput, {
      target: { value: "1977-04-10" },
    });

    expect(birthDateInput).toHaveValue("1977-04-10");
    expect(JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}")).toEqual({
      dateOfBirth: defaultSettings.dateOfBirth,
      lifeExpectancy: defaultSettings.lifeExpectancy,
      normalPensionAge: defaultSettings.normalPensionAge,
      currentStatePension: defaultSettings.currentStatePension,
      statePensionDrawDate: defaultSettings.statePensionDrawDate,
      alphaPensionAbsDate: defaultSettings.alphaPensionAbsDate,
      alphaAddedPensionMonthly: defaultSettings.alphaAddedPensionMonthly,
      alphaPensionLeaveAge: defaultSettings.alphaPensionLeaveAge,
      accruedPensionAtLastAbs: defaultSettings.accruedPensionAtLastAbs,
      pensionableEarnings: defaultSettings.pensionableEarnings,
      alphaPensionDrawAge: defaultSettings.alphaPensionDrawAge,
      alphaAddedPensionLumpSums: [],
    });

    fireEvent.blur(birthDateInput);

    expect(JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}")).toEqual({
      dateOfBirth: "1977-04-10",
      lifeExpectancy: defaultSettings.lifeExpectancy,
      normalPensionAge: defaultSettings.normalPensionAge,
      currentStatePension: defaultSettings.currentStatePension,
      statePensionDrawDate: defaultSettings.statePensionDrawDate,
      alphaPensionAbsDate: defaultSettings.alphaPensionAbsDate,
      alphaAddedPensionMonthly: defaultSettings.alphaAddedPensionMonthly,
      alphaPensionLeaveAge: defaultSettings.alphaPensionLeaveAge,
      accruedPensionAtLastAbs: defaultSettings.accruedPensionAtLastAbs,
      pensionableEarnings: defaultSettings.pensionableEarnings,
      alphaPensionDrawAge: defaultSettings.alphaPensionDrawAge,
      alphaAddedPensionLumpSums: [],
    });
  });

  it("loads settings from local storage on first render", () => {
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        ...defaultSettings,
        startDate: "1999-01-01",
        normalPensionAge: 69,
      }),
    );

    render(<App />);

    expect(screen.getByLabelText("Calculation Start Date")).toHaveValue(getTodayIsoDate());
    expect(screen.getByLabelText("Your Normal Pension Age")).toHaveValue("68");
    expect(screen.getAllByText(/At State Pension start/i).length).toBeGreaterThan(0);
  });

  it("resets the state pension slider back to its default value", () => {
    render(<App />);

    const statePensionSlider = screen.getByLabelText("Current Full State Pension (£ per year)");

    fireEvent.change(statePensionSlider, {
      target: { value: "13000" },
    });
    expect(statePensionSlider).toHaveValue("13000");

    fireEvent.click(screen.getByRole("button", { name: "Reset to default" }));

    expect(statePensionSlider).toHaveValue(defaultSettings.currentStatePension.toString());
  });

  it("supports exact numeric entry alongside sliders", () => {
    render(<App />);

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
    render(<App />);

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
    render(<App />);

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
        normalPensionAge: 120,
        currentStatePension: -10,
        alphaAddedPensionMonthly: 233,
        alphaPensionLeaveAge: 10,
        accruedPensionAtLastAbs: 12444,
        pensionableEarnings: 56321,
        alphaPensionDrawAge: 200,
      }),
    );

    render(<App />);

    expect(screen.getByLabelText("Assumed Life Expectancy (Age)")).toHaveValue("100");
    expect(screen.getByLabelText("Your Normal Pension Age")).toHaveValue("68");
    expect(screen.getByLabelText("Current Full State Pension (£ per year)")).toHaveValue("0");
    expect(screen.getByLabelText("Added Alpha Pension (£ per month)")).toHaveValue("225");
    expect(screen.getByLabelText("Age You Leave Alpha Pensionable Service")).toHaveValue("40");
    expect(
      screen.getByLabelText("Alpha Pension Accrued at Last Statement (£ per year)"),
    ).toHaveValue("12500");
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
        statePensionDrawDate: "2046-01-01",
      }),
    );

    render(<App />);

    expect(screen.getByRole("heading", { name: "Check these assumptions" })).toBeInTheDocument();
    expect(
      screen.getByText("No projection rows are available for the current settings."),
    ).toBeInTheDocument();
  });

  it("can collapse the table to milestone rows only", () => {
    const rows = createProjectionTable({
      ...defaultSettings,
      startDate: getTodayIsoDate(),
    });
    const milestoneRows = rows.filter((row) => row.milestones.length > 0);
    const nonMilestoneRow = rows.find((row) => row.milestones.length === 0);

    render(<App />);

    expect(
      screen.getByText(`Showing ${rows.length} of ${rows.length} rows.`),
    ).toBeInTheDocument();

    if (!nonMilestoneRow) {
      throw new Error("Expected a non-milestone row for the collapse test.");
    }

    const nonMilestoneRowLabel = new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(`${nonMilestoneRow.date}T00:00:00`));

    expect(screen.getByText(nonMilestoneRowLabel)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Only show milestone rows" }));

    expect(
      screen.getByText(
        `Showing ${milestoneRows.length} of ${rows.length} rows (${milestoneRows.length} milestones).`,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(nonMilestoneRowLabel)).not.toBeInTheDocument();
    expect(screen.getAllByText("Calculation start").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Life expectancy").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Show all rows" }));

    expect(
      screen.getByText(`Showing ${rows.length} of ${rows.length} rows.`),
    ).toBeInTheDocument();
    expect(screen.getByText(nonMilestoneRowLabel)).toBeInTheDocument();
  });
});
