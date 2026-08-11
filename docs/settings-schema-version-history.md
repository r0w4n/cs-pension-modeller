# Settings Schema Version History

## Version 9 (current)

- Added `alphaEpaPeriods`, allowing separate dated EPA −1, −2 and −3
  purchase periods.
- Version 8 settings with the former single EPA option are migrated to one
  equivalent period so existing locally saved scenarios keep their meaning.

## Versions 3–8

- Added additional guaranteed incomes, protected pension ages, CS AVCs,
  spending strategies, and flexible-withdrawal priority settings.

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
