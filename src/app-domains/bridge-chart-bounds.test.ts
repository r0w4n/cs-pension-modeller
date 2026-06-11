import {
  getEarliestSippChartStartAge,
  getPartialRetirementStartAgeBounds,
  getPensionStartAgeBounds,
  getSippChartAccessAgeBounds,
  getStatePensionAgeBounds,
  getUseByAgeBounds,
} from "./bridge-chart-bounds";

describe("bridge-chart-bounds", () => {
  it("uses the later of SIPP access age and State Pension age for chart SIPP starts", () => {
    expect(
      getEarliestSippChartStartAge({
        defaultStatePensionAge: 68,
        minimumSippAccessAge: 57,
      })
    ).toBe(68);

    expect(
      getEarliestSippChartStartAge({
        defaultStatePensionAge: 55,
        minimumSippAccessAge: 57,
      })
    ).toBe(57);
  });

  it("bounds chart SIPP access age between earliest chart start and life expectancy", () => {
    expect(
      getSippChartAccessAgeBounds({
        defaultStatePensionAge: 68,
        lifeExpectancy: 85,
        minimumSippAccessAge: 57,
      })
    ).toEqual({ min: 68, max: 85 });
  });

  it("keeps partial retirement start before full retirement", () => {
    expect(
      getPartialRetirementStartAgeBounds({
        currentPlanningAge: 40,
        lifeExpectancy: 85,
        retirementAge: 60,
      })
    ).toEqual({ min: 40, max: 59.75 });
  });

  it("bounds State Pension age between default entitlement and life expectancy", () => {
    expect(
      getStatePensionAgeBounds({
        defaultStatePensionAge: 67,
        lifeExpectancy: 85,
      })
    ).toEqual({ min: 67, max: 85 });
  });

  it("bounds pension start ages after planning, retirement, leave, and access ages", () => {
    expect(
      getPensionStartAgeBounds({
        currentPlanningAge: 45,
        leaveAge: 62,
        minimumPensionAccessAge: 57,
        retirementAge: 60,
      })
    ).toEqual({ min: 62, max: 70 });
  });

  it("keeps use-by ages at least a quarter year after draw age", () => {
    expect(
      getUseByAgeBounds({
        drawAge: 60,
        lifeExpectancy: 85,
      })
    ).toEqual({ min: 60.25, max: 85 });
  });
});
