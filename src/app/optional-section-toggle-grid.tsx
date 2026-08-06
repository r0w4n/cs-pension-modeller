import {
  OPTIONAL_SECTION_TOGGLES,
  type JourneyOptionalSectionCopy,
  type OptionalSectionToggleKey,
} from "../app-domains";
import type { PensionSettings } from "../settings";
import type { SettingsFieldOnChange } from "./form-fields";

export function OptionalSectionToggleGrid({
  settings,
  onChange,
  toggleKeys,
  toggleCopy,
}: {
  settings: PensionSettings;
  onChange: SettingsFieldOnChange;
  toggleKeys?: readonly OptionalSectionToggleKey[];
  toggleCopy?: JourneyOptionalSectionCopy;
}) {
  const visibleToggles = toggleKeys
    ? OPTIONAL_SECTION_TOGGLES.filter((toggle) =>
        toggleKeys.includes(toggle.key)
      )
    : OPTIONAL_SECTION_TOGGLES;

  return (
    <div className="field-grid">
      {visibleToggles.map((toggle) => {
        const copy = toggleCopy?.[toggle.key] ?? toggle;

        return (
          <label key={toggle.key} className="field-card checkbox-field-card">
            <span className="field-header">
              <span className="field-label-group">
                <span className="field-label">{copy.label}</span>
              </span>
            </span>
            <span className="checkbox-row">
              <input
                aria-label={copy.label}
                type="checkbox"
                checked={settings[toggle.key]}
                onChange={(event) => onChange(toggle.key, event.target.checked)}
              />
              <span>{copy.description}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
}
