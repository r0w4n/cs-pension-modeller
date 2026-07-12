import { act, fireEvent, render, screen } from "@testing-library/react";
import {
  ProjectionTableFrame,
  ProjectionTableSection,
} from "./projection-table";
import { createDefaultSettings } from "../settings";
import type { ProjectionRow } from "../projection";

const rows: ProjectionRow[] = [
  {
    date: "2026-01-01",
    age: 40,
    ageMonths: 0,
    milestones: ["Start"],
    milestoneDates: ["2026-01-01"],
    monthlyAddedPension: 0,
    lumpSumAddedPension: 0,
    annualStandardAlphaPension: 1000,
    annualEpaAlphaPension: 0,
    annualAccruedAlphaPension: 1000,
    annualAlphaPensionIncludingReduction: 1000,
    monthlyAlphaPensionGross: 80,
    annualClassicPension: 0,
    classicAutomaticLumpSum: 0,
    annualClassicPensionIncludingReduction: 0,
    classicAutomaticLumpSumIncludingReduction: 0,
    monthlyClassicPensionGross: 0,
    annualClassicPlusPension: 0,
    classicPlusAutomaticLumpSum: 0,
    annualClassicPlusPensionIncludingReduction: 0,
    classicPlusAutomaticLumpSumIncludingReduction: 0,
    monthlyClassicPlusPensionGross: 0,
    annualNuvosPension: 0,
    annualNuvosPensionIncludingReduction: 0,
    monthlyNuvosPensionGross: 0,
    annualPremiumPension: 0,
    annualPremiumPensionIncludingReduction: 0,
    monthlyPremiumPensionGross: 0,
    monthlyStatePension: 0,
    monthlyAdditionalGuaranteedIncomeGross: 0,
    monthlyAdditionalGuaranteedIncomeTaxable: 0,
    sippPot: 0,
    monthlySippPension: 0,
    isaPot: 0,
    monthlyIsaPension: 0,
    lisaPot: 0,
    monthlyLisaPension: 0,
    totalMonthlyIncomeBeforeTax: 80,
    monthlyIncomeTax: 0,
    totalMonthlyNetIncome: 80,
  },
];

describe("projection-table module", () => {
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

  it("defers table rendering then displays controls", () => {
    vi.useFakeTimers();

    render(
      <ProjectionTableSection rows={rows} settings={createDefaultSettings()} />
    );

    expect(
      screen.getByText("Preparing projection table...")
    ).toBeInTheDocument();

    act(() => {
      vi.runAllTimers();
    });

    expect(
      screen.getByRole("button", { name: "Show all rows" })
    ).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("toggles milestone filter", () => {
    vi.useFakeTimers();
    render(
      <ProjectionTableSection rows={rows} settings={createDefaultSettings()} />
    );

    act(() => {
      vi.runAllTimers();
    });

    const button = screen.getByRole("button", { name: "Show all rows" });
    fireEvent.click(button);
    expect(
      screen.getByRole("button", { name: "Only show milestone rows" })
    ).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("renders mobile cards when the 640px breakpoint matches", () => {
    mockMatchMedia(true);

    render(
      <ProjectionTableFrame
        columns={[
          { key: "date", label: "Date", width: "7rem" },
          { key: "income", label: "Income", width: "7rem" },
        ]}
        rows={[{ id: "row-1", date: "2026-01-01", income: "100" }]}
        emptyMessage="No rows"
        getRowKey={(row) => row.id}
        renderCells={(row) => [row.date, row.income]}
      />
    );

    expect(screen.getByText("Date")).toBeInTheDocument();
    expect(screen.getByText("Income")).toBeInTheDocument();
    expect(
      document.querySelector(".projection-mobile-cards--active")
    ).not.toBeNull();
    expect(document.querySelector(".table-header-shell")).toBeNull();
    expect(document.querySelector(".table-body-shell")).toBeNull();
  });

  it("renders desktop table when the 640px breakpoint does not match", () => {
    mockMatchMedia(false);

    render(
      <ProjectionTableFrame
        columns={[
          { key: "date", label: "Date", width: "7rem" },
          { key: "income", label: "Income", width: "7rem" },
        ]}
        rows={[{ id: "row-1", date: "2026-01-01", income: "100" }]}
        emptyMessage="No rows"
        getRowKey={(row) => row.id}
        renderCells={(row) => [row.date, row.income]}
      />
    );

    expect(
      document.querySelector(".projection-mobile-cards--active")
    ).toBeNull();
    expect(document.querySelector(".table-header-shell")).not.toBeNull();
    expect(document.querySelector(".table-body-shell")).not.toBeNull();
  });
});
