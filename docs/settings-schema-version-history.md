# Settings Schema Version History

## Version 2 (current)

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
