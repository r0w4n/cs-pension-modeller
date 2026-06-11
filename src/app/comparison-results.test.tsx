import { render, screen } from "@testing-library/react";
import {
  createComparisonResult,
  type ComparisonInsights,
} from "../app-domains";
import { createDefaultSettings } from "../settings";
import { ComparisonResults } from "./comparison-results";

describe("comparison results", () => {
  const originalMatchMedia = window.matchMedia;

  const mockMatchMedia = (matches: boolean) => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  };

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it("keeps the mobile comparison view card-based without section divider cards", () => {
    mockMatchMedia(true);

    const settings = createDefaultSettings();
    const result = createComparisonResult(
      {
        id: "scenario-1",
        name: "Current model",
        settings,
        createdAt: "",
        updatedAt: "",
      },
      JSON.stringify(settings)
    );
    const insights: ComparisonInsights = {
      earliestRetirementResult: null,
      bestTargetResult: null,
      lowestShortfallRiskResult: null,
      longestCapitalResult: null,
      highestLaterIncomeResult: null,
    };

    render(<ComparisonResults results={[result]} insights={insights} />);

    expect(
      document.querySelector(".projection-mobile-cards--active")
    ).not.toBeNull();
    expect(document.querySelector(".table-header-shell")).toBeNull();
    expect(document.querySelector(".table-body-shell")).toBeNull();
    expect(screen.queryByText("Headline outcome")).not.toBeInTheDocument();
    expect(screen.queryByText("Bridge funding")).not.toBeInTheDocument();
    expect(screen.queryByText("Flexible assets")).not.toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getAllByText("Current model").length).toBeGreaterThan(0);
  });
});
