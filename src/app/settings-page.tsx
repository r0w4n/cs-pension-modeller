import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { resolveAppBaseHref } from "./app-base";
import { GuidanceNotesToggle } from "./journey";
import { SavedLocalFeedback } from "./saved-local-feedback";
import { SiteFooter } from "./site-footer";
import { Helmet } from "../helmet";

type SettingsPageProps = {
  localStorageEnabled: boolean;
  onClearAllData: () => void;
  onExportParameters: () => void;
  onLoadParameters: (input: unknown) => boolean;
  onLocalStorageEnabledChange: (enabled: boolean) => void;
  showGuidanceNotes: boolean;
  onShowGuidanceNotesChange: (checked: boolean) => void;
};

export function SettingsPage({
  localStorageEnabled,
  onClearAllData,
  onExportParameters,
  onLoadParameters,
  onLocalStorageEnabledChange,
  showGuidanceNotes,
  onShowGuidanceNotesChange,
}: SettingsPageProps) {
  const feedbackTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(
    null
  );
  const [actionFeedback, setActionFeedback] = useState("");
  const [fileInputVersion, setFileInputVersion] = useState(0);
  const [loadError, setLoadError] = useState("");
  const appBaseHref = resolveAppBaseHref();

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) {
        window.clearTimeout(feedbackTimerRef.current);
      }
    };
  }, []);

  function showActionFeedback(message: string) {
    if (feedbackTimerRef.current) {
      window.clearTimeout(feedbackTimerRef.current);
    }

    setActionFeedback(message);
    feedbackTimerRef.current = window.setTimeout(() => {
      setActionFeedback("");
      feedbackTimerRef.current = null;
    }, 1400);
  }

  function exportParameters() {
    onExportParameters();
    showActionFeedback("Parameters exported");
  }

  function clearAllData() {
    onClearAllData();
    showActionFeedback("Data Cleared");
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

      if (loaded) {
        setLoadError("");
        showActionFeedback("Parameters loaded");
      } else {
        setLoadError(
          "Could not load that file. Choose a JSON parameter export."
        );
      }
    } catch {
      setLoadError("Could not load that file. Choose a JSON parameter export.");
    } finally {
      input.value = "";
      setFileInputVersion((current) => current + 1);
    }
  }

  function updateLocalStoragePreference(event: ChangeEvent<HTMLInputElement>) {
    const enabled = event.currentTarget.checked;

    onLocalStorageEnabledChange(enabled);
    showActionFeedback(
      enabled ? "Local saving turned on" : "Local saving turned off"
    );
  }

  function updateGuidanceNotesPreference(checked: boolean) {
    onShowGuidanceNotesChange(checked);
    showActionFeedback("Settings saved");
  }

  return (
    <main className="app-shell">
      <Helmet>
        <title>Settings | Civil Service Pension Modeller</title>
        <meta
          name="description"
          content="Manage saved assumptions, local storage, and guidance notes for this browser."
        />
      </Helmet>

      <SavedLocalFeedback
        message={actionFeedback}
        show={actionFeedback.length > 0}
      />

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

      <section className="panel settings-panel">
        <div className="settings-action-grid">
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
            {loadError ? (
              <p className="field-help" role="alert">
                {loadError}
              </p>
            ) : null}
          </section>

          <section className="field-card">
            <span className="field-label">Clear all data</span>
            <p className="field-help">
              This will delete all data from this device for this site,
              including pension, savings, tax, inflation, and preference
              settings.
            </p>

            <div className="settings-panel-actions">
              <button
                type="button"
                className="secondary-button settings-reset-button"
                onClick={clearAllData}
              >
                Clear all data
              </button>
            </div>
          </section>

          <section className="field-card checkbox-field-card">
            <span className="field-label">Local saving</span>
            <p className="field-help">
              Choose whether the app saves inputs and preferences in this
              browser. Turning this off removes saved parameters from local
              storage and stops future automatic saves.
            </p>

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={localStorageEnabled}
                onChange={updateLocalStoragePreference}
              />
              <span>Save inputs on this device</span>
            </label>
          </section>

          <section className="field-card checkbox-field-card">
            <span className="field-label">Guidance notes</span>
            <p className="field-help">
              Show the inline guidance text on journey steps and form fields.
              Turn this off if you want a more compact view.
            </p>

            <GuidanceNotesToggle
              checked={showGuidanceNotes}
              onChange={updateGuidanceNotesPreference}
            />
          </section>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
