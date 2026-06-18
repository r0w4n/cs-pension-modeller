import { JOURNEY_DEFINITIONS } from "./journeys";
import type { FieldDefinition } from "../fieldDefinitions";

function getJourneyFieldIds(journeyId: string) {
  const journey = JOURNEY_DEFINITIONS.find((entry) => entry.id === journeyId);

  return new Set(
    journey?.steps.flatMap((step) =>
      step.kind === "fields" ? step.fieldIds : []
    ) ?? []
  );
}

describe("journey definitions", () => {
  it("keeps the Alpha pay-rise control in the expert journey only", () => {
    const alphaPayRiseFieldIds = [
      "alphaPayRisePercent",
    ] satisfies FieldDefinition["id"][];

    for (const fieldId of alphaPayRiseFieldIds) {
      expect(getJourneyFieldIds("expert-journey")).toContain(fieldId);
      expect(getJourneyFieldIds("early-retirement-bridge")).not.toContain(
        fieldId
      );
      expect(getJourneyFieldIds("simple-early-retirement")).not.toContain(
        fieldId
      );
    }
  });

  it("uses expert journey sections for the optimiser journey without optimiser-managed fields", () => {
    const optimiserFieldIds = getJourneyFieldIds("optimiser-journey");

    expect(optimiserFieldIds).toContain("dateOfBirth");
    expect(optimiserFieldIds).toContain("accruedPensionAtLastAbs");
    expect(optimiserFieldIds).toContain("sippCurrentPot");
    expect(optimiserFieldIds).toContain("isaCurrentPot");

    expect(optimiserFieldIds).not.toContain("requirementAge");
    expect(optimiserFieldIds).not.toContain("desiredRetirementIncome");
    expect(optimiserFieldIds).not.toContain("lifeExpectancy");
    expect(optimiserFieldIds).not.toContain("alphaPensionLeaveAge");
    expect(optimiserFieldIds).not.toContain("alphaPensionDrawAge");
    expect(optimiserFieldIds).not.toContain("alphaAddedPensionMonthly");
    expect(optimiserFieldIds).not.toContain("sippMonthlyContribution");
    expect(optimiserFieldIds).not.toContain("isaMonthlyContribution");
    expect(optimiserFieldIds).not.toContain("partialRetirementStartAge");
    expect(optimiserFieldIds).not.toContain("partialRetirementWorkPercent");
  });

  it("keeps the optimiser search and results in one final journey step", () => {
    const optimiserJourney = JOURNEY_DEFINITIONS.find(
      (entry) => entry.id === "optimiser-journey"
    );

    expect(optimiserJourney?.steps.at(-1)?.kind).toBe("optimiser-answer");
    expect(
      optimiserJourney?.steps.filter((step) => step.kind === "optimiser-answer")
    ).toHaveLength(1);
  });
});
