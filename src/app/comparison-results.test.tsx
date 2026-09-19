import { act, render, screen } from "@testing-library/react";
import type { ComparisonInsights } from "../app-domains";
import { createComparisonResult } from "../result-projection/comparison-result";
import { calculateRetirementPlan } from "../calculation/retirement-plan";
import { createDefaultSettings } from "../settings";
import { ComparisonResults } from "./comparison-results";

describe("comparison results", () => {
  const originalMatchMedia = window.matchMedia?.bind(window);

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
  const mockMutableMatchMedia = (initialMatches: boolean) => {
    let matches = initialMatches;
    const listeners = new Set<(event: MediaQueryListEvent) => void>();
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      get matches() {
        return matches;
      },
      media: query,
      onchange: null,
      addEventListener: vi.fn(
        (type: string, listener: (event: MediaQueryListEvent) => void) => {
          if (type === "change") {
            listeners.add(listener);
          }
        }
      ),
      removeEventListener: vi.fn(
        (type: string, listener: (event: MediaQueryListEvent) => void) => {
          if (type === "change") {
            listeners.delete(listener);
          }
        }
      ),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    return {
      setMatches(nextMatches: boolean) {
        matches = nextMatches;
        const event = { matches: nextMatches } as MediaQueryListEvent;
        listeners.forEach((listener) => listener(event));
      },
    };
  };

  afterEach(() => {
    if (originalMatchMedia) {
      window.matchMedia = originalMatchMedia;
    } else {
      Reflect.deleteProperty(window, "matchMedia");
    }
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
      JSON.stringify(settings),
      calculateRetirementPlan(settings)
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

  it("keeps the desktop comparison view table-based with section dividers", () => {
    const media = mockMutableMatchMedia(false);

    const settings = {
      ...createDefaultSettings(),
      desiredRetirementIncome: 36_000,
    };
    const result = createComparisonResult(
      {
        id: "scenario-1",
        name: "Current model",
        settings,
        createdAt: "",
        updatedAt: "",
      },
      JSON.stringify(settings),
      calculateRetirementPlan(settings, {
        targetWithdrawalMaxIterations: 0,
      })
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
    ).toBeNull();
    expect(document.querySelector(".table-header-shell")).not.toBeNull();
    expect(document.querySelector(".table-body-shell")).not.toBeNull();
    expect(screen.getByText("Headline outcome")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Needs checking")).toBeInTheDocument();
    expect(screen.getByText("£36,000.00/year")).toBeInTheDocument();
    expect(screen.getAllByText("Current model").length).toBeGreaterThan(0);

    act(() => {
      media.setMatches(true);
    });

    expect(
      document.querySelector(".projection-mobile-cards--active")
    ).not.toBeNull();
    expect(document.querySelector(".table-header-shell")).toBeNull();
    expect(document.querySelector(".table-body-shell")).toBeNull();
    expect(screen.queryByText("Headline outcome")).not.toBeInTheDocument();
    expect(screen.getByText("Needs checking")).toBeInTheDocument();
    expect(screen.getByText("£36,000.00/year")).toBeInTheDocument();
  });
});
