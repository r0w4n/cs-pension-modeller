import { fireEvent, render, screen } from "@testing-library/react";
import { FlexibleWithdrawalInsightPanel } from "./flexible-withdrawal-insight";

describe("FlexibleWithdrawalInsightPanel", () => {
  it("quantifies surplus and keeps the preview non-destructive", () => {
    const onApply = vi.fn();
    const onReview = vi.fn();

    render(
      <FlexibleWithdrawalInsightPanel
        summary={{
          accounts: [
            {
              accountId: "isa",
              label: "ISA",
              affectedAges: [65, 66, 67, 68],
              reducibleGrossWithdrawal: 42_600,
              avoidableNetSurplus: 37_900,
            },
          ],
          residualAccounts: [],
          affectedAges: [65, 66, 67, 68],
          totalReducibleGrossWithdrawal: 42_600,
          totalAvoidableNetSurplus: 37_900,
          largestAnnualAvoidableSurplus: 12_000,
        }}
        previews={[
          {
            accountId: "isa",
            currentGrossWithdrawals: 80_000,
            targetBasedGrossWithdrawals: 61_600,
            currentUnallocatedSurplus: 18_400,
            targetBasedUnallocatedSurplus: 0,
            currentEndingBalance: 0,
            targetBasedEndingBalance: 26_700,
          },
        ]}
        onApplyTargetBasedStrategy={onApply}
        onReviewStrategy={onReview}
      />
    );

    expect(
      screen.getByRole("heading", {
        name: "Your flexible withdrawals may be higher than needed",
      })
    ).toBeInTheDocument();
    expect(screen.getAllByText("£42,600.00 gross")).toHaveLength(2);
    expect(screen.getByText("65–68")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Preview “Use to meet income target”"));
    expect(screen.getByText("£61,600.00")).toBeInTheDocument();
    expect(onApply).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole("button", { name: "Review withdrawal strategy" })
    );
    expect(onReview).toHaveBeenCalledWith("isa");

    fireEvent.click(
      screen.getByRole("button", {
        name: "Apply “Use to meet income target”",
      })
    );
    expect(onApply).toHaveBeenCalledWith("isa");
  });
});
