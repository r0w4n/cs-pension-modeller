import { createDefaultSettings } from "../settings";
import { buildBridgePlanReview } from "./bridge-plan-review";

describe("bridge plan review", () => {
  it("summarises the target, selected income, and explicit pot instructions", () => {
    const sections = buildBridgePlanReview({
      ...createDefaultSettings(),
      desiredRetirementIncome: 32700,
      requirementAge: 58.25,
      lifeExpectancy: 92,
      showAlpha: true,
      showStatePension: true,
      showSipp: true,
      showCsAvc: false,
      showLisa: false,
      showIsa: true,
      sippCurrentPot: 95000,
      isaCurrentPot: 35000,
      sippWithdrawalStrategy: "use_by_age",
      isaWithdrawalStrategy: "meet_income_target",
      flexibleWithdrawalPriority: ["isa", "sipp", "csAvc", "lisa"],
    });

    const targetSection = sections.find(
      (section) => section.title === "Retirement target"
    );
    const incomeSection = sections.find(
      (section) => section.title === "Pensions and guaranteed income"
    );
    const potsSection = sections.find(
      (section) =>
        section.title === "Bridging money and withdrawal instructions"
    );

    expect(targetSection?.items).toEqual(
      expect.arrayContaining([
        {
          label: "Spending target after estimated tax",
          value: "£2,725 a month (£32,700 a year)",
        },
        { label: "Retirement age", value: "58 years 3 months" },
      ])
    );
    expect(incomeSection?.items).toEqual(
      expect.arrayContaining([
        { label: "Included pensions", value: "Alpha, State Pension" },
        { label: "Other guaranteed income", value: "Not included" },
      ])
    );
    expect(potsSection?.items).toEqual(
      expect.arrayContaining([
        {
          label: "ISA",
          value: "£35,000 current balance; Use to meet income target",
        },
        {
          label: "SIPP",
          value: "£95,000 current balance; Use by age 75",
        },
        { label: "Income-target funding order", value: "ISA" },
      ])
    );
  });

  it("distinguishes an optional income section with no completed income", () => {
    const sections = buildBridgePlanReview({
      ...createDefaultSettings(),
      showAdditionalGuaranteedIncome: true,
      additionalGuaranteedIncomes: [],
    });
    const incomeSection = sections.find(
      (section) => section.title === "Pensions and guaranteed income"
    );

    expect(incomeSection?.items).toContainEqual({
      label: "Other guaranteed income",
      value: "Selected, but no income has been added",
    });
  });
});
