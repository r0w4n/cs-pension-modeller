import {
  JOURNEY_DEFINITIONS,
  OPTIONAL_SECTION_TOGGLES,
  applyBridgeJourneyDefaults,
  applySimpleJourneyAssumptions,
  applySimpleJourneyDefaults,
  mergeSimpleJourneySettings,
  type JourneyStepDefinition,
} from "./journeys";
import type { FieldDefinition } from "../fieldDefinitions";
import { knowledgeLinks } from "../knowledgeLinks";
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

function getJourneyStep(
  journeyId: string,
  stepId: string
): JourneyStepDefinition | undefined {
  const journey = JOURNEY_DEFINITIONS.find((entry) => entry.id === journeyId);

  return journey?.steps.find((entry) => entry.id === stepId);
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
      ["expert-journey", "expert-alpha"],
    ] as const) {
      const epaFields = getJourneyStepFieldIds(journeyId, stepId);

      for (const fieldId of alphaEpaFieldIds) {
        expect(epaFields).toContain(fieldId);
      }
    }

    const simpleEpaStep = getJourneyStep(
      "simple-early-retirement",
      "alpha-epa"
    );

    if (!simpleEpaStep || simpleEpaStep.kind !== "fields") {
      throw new Error("Expected the simple EPA step to contain fields");
    }
    expect(simpleEpaStep.optionalQuestion?.setting.id).toBe("alphaEpaEnabled");
    expect(simpleEpaStep.fieldIds).toEqual([
      "alphaEpaYearsBeforeNpa",
      "alphaEpaStartDate",
      "alphaEpaEndDate",
    ]);

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

  it("lets expert mode disable Alpha pension modelling", () => {
    const expertJourney = JOURNEY_DEFINITIONS.find(
      (journey) => journey.id === "expert-journey"
    );
    const optionalSectionsStep = expertJourney?.steps.find(
      (step) => step.id === "optional-sections"
    );

    expect(optionalSectionsStep?.kind).toBe("optional-sections");
    if (optionalSectionsStep?.kind !== "optional-sections") {
      throw new Error("Expected the expert optional sections step");
    }
    expect(optionalSectionsStep.toggleKeys).toContain("showAlpha");

    const settingsWithoutAlpha = {
      ...defaultSettings,
      showAlpha: false,
    };
    const visibleStepIds = expertJourney?.steps
      .filter((step) => !step.visible || step.visible(settingsWithoutAlpha))
      .map((step) => step.id);

    expect(visibleStepIds).not.toContain("expert-alpha");
  });

  it("keeps Alpha fixed and gives other pension choices simple-specific copy", () => {
    const simpleJourney = JOURNEY_DEFINITIONS.find(
      (journey) => journey.id === "simple-early-retirement"
    );
    const pensionChoicesStep = simpleJourney?.steps.find(
      (step) => step.id === "include"
    );

    expect(pensionChoicesStep?.kind).toBe("optional-sections");
    if (pensionChoicesStep?.kind !== "optional-sections") {
      throw new Error("Expected the simple pension choices step");
    }

    expect(pensionChoicesStep.toggleKeys).toEqual([
      "showClassic",
      "showClassicPlus",
      "showNuvos",
      "showPremium",
      "showCsAvc",
    ]);
    expect(
      pensionChoicesStep.toggleKeys?.map(
        (key) => pensionChoicesStep.toggleCopy?.[key]?.label
      )
    ).toEqual([
      "classic pension",
      "classic plus pension",
      "nuvos pension",
      "premium pension",
      "Civil Service AVC savings",
    ]);

    const stepIds = simpleJourney?.steps.map((step) => step.id) ?? [];
    expect(stepIds.indexOf("alpha-epa")).toBeLessThan(
      stepIds.indexOf("include")
    );
    expect(stepIds.indexOf("include")).toBeLessThan(stepIds.indexOf("classic"));
    expect(stepIds.indexOf("cs-avc")).toBeLessThan(
      stepIds.indexOf("additional-income")
    );
  });

  it("forces Alpha on throughout the simple journey only", () => {
    const settingsWithoutAlpha = {
      ...defaultSettings,
      showAlpha: false,
    };

    expect(applySimpleJourneyDefaults(settingsWithoutAlpha).showAlpha).toBe(
      true
    );
    expect(applySimpleJourneyAssumptions(settingsWithoutAlpha).showAlpha).toBe(
      true
    );
    expect(
      mergeSimpleJourneySettings(settingsWithoutAlpha, settingsWithoutAlpha)
        .showAlpha
    ).toBe(true);
    expect(applyBridgeJourneyDefaults(settingsWithoutAlpha).showAlpha).toBe(
      false
    );
  });

  it("guides simple journey users to copy the three Alpha statement figures", () => {
    const simpleJourney = JOURNEY_DEFINITIONS.find(
      (journey) => journey.id === "simple-early-retirement"
    );
    const alphaStep = simpleJourney?.steps.find((step) => step.id === "alpha");

    expect(alphaStep?.kind).toBe("fields");
    if (alphaStep?.kind !== "fields") {
      throw new Error("Expected the simple Alpha details step");
    }

    expect(alphaStep.title).toBe("Add your Alpha pension details");
    expect(alphaStep.fieldLabels).toEqual({
      alphaPensionAbsDate: "What year is your latest pension statement?",
      accruedPensionAtLastAbs: "Yearly Alpha pension built up so far (£)",
      pensionableEarnings: "Yearly pay used to build your Alpha pension (£)",
    });
    expect(alphaStep.fieldDescriptions?.accruedPensionAtLastAbs).toContain(
      "not the value of a pension pot"
    );
    expect(alphaStep.fieldDescriptions?.pensionableEarnings).toContain(
      "pensionable earnings"
    );
    expect(alphaStep.hideFieldInfoLinks).toBe(true);
    expect(alphaStep.supportLink?.href).toBe(
      knowledgeLinks.annualBenefitStatement
    );
  });

  it("asks for retirement age after the income target and before Alpha details", () => {
    const simpleJourney = JOURNEY_DEFINITIONS.find(
      (journey) => journey.id === "simple-early-retirement"
    );
    const stepIds = simpleJourney?.steps.map((step) => step.id) ?? [];

    expect(
      getJourneyStepFieldIds("simple-early-retirement", "retirement-age")
    ).toEqual(new Set(["requirementAge"]));
    expect(stepIds.indexOf("target")).toBeLessThan(
      stepIds.indexOf("retirement-age")
    );
    expect(stepIds.indexOf("retirement-age")).toBeLessThan(
      stepIds.indexOf("alpha")
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
