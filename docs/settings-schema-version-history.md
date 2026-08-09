# Settings Schema Version History

## Version 10 (current)

- Added `statePensionForecastConfirmed` so the modeller can distinguish a
  personalised forecast from the fallback full-rate assumption.
- Version 9 settings are migrated with the confirmation set to `false`. This
  avoids treating an existing State Pension amount as personally confirmed.

## Version 2

- Introduced a versioned storage envelope for `cs-pension-modeller.settings`.
- Stored settings now use `{ version, data }` rather than a bare settings object.
- Legacy unversioned browser data is migrated automatically on load.

Migration notes:

- `targetRetirementAge` is migrated to `requirementAge`.
- Legacy payloads that relied on `isaDrawAge` as the retirement-age fallback keep that behaviour during migration.

## Version 1 (legacy unversioned storage)

- Settings were stored as a plain JSON object with no schema version.
- Compatibility for renamed fields lived inside storage coercion.

Status:

- Still supported on read through automatic migration to Version 2.
