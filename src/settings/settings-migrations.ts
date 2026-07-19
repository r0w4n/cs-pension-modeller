import {
  LEGACY_UNVERSIONED_SETTINGS_SCHEMA_VERSION,
  SETTINGS_SCHEMA_VERSION,
  type StoredSettingsEnvelope,
} from "./settings-versions";

type SettingsMigration = (data: unknown) => unknown;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function migrateFromV1ToV2(data: unknown) {
  if (!isRecord(data)) {
    return {};
  }

  const { targetRetirementAge, ...remainingSettings } = data;
  const requirementAge =
    remainingSettings.requirementAge ?? targetRetirementAge ?? data.isaDrawAge;

  if (requirementAge === undefined) {
    return remainingSettings;
  }

  return {
    ...remainingSettings,
    requirementAge,
  };
}

export function migrateFromV2ToV3(data: unknown) {
  if (!isRecord(data)) {
    return {};
  }

  return {
    ...data,
    additionalGuaranteedIncomes: Array.isArray(data.additionalGuaranteedIncomes)
      ? data.additionalGuaranteedIncomes
      : [],
  };
}

export function migrateFromV3ToV4(data: unknown) {
  if (!isRecord(data)) {
    return {};
  }

  return {
    ...data,
    sippHasProtectedPensionAge:
      typeof data.sippHasProtectedPensionAge === "boolean"
        ? data.sippHasProtectedPensionAge
        : false,
    sippProtectedPensionAge:
      typeof data.sippProtectedPensionAge === "number"
        ? data.sippProtectedPensionAge
        : 55,
  };
}

const SETTINGS_MIGRATIONS: Record<number, SettingsMigration> = {
  [LEGACY_UNVERSIONED_SETTINGS_SCHEMA_VERSION]: migrateFromV1ToV2,
  2: migrateFromV2ToV3,
  3: migrateFromV3ToV4,
};

export function migrateSettingsToLatest(
  envelope: StoredSettingsEnvelope<unknown>
) {
  if (envelope.version === SETTINGS_SCHEMA_VERSION) {
    return envelope.data;
  }

  if (
    envelope.version < LEGACY_UNVERSIONED_SETTINGS_SCHEMA_VERSION ||
    envelope.version > SETTINGS_SCHEMA_VERSION
  ) {
    return {};
  }

  let migratedData = envelope.data;

  for (
    let version = envelope.version;
    version < SETTINGS_SCHEMA_VERSION;
    version += 1
  ) {
    const migrate = SETTINGS_MIGRATIONS[version];

    if (!migrate) {
      return {};
    }

    migratedData = migrate(migratedData);
  }

  return migratedData;
}
