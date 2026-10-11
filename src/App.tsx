import { useEffect, useRef } from "react";
import {
  applyAnalyticsConsent,
  disableAnalytics,
  trackPageView,
} from "./analytics";
import { createRetirementIncomeSeries } from "./result-projection/retirement-income";
import { APP_MODE_STORAGE_KEY } from "./app/app-persistence";
import { ModeSelection } from "./app/mode-selection";
import { JourneyModeScreen } from "./app/journey-mode-screen";
import { SavedLocalFeedback } from "./app/saved-local-feedback";
import { SettingsPage } from "./app/settings-page";
import { useAppController } from "./app/use-app-controller";
import { SiteFooter } from "./app/site-footer";
import { SupportPrompt, SupportPromptThankYou } from "./app/support-prompt";
import { Helmet } from "./helmet";
import { ImportantInformationDialog } from "./app/important-information-dialog";

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
    analyticsConsentGranted,
    exportParameters,
    hasAcknowledgedNotice,
    journeyStepViewModel,
    loadParameters,
    localStorageEnabled,
    onResultsStepActiveChange,
    clearAllData,
    selectAppMode,
    setAnalyticsConsent,
    setLocalStorageEnabled,
    setShowGuidanceNotes,
    settingsFormVersion,
    showGuidanceNotes,
    showSavedFeedback,
    supportPrompt,
    visibleSettings,
  } = useAppController();
  const hasTrackedPageViewRef = useRef(false);

  useEffect(() => {
    if (!hasAcknowledgedNotice) {
      disableAnalytics();
      return;
    }

    if (applyAnalyticsConsent(analyticsConsentGranted)) {
      if (!hasTrackedPageViewRef.current) {
        trackPageView();
        hasTrackedPageViewRef.current = true;
      }
    }
  }, [analyticsConsentGranted, hasAcknowledgedNotice]);

  if (isSettingsRoute()) {
    return (
      <SettingsPage
        analyticsConsentGranted={analyticsConsentGranted}
        localStorageEnabled={localStorageEnabled}
        onExportParameters={exportParameters}
        onLoadParameters={loadParameters}
        onAnalyticsConsentChange={setAnalyticsConsent}
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
          content="Estimate your Civil Service pension and retirement income with a browser-based planning tool."
        />
      </Helmet>

      {!hasAcknowledgedNotice ? (
        <ImportantInformationDialog onContinue={acknowledgeNotice} />
      ) : null}

      <main
        className="app-shell"
        aria-hidden={!hasAcknowledgedNotice || supportPrompt.isOpen}
      >
        <SavedLocalFeedback show={showSavedFeedback} />
        <SupportPromptThankYou
          show={supportPrompt.showThankYouStatus}
          onDismiss={supportPrompt.dismissThankYouStatus}
        />

        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">Civil Service Pensions</p>
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
            onResultsStepActiveChange={onResultsStepActiveChange}
          />
        ) : null}

        <SiteFooter />
      </main>
      {hasAcknowledgedNotice ? <SupportPrompt prompt={supportPrompt} /> : null}
    </>
  );
}

export { createRetirementIncomeSeries };
export { APP_MODE_STORAGE_KEY };
export default App;
