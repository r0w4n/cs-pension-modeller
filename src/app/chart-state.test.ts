import { applyBridgeChartParameterPatch, updateSetting } from "./chart-state";
import { createDefaultSettings } from "../settings";

describe("chart-state", () => {
  it("caps SMILE phase ages when life expectancy is reduced", () => {
    const current = {
      ...createDefaultSettings(),
      lifeExpectancy: 95,
      spendingSmile: {
        ...createDefaultSettings().spendingSmile,
        slowGoStartAge: 75,
        noGoStartAge: 85,
      },
    };
    let next = current;

    updateSetting({
      key: "lifeExpectancy",
      value: 80,
      showSavedLabel: vi.fn(),
      setChartUndoStack: vi.fn(),
      setSettings: (update) => {
        next = typeof update === "function" ? update(next) : update;
      },
    });

    expect(next.lifeExpectancy).toBe(80);
    expect(next.spendingSmile).toMatchObject({
      slowGoStartAge: 75,
      noGoStartAge: 80,
    });
  });

  it("updates optional section controls synchronously", () => {
    const current = createDefaultSettings();
    let next = current;

    updateSetting({
      key: "showAlpha",
      value: false,
      showSavedLabel: vi.fn(),
      setChartUndoStack: vi.fn(),
      setSettings: (update) => {
        next = typeof update === "function" ? update(next) : update;
      },
    });

    expect(next.showAlpha).toBe(false);
  });

  it("applies Civil Service AVC visibility changes from the chart key", () => {
    const current = {
      ...createDefaultSettings(),
      showCsAvc: true,
    };

    const next = applyBridgeChartParameterPatch(current, {
      showCsAvc: false,
    });

    expect(next.showCsAvc).toBe(false);
  });

  it("keeps the default SIPP draw age linked to Normal Pension Age when date of birth changes", () => {
    const current = createDefaultSettings();
    let next = current;

    updateSetting({
      key: "dateOfBirth",
      value: "1977-06-01",
      showSavedLabel: vi.fn(),
      setChartUndoStack: vi.fn(),
      setSettings: (update) => {
        next = typeof update === "function" ? update(next) : update;
      },
    });

    expect(next.normalPensionAge).toBeCloseTo(67.1666666667);
    expect(next.sippDrawAge).toBe(67);
  });

  it("preserves a custom SIPP draw age when date of birth changes", () => {
    const current = {
      ...createDefaultSettings(),
      sippDrawAge: 65,
    };
    let next = current;

    updateSetting({
      key: "dateOfBirth",
      value: "1970-01-01",
      showSavedLabel: vi.fn(),
      setChartUndoStack: vi.fn(),
      setSettings: (update) => {
        next = typeof update === "function" ? update(next) : update;
      },
    });

    expect(next.normalPensionAge).toBe(67);
    expect(next.sippDrawAge).toBe(65);
  });

  it("keeps the untouched ISA draw age ten years before NPA when date of birth changes", () => {
    const current = createDefaultSettings();
    let next = current;

    updateSetting({
      key: "dateOfBirth",
      value: "1977-06-01",
      showSavedLabel: vi.fn(),
      setChartUndoStack: vi.fn(),
      setSettings: (update) => {
        next = typeof update === "function" ? update(next) : update;
      },
    });

    expect(next.normalPensionAge).toBeCloseTo(67.1666666667);
    expect(next.isaDrawAge).toBe(57);
  });

  it("preserves a custom ISA draw age when date of birth changes", () => {
    const current = {
      ...createDefaultSettings(),
      isaDrawAge: 60,
    };
    let next = current;

    updateSetting({
      key: "dateOfBirth",
      value: "1970-01-01",
      showSavedLabel: vi.fn(),
      setChartUndoStack: vi.fn(),
      setSettings: (update) => {
        next = typeof update === "function" ? update(next) : update;
      },
    });

    expect(next.normalPensionAge).toBe(67);
    expect(next.isaDrawAge).toBe(60);
  });

  it("updates one SMILE percentage from a chart patch", () => {
    const current = {
      ...createDefaultSettings(),
      spendingStrategyType: "SPENDING_SMILE" as const,
    };

    const next = applyBridgeChartParameterPatch(current, {
      slowGoPercentage: 82,
    });

    expect(next.spendingSmile).toEqual({
      ...current.spendingSmile,
      slowGoPercentage: 82,
    });
  });

  it("updates SMILE phase start ages from chart patches", () => {
    const current = {
      ...createDefaultSettings(),
      requirementAge: 68,
      lifeExpectancy: 90,
      spendingStrategyType: "SPENDING_SMILE" as const,
      spendingSmile: {
        ...createDefaultSettings().spendingSmile,
        slowGoStartAge: 75,
        noGoStartAge: 85,
      },
    };

    const withSlowGoChange = applyBridgeChartParameterPatch(current, {
      slowGoStartAge: 78,
    });
    const withNoGoChange = applyBridgeChartParameterPatch(withSlowGoChange, {
      noGoStartAge: 88,
    });

    expect(withSlowGoChange.spendingSmile).toEqual({
      ...current.spendingSmile,
      slowGoStartAge: 78,
    });
    expect(withNoGoChange.spendingSmile).toEqual({
      ...current.spendingSmile,
      slowGoStartAge: 78,
      noGoStartAge: 88,
    });
  });

  it("keeps chart-dragged SMILE phase ages in valid order", () => {
    const current = {
      ...createDefaultSettings(),
      requirementAge: 68,
      lifeExpectancy: 85,
      spendingStrategyType: "SPENDING_SMILE" as const,
      spendingSmile: {
        ...createDefaultSettings().spendingSmile,
        slowGoStartAge: 75,
        noGoStartAge: 82,
      },
    };

    expect(
      applyBridgeChartParameterPatch(current, {
        slowGoStartAge: 84,
      }).spendingSmile.slowGoStartAge
    ).toBe(81);
    expect(
      applyBridgeChartParameterPatch(current, {
        noGoStartAge: 70,
      }).spendingSmile.noGoStartAge
    ).toBe(76);
  });

  it("moves SMILE phase ages when retirement would catch Slow-go", () => {
    const current = {
      ...createDefaultSettings(),
      requirementAge: 65,
      lifeExpectancy: 80,
      spendingStrategyType: "SPENDING_SMILE" as const,
      spendingSmile: {
        ...createDefaultSettings().spendingSmile,
        slowGoStartAge: 66,
        noGoStartAge: 75,
      },
    };

    const next = applyBridgeChartParameterPatch(current, {
      retirementAge: 68,
    });

    expect(next.requirementAge).toBe(68);
    expect(next.spendingSmile).toMatchObject({
      slowGoStartAge: 69,
      noGoStartAge: 75,
    });
  });

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
