import {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  type SettingsKey,
} from "./fieldDefinitions";
import {
  calculateRetirementIncomeTargetAtDate,
  createProjectionTable,
  deriveInflationAssumptions,
  generatePensionSummary,
  type RetirementIncomeDisplay,
} from "./projection";
import {
  type RetirementIncomeBridgeParameters,
  RetirementIncomeBridgeChart,
} from "./RetirementIncomeBridgeChart";
import {
  loadStoredSettings,
  saveSettings,
  validateSettings,
  type PensionSettings,
} from "./settings";
import {
  APP_MODE_STORAGE_KEY,
  loadAcknowledgementState,
  loadStoredAppMode,
  loadStoredGuidanceNotes,
  saveAcknowledgementState,
  saveStoredGuidanceNotes,
  type AppMode,
} from "./app/app-persistence";
import {
  loadComparisonScenario as loadComparisonScenarioAction,
  resetSettings as resetSettingsAction,
  selectAppMode as selectAppModeAction,
  showSavedLabel as showSavedLabelAction,
} from "./app/app-actions";
import {
  updateBridgeChartParameters as updateBridgeChartParametersAction,
  updateSetting as updateSettingAction,
} from "./app/chart-state";
import { ModeSelection } from "./app/mode-selection";
import {
  JourneyFlow as JourneyFlowFeature,
  JourneySection,
} from "./app/journey";
import {
  ResultsSummarySection,
  InflationBasisPanel as InflationBasisPanelFeature,
} from "./app/results-summary";
import {
  ComparisonPanel as ComparisonPanelFeature,
  ComparisonSection,
  PensionSummarySection as PensionSummarySectionFeature,
} from "./app/comparison";
import {
  ProjectionTableSection as ProjectionTableSectionFeature,
  ProjectionTableSectionContainer,
} from "./app/projection-table";
import {
  JOURNEY_DEFINITIONS,
  addYearsToIsoDate,
  buildComparisonStatusItems,
  buildRetirementIncomeItems,
  clonePensionSettings,
  createBridgeChartLimits,
  createBridgeChartParameters,
  createComparisonResult,
  createRetirementIncomeSeries,
  formatCurrencyDetailed,
  getRetirementIncomeTargetTitle,
  getRetirementIncomeTitle,
  getSettingsSignature,
  loadStoredComparisonScenarios,
  saveStoredComparisonScenarios,
  type BridgeAnswerResultCache,
  type ComparisonResultCache,
  type ComparisonScenario,
} from "./app-domains";
import {
  useMobileDateDropdowns as useMobileDateDropdownsHook,
} from "./app/form-fields";
import { JourneyStepContent } from "./app/journey-step-content";
import { SettingsPanel } from "./app/settings-panel";
import { SiteFooter } from "./app/site-footer";

