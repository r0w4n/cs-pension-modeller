import { createRetirementIncomeSeries } from "./app-domains";
import { APP_MODE_STORAGE_KEY } from "./app/app-persistence";
import { ModeSelection } from "./app/mode-selection";
import { JourneyModeScreen } from "./app/journey-mode-screen";
import { SavedLocalFeedback } from "./app/saved-local-feedback";
import { SettingsPage } from "./app/settings-page";
import { useAppController } from "./app/use-app-controller";
import { SiteFooter } from "./app/site-footer";
import { Helmet } from "./helmet";

function isSettingsRoute() {
  return window.location.pathname.endsWith("/settings/");
}

function App() {
  const {
    activeJourneyDefinition,
    activeJourneyMode,
    activeModeRef,
    acknowledgeNotice,
    appMode,
    exportParameters,
    hasAcknowledgedNotice,
    journeyStepViewModel,
    loadParameters,
    localStorageEnabled,
    clearAllData,
    selectAppMode,
    setLocalStorageEnabled,
    setShowGuidanceNotes,
    settingsFormVersion,
    showGuidanceNotes,
    showSavedFeedback,
    visibleSettings,
  } = useAppController();

  if (isSettingsRoute()) {
    return (
      <SettingsPage
        localStorageEnabled={localStorageEnabled}
        onExportParameters={exportParameters}
        onLoadParameters={loadParameters}
        onLocalStorageEnabledChange={setLocalStorageEnabled}
        onClearAllData={clearAllData}
        showGuidanceNotes={showGuidanceNotes}
        onShowGuidanceNotesChange={setShowGuidanceNotes}
      />
    );
  }

  return (
    <>
      <Helmet>
        <title>Civil Service Pension Modeller</title>
        <meta
          name="description"
          content="Estimate your Civil Service pension and retirement income with a local-only planning tool."
        />
      </Helmet>

      {!hasAcknowledgedNotice ? (
        <div
          className="acknowledgement-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="acknowledgement-title"
        >
          <section className="acknowledgement-card">
            <p className="eyebrow">Before you continue</p>
            <h2 id="acknowledgement-title">Important information</h2>
            <p className="section-copy">
              This modeller is for planning and illustration only. It is not
              financial advice and is not affiliated with the Civil Service
              Pension Scheme, Capita, the Cabinet Office, or the Alpha Pension
              Scheme.
            </p>
            <p className="section-copy">
              Results depend entirely on the assumptions you enter. Check
              important decisions against your official pension statement and,
              where appropriate, a regulated financial adviser.
            </p>
            <p className="section-copy">
              Your inputs are saved locally in your browser so you can come back
              to the same assumptions later. This site does not use analytics
              cookies, and no financial or personal information is transmitted.
            </p>
            <button
              type="button"
              className="secondary-button"
              onClick={acknowledgeNotice}
            >
              I understand
            </button>
          </section>
        </div>
      ) : null}

      <main className="app-shell" aria-hidden={!hasAcknowledgedNotice}>
        <SavedLocalFeedback show={showSavedFeedback} />

        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">Civil Service</p>
            <h1>Retirement Income Modeller</h1>
            <p className="lead">
              Work through a Civil Service pension journey, then review your
              retirement income, funding gaps, key dates, and assumptions.
            </p>
          </div>

          <ModeSelection selectedMode={appMode} onSelectMode={selectAppMode} />
        </section>

        {activeJourneyMode && activeJourneyDefinition ? (
          <JourneyModeScreen
            activeModeRef={activeModeRef}
            mode={activeJourneyMode}
            journey={activeJourneyDefinition}
            settings={visibleSettings}
            settingsFormVersion={settingsFormVersion}
            journeyStepViewModel={journeyStepViewModel}
          />
        ) : null}

        <SiteFooter />
      </main>
    </>
  );
}

export { createRetirementIncomeSeries };
export { APP_MODE_STORAGE_KEY };
export default App;
