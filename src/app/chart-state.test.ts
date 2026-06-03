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
});
