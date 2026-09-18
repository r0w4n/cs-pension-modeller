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

  it("announces pending preview calculations", () => {
    render(
      <FlexibleWithdrawalInsightPanel
        summary={createSummary()}
        previews={[]}
        isPreviewPending
        onApplyTargetBasedStrategy={vi.fn()}
        onReviewStrategy={vi.fn()}
      />
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Previewing target-based withdrawals"
    );
  });

  it("offers a retry when preview calculation fails", () => {
    const onRetry = vi.fn();

    render(
      <FlexibleWithdrawalInsightPanel
        summary={createSummary()}
        previews={[]}
        previewError
        onApplyTargetBasedStrategy={vi.fn()}
        onReviewStrategy={vi.fn()}
        onRetryPreview={onRetry}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Retry preview" }));

    expect(screen.getByText("Preview needs recalculating")).toBeInTheDocument();
    expect(onRetry).toHaveBeenCalled();
  });
});

function createSummary() {
  return {
    accounts: [
      {
        accountId: "isa" as const,
        label: "ISA",
        affectedAges: [65],
        reducibleGrossWithdrawal: 12_000,
        avoidableNetSurplus: 12_000,
      },
    ],
    residualAccounts: [],
    affectedAges: [65],
    totalReducibleGrossWithdrawal: 12_000,
    totalAvoidableNetSurplus: 12_000,
    largestAnnualAvoidableSurplus: 12_000,
  };
}
