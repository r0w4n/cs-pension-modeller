import { fireEvent, render, screen, within } from "@testing-library/react";
import { AdditionalGuaranteedIncomeEditor } from "./form-field-additional-guaranteed-income";
import type {
  AdditionalGuaranteedIncome,
  PensionValidationIssue,
} from "../settings";

function renderEditor(
  incomes: AdditionalGuaranteedIncome[] = [],
  onChange = vi.fn(),
  validationIssues: PensionValidationIssue[] = []
) {
  render(
    <AdditionalGuaranteedIncomeEditor
      incomes={incomes}
      defaultStartAge={60}
      validationIssues={validationIssues}
      onChange={onChange}
    />
  );

  return { onChange };
}

describe("AdditionalGuaranteedIncomeEditor", () => {
  it("adds an empty additional income stream", () => {
    const { onChange } = renderEditor();

    fireEvent.click(
      screen.getByRole("button", { name: "Add additional income" })
    );

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({
        name: "",
        annualAmount: null,
        startAge: 60,
        endAge: null,
        indexation: "cpi",
        fixedIncreasePercent: null,
        taxable: true,
      }),
    ]);
  });

  it("edits and removes an income stream", () => {
    const { onChange } = renderEditor([
      {
        id: "income-1",
        name: "Previous employer DB pension",
        annualAmount: 4500,
        startAge: 60,
        endAge: null,
        indexation: "cpi",
        fixedIncreasePercent: null,
        taxable: true,
      },
    ]);
    const card = screen
      .getByText("Additional income #1")
      .closest(".field-card");

    expect(card).not.toBeNull();
    fireEvent.change(
      within(card as HTMLElement).getByLabelText("Name, optional"),
      {
        target: { value: "Annuity" },
      }
    );
    expect(onChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ id: "income-1", name: "Annuity" }),
    ]);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Remove Previous employer DB pension",
      })
    );
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it("shows the fixed percentage input only for fixed indexation", () => {
    const { onChange } = renderEditor([
      {
        id: "income-1",
        name: "Annuity",
        annualAmount: 6000,
        startAge: 67,
        endAge: null,
        indexation: "cpi",
        fixedIncreasePercent: null,
        taxable: true,
      },
    ]);

    expect(
      screen.queryByLabelText("Fixed increase percentage")
    ).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Increases each year"), {
      target: { value: "fixed" },
    });

    expect(onChange).toHaveBeenLastCalledWith([
      expect.objectContaining({
        indexation: "fixed",
        fixedIncreasePercent: null,
      }),
    ]);
  });

  it("shows a draft hint before an annual income is entered", () => {
    renderEditor([
      {
        id: "income-1",
        name: "",
        annualAmount: null,
        startAge: 60,
        endAge: null,
        indexation: "cpi",
        fixedIncreasePercent: null,
        taxable: true,
      },
    ]);

    expect(
      screen.getByText(
        "Enter an annual income to include this row in the projection."
      )
    ).toBeInTheDocument();
  });

  it("renders validation messages for a stream", () => {
    renderEditor(
      [
        {
          id: "income-1",
          name: "",
          annualAmount: null,
          startAge: null,
          endAge: null,
          indexation: "cpi",
          fixedIncreasePercent: null,
          taxable: true,
        },
      ],
      vi.fn(),
      [
        {
          field: "additionalGuaranteedIncomes",
          itemId: "income-1",
          message: "Enter an annual amount.",
        },
      ]
    );

    expect(screen.getByText("Enter an annual amount.")).toBeInTheDocument();
  });
});
