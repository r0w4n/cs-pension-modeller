import { describe, expect, it } from "vitest";
import {
  createDefaultPartnerSettings,
  createDefaultSettings,
  normalizeSettings,
} from "../settings";
import { assessHouseholdRetirementPlan } from "./household-retirement-assessment";
import { calculateJointRetirementProjection } from "./joint-retirement-plan";

describe("assessHouseholdRetirementPlan", () => {
  it("includes each person's final flexible assets when horizons differ", () => {
    const defaults = createDefaultSettings();
    const settings = normalizeSettings({
      ...defaults,
      startDate: "2026-06-01",
      dateOfBirth: "1970-06-01",
      requirementAge: 60,
      lifeExpectancy: 70,
      showAlpha: false,
      showStatePension: false,
      showSipp: true,
      sippCurrentPot: 10_000,
      sippMonthlyContribution: 0,
      sippDrawAge: 60,
      sippWithdrawalStrategy: "meet_income_target",
      showIsa: false,
      partner: {
        ...createDefaultPartnerSettings(),
        dateOfBirth: "1970-06-01",
        requirementAge: 60,
        lifeExpectancy: 80,
        showStatePension: false,
        showSipp: false,
        showIsa: false,
      },
      jointRetirement: {
        ...defaults.jointRetirement,
        enabled: true,
        transitionDesiredRetirementIncome: 0,
        fullyRetiredDesiredRetirementIncome: 0,
        flexibleWithdrawalPriority: ["you:sipp"],
      },
    });
    const projection = calculateJointRetirementProjection(settings);
    const yourFinalRow = projection.people.you.rows.at(-1);
    const partnerFinalRow = projection.people.partner.rows.at(-1);

    const assessment = assessHouseholdRetirementPlan(projection, settings);

    expect(projection.rows.at(-1)?.people.you).toBeNull();
    expect(assessment.finalFlexibleAssets).toBeCloseTo(
      (yourFinalRow?.sippPot ?? 0) + (partnerFinalRow?.sippPot ?? 0),
      2
    );
    expect(assessment.finalFlexibleAssets).toBeGreaterThan(0);
  });

  it("does not report a never-funded enabled account as exhausted", () => {
    const defaults = createDefaultSettings();
    const settings = normalizeSettings({
      ...defaults,
      startDate: "2026-06-01",
      dateOfBirth: "1970-06-01",
      requirementAge: 60,
      lifeExpectancy: 70,
      showAlpha: false,
      showStatePension: false,
      showSipp: false,
      showIsa: true,
      isaCurrentPot: 0,
      isaMonthlyContribution: 0,
      isaDrawAge: 60,
      isaWithdrawalStrategy: "meet_income_target",
      partner: {
        ...createDefaultPartnerSettings(),
        dateOfBirth: "1970-06-01",
        requirementAge: 60,
        lifeExpectancy: 70,
        showStatePension: false,
        showSipp: false,
        showIsa: false,
      },
      jointRetirement: {
        ...defaults.jointRetirement,
        enabled: true,
        transitionDesiredRetirementIncome: 0,
        fullyRetiredDesiredRetirementIncome: 0,
        flexibleWithdrawalPriority: ["you:isa"],
      },
    });
    const projection = calculateJointRetirementProjection(settings);

    const assessment = assessHouseholdRetirementPlan(projection, settings);

    expect(assessment.firstFlexibleFundExhaustionDate).toBeNull();
    expect(assessment.firstFlexibleFundExhaustionAccount).toBeNull();
  });
});
