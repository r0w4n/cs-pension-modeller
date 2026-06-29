import { JOURNEY_DEFINITIONS, applySimpleJourneyAssumptions } from "./journeys";
import type { FieldDefinition } from "../fieldDefinitions";
import { defaultSettings } from "../settings";

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

  it("includes Alpha EPA controls in the simple journey", () => {
    const alphaEpaFieldIds = [
      "alphaEpaEnabled",
      "alphaEpaYearsBeforeNpa",
      "alphaEpaStartDate",
      "alphaEpaEndDate",
    ] satisfies FieldDefinition["id"][];

    for (const fieldId of alphaEpaFieldIds) {
      expect(getJourneyFieldIds("simple-early-retirement")).toContain(fieldId);
    }
  });

  it("keeps EPA enabled when applying simple journey assumptions", () => {
    expect(
      applySimpleJourneyAssumptions({
        ...defaultSettings,
        alphaEpaEnabled: true,
      })
    ).toEqual(
      expect.objectContaining({
        alphaEpaEnabled: true,
      })
    );
  });
});
