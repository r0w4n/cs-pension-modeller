import { createDefaultSettings } from "../settings-defaults";
import { normalizeIsaWithdrawalStrategy, validateIsaRules } from "./isa";

describe("isa settings module", () => {
  it("normalizes isa withdrawal strategy", () => {
    expect(normalizeIsaWithdrawalStrategy("percentage")).toBe("percentage");
    expect(normalizeIsaWithdrawalStrategy("bad")).toBe("use_by_age");
  });

  it("validates isa draw rules", () => {
    const settings = {
      ...createDefaultSettings(),
      showIsa: true,
      isaWithdrawalStrategy: "use_by_age" as const,
    };

    const issues = validateIsaRules({
      settings,
      lifeExpectancyDate: "2020-01-01",
      isaDrawDate: "2030-01-01",
      isaWithdrawalTargetDate: "2029-01-01",
    });

    expect(issues.length).toBeGreaterThan(0);
  });
});
