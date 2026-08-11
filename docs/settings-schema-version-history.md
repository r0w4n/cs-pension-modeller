# Settings Schema Version History

## Version 12 (current)

- Added `alphaEpaPeriods`, allowing separate dated EPA −1, −2 and −3
  purchase periods.
- Version 11 settings with the former single EPA option are migrated to one
  equivalent period so existing locally saved scenarios keep their meaning.

## Version 11

- Added explicit SIPP and Civil Service AVC withdrawal-tax treatments.
- New plans track one shared pension lump-sum allowance and prior allowance use.
- Version 10 plans migrate to their existing custom percentage treatment with
  allowance tracking disabled, preserving their previous projections until the
  user opts into the tracked treatment.

## Version 10

- New plans enable the simplified Income Tax estimate by default so retirement
  targets are assessed as take-home income after estimated tax.
- Existing saved plans preserve their previous Income Tax setting. Plans that
  pre-date the setting migrate with taxation disabled to avoid changing their
  results silently.

## Version 9

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
