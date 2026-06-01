import {
  calculateDateAge,
  normalizePersonalDateSetting,
  validatePersonalDetailsRules,
} from "./personal-details";
import { normalizeIsoDate } from "../settings-shared/date";

describe("personal-details settings module", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-25T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calculates age from dates", () => {
    expect(calculateDateAge("1987-06-15", "2026-06-15")).toBeCloseTo(39, 2);
  });

  it("normalizes personal date fields", () => {
    expect(
      normalizePersonalDateSetting("startDate", "bad", normalizeIsoDate)
    ).toBe("2026-04-25");
    expect(
      normalizePersonalDateSetting("dateOfBirth", "bad", normalizeIsoDate)
    ).toBe("1987-06-01");
  });

  it("validates personal details dates", () => {
    const issues = validatePersonalDetailsRules(
      { dateOfBirth: "2030-01-01", startDate: "2026-01-01" },
      "2025-01-01"
    );

    expect(issues.map((issue) => issue.field)).toEqual([
      "dateOfBirth",
      "startDate",
    ]);
  });
});
