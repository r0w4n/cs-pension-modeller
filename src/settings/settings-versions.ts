import type { StoredPensionSettings } from "./settings-types";

export const LEGACY_UNVERSIONED_SETTINGS_SCHEMA_VERSION = 1;
export const SETTINGS_SCHEMA_VERSION = 2;

export type StoredSettingsEnvelope<TData = StoredPensionSettings> = {
  version: number;
  data: TData;
};
