import { fireEvent, render, screen } from "@testing-library/react";
import { fieldGroups } from "../fieldDefinitions";
import { calculateNormalPensionAge, createDefaultSettings } from "../settings";
import { DateInputFieldEditor, SettingsFields } from "./form-fields";
import { CurrencySettingField, RangeSettingField } from "./form-field-values";

describe("form-fields module", () => {
  it("keeps an opt-in required currency draft empty rather than committing zero", () => {
    const field = fieldGroups
      .flatMap((group) => group.fields)
      .find((candidate) => candidate.id === "accruedPensionAtLastAbs");
    if (!field || field.type !== "currency-input") {
      throw new Error("Expected accrued pension currency field");
    }
    const onChange = vi.fn();
    const onDraftStateChange = vi.fn();

    render(
      <CurrencySettingField
        field={field}
        value={0}
        onChange={onChange}
        showGuidanceNotes
        initialDraftValue=""
        strictDraftValidation
        onDraftStateChange={onDraftStateChange}
      />
    );

    const input = screen.getByLabelText(field.label);
    expect(input).toHaveValue(null);
    fireEvent.blur(input);
    expect(onChange).not.toHaveBeenCalled();
    expect(onDraftStateChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: "invalid" })
    );
    fireEvent.change(input, { target: { value: "0" } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith("accruedPensionAtLastAbs", 0);
  });

  it("distinguishes an unanswered required range from an explicit zero", () => {
    const settings = createDefaultSettings();
    const field = fieldGroups
      .flatMap((group) => group.fields)
      .find((candidate) => candidate.id === "pensionableEarnings");
    if (!field || field.type !== "range") {
      throw new Error("Expected earnings range field");
    }
    const onChange = vi.fn();
    const onDraftStateChange = vi.fn();

    const view = render(
      <RangeSettingField
        field={field}
        value={0}
        settings={settings}
        onChange={onChange}
        showGuidanceNotes
        isAnswered={false}
        strictDraftValidation
        onDraftStateChange={onDraftStateChange}
      />
    );

    const exact = screen.getByLabelText(`${field.label} exact value`);
    expect(exact).toHaveValue(null);
    fireEvent.change(exact, { target: { value: "0" } });
    fireEvent.blur(exact);
    expect(onChange).toHaveBeenCalledWith("pensionableEarnings", 0);
    expect(onDraftStateChange).toHaveBeenLastCalledWith({
      status: "committed",
      value: 0,
    });
    view.rerender(
      <RangeSettingField
        field={field}
        value={0}
        settings={{ ...settings, pensionableEarnings: 0 }}
        onChange={onChange}
        showGuidanceNotes
        isAnswered
        strictDraftValidation
        onDraftStateChange={onDraftStateChange}
      />
    );
    expect(exact).toHaveValue(0);
  });

  it("preserves legacy currency commit behaviour unless strict validation is requested", () => {
    const field = fieldGroups
      .flatMap((group) => group.fields)
      .find((candidate) => candidate.id === "accruedPensionAtLastAbs");
    if (!field || field.type !== "currency-input") {
      throw new Error("Expected accrued pension currency field");
    }
    const onChange = vi.fn();

    render(
      <CurrencySettingField
        field={field}
        value={4_000}
        onChange={onChange}
        showGuidanceNotes
      />
    );
    const input = screen.getByLabelText(field.label);
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);

    expect(onChange).toHaveBeenCalledWith("accruedPensionAtLastAbs", 0);
  });

  it("retains strict currency errors in displayed units until a valid commit", () => {
    const baseField = fieldGroups
      .flatMap((group) => group.fields)
      .find((candidate) => candidate.id === "currentStatePension");
    if (!baseField || baseField.type !== "currency-input") {
      throw new Error("Expected State Pension currency field");
    }
    const field = {
      ...baseField,
      min: 1_200,
      max: 12_000,
      displayDivisor: 12,
      presets: [{ label: "Preset", value: 6_000 }],
    };
    const onChange = vi.fn();
    const onDraftStateChange = vi.fn();
    const view = render(
      <CurrencySettingField
        field={field}
        value={6_000}
        onChange={onChange}
        showGuidanceNotes
        strictDraftValidation
        onDraftStateChange={onDraftStateChange}
      />
    );
    const input = screen.getByLabelText(field.label);

    for (const [draft, message] of [
      ["", `Enter ${field.label.toLowerCase()}.`],
      ["-1", "Enter 100 or more."],
      ["1001", "Enter 1000 or less."],
    ]) {
      fireEvent.change(input, { target: { value: draft } });
      fireEvent.blur(input);
      expect(input).toHaveValue(draft === "" ? null : Number(draft));
      expect(onDraftStateChange).toHaveBeenLastCalledWith({
        status: "invalid",
        message,
      });
    }
    expect(onChange).not.toHaveBeenCalled();

    input.focus();
    view.rerender(
      <CurrencySettingField
        field={field}
        value={6_000}
        onChange={onChange}
        showGuidanceNotes
        initialDraftValue=""
        strictDraftValidation
        onDraftStateChange={onDraftStateChange}
      />
    );
    expect(input).toHaveValue(1001);
    expect(input).toHaveFocus();

    fireEvent.change(input, { target: { value: "250" } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenLastCalledWith("currentStatePension", 3_000);
    expect(onDraftStateChange).toHaveBeenLastCalledWith({
      status: "committed",
      value: 250,
    });

    fireEvent.click(screen.getByRole("button", { name: "Preset" }));
    expect(onChange).toHaveBeenLastCalledWith("currentStatePension", 6_000);
    expect(onDraftStateChange).toHaveBeenLastCalledWith({
      status: "committed",
      value: 500,
    });
    fireEvent.click(
      screen.getByRole("button", {
        name: /Reset State Pension forecast.*to default value/,
      })
    );
    expect(onDraftStateChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: "committed" })
    );
  });

  it("preserves legacy range clamping when strict validation is not requested", () => {
    const settings = createDefaultSettings();
    const field = fieldGroups
      .flatMap((group) => group.fields)
      .find((candidate) => candidate.id === "pensionableEarnings");
    if (!field || field.type !== "range") {
      throw new Error("Expected earnings range field");
    }
    const onChange = vi.fn();
    render(
      <RangeSettingField
        field={field}
        value={42_000}
        settings={settings}
        onChange={onChange}
        showGuidanceNotes
      />
    );
    const exact = screen.getByLabelText(`${field.label} exact value`);
    fireEvent.change(exact, { target: { value: "200000" } });
    fireEvent.blur(exact);
    expect(onChange).toHaveBeenCalledWith("pensionableEarnings", 150_000);
  });

  it("blocks invalid strict range drafts on blur and Enter while retaining valid slider commits", () => {
    const settings = createDefaultSettings();
    const field = fieldGroups
      .flatMap((group) => group.fields)
      .find((candidate) => candidate.id === "pensionableEarnings");
    if (!field || field.type !== "range") {
      throw new Error("Expected earnings range field");
    }
    const onChange = vi.fn();
    const onDraftStateChange = vi.fn();
    const view = render(
      <RangeSettingField
        field={field}
        value={42_000}
        settings={settings}
        onChange={onChange}
        showGuidanceNotes
        strictDraftValidation
        onDraftStateChange={onDraftStateChange}
      />
    );
    const exact = screen.getByLabelText(`${field.label} exact value`);

    for (const draft of ["", "-1", "150001"]) {
      fireEvent.change(exact, { target: { value: draft } });
      fireEvent.keyDown(exact, { key: "Enter" });
      fireEvent.blur(exact);
      expect(exact).toHaveValue(draft === "" ? null : Number(draft));
    }
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.change(exact, { target: { value: "0" } });
    fireEvent.keyDown(exact, { key: "Enter" });
    expect(onChange).toHaveBeenLastCalledWith("pensionableEarnings", 0);
    view.rerender(
      <RangeSettingField
        field={field}
        value={0}
        settings={{ ...settings, pensionableEarnings: 0 }}
        onChange={onChange}
        showGuidanceNotes
        strictDraftValidation
        onDraftStateChange={onDraftStateChange}
      />
    );
    expect(exact).toHaveValue(0);

    const slider = screen.getByLabelText(field.label);
    fireEvent.change(slider, { target: { value: "50000" } });
    fireEvent.blur(slider);
    expect(onChange).toHaveBeenLastCalledWith("pensionableEarnings", 50_000);
  });

  it("keeps non-quarter ages invalid in strict range mode until corrected", () => {
    const settings = createDefaultSettings();
    const field = fieldGroups
      .flatMap((group) => group.fields)
      .find((candidate) => candidate.id === "alphaPensionDrawAge");
    if (!field || field.type !== "range") {
      throw new Error("Expected Alpha draw age range field");
    }
    const onChange = vi.fn();
    render(
      <RangeSettingField
        field={field}
        value={60}
        settings={settings}
        onChange={onChange}
        showGuidanceNotes
        strictDraftValidation
        onDraftStateChange={vi.fn()}
      />
    );
    const exact = screen.getByLabelText(`${field.label} exact value`);
    fireEvent.change(exact, { target: { value: "60.2" } });
    fireEvent.blur(exact);
    expect(onChange).not.toHaveBeenCalled();
    expect(exact).toHaveValue(60.2);

    fireEvent.change(exact, { target: { value: "60.25" } });
    fireEvent.blur(exact);
    expect(onChange).toHaveBeenCalledWith("alphaPensionDrawAge", 60.25);
  });

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
