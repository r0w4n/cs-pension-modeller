import { fireEvent, render, screen } from "@testing-library/react";
import { fieldGroups } from "../fieldDefinitions";
import { createDefaultSettings } from "../settings";
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
});
