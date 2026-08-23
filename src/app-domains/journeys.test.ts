import {
  JOURNEY_DEFINITIONS,
  OPTIONAL_SECTION_TOGGLES,
  applyBridgeJourneyDefaults,
  applyExpertJourneyDefaults,
  applySimpleJourneyDefaults,
  type JourneyStepDefinition,
} from "./journeys";
import { fieldGroups, type FieldDefinition } from "../fieldDefinitions";
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
    ]).toEqual(["desiredRetirementIncome", "requirementAge"]);
  });

  it("uses an after-tax target with the restored expert quick selects", () => {
    const targetGroup = fieldGroups.find(
      (group) => group.id === "retirement-target"
    );
    const targetField = targetGroup?.fields.find(
      (field) => field.id === "desiredRetirementIncome"
    );

    expect(applyExpertJourneyDefaults(defaultSettings)).toEqual(
      expect.objectContaining({
        retirementIncomeTargetBasis: "after_tax",
        taxationEnabled: true,
      })
    );
    expect(targetGroup?.description).toBe(
      "Set your target retirement age and the annual amount you would like available to spend after tax."
    );
    expect(targetField?.description).toBe(
      "How much would you like to have available to spend each year in retirement, after tax?"
    );
    expect(
      targetField?.type === "currency-input" ? targetField.presets : []
    ).toEqual(
      [11250, 13900, 22700, 31350, 32700, 45400].map((value) => ({
        value,
        label: `£${value.toLocaleString("en-GB")}`,
      }))
    );
    expect(OPTIONAL_SECTION_TOGGLES.map((toggle) => toggle.key)).not.toContain(
      "taxationEnabled"
    );
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

  it("keeps withdrawal strategy fields out of guided field groups", () => {
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

  it("keeps the bridge target focused and puts withdrawal decisions in their own step", () => {
    const bridgeTarget = getJourneyStep("early-retirement-bridge", "target");
    const bridgeStrategy = getJourneyStep(
      "early-retirement-bridge",
      "bridge-strategy"
    );
    const expertTarget = getJourneyStep(
      "expert-journey",
      "expert-retirement-target"
    );

    expect(bridgeTarget?.kind).toBe("fields");
    if (bridgeTarget?.kind !== "fields") {
      throw new Error("Expected a bridge retirement target field step");
    }
    expect(bridgeTarget.showSpendingSmileEditor).not.toBe(true);
    expect(bridgeTarget.showFlexibleWithdrawalPriority).not.toBe(true);

    for (const strategyStep of [bridgeStrategy, expertTarget]) {
      expect(strategyStep?.kind).toBe("fields");
      if (strategyStep?.kind !== "fields") {
        throw new Error("Expected a withdrawal strategy field step");
      }
      expect(strategyStep.showSpendingSmileEditor).toBe(true);
      expect(strategyStep.showFlexibleWithdrawalPriority).toBe(true);
    }
  });

  it("keeps target-based drawdown out of simplified projections", () => {
    const settings = applySimpleJourneyDefaults({
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

  it("lets the bridge journey select flexible pots independently", () => {
    const bridgeJourney = JOURNEY_DEFINITIONS.find(
      (journey) => journey.id === "early-retirement-bridge"
    );
    const potChoicesStep = bridgeJourney?.steps.find(
      (step) => step.id === "pots"
    );

    expect(potChoicesStep?.kind).toBe("optional-sections");
    if (potChoicesStep?.kind !== "optional-sections") {
      throw new Error("Expected the bridge pot choices step");
    }

    expect(potChoicesStep.toggleKeys).toEqual([
      "showIsa",
      "showLisa",
      "showSipp",
      "showCsAvc",
      "showAdditionalGuaranteedIncome",
    ]);
    expect(
      potChoicesStep.toggleKeys?.map(
        (key) => potChoicesStep.toggleCopy?.[key]?.label
      )
    ).toEqual([
      "ISA",
      "Lifetime ISA (LISA)",
      "SIPP or personal pension",
      "Civil Service AVC",
      "Other guaranteed income",
    ]);

    const pensionChoicesStep = bridgeJourney?.steps.find(
      (step) => step.id === "include"
    );
    expect(pensionChoicesStep?.kind).toBe("optional-sections");
    if (pensionChoicesStep?.kind !== "optional-sections") {
      throw new Error("Expected the bridge pension choices step");
    }
    expect(pensionChoicesStep.toggleKeys).not.toContain("showCsAvc");
  });

  it("makes other guaranteed income a conditional bridge selection", () => {
    const step = getJourneyStep("early-retirement-bridge", "additional-income");

    expect(
      step?.visible?.({
        ...defaultSettings,
        showAdditionalGuaranteedIncome: false,
      })
    ).toBe(false);
    expect(
      step?.visible?.({
        ...defaultSettings,
        showAdditionalGuaranteedIncome: true,
      })
    ).toBe(true);
  });

  it("starts bridge planning with the simple question order and ends with a review", () => {
    const bridgeJourney = JOURNEY_DEFINITIONS.find(
      (journey) => journey.id === "early-retirement-bridge"
    );
    const bridgeStepIds = bridgeJourney?.steps.map((step) => step.id) ?? [];
    const bridgeTarget = getJourneyStep("early-retirement-bridge", "target");
    const simpleTarget = getJourneyStep("simple-early-retirement", "target");

    expect(bridgeStepIds.slice(0, 4)).toEqual([
      "personal",
      "target",
      "retirement-age",
      "include",
    ]);
    expect(bridgeTarget).toEqual(
      expect.objectContaining({
        title: simpleTarget?.title,
        description: simpleTarget?.description,
        fieldIds:
          simpleTarget?.kind === "fields" ? simpleTarget.fieldIds : undefined,
        currencyFieldPresentation:
          simpleTarget?.kind === "fields"
            ? simpleTarget.currencyFieldPresentation
            : undefined,
      })
    );
    expect(bridgeStepIds.indexOf("check-plan")).toBe(
      bridgeStepIds.indexOf("answer") - 1
    );
    expect(bridgeStepIds.indexOf("state")).toBeLessThan(
      bridgeStepIds.indexOf("pots")
    );
    expect(bridgeStepIds.indexOf("pots")).toBeLessThan(
      bridgeStepIds.indexOf("bridge-strategy")
    );
    expect(bridgeStepIds.indexOf("bridge-strategy")).toBeLessThan(
      bridgeStepIds.indexOf("isa")
    );
    expect(getJourneyStep("early-retirement-bridge", "check-plan")).toEqual(
      expect.objectContaining({ kind: "review", presentation: "bridge-plan" })
    );
  });

  it("shows bridge pot details only for selected pots", () => {
    const bridgeJourney = JOURNEY_DEFINITIONS.find(
      (journey) => journey.id === "early-retirement-bridge"
    );
    const settings = {
      ...defaultSettings,
      showIsa: true,
      showLisa: false,
      showSipp: false,
      showCsAvc: true,
    };
    const bridgeSteps: readonly JourneyStepDefinition[] =
      bridgeJourney?.steps ?? [];
    const visibleStepIds = bridgeSteps
      .filter((step) => !step.visible || step.visible(settings))
      .map((step) => step.id);

    expect(visibleStepIds).toContain("isa");
    expect(visibleStepIds).not.toContain("lisa");
    expect(visibleStepIds).not.toContain("sipp");
    expect(visibleStepIds).toContain("cs-avc");
    expect(visibleStepIds).toContain("pot-tax");
  });

  it("keeps each bridge pot's fields in its conditional detail step", () => {
    expect([
      ...getJourneyStepFieldIds("early-retirement-bridge", "isa"),
    ]).toEqual([
      "isaCurrentPot",
      "isaMonthlyContribution",
      "isaDrawAge",
      "isaRealInterestPercent",
      "isaWithdrawalPercent",
      "isaWithdrawalTargetAge",
    ]);
    expect([
      ...getJourneyStepFieldIds("early-retirement-bridge", "lisa"),
    ]).toEqual([
      "lisaCurrentPot",
      "lisaMonthlyContribution",
      "lisaDrawAge",
      "lisaRealInterestPercent",
      "lisaWithdrawalPercent",
      "lisaWithdrawalTargetAge",
    ]);
    expect(
      getJourneyStepFieldIds("early-retirement-bridge", "pot-tax")
    ).toContain("taxSippTaxFreeWithdrawalPercent");
    expect([
      ...getJourneyStepFieldIds("early-retirement-bridge", "sipp"),
    ]).toEqual(
      expect.arrayContaining([
        "sippWithdrawalPercent",
        "sippWithdrawalTargetAge",
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

    expect(answerStep?.kind).toBe("results");
    if (answerStep?.kind !== "results") {
      throw new Error("Expected the simple results step");
    }
    expect(answerStep.sections).toEqual([
      { id: "summary", presentation: "simple" },
      { id: "retirement-income-chart", presentation: "simple" },
      { id: "income-details", presentation: "simple" },
      { id: "inflation-basis", presentation: "disclosure" },
    ]);
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
      "Do not enter a total pot value"
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

  it("keeps Added Pension out of the simple journey and calculation", () => {
    expect(getJourneyStepIds("simple-early-retirement")).not.toContain(
      "alpha-options"
    );
    expect(
      applySimpleJourneyDefaults({
        ...defaultSettings,
        alphaAddedPensionMonthly: 250,
      })
    ).toEqual(expect.objectContaining({ alphaAddedPensionMonthly: 0 }));
  });

  it("uses statement amounts for classic pensions in the simple journey", () => {
    expect([
      ...getJourneyStepFieldIds("simple-early-retirement", "classic"),
    ]).toEqual([
      "classicAnnualPension",
      "classicAutomaticLumpSum",
      "classicPensionDrawAge",
      "classicApplyPensionIncreases",
    ]);
    expect(
      applySimpleJourneyDefaults({
        ...defaultSettings,
        classicCalculationMode: "estimate",
        classicPlusCalculationMode: "estimate",
      })
    ).toEqual(
      expect.objectContaining({
        classicCalculationMode: "manual",
        classicPlusCalculationMode: "manual",
      })
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

  it("materialises the disabled EPA assumption in simple settings", () => {
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
    const simpleSettings = applySimpleJourneyDefaults(currentSettings);

    expect(simpleSettings.alphaEpaEnabled).toBe(false);
    expect(simpleSettings.alphaEpaPeriods).toEqual(alphaEpaPeriods);
    expect(currentSettings.alphaEpaEnabled).toBe(true);
  });

  it("materialises the excluded additional-income assumption in simple settings", () => {
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
    const simpleSettings = applySimpleJourneyDefaults(currentSettings);

    expect(simpleSettings.showAdditionalGuaranteedIncome).toBe(false);
    expect(simpleSettings.additionalGuaranteedIncomes).toEqual(
      additionalGuaranteedIncomes
    );
    expect(currentSettings.showAdditionalGuaranteedIncome).toBe(true);
  });

  it("uses flat spending for simple journey calculations", () => {
    expect(
      applySimpleJourneyDefaults({
        ...defaultSettings,
        spendingStrategyType: "SPENDING_SMILE",
      }).spendingStrategyType
    ).toBe("FLAT");
  });

  it("uses an after-tax spending target and tax estimates in simple mode", () => {
    expect(applySimpleJourneyDefaults(defaultSettings)).toEqual(
      expect.objectContaining({
        retirementIncomeTargetBasis: "after_tax",
        taxationEnabled: true,
      })
    );
  });

  it("keeps an enabled CS AVC visible in simple journey assumptions", () => {
    expect(
      applySimpleJourneyDefaults({
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

  it("stores the same simple settings that are passed to calculations", () => {
    const simpleSettings = applySimpleJourneyDefaults({
      ...defaultSettings,
      showCsAvc: true,
      showSipp: true,
      showIsa: true,
      showLisa: true,
    });

    expect(simpleSettings).toEqual(
      expect.objectContaining({
        showCsAvc: true,
        showSipp: false,
        showIsa: false,
        showLisa: false,
      })
    );
  });
});
