import { applyBridgeChartParameterPatch } from "./chart-state";
import { createDefaultSettings } from "../settings";

describe("chart-state", () => {
  it("does not let leave alpha move past retirement", () => {
    const current = {
      ...createDefaultSettings(),
      requirementAge: 65,
      alphaPensionLeaveAge: 65,
      alphaPensionDrawAge: 68,
    };

    const next = applyBridgeChartParameterPatch(current, {
      alphaLeaveAge: 66,
    });

    expect(next.alphaPensionLeaveAge).toBe(65);
  });

  it("pulls leave alpha back when retirement moves earlier than it", () => {
    const current = {
      ...createDefaultSettings(),
      requirementAge: 65,
      alphaPensionLeaveAge: 66,
      alphaPensionDrawAge: 68,
    };

    const next = applyBridgeChartParameterPatch(current, {
      retirementAge: 64,
    });

    expect(next.requirementAge).toBe(64);
    expect(next.alphaPensionLeaveAge).toBe(64);
  });

  it("moves an aligned Alpha draw age when retirement moves later", () => {
    const current = {
      ...createDefaultSettings(),
      requirementAge: 57,
      alphaPensionLeaveAge: 57,
      alphaPensionDrawAge: 57,
      showAlpha: true,
    };

    const next = applyBridgeChartParameterPatch(current, {
      retirementAge: 60,
    });

    expect(next.requirementAge).toBe(60);
    expect(next.alphaPensionDrawAge).toBe(60);
    expect(next.alphaPensionLeaveAge).toBe(57);
  });

  it("preserves an intentionally later Alpha draw age", () => {
    const current = {
      ...createDefaultSettings(),
      requirementAge: 57,
      alphaPensionLeaveAge: 57,
      alphaPensionDrawAge: 68,
      showAlpha: true,
    };

    const next = applyBridgeChartParameterPatch(current, {
      retirementAge: 60,
    });

    expect(next.requirementAge).toBe(60);
    expect(next.alphaPensionDrawAge).toBe(68);
  });

  it("keeps other pension and savings start ages independent", () => {
    const current = {
      ...createDefaultSettings(),
      requirementAge: 57,
      alphaPensionDrawAge: 57,
      isaDrawAge: 72,
      sippDrawAge: 68,
      nuvosPensionDrawAge: 65,
      premiumDrawAge: 60,
      showAlpha: true,
      showIsa: true,
      showSipp: true,
      showNuvos: true,
      showPremium: true,
    };

    const next = applyBridgeChartParameterPatch(current, {
      retirementAge: 60,
    });

    expect(next.requirementAge).toBe(60);
    expect(next.alphaPensionDrawAge).toBe(60);
    expect(next.isaDrawAge).toBe(72);
    expect(next.sippDrawAge).toBe(68);
    expect(next.nuvosPensionDrawAge).toBe(65);
    expect(next.premiumDrawAge).toBe(60);
  });

  it("continues to cap retirement at State Pension age", () => {
    const current = {
      ...createDefaultSettings(),
      dateOfBirth: "1987-06-01",
      requirementAge: 57,
      alphaPensionDrawAge: 57,
      statePensionDrawDate: "2055-06-01",
      showAlpha: true,
    };

    const next = applyBridgeChartParameterPatch(current, {
      retirementAge: 70,
    });

    expect(next.requirementAge).toBe(68);
    expect(next.alphaPensionDrawAge).toBe(68);
  });

  it("does not move ISA draw age when retirement age changes", () => {
    const current = {
      ...createDefaultSettings(),
      requirementAge: 65,
      isaDrawAge: 72,
      alphaPensionDrawAge: 68,
    };

    const next = applyBridgeChartParameterPatch(current, {
      retirementAge: 64,
    });

    expect(next.requirementAge).toBe(64);
    expect(next.isaDrawAge).toBe(72);
  });

  it("does not move SIPP draw age when retirement age changes", () => {
    const current = {
      ...createDefaultSettings(),
      dateOfBirth: "1987-06-01",
      startDate: "2026-06-01",
      requirementAge: 65,
      sippDrawAge: 68,
      alphaPensionDrawAge: 68,
      showSipp: true,
    };

    const next = applyBridgeChartParameterPatch(current, {
      retirementAge: 64,
    });

    expect(next.requirementAge).toBe(64);
    expect(next.sippDrawAge).toBe(68);
  });

  it("allows SIPP draw age to move to 55 when age 55 is reached before 6 April 2028", () => {
    const current = {
      ...createDefaultSettings(),
      dateOfBirth: "1973-04-05",
      startDate: "2026-06-01",
      requirementAge: 55,
      sippDrawAge: 68,
      showSipp: true,
    };

    const next = applyBridgeChartParameterPatch(current, {
      sippAccessAge: 55,
    });

    expect(next.requirementAge).toBe(55);
    expect(next.sippDrawAge).toBe(55);
  });

  it("resolves SIPP draw age to 57 when age 55 is reached on 6 April 2028 without protection", () => {
    const current = {
      ...createDefaultSettings(),
      dateOfBirth: "1973-04-06",
      startDate: "2026-06-01",
      requirementAge: 55,
      sippDrawAge: 68,
      showSipp: true,
    };

    const next = applyBridgeChartParameterPatch(current, {
      sippAccessAge: 55,
    });

    expect(next.requirementAge).toBe(55);
    expect(next.sippDrawAge).toBe(57);
  });

  it("allows SIPP draw age to move to a provider-confirmed protected age after 6 April 2028", () => {
    const current = {
      ...createDefaultSettings(),
      dateOfBirth: "1973-04-06",
      startDate: "2026-06-01",
      requirementAge: 55,
      sippHasProtectedPensionAge: true,
      sippProtectedPensionAge: 55,
      sippDrawAge: 68,
      showSipp: true,
    };

    const next = applyBridgeChartParameterPatch(current, {
      sippAccessAge: 55,
    });

    expect(next.requirementAge).toBe(55);
    expect(next.sippDrawAge).toBe(55);
  });

  it("does not let SIPP draw age move before retirement age", () => {
    const current = {
      ...createDefaultSettings(),
      dateOfBirth: "1987-06-01",
      startDate: "2026-06-01",
      requirementAge: 62,
      sippDrawAge: 68,
      showSipp: true,
    };

    const next = applyBridgeChartParameterPatch(current, {
      sippAccessAge: 58,
    });

    expect(next.requirementAge).toBe(62);
    expect(next.sippDrawAge).toBe(62);
  });

  it("allows SIPP draw age to move beyond State Pension age", () => {
    const current = {
      ...createDefaultSettings(),
      dateOfBirth: "1987-06-01",
      startDate: "2026-06-01",
      lifeExpectancy: 85,
      requirementAge: 65,
      sippDrawAge: 65,
      statePensionDrawDate: "2055-06-01",
      showSipp: true,
    };

    const next = applyBridgeChartParameterPatch(current, {
      sippAccessAge: 72,
    });

    expect(next.sippDrawAge).toBe(72);
  });

  it("caps chart SIPP draw age at life expectancy", () => {
    const current = {
      ...createDefaultSettings(),
      dateOfBirth: "1987-06-01",
      startDate: "2026-06-01",
      lifeExpectancy: 85,
      sippDrawAge: 65,
      showSipp: true,
    };

    const next = applyBridgeChartParameterPatch(current, {
      sippAccessAge: 90,
    });

    expect(next.sippDrawAge).toBe(85);
  });

  it("does not clamp nuvos draw age to retirement age", () => {
    const current = {
      ...createDefaultSettings(),
      dateOfBirth: "1987-06-01",
      startDate: "2026-06-01",
      requirementAge: 68,
      nuvosPensionLeaveAge: 60,
      nuvosPensionDrawAge: 68,
      showNuvos: true,
    };

    const next = applyBridgeChartParameterPatch(current, {
      nuvosStartAge: 60,
    });

    expect(next.requirementAge).toBe(68);
    expect(next.nuvosPensionDrawAge).toBe(60);
  });

  it("updates Premium draw age when its chart milestone moves earlier", () => {
    const current = {
      ...createDefaultSettings(),
      dateOfBirth: "1970-04-01",
      startDate: "2025-04-01",
      lifeExpectancy: 90,
      requirementAge: 55,
      premiumDrawAge: 60,
      premiumEarliestAccessAge: 55 as const,
      showPremium: true,
    };

    const next = applyBridgeChartParameterPatch(current, {
      premiumStartAge: 55,
    });

    expect(next.premiumDrawAge).toBe(55);
  });

  it("allows alpha draw age to move beyond state pension age", () => {
    const current = {
      ...createDefaultSettings(),
      requirementAge: 65,
      alphaPensionLeaveAge: 65,
      alphaPensionDrawAge: 67,
      statePensionDrawDate: "2055-06-01",
    };

    const next = applyBridgeChartParameterPatch(current, {
      alphaStartAge: 69,
    });

    expect(next.alphaPensionDrawAge).toBe(69);
  });

  it("allows ISA draw age to move beyond state pension age", () => {
    const current = {
      ...createDefaultSettings(),
      dateOfBirth: "1987-06-01",
      startDate: "2026-06-01",
      lifeExpectancy: 85,
      requirementAge: 65,
      isaDrawAge: 65,
      statePensionDrawDate: "2055-06-01",
    };

    const next = applyBridgeChartParameterPatch(current, {
      isaAccessAge: 72,
    });

    expect(next.isaDrawAge).toBe(72);
  });
});
