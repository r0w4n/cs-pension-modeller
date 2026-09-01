import { fireEvent, render, screen } from "@testing-library/react";
import { fieldGroups } from "../fieldDefinitions";
import { calculateNormalPensionAge, createDefaultSettings } from "../settings";
import { DateInputFieldEditor, SettingsFields } from "./form-fields";

describe("form-fields module", () => {
  it("commits date editor changes on blur", () => {
    const onCommit = vi.fn((value: string) => value);

    render(
      <DateInputFieldEditor
        label="Start"
        initialValue="2026-01-01"
        onCommit={onCommit}
      />
    );

    const input = screen.getByLabelText("Start");
    fireEvent.change(input, { target: { value: "2026-02-01" } });
    fireEvent.blur(input);

    expect(onCommit).toHaveBeenCalledWith("2026-02-01");
  });

  it("offers target-based drawdown without placing priority in account fields", () => {
    const settings = {
      ...createDefaultSettings(),
      sippWithdrawalStrategy: "meet_income_target" as const,
      isaWithdrawalStrategy: "meet_income_target" as const,
    };
    const onChange = vi.fn();
    const fields = fieldGroups
      .flatMap((group) => group.fields)
      .filter(
        (field) =>
          field.id === "sippWithdrawalStrategy" ||
          field.id === "isaWithdrawalStrategy"
      );

    render(
      <SettingsFields
        fields={fields}
        settings={settings}
        validationIssues={[]}
        onChange={onChange}
        showGuidanceNotes
        useDropdownDates={false}
      />
    );

    expect(
      screen.getAllByRole("option", { name: "Use to meet income target" })
    ).toHaveLength(2);
    expect(
      screen.queryByRole("heading", { name: "Income-target funding priority" })
    ).not.toBeInTheDocument();
  });

  it("places forecast confirmation in a section after the State Pension amount", () => {
    const settings = createDefaultSettings();
    const fields = fieldGroups
      .flatMap((group) => group.fields)
      .filter(
        (field) =>
          field.id === "currentStatePension" ||
          field.id === "statePensionForecastConfirmed"
      );

    render(
      <SettingsFields
        fields={fields}
        settings={settings}
        validationIssues={[]}
        onChange={vi.fn()}
        showGuidanceNotes
        useDropdownDates={false}
      />
    );

    const amount = screen.getByLabelText("State Pension forecast (£ per year)");
    const confirmation = screen.getByLabelText(
      "This is my personalised State Pension forecast"
    );
    const amountSection = amount.closest(".field-card");
    const confirmationSection = confirmation.closest(".field-card");

    expect(amountSection).not.toBe(confirmationSection);
    expect(amountSection?.nextElementSibling).toBe(confirmationSection);
  });

  it("shows a non-blocking warning on an over-withdrawing strategy", () => {
    const settings = createDefaultSettings();
    const isaStrategyField = fieldGroups
      .flatMap((group) => group.fields)
      .filter((field) => field.id === "isaWithdrawalStrategy");

    render(
      <SettingsFields
        fields={isaStrategyField}
        settings={settings}
        validationIssues={[]}
        onChange={vi.fn()}
        showGuidanceNotes
        useDropdownDates={false}
        flexibleWithdrawalSummary={{
          accounts: [
            {
              accountId: "isa",
              label: "ISA",
              affectedAges: [65, 66, 67],
              reducibleGrossWithdrawal: 18_400,
              avoidableNetSurplus: 18_400,
            },
          ],
          residualAccounts: [],
          affectedAges: [65, 66, 67],
          totalReducibleGrossWithdrawal: 18_400,
          totalAvoidableNetSurplus: 18_400,
          largestAnnualAvoidableSurplus: 7_000,
        }}
      />
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "approximately £18,400 more than is needed"
    );
    expect(
      screen.getByLabelText("ISA withdrawal strategy")
    ).not.toHaveAttribute("aria-invalid");
  });

  it("validates manually entered ages against quarter-year steps", () => {
    const settings = createDefaultSettings();
    const onChange = vi.fn();
    const retirementAgeField = fieldGroups
      .flatMap((group) => group.fields)
      .filter((field) => field.id === "requirementAge");

    render(
      <SettingsFields
        fields={retirementAgeField}
        settings={settings}
        validationIssues={[]}
        onChange={onChange}
        showGuidanceNotes
        useDropdownDates={false}
      />
    );

    const exactAgeInput = screen.getByLabelText(
      "Target retirement age exact value"
    );

    expect(exactAgeInput).toHaveAttribute("step", "0.25");
    expect(screen.getByText("Selected age: 68 years")).toBeInTheDocument();

    fireEvent.focus(exactAgeInput);
    fireEvent.change(exactAgeInput, { target: { value: "67.2" } });
    fireEvent.blur(exactAgeInput);

    expect(exactAgeInput).toHaveValue(67.2);
    expect(exactAgeInput).toHaveAttribute("aria-invalid", "true");
    expect(
      screen.getByText(
        "Enter a whole year, or add 3, 6 or 9 months (for example 67.25)."
      )
    ).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.change(exactAgeInput, { target: { value: "67.25" } });
    fireEvent.blur(exactAgeInput);

    expect(onChange).toHaveBeenCalledWith("requirementAge", 67.25);
  });

  it("lets the LISA slider select its £333.33 regular-saving maximum", () => {
    const settings = {
      ...createDefaultSettings(),
      showLisa: true,
      lisaMonthlyContribution: 325,
    };
    const onChange = vi.fn();
    const lisaContributionField = fieldGroups
      .flatMap((group) => group.fields)
      .filter((field) => field.id === "lisaMonthlyContribution");

    render(
      <SettingsFields
        fields={lisaContributionField}
        settings={settings}
        validationIssues={[]}
        onChange={onChange}
        showGuidanceNotes
        useDropdownDates={false}
      />
    );

    const slider = screen.getByLabelText(
      "Regular LISA contribution (£ per month)"
    );
    const exactValue = screen.getByLabelText(
      "Regular LISA contribution (£ per month) exact value"
    );

    expect(slider).toHaveAttribute("step", "0.01");
    expect(exactValue).toHaveAttribute("step", "0.01");

    fireEvent.change(slider, { target: { value: "333.33" } });
    fireEvent.blur(slider);

    expect(onChange).toHaveBeenCalledWith("lisaMonthlyContribution", 333.33);
  });

  it("resets NPA-linked expert ages to the current Normal Pension Age", () => {
    const dateOfBirth = "1977-06-01";
    const normalPensionAge = calculateNormalPensionAge(dateOfBirth);
    const settings = {
      ...createDefaultSettings(),
      dateOfBirth,
      normalPensionAge,
      requirementAge: 60,
      alphaPensionLeaveAge: 61,
      alphaPensionDrawAge: 62,
      sippDrawAge: 65,
      statePensionDrawDate: "2045-06-01",
    };
    const onChange = vi.fn();
    const fields = fieldGroups
      .flatMap((group) => group.fields)
      .filter(
        (field) =>
          field.id === "requirementAge" ||
          field.id === "alphaPensionLeaveAge" ||
          field.id === "alphaPensionDrawAge" ||
          field.id === "statePensionDrawDate" ||
          field.id === "sippDrawAge"
      );

    render(
      <SettingsFields
        fields={fields}
        settings={settings}
        validationIssues={[]}
        onChange={onChange}
        showGuidanceNotes
        useDropdownDates={false}
        useNpaLinkedDefaults
      />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Reset retirement age to default value",
      })
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Reset State Pension start age to default value",
      })
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Reset Age You Leave Alpha Scheme to default value",
      })
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Reset Planned Alpha Pension Draw Age to default value",
      })
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Reset SIPP draw start age to default value",
      })
    );

    expect(normalPensionAge).toBe(67.25);
    expect(onChange).toHaveBeenCalledWith("requirementAge", 67.25);
    expect(onChange).toHaveBeenCalledWith("alphaPensionLeaveAge", 67.25);
    expect(onChange).toHaveBeenCalledWith("alphaPensionDrawAge", 67.25);
    expect(onChange).toHaveBeenCalledWith("statePensionDrawDate", "2044-09-01");
    expect(onChange).toHaveBeenCalledWith("sippDrawAge", 67.25);
  });
});
