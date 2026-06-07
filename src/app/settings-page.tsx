import { useState, type ChangeEvent } from "react";
import { resolveAppBaseHref } from "./app-base";
import { SiteFooter } from "./site-footer";

type SettingsPageProps = {
  localStorageEnabled: boolean;
  onExportParameters: () => void;
  onLoadParameters: (input: unknown) => boolean;
  onLocalStorageEnabledChange: (enabled: boolean) => void;
  onResetParameters: () => void;
};

type SettingsStatusSection = "export" | "load" | "reset" | "saving";

export function SettingsPage({
  localStorageEnabled,
  onExportParameters,
  onLoadParameters,
  onLocalStorageEnabledChange,
  onResetParameters,
}: SettingsPageProps) {
  const [status, setStatus] = useState<{
    message: string;
    section: SettingsStatusSection;
  } | null>(null);
  const [fileInputVersion, setFileInputVersion] = useState(0);
  const appBaseHref = resolveAppBaseHref();

  function showStatus(section: SettingsStatusSection, message: string) {
    setStatus({ section, message });
  }

  function exportParameters() {
    onExportParameters();
    showStatus("export", "Parameters exported.");
  }

  function resetParameters() {
    onResetParameters();
    showStatus("reset", "Parameters reset.");
  }

  async function loadParameters(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      const loaded = onLoadParameters(parsed);

      showStatus(
        "load",
        loaded
          ? "Parameters loaded."
          : "Could not load that file. Choose a JSON parameter export."
      );
    } catch {
      showStatus(
        "load",
        "Could not load that file. Choose a JSON parameter export."
      );
    } finally {
      input.value = "";
      setFileInputVersion((current) => current + 1);
    }
  }

  function updateLocalStoragePreference(event: ChangeEvent<HTMLInputElement>) {
    const enabled = event.currentTarget.checked;

    onLocalStorageEnabledChange(enabled);
    showStatus(
      "saving",
      enabled
        ? "Local saving turned on."
        : "Local saving turned off. Saved parameters were removed from this browser."
    );
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Civil Service</p>
          <h1>Settings</h1>
          <p className="lead">Manage saved assumptions for this browser.</p>
          <a className="static-backlink" href={appBaseHref}>
            Back to the modeller
          </a>
        </div>
      </section>

      <section className="settings-action-grid">
        <section className="field-card">
          <span className="field-label">Export parameters</span>
          <p className="field-help">
            Download the current assumptions as a JSON file. This is useful if
            you want a backup or want to move the same scenario to another
            browser.
          </p>

          <div className="settings-panel-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={exportParameters}
            >
              Export parameters
            </button>
          </div>
          <SettingsStatus status={status} section="export" />
        </section>

        <section className="field-card">
          <span className="field-label">Load parameters</span>
          <p className="field-help">
            Load a JSON parameter export from this modeller. Imported
            assumptions replace the current scenario in the app.
          </p>

          <label className="date-select-label" htmlFor="parameter-file">
            Choose JSON parameter file
          </label>
          <input
            key={fileInputVersion}
            className="settings-file-input"
            id="parameter-file"
            type="file"
            accept="application/json,.json"
            onChange={(event) => {
              void loadParameters(event);
            }}
          />
          <SettingsStatus status={status} section="load" />
        </section>

        <section className="field-card">
          <span className="field-label">Reset parameters</span>
          <p className="field-help">
            Reset pension, savings, tax, and inflation assumptions to the
            modeller defaults.
          </p>

          <div className="settings-panel-actions">
            <button
              type="button"
              className="secondary-button settings-reset-button"
              onClick={resetParameters}
            >
              Reset parameters
            </button>
          </div>
          <SettingsStatus status={status} section="reset" />
        </section>

        <section className="field-card checkbox-field-card">
          <span className="field-label">Local saving</span>
          <p className="field-help">
            Choose whether the app saves inputs and preferences in this browser.
            Turning this off removes saved parameters from local storage and
            stops future automatic saves.
          </p>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={localStorageEnabled}
              onChange={updateLocalStoragePreference}
            />
            <span>Save inputs on this device</span>
          </label>
          <SettingsStatus status={status} section="saving" />
        </section>
      </section>

      <SiteFooter />
    </main>
  );
}

function SettingsStatus({
  section,
  status,
}: {
  section: SettingsStatusSection;
  status: { message: string; section: SettingsStatusSection } | null;
}) {
  if (!status || status.section !== section) {
    return null;
  }

  return (
    <p className="field-help" role="status">
      {status.message}
    </p>
  );
}
