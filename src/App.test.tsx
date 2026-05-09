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
    expect(screen.getByLabelText("Project State Pension future growth")).not.toBeChecked();
    expect(screen.getByLabelText("State Pension CPI (%)")).toBeDisabled();
    expect(screen.getByLabelText("State Pension wage growth (%)")).toBeDisabled();
    expect(screen.getByLabelText("Apply Alpha pension increases")).not.toBeChecked();
    expect(screen.getByLabelText("Assumed CPI (%)")).toHaveValue("2");
    expect(screen.getByLabelText("Assumed CPI (%)")).toBeDisabled();
    expect(screen.getByLabelText("Assumed CPI (%) exact value")).toBeDisabled();
    expect(screen.getByLabelText("Current SIPP pot (£)")).toHaveValue(
      defaultSettings.sippCurrentPot,
    );
    expect(screen.getByLabelText("Regular SIPP contribution (£ per month)")).toHaveValue(
      defaultSettings.sippMonthlyContribution.toString(),
    );
    expect(screen.getByRole("button", { name: "Add SIPP lump sum" })).toBeInTheDocument();
    expect(screen.getByLabelText("Apply 25% tax relief to SIPP additions")).toBeChecked();
    expect(screen.getByLabelText("Apply real interest to SIPP pot")).not.toBeChecked();
    expect(screen.getByLabelText("SIPP real interest rate (%)")).toBeDisabled();
    expect(screen.getByLabelText("SIPP real interest rate (%) exact value")).toBeDisabled();
    expect(screen.getByLabelText("SIPP withdrawal strategy")).toHaveValue("zero_at_death");
    expect(screen.getByLabelText("SIPP withdrawal rate (%)")).toHaveValue("4");
    expect(screen.getByLabelText("SIPP withdrawal rate (%)")).toBeDisabled();
    expect(screen.getByLabelText("SIPP withdrawal rate (%) exact value")).toBeDisabled();
    expect(screen.getByLabelText("Current ISA pot (£)")).toHaveValue(
      defaultSettings.isaCurrentPot,
    );
    expect(screen.getByText("ISA at Alpha draw date")).toBeInTheDocument();
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
        name: "Monthly SIPP pension",
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
    expect(screen.getByText("SIPP at Alpha draw date")).toBeInTheDocument();
    expect(screen.getAllByText("Starts Drawing Alpha Pension").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Calculation start").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Life expectancy").length).toBeGreaterThan(0);
    expect(screen.queryByLabelText("State Pension Age")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Your Normal Pension Age")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Annual Benefit Statement guide" }),
    ).toHaveAttribute(
      "href",
      "https://www.civilservicepensionscheme.org.uk/memberhub/your-pension/yearly-pension-updates/annual-benefit-statement/",
    );
    expect(screen.getByRole("link", { name: "Estimate life expectancy" })).toHaveAttribute(
      "href",
      "https://www.ons.gov.uk/peoplepopulationandcommunity/healthandsocialcare/healthandlifeexpectancies/articles/lifeexpectancycalculator/2019-06-07",
    );
    expect(screen.getByRole("link", { name: "Check State Pension" })).toHaveAttribute(
      "href",
      "https://www.gov.uk/check-state-pension",
    );
    expect(screen.getByRole("link", { name: "Check State Pension age" })).toHaveAttribute(
      "href",
      "https://www.gov.uk/state-pension-age",
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
      statePensionApplyFutureGrowth: defaultSettings.statePensionApplyFutureGrowth,
      statePensionCpiPercent: defaultSettings.statePensionCpiPercent,
      statePensionWageGrowthPercent: defaultSettings.statePensionWageGrowthPercent,
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
      sippCurrentPot: defaultSettings.sippCurrentPot,
      sippMonthlyContribution: defaultSettings.sippMonthlyContribution,
      sippLumpSums: defaultSettings.sippLumpSums,
      sippApplyRealInterest: defaultSettings.sippApplyRealInterest,
      sippRealInterestPercent: defaultSettings.sippRealInterestPercent,
      sippApplyTaxRelief: defaultSettings.sippApplyTaxRelief,
      sippWithdrawalStrategy: defaultSettings.sippWithdrawalStrategy,
      sippWithdrawalPercent: defaultSettings.sippWithdrawalPercent,
      isaCurrentPot: defaultSettings.isaCurrentPot,
      isaMonthlyContribution: defaultSettings.isaMonthlyContribution,
      isaLumpSums: defaultSettings.isaLumpSums,
      isaApplyRealInterest: defaultSettings.isaApplyRealInterest,
      isaRealInterestPercent: defaultSettings.isaRealInterestPercent,
      isaWithdrawalStrategy: defaultSettings.isaWithdrawalStrategy,
      isaWithdrawalPercent: defaultSettings.isaWithdrawalPercent,
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
      statePensionApplyFutureGrowth: defaultSettings.statePensionApplyFutureGrowth,
      statePensionCpiPercent: defaultSettings.statePensionCpiPercent,
      statePensionWageGrowthPercent: defaultSettings.statePensionWageGrowthPercent,
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
      sippCurrentPot: defaultSettings.sippCurrentPot,
      sippMonthlyContribution: defaultSettings.sippMonthlyContribution,
      sippLumpSums: defaultSettings.sippLumpSums,
      sippApplyRealInterest: defaultSettings.sippApplyRealInterest,
      sippRealInterestPercent: defaultSettings.sippRealInterestPercent,
      sippApplyTaxRelief: defaultSettings.sippApplyTaxRelief,
      sippWithdrawalStrategy: defaultSettings.sippWithdrawalStrategy,
      sippWithdrawalPercent: defaultSettings.sippWithdrawalPercent,
      isaCurrentPot: defaultSettings.isaCurrentPot,
      isaMonthlyContribution: defaultSettings.isaMonthlyContribution,
      isaLumpSums: defaultSettings.isaLumpSums,
      isaApplyRealInterest: defaultSettings.isaApplyRealInterest,
      isaRealInterestPercent: defaultSettings.isaRealInterestPercent,
      isaWithdrawalStrategy: defaultSettings.isaWithdrawalStrategy,
      isaWithdrawalPercent: defaultSettings.isaWithdrawalPercent,
    });

    fireEvent.blur(birthDateInput);

    expect(JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}")).toEqual({
      dateOfBirth: "1977-04-10",
      lifeExpectancy: defaultSettings.lifeExpectancy,
      currentStatePension: defaultSettings.currentStatePension,
      statePensionApplyFutureGrowth: defaultSettings.statePensionApplyFutureGrowth,
      statePensionCpiPercent: defaultSettings.statePensionCpiPercent,
      statePensionWageGrowthPercent: defaultSettings.statePensionWageGrowthPercent,
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
      sippCurrentPot: defaultSettings.sippCurrentPot,
      sippMonthlyContribution: defaultSettings.sippMonthlyContribution,
      sippLumpSums: defaultSettings.sippLumpSums,
      sippApplyRealInterest: defaultSettings.sippApplyRealInterest,
      sippRealInterestPercent: defaultSettings.sippRealInterestPercent,
      sippApplyTaxRelief: defaultSettings.sippApplyTaxRelief,
      sippWithdrawalStrategy: defaultSettings.sippWithdrawalStrategy,
      sippWithdrawalPercent: defaultSettings.sippWithdrawalPercent,
      isaCurrentPot: defaultSettings.isaCurrentPot,
      isaMonthlyContribution: defaultSettings.isaMonthlyContribution,
      isaLumpSums: defaultSettings.isaLumpSums,
      isaApplyRealInterest: defaultSettings.isaApplyRealInterest,
      isaRealInterestPercent: defaultSettings.isaRealInterestPercent,
      isaWithdrawalStrategy: defaultSettings.isaWithdrawalStrategy,
      isaWithdrawalPercent: defaultSettings.isaWithdrawalPercent,
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

  it("can apply projected State Pension future growth", () => {
    renderAcknowledgedApp();

    const applyStateGrowthToggle = screen.getByLabelText(
      "Project State Pension future growth",
    );
    const cpiInput = screen.getByLabelText("State Pension CPI (%) exact value");
    const wageGrowthInput = screen.getByLabelText(
      "State Pension wage growth (%) exact value",
    );

    fireEvent.click(applyStateGrowthToggle);
    fireEvent.change(cpiInput, {
      target: { value: "3.1" },
    });
    fireEvent.change(wageGrowthInput, {
      target: { value: "4.2" },
    });

    expect(applyStateGrowthToggle).toBeChecked();
    expect(cpiInput).toHaveValue(3.1);
    expect(wageGrowthInput).toHaveValue(4.2);
    expect(JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}")).toEqual(
      expect.objectContaining({
        statePensionApplyFutureGrowth: true,
        statePensionCpiPercent: 3.1,
        statePensionWageGrowthPercent: 4.2,
      }),
    );
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
      statePensionApplyFutureGrowth: defaultSettings.statePensionApplyFutureGrowth,
      statePensionCpiPercent: defaultSettings.statePensionCpiPercent,
      statePensionWageGrowthPercent: defaultSettings.statePensionWageGrowthPercent,
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
      sippCurrentPot: defaultSettings.sippCurrentPot,
      sippMonthlyContribution: defaultSettings.sippMonthlyContribution,
      sippLumpSums: defaultSettings.sippLumpSums,
      sippApplyRealInterest: defaultSettings.sippApplyRealInterest,
      sippRealInterestPercent: defaultSettings.sippRealInterestPercent,
      sippApplyTaxRelief: defaultSettings.sippApplyTaxRelief,
      sippWithdrawalStrategy: defaultSettings.sippWithdrawalStrategy,
      sippWithdrawalPercent: defaultSettings.sippWithdrawalPercent,
      isaCurrentPot: defaultSettings.isaCurrentPot,
      isaMonthlyContribution: defaultSettings.isaMonthlyContribution,
      isaLumpSums: defaultSettings.isaLumpSums,
      isaApplyRealInterest: defaultSettings.isaApplyRealInterest,
      isaRealInterestPercent: defaultSettings.isaRealInterestPercent,
      isaWithdrawalStrategy: defaultSettings.isaWithdrawalStrategy,
      isaWithdrawalPercent: defaultSettings.isaWithdrawalPercent,
    });
  });

  it("supports exact numeric entry alongside sliders", () => {
    renderAcknowledgedApp();

    fireEvent.change(
      screen.getByLabelText("Current Pensionable Earnings (£ per year) exact value"),
      {
        target: { value: "10001" },
      },
    );

    expect(screen.getByLabelText("Current Pensionable Earnings (£ per year)")).toHaveValue(
      "10001",
    );
    expect(JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}")).toEqual(
      expect.objectContaining({
        pensionableEarnings: 10001,
      }),
    );
  });

  it("keeps partial exact numeric entry editable before saving a valid range value", () => {
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        ...defaultSettings,
        lifeExpectancy: 100,
      }),
    );
    renderAcknowledgedApp();

    const exactLifeExpectancyInput = screen.getByLabelText(
      "Life Expectancy (Age) exact value",
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
    expect(JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}")).toEqual(
      expect.objectContaining({
        lifeExpectancy: 90,
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

  it("adds and removes SIPP lump sums from the form and saved settings", () => {
    renderAcknowledgedApp();

    fireEvent.click(screen.getByRole("button", { name: "Add SIPP lump sum" }));
    fireEvent.change(screen.getByLabelText("SIPP lump sum amount 1"), {
      target: { value: "15000" },
    });
    fireEvent.change(screen.getByLabelText("SIPP lump sum cadence 1"), {
      target: { value: "yearly" },
    });

    expect(screen.getByText("SIPP lump sum #1")).toBeInTheDocument();
    expect(screen.getByLabelText("SIPP lump sum end date 1")).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}")).toEqual(
      expect.objectContaining({
        sippLumpSums: [
          expect.objectContaining({
            amount: 15000,
            cadence: "yearly",
          }),
        ],
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Remove SIPP lump sum" }));

    expect(screen.queryByText("SIPP lump sum #1")).not.toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}")).toEqual(
      expect.objectContaining({
        sippLumpSums: [],
      }),
    );
  });

  it("enables the SIPP withdrawal rate when using percentage drawdown", () => {
    renderAcknowledgedApp();

    fireEvent.change(screen.getByLabelText("SIPP withdrawal strategy"), {
      target: { value: "percentage" },
    });
    fireEvent.change(screen.getByLabelText("SIPP withdrawal rate (%) exact value"), {
      target: { value: "5.2" },
    });

    expect(screen.getByLabelText("SIPP withdrawal rate (%)")).not.toBeDisabled();
    expect(screen.getByLabelText("SIPP withdrawal rate (%) exact value")).toHaveValue(5.2);
    expect(JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}")).toEqual(
      expect.objectContaining({
        sippWithdrawalStrategy: "percentage",
        sippWithdrawalPercent: 5.2,
      }),
    );
  });

  it("enables ISA settings and lump sums when included", () => {
    renderAcknowledgedApp();

    fireEvent.change(screen.getByLabelText("Current ISA pot (£)"), {
      target: { value: "20000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add ISA lump sum" }));
    fireEvent.change(screen.getByLabelText("ISA lump sum amount 1"), {
      target: { value: "5000" },
    });

    expect(screen.getByText("ISA at Alpha draw date")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Monthly ISA pension" })).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}")).toEqual(
      expect.objectContaining({
        isaCurrentPot: 20000,
        isaLumpSums: [
          expect.objectContaining({
            amount: 5000,
          }),
        ],
      }),
    );
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
    expect(screen.getByLabelText("Added Alpha Pension (£ per month)")).toHaveValue("233");
    expect(screen.getByLabelText("Age You Leave Alpha Scheme")).toHaveValue("40");
    expect(
      screen.getByLabelText("Alpha Pension Accrued at Last Statement (£ per year)"),
    ).toHaveValue(12444);
    expect(screen.getByLabelText("Current Pensionable Earnings (£ per year)")).toHaveValue(
      "56321",
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
