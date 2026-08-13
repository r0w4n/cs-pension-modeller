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
      "expert-sipp",
      "expert-isa",
      "expert-tax",
      "answer",
    ]);
    expect(getJourneyStepFieldIds("expert-journey", "expert-personal")).toEqual(
      new Set(["dateOfBirth", "lifeExpectancy"])
    );
    expect([
      ...getJourneyStepFieldIds("expert-journey", "expert-retirement-target"),
    ]).toEqual([
      "desiredRetirementIncome",
      "requirementAge",
      "retirementIncomeTargetBasis",
    ]);
  });

  it("keeps the SIPP tax-free withdrawal assumption with the SIPP inputs", () => {
    expect(getJourneyStepFieldIds("expert-journey", "expert-sipp")).toContain(
      "taxSippTaxFreeWithdrawalPercent"
    );
    expect(
      getJourneyStepFieldIds("expert-journey", "expert-tax")
    ).not.toContain("taxSippTaxFreeWithdrawalPercent");
  });

  it("lets guided journeys select the tax regime beside their after-tax target", () => {
    expect(
      getJourneyStepFieldIds("early-retirement-bridge", "target")
    ).toContain("taxRegime");
    expect(
      getJourneyStepFieldIds("simple-early-retirement", "target")
    ).toContain("taxRegime");
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

  it("keeps Alpha EPA controls out of the simplified journey", () => {
    const alphaEpaFieldIds = [
      "alphaEpaEnabled",
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

    expect(
      getJourneyStep("simple-early-retirement", "alpha-epa")
    ).toBeUndefined();
    expect(getJourneyFieldIds("simple-early-retirement")).not.toContain(
      "alphaEpaEnabled"
    );

    for (const legacyFieldId of [
      "alphaEpaYearsBeforeNpa",
      "alphaEpaStartDate",
      "alphaEpaEndDate",
    ] as const) {
      expect(getJourneyFieldIds("simple-early-retirement")).not.toContain(
        legacyFieldId
      );
    }
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
        "taxSippTaxFreeWithdrawalPercent",
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
    expect(stepIds).not.toContain("alpha-epa");
    expect(stepIds).not.toContain("additional-income");
    expect(stepIds).not.toContain("partial-retirement");
    expect(stepIds.indexOf("include")).toBeLessThan(stepIds.indexOf("classic"));
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

  it("uses the simplified results presentation", () => {
    const simpleJourney = JOURNEY_DEFINITIONS.find(
      (journey) => journey.id === "simple-early-retirement"
    );
    const answerStep = simpleJourney?.steps.find(
      (step) => step.id === "answer"
    );

    expect(answerStep?.kind).toBe("bridge-answer");
    expect(answerStep?.resultsPresentation).toBe("simple");
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

  it("asks whether the simple user knows their State Pension forecast", () => {
    const simpleJourney = JOURNEY_DEFINITIONS.find(
      (journey) => journey.id === "simple-early-retirement"
    );
    const step = simpleJourney?.steps.find(
      (candidate) => candidate.id === "state-pension-forecast"
    );
    const stepIds = simpleJourney?.steps.map((candidate) => candidate.id) ?? [];

    expect(step?.kind).toBe("fields");
    if (step?.kind !== "fields") {
      throw new Error("Expected the simple State Pension forecast step");
    }

    expect(step.fieldIds).toEqual(["currentStatePension"]);
    expect(step.optionalQuestion?.setting.id).toBe(
      "statePensionForecastConfirmed"
    );
    expect(step.supportLink?.href).toBe(knowledgeLinks.statePensionForecast);
    expect(stepIds.indexOf("state-pension-forecast")).toBeLessThan(
      stepIds.indexOf("include")
    );
  });

  it("keeps additional guaranteed income out of the simple journey", () => {
    expect(getJourneyStepIds("early-retirement-bridge")).toContain(
      "additional-income"
    );
    expect(getJourneyStepIds("simple-early-retirement")).not.toContain(
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

  it("excludes EPA from simple calculations while preserving expert settings", () => {
    const alphaEpaPeriods = [
      {
        id: "saved-epa-period",
        yearsBeforeNpa: 2 as const,
        startDate: "2026-04-01",
        endDate: "2027-03-31",
      },
    ];
    const currentSettings = {
      ...defaultSettings,
      alphaEpaEnabled: true,
      alphaEpaPeriods,
    };
    const simpleSettings = applySimpleJourneyAssumptions(currentSettings);

    expect(simpleSettings.alphaEpaEnabled).toBe(false);
    expect(mergeSimpleJourneySettings(currentSettings, simpleSettings)).toEqual(
      expect.objectContaining({
        alphaEpaEnabled: true,
        alphaEpaPeriods,
      })
    );
  });

  it("excludes additional guaranteed income from simple calculations while preserving expert settings", () => {
    const additionalGuaranteedIncomes = [
      {
        id: "saved-additional-income",
        name: "Previous employer pension",
        annualAmount: 5000,
        startAge: 67,
        endAge: null,
        indexation: "cpi" as const,
        fixedIncreasePercent: null,
        taxable: true,
      },
    ];
    const currentSettings = {
      ...defaultSettings,
      showAdditionalGuaranteedIncome: true,
      additionalGuaranteedIncomes,
    };
    const simpleSettings = applySimpleJourneyAssumptions(currentSettings);

    expect(simpleSettings.showAdditionalGuaranteedIncome).toBe(false);
    expect(mergeSimpleJourneySettings(currentSettings, simpleSettings)).toEqual(
      expect.objectContaining({
        showAdditionalGuaranteedIncome: true,
        additionalGuaranteedIncomes,
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

  it("uses an after-tax spending target and tax estimates in simple mode", () => {
    expect(applySimpleJourneyAssumptions(defaultSettings)).toEqual(
      expect.objectContaining({
        retirementIncomeTargetBasis: "after_tax",
        taxationEnabled: true,
      })
    );
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
