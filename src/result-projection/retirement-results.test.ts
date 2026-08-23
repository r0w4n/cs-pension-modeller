import { describe, expect, it } from "vitest";
import { calculateRetirementPlan } from "../calculation/retirement-plan";
import { createDefaultSettings } from "../settings";
import {
  projectRetirementIncomeDisplay,
  projectRetirementPlanControls,
  projectRetirementPlanResult,
} from "./retirement-results";

describe("projectRetirementPlanResult", () => {
  it("deterministically projects presentation data from a canonical result", () => {
    const settings = createDefaultSettings();
    const result = calculateRetirementPlan(settings);

    const firstProjection = projectRetirementPlanResult(result);
    const secondProjection = projectRetirementPlanResult(result);

    expect(firstProjection).toEqual(secondProjection);
    expect(firstProjection.retirementIncomeSeries.length).toBeGreaterThan(0);
    expect(firstProjection.targetBasedWithdrawalPreviews).toBe(
      result.targetBasedWithdrawalPreviews
    );
    expect(result.settings).toBe(settings);
    expect(projectRetirementPlanControls(settings)).toEqual(
      projectRetirementPlanControls(settings)
    );
    expect(projectRetirementIncomeDisplay(result, "annual")).toEqual(
      projectRetirementIncomeDisplay(result, "annual")
    );
  });
});
