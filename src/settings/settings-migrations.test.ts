import {
  migrateFromV1ToV2,
  migrateSettingsToLatest,
} from "./settings-migrations";
import { SETTINGS_SCHEMA_VERSION } from "./settings-versions";

describe("settings-migrations", () => {
  it("renames targetRetirementAge to requirementAge", () => {
    expect(
      migrateFromV1ToV2({
        dateOfBirth: "1987-06-01",
        targetRetirementAge: 65,
      })
    ).toEqual({
      dateOfBirth: "1987-06-01",
      requirementAge: 65,
    });
  });

  it("preserves an existing requirementAge during migration", () => {
    expect(
      migrateFromV1ToV2({
        requirementAge: 64,
        targetRetirementAge: 65,
      })
    ).toEqual({
      requirementAge: 64,
    });
  });

  it("keeps legacy isaDrawAge fallback behaviour during migration", () => {
    expect(
      migrateFromV1ToV2({
        isaDrawAge: 60,
      })
    ).toEqual({
      isaDrawAge: 60,
      requirementAge: 60,
    });
  });

  it("returns current-version data unchanged", () => {
    const data = { requirementAge: 66 };

    expect(
      migrateSettingsToLatest({
        version: SETTINGS_SCHEMA_VERSION,
        data,
      })
    ).toBe(data);
  });

  it("falls back to empty data for a newer schema version", () => {
    expect(
      migrateSettingsToLatest({
        version: SETTINGS_SCHEMA_VERSION + 1,
        data: { requirementAge: 66 },
      })
    ).toEqual({});
  });
});
