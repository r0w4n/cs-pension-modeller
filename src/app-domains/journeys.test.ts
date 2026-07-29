import {
  JOURNEY_DEFINITIONS,
  OPTIONAL_SECTION_TOGGLES,
  applyBridgeJourneyDefaults,
  applySimpleJourneyAssumptions,
  mergeSimpleJourneySettings,
} from "./journeys";
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

function getJourneyStepFieldIds(journeyId: string, stepId: string) {
  const journey = JOURNEY_DEFINITIONS.find((entry) => entry.id === journeyId);
  const step = journey?.steps.find((entry) => entry.id === stepId);

  return new Set(step?.kind === "fields" ? step.fieldIds : []);
}

function getJourneyStepIds(journeyId: string) {
  const journey = JOURNEY_DEFINITIONS.find((entry) => entry.id === journeyId);

  return new Set(journey?.steps.map((step) => step.id) ?? []);
}

describe("journey definitions", () => {
  it("keeps the internal calculation start date out of every journey", () => {
    for (const journey of JOURNEY_DEFINITIONS) {
      expect(getJourneyFieldIds(journey.id)).not.toContain("startDate");
    }
  });

  it("gives the default expert journey a dedicated retirement target step", () => {
    const journey = JOURNEY_DEFINITIONS.find(
      (entry) => entry.id === "expert-journey"
    );
    const visibleSteps =
      journey?.steps.filter(
        (step) => !step.visible || step.visible(defaultSettings)
      ) ?? [];

    expect(visibleSteps.map((step) => step.id)).toEqual([
      "optional-sections",
      "expert-personal",
      "expert-retirement-target",
      "expert-inflation",
      "expert-state",
      "expert-alpha",
      "expert-additional-income",
      "expert-sipp",
      "expert-isa",
      "answer",
    ]);
    expect(getJourneyStepFieldIds("expert-journey", "expert-personal")).toEqual(
      new Set(["dateOfBirth", "lifeExpectancy"])
    );
    expect([
      ...getJourneyStepFieldIds("expert-journey", "expert-retirement-target"),
    ]).toEqual(["desiredRetirementIncome", "requirementAge"]);
  });

  it("keeps flexible withdrawal strategy controls exclusive to expert mode", () => {
    const strategyFieldIds = [
      "sippWithdrawalStrategy",
      "csAvcWithdrawalStrategy",
      "isaWithdrawalStrategy",
      "lisaWithdrawalStrategy",
    ] satisfies FieldDefinition["id"][];

    for (const fieldId of strategyFieldIds) {
      expect(getJourneyFieldIds("expert-journey")).toContain(fieldId);
      expect(getJourneyFieldIds("early-retirement-bridge")).not.toContain(
        fieldId
      );
      expect(getJourneyFieldIds("simple-early-retirement")).not.toContain(
        fieldId
      );
    }
  });

  it("keeps target-based drawdown out of simplified projections", () => {
    const settings = applySimpleJourneyAssumptions({
      ...defaultSettings,
      sippWithdrawalStrategy: "meet_income_target",
      csAvcWithdrawalStrategy: "meet_income_target",
      isaWithdrawalStrategy: "meet_income_target",
      lisaWithdrawalStrategy: "meet_income_target",
    });

    expect(settings.sippWithdrawalStrategy).toBe("use_by_age");
    expect(settings.csAvcWithdrawalStrategy).toBe("use_by_age");
    expect(settings.isaWithdrawalStrategy).toBe("use_by_age");
    expect(settings.lisaWithdrawalStrategy).toBe("use_by_age");
  });

  it("keeps target-based drawdown out of bridge projections", () => {
    const settings = applyBridgeJourneyDefaults({
      ...defaultSettings,
      sippWithdrawalStrategy: "meet_income_target",
      csAvcWithdrawalStrategy: "meet_income_target",
      isaWithdrawalStrategy: "meet_income_target",
      lisaWithdrawalStrategy: "meet_income_target",
    });

    expect(settings.sippWithdrawalStrategy).toBe("use_by_age");
    expect(settings.csAvcWithdrawalStrategy).toBe("use_by_age");
    expect(settings.isaWithdrawalStrategy).toBe("use_by_age");
    expect(settings.lisaWithdrawalStrategy).toBe("use_by_age");
  });

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

  it("includes Alpha EPA controls in journey-specific places", () => {
    const alphaEpaFieldIds = [
      "alphaEpaEnabled",
      "alphaEpaYearsBeforeNpa",
      "alphaEpaStartDate",
      "alphaEpaEndDate",
    ] satisfies FieldDefinition["id"][];

    for (const [journeyId, stepId] of [
      ["early-retirement-bridge", "alpha"],
      ["simple-early-retirement", "alpha-epa"],
      ["expert-journey", "expert-alpha"],
    ] as const) {
      const epaFields = getJourneyStepFieldIds(journeyId, stepId);

      for (const fieldId of alphaEpaFieldIds) {
        expect(epaFields).toContain(fieldId);
      }
    }

    expect(
      getJourneyStepFieldIds("simple-early-retirement", "alpha-options")
    ).not.toContain("alphaEpaYearsBeforeNpa");
  });

  it("includes LISA controls in the early retirement bridging pots step", () => {
    const bridgePotFields = getJourneyStepFieldIds(
      "early-retirement-bridge",
      "pots"
    );

    expect([...bridgePotFields]).toEqual(
      expect.arrayContaining([
        "lisaCurrentPot",
        "lisaMonthlyContribution",
        "lisaDrawAge",
        "lisaRealInterestPercent",
      ])
    );
  });

  it("keeps EPA out of the optional sections page", () => {
    expect(OPTIONAL_SECTION_TOGGLES.map((toggle) => toggle.key)).not.toContain(
      "alphaEpaEnabled"
    );
  });

  it("lets expert mode toggle additional guaranteed income", () => {
    expect(OPTIONAL_SECTION_TOGGLES.map((toggle) => toggle.key)).toContain(
      "showAdditionalGuaranteedIncome"
    );
  });

  it("keeps additional guaranteed income in the simple and bridge journeys", () => {
    expect(getJourneyStepIds("early-retirement-bridge")).toContain(
      "additional-income"
    );
    expect(getJourneyStepIds("simple-early-retirement")).toContain(
      "additional-income"
    );
  });

  it("keeps the simple CS AVC step separate from personal pots", () => {
    expect([
      ...getJourneyStepFieldIds("simple-early-retirement", "cs-avc"),
    ]).toEqual([
      "csAvcCurrentPot",
      "csAvcMonthlyContribution",
      "csAvcDrawAge",
      "csAvcHasProtectedPensionAge",
      "csAvcRealInterestPercent",
    ]);
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

  it("uses flat spending for simple journey calculations", () => {
    expect(
      applySimpleJourneyAssumptions({
        ...defaultSettings,
        spendingStrategyType: "SPENDING_SMILE",
      }).spendingStrategyType
    ).toBe("FLAT");
  });

  it("keeps an enabled CS AVC visible in simple journey assumptions", () => {
    expect(
      applySimpleJourneyAssumptions({
        ...defaultSettings,
        showCsAvc: true,
        showSipp: true,
        showIsa: true,
        showLisa: true,
      })
    ).toEqual(
      expect.objectContaining({
        showCsAvc: true,
        showSipp: false,
        showIsa: false,
        showLisa: false,
      })
    );
  });

  it("applies a CS AVC toggle while preserving hidden simple journey pots", () => {
    expect(
      mergeSimpleJourneySettings(
        {
          ...defaultSettings,
          showCsAvc: false,
          showSipp: true,
          showIsa: true,
          showLisa: true,
        },
        {
          ...defaultSettings,
          showCsAvc: true,
          showSipp: false,
          showIsa: false,
          showLisa: false,
        }
      )
    ).toEqual(
      expect.objectContaining({
        showCsAvc: true,
        showSipp: true,
        showIsa: true,
        showLisa: true,
      })
    );
  });
});
