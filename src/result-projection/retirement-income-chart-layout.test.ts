import type { RetirementIncomePoint } from "./retirement-income-chart-model";
import {
  bringActiveMarkerToFront,
  createBuildUpWindow,
  createChartIncomeSeriesDefinitions,
  createChartMaxAge,
  createStackedIncomeSeries,
  createVisibleChartData,
  createWholeYearTicks,
  getChartIncomeValue,
  getRetirementIncomeEventsForDate,
  hasActiveIncome,
} from "./retirement-income-chart-layout";

const basePoint: RetirementIncomePoint = {
  date: "2045-01-01",
  age: 60,
  targetIncomeAnnual: 30_000,
  isaIncomeAnnual: 0,
  lisaIncomeAnnual: 0,
  sippIncomeAnnual: 0,
  csAvcIncomeAnnual: 0,
  alphaIncomeAnnual: 0,
  classicIncomeAnnual: 0,
  classicPlusIncomeAnnual: 0,
  nuvosIncomeAnnual: 0,
  premiumIncomeAnnual: 0,
  additionalGuaranteedIncomeAnnual: 0,
  partialRetirementIncomeAnnual: 0,
  statePensionIncomeAnnual: 0,
  totalIncomeAnnual: 0,
  assessedIncomeAnnual: 0,
  shortfallAnnual: 30_000,
  guaranteedNetIncomeAnnual: 0,
  unavoidableSurplusAnnual: 0,
  avoidableFlexibleSurplusAnnual: 0,
  flexibleWithdrawalInsights: [],
};

describe("retirement income chart layout", () => {
  it("creates a bounded chart domain from data and active milestones", () => {
    expect(
      createChartMaxAge({
        dataMaxAge: 79.25,
        fallbackMaxAge: 80,
        milestoneAges: [67, 80.5, null],
      })
    ).toBe(81);

    expect(
      createBuildUpWindow({
        buildUpEndAge: 60,
        chartMaxAge: 81,
        dataMinAge: 40,
        earliestMilestoneAge: 57,
      })
    ).toEqual({ xDomainMin: 57, xDomainMax: 81 });
    expect(createWholeYearTicks(59.5, 62.25)).toEqual([60, 61, 62]);
  });

  it("uses the post-milestone value at an inserted income boundary", () => {
    const data = [
      basePoint,
      {
        ...basePoint,
        date: "2045-04-01",
        age: 60.25,
        alphaIncomeAnnual: 12_000,
      },
    ];

    const visibleData = createVisibleChartData(data, 60, 60.25, [
      { key: "alphaStartAge", age: 60.1 },
    ]);

    expect(visibleData.map((point) => point.age)).toEqual([60, 60.1, 60.25]);
    expect(visibleData[1]?.alphaIncomeAnnual).toBe(12_000);
  });

  it("normalises additional income streams into independently stacked series", () => {
    const data = [
      {
        ...basePoint,
        additionalGuaranteedIncomeAnnual: 3_000,
        additionalGuaranteedIncomeStreams: [
          { id: "rental", label: "Rental income", annualAmount: 3_000 },
        ],
      },
      {
        ...basePoint,
        age: 61,
        isaIncomeAnnual: 4_000,
        additionalGuaranteedIncomeAnnual: 3_000,
        additionalGuaranteedIncomeStreams: [
          { id: "rental", label: "Rental income", annualAmount: 3_000 },
        ],
      },
    ];
    const definitions = createChartIncomeSeriesDefinitions(
      ["isaIncomeAnnual"],
      data
    );
    const rentalSeries = definitions.find(
      (series) => series.key === "additionalGuaranteedIncome:rental"
    );

    expect(rentalSeries?.label).toBe("Rental income");
    expect(rentalSeries && getChartIncomeValue(data[0], rentalSeries)).toBe(
      3_000
    );
    expect(rentalSeries && hasActiveIncome(data, rentalSeries)).toBe(true);
    expect(
      createStackedIncomeSeries(definitions, data).map(({ key }) => key)
    ).toEqual(["additionalGuaranteedIncome:rental", "isaIncomeAnnual"]);
  });

  it("places the active milestone last so it receives pointer priority", () => {
    const markers = [
      {
        key: "retirementAge" as const,
        age: 60,
        label: "Retirement",
        shortLabel: "Retire",
        colour: "#000",
        editable: true,
      },
      {
        key: "statePensionAge" as const,
        age: 67,
        label: "State Pension",
        shortLabel: "State",
        colour: "#111",
        editable: true,
      },
    ];

    expect(
      bringActiveMarkerToFront(markers, "retirementAge").map(({ key }) => key)
    ).toEqual(["statePensionAge", "retirementAge"]);
  });

  it("groups inspection events by calendar month", () => {
    const events = [
      {
        key: "retirement",
        label: "You retire",
        date: "2045-06-20",
        timelineValue: 2045.47,
        owner: "you" as const,
      },
      {
        key: "state",
        label: "Partner's State Pension starts",
        date: "2045-07-01",
        timelineValue: 2045.5,
        owner: "partner" as const,
      },
    ];

    expect(
      getRetirementIncomeEventsForDate(events, "2045-06-01").map(
        ({ key }) => key
      )
    ).toEqual(["retirement"]);
  });
});
