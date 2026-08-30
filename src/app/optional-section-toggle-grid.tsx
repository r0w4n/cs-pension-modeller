import {
  OPTIONAL_SECTION_TOGGLES,
  type JourneyOptionalSectionCopy,
  type OptionalSectionToggleKey,
} from "../app-domains";
import type { PensionSettings } from "../settings";
import type { SettingsFieldOnChange } from "./form-fields";

export type CheckboxFieldGridItem = {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

/** Shared field-card presentation for independent yes/no options. */
export function CheckboxFieldGrid({
  items,
}: {
  items: readonly CheckboxFieldGridItem[];
}) {
  return (
    <div className="field-grid">
      {items.map((item) => (
        <label key={item.id} className="field-card checkbox-field-card">
          <span className="field-header">
            <span className="field-label-group">
              <span className="field-label">{item.label}</span>
            </span>
          </span>
          <span className="checkbox-row">
            <input
              aria-label={item.label}
              type="checkbox"
              checked={item.checked}
              onChange={(event) => item.onChange(event.target.checked)}
            />
            <span>{item.description}</span>
          </span>
        </label>
      ))}
    </div>
  );
}

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
      ).sort(
        (left, right) =>
          toggleKeys.indexOf(left.key) - toggleKeys.indexOf(right.key)
      )
    : OPTIONAL_SECTION_TOGGLES;

  return (
    <CheckboxFieldGrid
      items={visibleToggles.map((toggle) => {
        const copy = toggleCopy?.[toggle.key] ?? toggle;

        return {
          id: toggle.key,
          label: copy.label,
          description: copy.description,
          checked: settings[toggle.key],
          onChange: (checked) => onChange(toggle.key, checked),
        };
      })}
    />
  );
}
