import type {
  StoredPensionSettings,
  StoredPensionSettingsByJourney,
} from "./settings-types";

export const LEGACY_UNVERSIONED_SETTINGS_SCHEMA_VERSION = 1;
export const SETTINGS_SCHEMA_VERSION = 14;

export type StoredJourneySettingsData = {
  journeys: StoredPensionSettingsByJourney;
};

export type StoredSettingsEnvelope<TData = StoredJourneySettingsData> = {
  version: number;
  data: TData;
};

export type LegacyStoredSettingsEnvelope =
  StoredSettingsEnvelope<StoredPensionSettings>;
