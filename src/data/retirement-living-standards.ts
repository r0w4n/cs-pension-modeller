/**
 * Annual expenditure reference values for a two-person household.
 *
 * These are spending benchmarks, not income requirements. Housing costs are
 * excluded by the publisher, so they need adjusting for individual plans.
 */
export const TWO_PERSON_RETIREMENT_LIVING_STANDARDS = {
  source: {
    publisher: "Pensions UK",
    title: "Retirement Living Standards",
    url: "https://www.retirementlivingstandards.org.uk/",
    publicationDate: "2026-06-03",
    retrieved: "2026-08-29",
  },
  annualExpenditure: [
    { value: 22_500, label: "Minimum £22,500" },
    { value: 45_400, label: "Moderate £45,400" },
    { value: 62_700, label: "Comfortable £62,700" },
  ],
} as const;
