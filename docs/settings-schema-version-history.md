# Settings Schema Version History

## Version 9 (current)

- Added `taxRegime` so saved plans can select the rest-of-UK or Scottish
  2026/27 Income Tax rules.
- Existing plans migrate to `rest_of_uk`, preserving their previous tax
  calculation.

## Versions 3 to 8

- Added settings for guaranteed income, protected pension ages, Civil Service
  AVCs, spending phases, and flexible-account withdrawal priority.
- Each version supplied explicit defaults so older saved plans retained their
  previous behaviour.

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
