const RETIREMENT_LIVING_STANDARDS_SOURCE = {
  publisher: "Pensions UK",
  title: "Retirement Living Standards",
  url: "https://www.retirementlivingstandards.org.uk/",
  publicationDate: "2026-06-03",
  retrieved: "2026-08-29",
} as const;

/**
 * Annual expenditure reference values for a one-person household.
 *
 * These are spending benchmarks, not income requirements. Housing costs are
 * excluded by the publisher, so they need adjusting for individual plans.
 */
export const ONE_PERSON_RETIREMENT_LIVING_STANDARDS = {
  source: RETIREMENT_LIVING_STANDARDS_SOURCE,
  annualExpenditure: [
    { value: 13_900, label: "Minimum £13,900" },
    { value: 32_700, label: "Moderate £32,700" },
    { value: 45_400, label: "Comfortable £45,400" },
  ],
} as const;

/**
 * Annual expenditure reference values for a two-person household.
 *
 * These are spending benchmarks, not income requirements. Housing costs are
 * excluded by the publisher, so they need adjusting for individual plans.
 */
export const TWO_PERSON_RETIREMENT_LIVING_STANDARDS = {
  source: RETIREMENT_LIVING_STANDARDS_SOURCE,
  annualExpenditure: [
    { value: 22_500, label: "Minimum £22,500" },
    { value: 45_400, label: "Moderate £45,400" },
    { value: 62_700, label: "Comfortable £62,700" },
  ],
} as const;
