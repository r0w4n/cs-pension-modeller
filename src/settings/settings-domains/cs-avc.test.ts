import { createDefaultSettings } from "../settings-defaults";
import { normalizeCsAvcWithdrawalStrategy, validateCsAvcRules } from "./cs-avc";

describe("CS AVC settings module", () => {
  it("normalizes CS AVC withdrawal strategy", () => {
    expect(normalizeCsAvcWithdrawalStrategy("percentage")).toBe("percentage");
    expect(normalizeCsAvcWithdrawalStrategy("bad")).toBe("use_by_age");
  });

  it("validates standard CS AVC access against the planned draw date", () => {
    const settings = {
      ...createDefaultSettings(),
      dateOfBirth: "1972-08-01",
      showCsAvc: true,
      csAvcDrawAge: 56,
    };

    expect(
      validateCsAvcRules({
        settings,
        lifeExpectancyDate: "2060-01-01",
        csAvcDrawDate: "2028-08-01",
        csAvcWithdrawalTargetDate: "2035-01-01",
      })
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "csAvcDrawAge",
          message:
            "CS AVC draw start age must be at least 57 for access dates on or after 6 April 2028, unless your provider has confirmed a protected pension age.",
        }),
      ])
    );
  });

  it("validates provider-confirmed protected CS AVC access from age 50", () => {
    const settings = {
      ...createDefaultSettings(),
      dateOfBirth: "1980-08-01",
      showCsAvc: true,
      csAvcHasProtectedPensionAge: true,
      csAvcProtectedPensionAge: 50,
      csAvcDrawAge: 49,
    };

    expect(
      validateCsAvcRules({
        settings,
        lifeExpectancyDate: "2060-01-01",
        csAvcDrawDate: "2029-08-01",
        csAvcWithdrawalTargetDate: "2035-01-01",
      })
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "csAvcDrawAge",
          message:
            "CS AVC draw start age must not be earlier than the provider-confirmed protected CS AVC access age of 50.",
        }),
      ])
    );
  });
});
