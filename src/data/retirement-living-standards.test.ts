import {
  ONE_PERSON_RETIREMENT_LIVING_STANDARDS,
  TWO_PERSON_RETIREMENT_LIVING_STANDARDS,
} from "./retirement-living-standards";

describe("one-person Retirement Living Standards", () => {
  it("stores the published annual expenditure benchmarks with provenance", () => {
    expect(ONE_PERSON_RETIREMENT_LIVING_STANDARDS).toMatchObject({
      source: {
        publisher: "Pensions UK",
        publicationDate: "2026-06-03",
      },
      annualExpenditure: [
        { value: 13_900, label: "Minimum £13,900" },
        { value: 32_700, label: "Moderate £32,700" },
        { value: 45_400, label: "Comfortable £45,400" },
      ],
    });
  });
});

describe("two-person Retirement Living Standards", () => {
  it("stores the published annual household expenditure benchmarks with provenance", () => {
    expect(TWO_PERSON_RETIREMENT_LIVING_STANDARDS).toMatchObject({
      source: {
        publisher: "Pensions UK",
        publicationDate: "2026-06-03",
      },
      annualExpenditure: [
        { value: 22_500, label: "Minimum £22,500" },
        { value: 45_400, label: "Moderate £45,400" },
        { value: 62_700, label: "Comfortable £62,700" },
      ],
    });
  });
});
