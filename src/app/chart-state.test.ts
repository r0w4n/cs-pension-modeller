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

  it("does not let SIPP draw age move before Normal Pension Age", () => {
    const current = {
      ...createDefaultSettings(),
      dateOfBirth: "1987-06-01",
      startDate: "2026-06-01",
      requirementAge: 70,
      sippDrawAge: 68,
      showSipp: true,
    };

    const next = applyBridgeChartParameterPatch(current, {
      sippAccessAge: 58,
    });

    expect(next.requirementAge).toBe(70);
    expect(next.sippDrawAge).toBe(68);
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

  it("does not let nuvos draw age move before retirement age", () => {
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
    expect(next.nuvosPensionDrawAge).toBe(68);
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