function App() {
  const [settings, setSettings] = useState<PensionSettings>(loadStoredSettings);
  const [chartUndoStack, setChartUndoStack] = useState<PensionSettings[]>([]);
  const [settingsFormVersion, setSettingsFormVersion] = useState(0);
  const [appMode, setAppMode] = useState<AppMode | null>(loadStoredAppMode);
  const [showGuidanceNotes, setShowGuidanceNotes] = useState(
    loadStoredGuidanceNotes,
  );
  const [retirementIncomeDisplay, setRetirementIncomeDisplay] =
    useState<RetirementIncomeDisplay>("monthly");
  const [comparisonScenarios, setComparisonScenarios] = useState<
    ComparisonScenario[]
  >(loadStoredComparisonScenarios);
  const [showLimitations, setShowLimitations] = useState(false);
  const [hasAcknowledgedNotice, setHasAcknowledgedNotice] = useState(
    loadAcknowledgementState,
  );
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);
  const savedFeedbackTimer = useRef<ReturnType<typeof window.setTimeout> | null>(
    null,
  );
  const [comparisonResultCache] = useState<ComparisonResultCache>(() => new Map());
  const [bridgeAnswerResultCache] = useState<BridgeAnswerResultCache>(
    () => new Map(),
  );
  const activeModeRef = useRef<HTMLDivElement | null>(null);
  const shouldFocusActiveMode = useRef(false);
  const scrollActiveModeIntoView = useCallback(() => {
    window.requestAnimationFrame(() => {
      activeModeRef.current?.focus({ preventScroll: true });
      if (typeof activeModeRef.current?.scrollIntoView === "function") {
        activeModeRef.current.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    });
  }, []);
  const useDropdownDates = useMobileDateDropdownsHook();
  const deferredSettings = useDeferredValue(settings);
  const visibleSettings = settings;
  const validationIssues = useMemo(
    () => validateSettings(deferredSettings),
    [deferredSettings],
  );
  const projectionRows = useMemo(
    () =>
      appMode === "bridge" || appMode === "simple"
        ? []
        : createProjectionTable(deferredSettings),
    [appMode, deferredSettings],
  );
  const pensionSummary = useMemo(
    () =>
      appMode === "bridge" || appMode === "simple"
        ? null
        : generatePensionSummary(projectionRows, deferredSettings),
    [appMode, projectionRows, deferredSettings],
  );
  const retirementIncomeSeries = useMemo(
    () => createRetirementIncomeSeries(projectionRows, deferredSettings),
    [projectionRows, deferredSettings],
  );
  const bridgeChartParameters = useMemo(
    () => createBridgeChartParameters(settings),
    [settings],
  );
  const bridgeChartLimits = useMemo(
    () => createBridgeChartLimits(settings),
    [settings],
  );
  const derivedInflationAssumptions = useMemo(
    () => deriveInflationAssumptions(deferredSettings),
    [deferredSettings],
  );
  const retirementIncomeTitle = getRetirementIncomeTitle(
    visibleSettings.taxationEnabled,
    retirementIncomeDisplay,
  );
  const retirementIncomeItems = pensionSummary
    ? buildRetirementIncomeItems(pensionSummary, retirementIncomeDisplay)
    : [];
  const retirementIncomeTotal = formatCurrencyDetailed(
    retirementIncomeDisplay === "monthly"
      ? (pensionSummary?.retirementIncome.totalMonthlyIncome ?? 0)
      : (pensionSummary?.retirementIncome.totalAnnualIncome ?? 0),
  );
  const retirementIncomeTargetTitle =
    getRetirementIncomeTargetTitle(retirementIncomeDisplay);
  const annualRetirementIncomeTarget = calculateRetirementIncomeTargetAtDate(
    settings,
    addYearsToIsoDate(settings.dateOfBirth, settings.requirementAge),
  );
  const retirementIncomeTarget = formatCurrencyDetailed(
    retirementIncomeDisplay === "monthly"
      ? annualRetirementIncomeTarget / 12
      : annualRetirementIncomeTarget,
  );
  const currentComparisonResult = useMemo(
    () =>
      appMode === "expert" && retirementIncomeDisplay
        ? createComparisonResult(
            {
              id: "current-model",
              name: "Current model",
              settings: clonePensionSettings(settings),
              createdAt: "",
              updatedAt: "",
            },
            getSettingsSignature(settings),
            comparisonResultCache,
          )
        : null,
    [appMode, comparisonResultCache, retirementIncomeDisplay, settings],
  );

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    saveStoredComparisonScenarios(comparisonScenarios);
  }, [comparisonScenarios]);

  useEffect(() => {
    saveStoredGuidanceNotes(showGuidanceNotes);
  }, [showGuidanceNotes]);

  useEffect(() => {
    if (!appMode || !shouldFocusActiveMode.current) {
      return;
    }

    shouldFocusActiveMode.current = false;
    scrollActiveModeIntoView();
  }, [appMode, scrollActiveModeIntoView]);

  useEffect(() => {
    const savedFeedbackTimeout = savedFeedbackTimer.current;
    return () => {
      if (savedFeedbackTimeout) {
        window.clearTimeout(savedFeedbackTimeout);
      }
    };
  }, []);

  useEffect(() => {
    const handleUndoShortcut = (event: globalThis.KeyboardEvent) => {
      if (
        event.key.toLowerCase() !== "z" ||
        event.shiftKey ||
        event.altKey ||
        (!event.metaKey && !event.ctrlKey) ||
        chartUndoStack.length === 0 ||
        isEditableShortcutTarget(event.target)
      ) {
        return;
      }

      event.preventDefault();
      setChartUndoStack((current) => {
        const previousSettings = current.at(-1);

        if (!previousSettings) {
          return current;
        }

        setSettings(previousSettings);
        return current.slice(0, -1);
      });
    };

    window.addEventListener("keydown", handleUndoShortcut);

    return () => window.removeEventListener("keydown", handleUndoShortcut);
  }, [chartUndoStack.length]);

  function updateSetting<K extends SettingsKey>(key: K, value: PensionSettings[K]) {
    updateSettingAction({
      key,
      value,
      showSavedLabel,
      startTransition,
      setChartUndoStack,
      setSettings,
    });
  }

  function updateBridgeChartParameters(
    patch: Partial<RetirementIncomeBridgeParameters>,
  ) {
    updateBridgeChartParametersAction({
      patch,
      settings,
      showSavedLabel,
      setChartUndoStack,
      setSettings,
    });
  }

  function resetSettings() {
    resetSettingsAction({
      savedFeedbackTimerRef: savedFeedbackTimer,
      setShowSavedFeedback,
      setChartUndoStack,
      setSettingsFormVersion,
      setSettings,
    });
  }

  function loadComparisonScenario(scenarioSettings: PensionSettings) {
    loadComparisonScenarioAction({
      savedFeedbackTimerRef: savedFeedbackTimer,
      setShowSavedFeedback,
      scenarioSettings,
      setChartUndoStack,
      setSettingsFormVersion,
      setSettings,
    });
  }

  function showSavedLabel() {
    showSavedLabelAction({
      savedFeedbackTimerRef: savedFeedbackTimer,
      setShowSavedFeedback,
    });
  }

  return (
    <>
      {!hasAcknowledgedNotice ? (
        <div className="acknowledgement-overlay" role="dialog" aria-modal="true" aria-labelledby="acknowledgement-title">
          <section className="acknowledgement-card">
            <p className="eyebrow">Before you continue</p>
            <h2 id="acknowledgement-title">Important information</h2>
            <p className="section-copy">
              This modeller is for planning and illustration only. It is not financial
              advice and is not affiliated with the Civil Service Pension Scheme, Capita,
              the Cabinet Office, or the Alpha Pension Scheme.
            </p>
            <p className="section-copy">
              Results depend entirely on the assumptions you enter. Check important
              decisions against your official pension statement and, where appropriate, a
              regulated financial adviser.
            </p>
            <p className="section-copy">
              Your inputs are saved locally in your browser so you can come back to the
              same assumptions later. This site does not use analytics cookies, and no
              financial or personal information is transmitted.
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
        {showSavedFeedback ? (
          <span className="saved-feedback" role="status" aria-live="polite">
            Saved Locally
          </span>
        ) : null}

        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">Civil Service</p>
            <h1>Retirement Income Modeller</h1>
            <p className="lead">
              Work through a Civil Service pension journey, then review your retirement
              income, funding gaps, key dates, and assumptions.
            </p>
          </div>

          <ModeSelection selectedMode={appMode} onSelectMode={selectAppMode} />
        </section>

        {appMode === "bridge" ? (
          <JourneySection activeModeRef={activeModeRef}>
            <JourneyFlowFeature
              key="early-retirement-bridge"
              journey={JOURNEY_DEFINITIONS[0]}
              settings={visibleSettings}
              showGuidanceNotes={showGuidanceNotes}
              onShowGuidanceNotesChange={setShowGuidanceNotes}
              renderStepContent={(step) => (
                <JourneyStepContent
                  step={step}
                  settings={visibleSettings}
                  validationIssues={validationIssues}
                  pensionSummary={pensionSummary}
                  retirementIncomeSeries={retirementIncomeSeries}
                  bridgeChartParameters={bridgeChartParameters}
                  bridgeChartLimits={bridgeChartLimits}
                  derivedInflationAssumptions={derivedInflationAssumptions}
                  retirementIncomeDisplay={retirementIncomeDisplay}
                  retirementIncomeItems={retirementIncomeItems}
                  retirementIncomeTitle={retirementIncomeTitle}
                  retirementIncomeTotal={retirementIncomeTotal}
                  retirementIncomeTargetTitle={retirementIncomeTargetTitle}
                  retirementIncomeTarget={retirementIncomeTarget}
                  useDropdownDates={useDropdownDates}
                  onChange={updateSetting}
                  onChangeChartParameters={updateBridgeChartParameters}
                  comparisonScenarios={comparisonScenarios}
                  comparisonResultCache={comparisonResultCache}
                  bridgeAnswerResultCache={bridgeAnswerResultCache}
                  onScenariosChange={setComparisonScenarios}
                  onLoadScenario={loadComparisonScenario}
                  onRetirementIncomeDisplayChange={setRetirementIncomeDisplay}
                  showGuidanceNotes={showGuidanceNotes}
                  showLimitations={showLimitations}
                  onToggleLimitations={() => setShowLimitations((current) => !current)}
                />
              )}
            />
          </JourneySection>
        ) : null}

        {appMode === "simple" ? (
          <JourneySection activeModeRef={activeModeRef}>
            <JourneyFlowFeature
              key="simple-early-retirement"
              journey={JOURNEY_DEFINITIONS[1]}
              settings={visibleSettings}
              showGuidanceNotes={showGuidanceNotes}
              onShowGuidanceNotesChange={setShowGuidanceNotes}
              renderStepContent={(step) => (
                <JourneyStepContent
                  step={step}
                  settings={visibleSettings}
                  validationIssues={validationIssues}
                  pensionSummary={pensionSummary}
                  retirementIncomeSeries={retirementIncomeSeries}
                  bridgeChartParameters={bridgeChartParameters}
                  bridgeChartLimits={bridgeChartLimits}
                  derivedInflationAssumptions={derivedInflationAssumptions}
                  retirementIncomeDisplay={retirementIncomeDisplay}
                  retirementIncomeItems={retirementIncomeItems}
                  retirementIncomeTitle={retirementIncomeTitle}
                  retirementIncomeTotal={retirementIncomeTotal}
                  retirementIncomeTargetTitle={retirementIncomeTargetTitle}
                  retirementIncomeTarget={retirementIncomeTarget}
                  useDropdownDates={useDropdownDates}
                  onChange={updateSetting}
                  onChangeChartParameters={updateBridgeChartParameters}
                  comparisonScenarios={comparisonScenarios}
                  comparisonResultCache={comparisonResultCache}
                  bridgeAnswerResultCache={bridgeAnswerResultCache}
                  onScenariosChange={setComparisonScenarios}
                  onLoadScenario={loadComparisonScenario}
                  onRetirementIncomeDisplayChange={setRetirementIncomeDisplay}
                  showGuidanceNotes={showGuidanceNotes}
                  showLimitations={showLimitations}
                  onToggleLimitations={() => setShowLimitations((current) => !current)}
                />
              )}
            />
          </JourneySection>
        ) : null}

        {appMode === "expert" ? (
          <JourneySection activeModeRef={activeModeRef}>
            <ResultsSummarySection>
              <PensionSummarySectionFeature
                activeResult={currentComparisonResult}
                headingLevel={2}
                description="This summary is generated from the current calculation result, so the same structure can later support side-by-side scenario comparisons."
                retirementIncomeDisplay={retirementIncomeDisplay}
                onRetirementIncomeDisplayChange={setRetirementIncomeDisplay}
                retirementIncomeItems={retirementIncomeItems}
                retirementIncomeTitle={retirementIncomeTitle}
                retirementIncomeTotal={retirementIncomeTotal}
                retirementIncomeTargetTitle={retirementIncomeTargetTitle}
                retirementIncomeTarget={retirementIncomeTarget}
                statusItems={currentComparisonResult ? buildComparisonStatusItems(currentComparisonResult) : []}
                showLimitations={showLimitations}
                onToggleLimitations={() => setShowLimitations((current) => !current)}
              />
            </ResultsSummarySection>

            <section className="layout">
              <SettingsPanel
                settings={settings}
                settingsFormVersion={settingsFormVersion}
                validationIssues={validationIssues}
                onChange={updateSetting}
                onReset={resetSettings}
                showGuidanceNotes={showGuidanceNotes}
                onShowGuidanceNotesChange={setShowGuidanceNotes}
                useDropdownDates={useDropdownDates}
                pensionSummary={pensionSummary}
              />
            </section>

            <InflationBasisPanelFeature
              settings={deferredSettings}
              assumptions={derivedInflationAssumptions}
            />

            <RetirementIncomeBridgeChart
              data={retirementIncomeSeries}
              alphaLabel="Alpha pension"
              limits={bridgeChartLimits}
              statePensionEditable
              validationIssues={validationIssues}
              onChangeParameters={updateBridgeChartParameters}
              {...bridgeChartParameters}
            />

          </JourneySection>
        ) : null}

        {appMode === "expert" ? (
          <ComparisonSection>
            <ComparisonPanelFeature
              settings={settings}
              validationIssues={validationIssues}
              scenarios={comparisonScenarios}
              comparisonResultCache={comparisonResultCache}
              onScenariosChange={setComparisonScenarios}
              onLoadScenario={loadComparisonScenario}
            />
          </ComparisonSection>
        ) : null}

        {appMode === "expert" ? (
          <ProjectionTableSectionContainer>
            <ProjectionTableSectionFeature rows={projectionRows} settings={settings} />
          </ProjectionTableSectionContainer>
        ) : null}

        <SiteFooter />
      </main>
    </>
  );

  function acknowledgeNotice() {
    setHasAcknowledgedNotice(true);
    saveAcknowledgementState();
  }

function selectAppMode(mode: AppMode) {
    selectAppModeAction({
      mode,
      currentMode: appMode,
      setSettings,
      setChartUndoStack,
      shouldFocusActiveModeRef: shouldFocusActiveMode,
      scrollActiveModeIntoView,
      setAppMode,
    });
  }
}

function isEditableShortcutTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();

  return (
    target.isContentEditable ||
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select"
  );
}

export { createRetirementIncomeSeries };
export { APP_MODE_STORAGE_KEY };
export default App;
