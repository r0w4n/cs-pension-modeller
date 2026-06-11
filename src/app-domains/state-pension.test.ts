import { defaultSettings } from "../settings";
import {
  getStatePensionDateYearRange,
  getStatePensionDefaultDrawDate,
  isStatePensionGrowthField,
} from "./state-pension";

describe("app state pension helpers", () => {
  it("identifies which fields belong to the State Pension growth controls", () => {
    expect(isStatePensionGrowthField("statePensionCpiPercent")).toBe(true);
    expect(isStatePensionGrowthField("statePensionWageGrowthPercent")).toBe(
      true
    );
    expect(isStatePensionGrowthField("inflationRateAnnual")).toBe(false);
  });

  it("derives the default draw date from the provided settings or project defaults", () => {
    expect(getStatePensionDefaultDrawDate()).toBe("2055-06-01");
    expect(
      getStatePensionDefaultDrawDate({
        ...defaultSettings,
        dateOfBirth: "1977-08-06",
      })
    ).toBe("2045-01-06");
  });

  it("only exposes a year range for the State Pension draw date field", () => {
    expect(
      getStatePensionDateYearRange("dateOfBirth", defaultSettings)
    ).toBeNull();
    expect(
      getStatePensionDateYearRange("statePensionDrawDate", {
        ...defaultSettings,
        dateOfBirth: "1977-08-06",
      })
    ).toEqual({
      min: 2045,
      max: 2075,
    });
  });
});
