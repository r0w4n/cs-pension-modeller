import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  type CurrencyInputField,
  fieldGroups,
  type DateField,
  type FieldDefinition,
  type RangeField,
  type SettingsKey,
  type SelectField,
} from "./fieldDefinitions";
import {
  calculateRetirementIncomeTargetAtDate,
  createProjectionTable,
  deriveInflationAssumptions,
  generatePensionSummary,
  type RetirementIncomeDisplay,
  type PensionSummary,
  type ProjectionRow,
} from "./projection";
import {
  RetirementIncomeBridgeChart,
  type RetirementIncomeBridgeLimits,
  type RetirementIncomeBridgeParameters,
  type RetirementIncomePoint,
} from "./RetirementIncomeBridgeChart";
import {
  calculateDateAge,
  calculateMinimumStatePensionDrawAge,
  calculateMinimumPensionAccessAge,
  calculateMinimumSippAccessAge,
  createDefaultAddedPensionLumpSum,
  calculateNormalPensionAge,
  calculateStatePensionDrawAge,
  createDefaultSettings,
  defaultSettings,
  formatCurrency,
  getAlphaAbsYear,
  calculateStatePensionDrawDateFromAge,
  calculateStatePensionDrawDate,
  loadStoredSettings,
  MAX_ADDED_PENSION_PURCHASE_INPUT_AGE,
  normalizeAlphaPensionDrawAge,
  normalizeSetting,
  normalizeSippDrawAge,
  normalizeStatePensionDrawAge,
  normalizeStatePensionDrawDate,
  readStorageItem,
  saveSettings,
  validateSettings,
  writeStorageItem,
  type AddedPensionLumpSum,
  type PensionSettings,
  type PensionValidationIssue,
} from "./settings";
import { knowledgeLinks } from "./knowledgeLinks";

const ACKNOWLEDGEMENT_STORAGE_KEY = "cs-pension-modeller.acknowledgement";
const ACKNOWLEDGEMENT_VERSION = "v1";
export const APP_MODE_STORAGE_KEY = "cs-pension-modeller.appMode";
const MODELLER_LIMITATIONS = [
  "Income Tax is estimated from configurable standard assumptions. It does not cover Scottish tax bands, benefit interactions, tax code changes, or other personal reliefs.",
  "Inflation is only modelled where explicit CPI or growth assumptions are enabled.",
  "State Pension modelling does not cover benefit interactions, overseas rules, lump-sum arrears choices, or pre-2016 deferral rules.",
  "Added pension purchase revaluation is simplified.",
  "Scheme-specific edge cases are not exhaustively represented.",
] as const;
const OPTIONAL_SECTION_TOGGLES = [
  {
    key: "partialRetirementEnabled",
    label: "Partial retirement",
    description:
      "Show partial retirement inputs and pro-rate regular accruals and contributions.",
  },
  {
    key: "showStatePension",
    label: "State Pension",
    description:
      "Show State Pension inputs and include State Pension values in the modeller.",
  },
  {
    key: "showNuvos",
    label: "nuvos",
    description: "Show nuvos inputs and include nuvos values in the modeller.",
  },
  {
    key: "showSipp",
    label: "SIPP",
    description: "Show SIPP inputs and include SIPP values in the modeller.",
  },
  {
    key: "showIsa",
    label: "ISA",
    description: "Show ISA inputs and include ISA values in the modeller.",
  },
  {
    key: "taxationEnabled",
    label: "Taxation",
    description:
      "Show tax assumptions and estimate take-home income after Income Tax.",
  },
] as const;

type AppMode = "journey" | "expert";

type JourneyStepDefinition =
  | {
      id: string;
      eyebrow: string;
      title: string;
      description: string;
      kind: "optional-sections" | "answer";
      visible?: (settings: PensionSettings) => boolean;
    }
  | {
      id: string;
      eyebrow: string;
      title: string;
      description: string;
      kind: "fields";
      fieldIds: readonly FieldDefinition["id"][];
      visible?: (settings: PensionSettings) => boolean;
    };

type JourneyDefinition = {
  id: string;
  title: string;
  description: string;
  steps: readonly JourneyStepDefinition[];
};

const GUIDED_JOURNEYS = [
  {
    id: "retirement-date",
    title: "When would you like to retire?",
    description:
      "Start with a planned retirement age, choose the sections that matter, then collect the details needed to estimate your retirement income.",
    steps: [
      {
        id: "include",
        eyebrow: "Step 1",
        title: "What should we include?",
        description:
          "Choose the parts of your retirement picture you want to model. You can come back and add more later.",
        kind: "optional-sections",
      },
      {
        id: "basics",
        eyebrow: "Step 2",
        title: "Your planning basics",
        description:
          "These dates and income targets anchor every projection in the modeller.",
        kind: "fields",
        fieldIds: [
          "dateOfBirth",
          "lifeExpectancy",
          "requirementAge",
          "desiredRetirementIncome",
        ],
      },
      {
        id: "inflation",
        eyebrow: "Step 3",
        title: "Inflation and projection basis",
        description:
          "Choose whether to view today’s purchasing power or future inflated pound amounts.",
        kind: "fields",
        fieldIds: ["projectionBasis", "inflationRateAnnual"],
      },
      {
        id: "alpha",
        eyebrow: "Step 4",
        title: "Your Alpha pension plan",
        description:
          "Tell us when you expect to leave Alpha, when you want to draw it, and what your latest statement says.",
        kind: "fields",
        fieldIds: [
          "alphaPensionDrawAge",
          "alphaPensionLeaveAge",
          "alphaPensionAbsDate",
          "accruedPensionAtLastAbs",
          "pensionableEarnings",
          "alphaAddedPensionMonthly",
          "alphaAddedPensionFactorType",
          "applyPensionIncreases",
        ],
      },
      {
        id: "state",
        eyebrow: "Optional",
        title: "State Pension",
        description:
          "Add your State Pension forecast and any future uprating assumption.",
        kind: "fields",
        fieldIds: [
          "currentStatePension",
          "statePensionDrawDate",
          "statePensionApplyFutureGrowth",
          "statePensionWageGrowthPercent",
        ],
        visible: (settings) => settings.showStatePension,
      },
      {
        id: "nuvos",
        eyebrow: "Optional",
        title: "nuvos pension",
        description: "Include any nuvos benefits you want to model alongside Alpha.",
        kind: "fields",
        fieldIds: [
          "nuvosPensionDrawAge",
          "nuvosPensionLeaveAge",
          "nuvosPensionAbsDate",
          "nuvosAccruedPensionAtLastAbs",
          "nuvosPensionableEarnings",
          "nuvosApplyPensionIncreases",
        ],
        visible: (settings) => settings.showNuvos,
      },
      {
        id: "sipp",
        eyebrow: "Optional",
        title: "SIPP drawdown",
        description:
          "Add a personal pension pot, contributions, investment assumptions and drawdown timing.",
        kind: "fields",
        fieldIds: [
          "sippCurrentPot",
          "sippMonthlyContribution",
          "sippDrawAge",
          "sippTaxReliefRate",
          "sippApplyRealInterest",
          "sippRealInterestPercent",
          "sippWithdrawalStrategy",
          "sippWithdrawalPercent",
          "sippWithdrawalTargetAge",
        ],
        visible: (settings) => settings.showSipp,
      },
      {
        id: "isa",
        eyebrow: "Optional",
        title: "ISA income",
        description:
          "Add ISA savings, contributions, investment assumptions and drawdown timing.",
        kind: "fields",
        fieldIds: [
          "isaCurrentPot",
          "isaMonthlyContribution",
          "isaDrawAge",
          "isaApplyRealInterest",
          "isaRealInterestPercent",
          "isaWithdrawalStrategy",
          "isaWithdrawalPercent",
          "isaWithdrawalTargetAge",
        ],
        visible: (settings) => settings.showIsa,
      },
      {
        id: "partial-retirement",
        eyebrow: "Optional",
        title: "Partial retirement",
        description:
          "Model a reduced work pattern and lower regular additions from that point.",
        kind: "fields",
        fieldIds: ["partialRetirementStartAge", "partialRetirementWorkPercent"],
        visible: (settings) => settings.partialRetirementEnabled,
      },
      {
        id: "tax",
        eyebrow: "Optional",
        title: "Tax assumptions",
        description:
          "Use standard Income Tax assumptions to estimate take-home retirement income.",
        kind: "fields",
        fieldIds: [
          "taxPersonalAllowance",
          "taxPersonalAllowanceTaperThreshold",
          "taxBasicRateLimit",
          "taxAdditionalRateThreshold",
          "taxBasicRatePercent",
          "taxHigherRatePercent",
          "taxAdditionalRatePercent",
          "taxSippTaxFreeWithdrawalPercent",
        ],
        visible: (settings) => settings.taxationEnabled,
      },
      {
        id: "answer",
        eyebrow: "Result",
        title: "Your retirement income answer",
        description:
          "This is the answer from the assumptions you have just walked through.",
        kind: "answer",
      },
    ],
  },
] as const satisfies readonly JourneyDefinition[];

function App() {
  const [settings, setSettings] = useState<PensionSettings>(loadStoredSettings);
  const [chartUndoStack, setChartUndoStack] = useState<PensionSettings[]>([]);
  const [settingsFormVersion, setSettingsFormVersion] = useState(0);
  const [appMode, setAppMode] = useState<AppMode | null>(loadStoredAppMode);
  const [retirementIncomeDisplay, setRetirementIncomeDisplay] =
    useState<RetirementIncomeDisplay>("monthly");
  const [showLimitations, setShowLimitations] = useState(false);
  const [hasAcknowledgedNotice, setHasAcknowledgedNotice] = useState(
    loadAcknowledgementState,
  );
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);
  const savedFeedbackTimer = useRef<ReturnType<typeof window.setTimeout> | null>(
    null,
  );
  const useDropdownDates = useMobileDateDropdowns();
  const deferredSettings = useDeferredValue(settings);
  const validationIssues = useMemo(
    () => validateSettings(deferredSettings),
    [deferredSettings],
  );
  const projectionRows = useMemo(
    () => createProjectionTable(deferredSettings),
    [deferredSettings],
  );
  const pensionSummary = useMemo(
    () => generatePensionSummary(projectionRows, deferredSettings),
    [projectionRows, deferredSettings],
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
  const retirementIncomeTitle =
    retirementIncomeDisplay === "monthly"
      ? settings.taxationEnabled
        ? "Monthly take-home retirement income"
        : "Monthly retirement income before tax"
      : settings.taxationEnabled
        ? "Annual take-home retirement income"
        : "Annual retirement income before tax";
  const retirementIncomeItems = pensionSummary.retirementIncome.sources.map((source) => ({
    label:
      retirementIncomeDisplay === "monthly"
        ? `Monthly ${source.label}`
        : `Annual ${source.label}`,
    value: formatCurrencyDetailed(
      retirementIncomeDisplay === "monthly" ? source.monthlyIncome : source.annualIncome,
    ),
  }));
  const retirementIncomeTotal = formatCurrencyDetailed(
    retirementIncomeDisplay === "monthly"
      ? pensionSummary.retirementIncome.totalMonthlyIncome
      : pensionSummary.retirementIncome.totalAnnualIncome,
  );
  const retirementIncomeTargetTitle =
    retirementIncomeDisplay === "monthly"
      ? "Monthly target retirement income"
      : "Annual target retirement income";
  const retirementIncomeTarget = formatCurrencyDetailed(
    retirementIncomeDisplay === "monthly"
      ? calculateRetirementIncomeTargetAtDate(
          settings,
          addYearsToIsoDate(settings.dateOfBirth, settings.requirementAge),
        ) / 12
      : calculateRetirementIncomeTargetAtDate(
          settings,
          addYearsToIsoDate(settings.dateOfBirth, settings.requirementAge),
        ),
  );

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    return () => {
      if (savedFeedbackTimer.current) {
        window.clearTimeout(savedFeedbackTimer.current);
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

  function applyBridgeChartParameterPatch(
    current: PensionSettings,
    patch: Partial<RetirementIncomeBridgeParameters>,
  ) {
    const next = { ...current };
    const minimumSippAccessAge = calculateMinimumSippAccessAge(next.dateOfBirth);
    const minimumAlphaAccessAge = calculateMinimumPensionAccessAge(next.dateOfBirth);
    const currentPlanningAge = calculateCurrentPlanningAge(next);
    const defaultStatePensionAge = calculateMinimumStatePensionDrawAge(
      next.dateOfBirth,
    );

    if (patch.targetIncomeAnnual !== undefined) {
      next.desiredRetirementIncome = normalizeSetting(
        "desiredRetirementIncome",
        patch.targetIncomeAnnual,
      );
    }

    if (patch.alphaMonthlyAddedPension !== undefined) {
      next.alphaAddedPensionMonthly = normalizeSetting(
        "alphaAddedPensionMonthly",
        patch.alphaMonthlyAddedPension,
      );
    }

    if (patch.isaMonthlyContribution !== undefined) {
      next.isaMonthlyContribution = normalizeSetting(
        "isaMonthlyContribution",
        patch.isaMonthlyContribution,
      );
    }

    if (patch.sippMonthlyContribution !== undefined) {
      next.sippMonthlyContribution = normalizeSetting(
        "sippMonthlyContribution",
        patch.sippMonthlyContribution,
      );
    }

    if (patch.partialRetirementStartAge !== undefined) {
      const latestPartialRetirementStartAge = Math.max(
        currentPlanningAge,
        Math.min(next.requirementAge - 0.25, 70, next.lifeExpectancy),
      );
      next.partialRetirementStartAge = normalizeSetting(
        "partialRetirementStartAge",
        clampNumber(
          patch.partialRetirementStartAge,
          currentPlanningAge,
          latestPartialRetirementStartAge,
        ),
      );
    }

    if (patch.partialRetirementWorkPercent !== undefined) {
      next.partialRetirementWorkPercent = normalizeSetting(
        "partialRetirementWorkPercent",
        patch.partialRetirementWorkPercent,
      );
    }

    if (patch.partialRetirementEnabled !== undefined) {
      next.partialRetirementEnabled = patch.partialRetirementEnabled;
    }

    if (patch.showIsa !== undefined) {
      next.showIsa = patch.showIsa;
    }

    if (patch.showSipp !== undefined) {
      next.showSipp = patch.showSipp;
    }

    if (patch.showNuvos !== undefined) {
      next.showNuvos = patch.showNuvos;
    }

    if (patch.showStatePension !== undefined) {
      next.showStatePension = patch.showStatePension;
    }

    const requestedStateAge =
      patch.statePensionAge ??
      calculateStatePensionDrawAge(next.dateOfBirth, next.statePensionDrawDate);
    const statePensionAge = clampNumber(
      requestedStateAge,
      defaultStatePensionAge,
      Math.max(defaultStatePensionAge, next.lifeExpectancy),
    );

    if (patch.statePensionAge !== undefined) {
      next.statePensionDrawDate = calculateStatePensionDrawDateFromAge(
        next.dateOfBirth,
        normalizeStatePensionDrawAge(statePensionAge, next.dateOfBirth),
      );
    }

    if (patch.retirementAge !== undefined) {
      const retirementAge = clampNumber(
        patch.retirementAge,
        currentPlanningAge,
        Math.min(70, statePensionAge),
      );
      next.requirementAge = normalizeSetting("requirementAge", retirementAge);
      next.isaDrawAge = normalizeSetting("isaDrawAge", retirementAge);

      if (
        next.partialRetirementEnabled &&
        next.partialRetirementStartAge >= next.requirementAge
      ) {
        next.partialRetirementStartAge = normalizeSetting(
          "partialRetirementStartAge",
          clampNumber(
            next.requirementAge - 0.25,
            currentPlanningAge,
            Math.min(70, next.lifeExpectancy),
          ),
        );
      }

      if (next.showSipp && next.sippDrawAge < Math.max(retirementAge, minimumSippAccessAge)) {
        next.sippDrawAge = normalizeSippDrawAge(
          Math.max(retirementAge, minimumSippAccessAge),
          next.dateOfBirth,
        );
      }
    }

    if (patch.alphaLeaveAge !== undefined) {
      const alphaLeaveAge = clampNumber(
        patch.alphaLeaveAge,
        currentPlanningAge,
        Math.min(70, statePensionAge),
      );
      next.alphaPensionLeaveAge = normalizeSetting(
        "alphaPensionLeaveAge",
        alphaLeaveAge,
      );
    }

    if (patch.sippAccessAge !== undefined) {
      const sippAccessAge = clampNumber(
        patch.sippAccessAge,
        Math.max(next.requirementAge, minimumSippAccessAge),
        Math.min(70, statePensionAge),
      );
      next.sippDrawAge = normalizeSippDrawAge(sippAccessAge, next.dateOfBirth);

      if (
        next.showSipp &&
        next.sippWithdrawalStrategy === "use_by_age" &&
        next.sippWithdrawalTargetAge <= next.sippDrawAge
      ) {
        next.sippWithdrawalTargetAge = normalizeSetting(
          "sippWithdrawalTargetAge",
          next.sippDrawAge + 0.25,
        );
      }
    }

    if (patch.sippUseByAge !== undefined) {
      next.sippWithdrawalTargetAge = normalizeSetting(
        "sippWithdrawalTargetAge",
        clampNumber(
          patch.sippUseByAge,
          next.sippDrawAge + 0.25,
          Math.min(100, next.lifeExpectancy),
        ),
      );
    }

    if (patch.isaAccessAge !== undefined) {
      next.isaDrawAge = normalizeSetting(
        "isaDrawAge",
        clampNumber(
          patch.isaAccessAge,
          currentPlanningAge,
          Math.min(70, statePensionAge),
        ),
      );

      if (
        next.showIsa &&
        next.isaWithdrawalStrategy === "use_by_age" &&
        next.isaWithdrawalTargetAge <= next.isaDrawAge
      ) {
        next.isaWithdrawalTargetAge = normalizeSetting(
          "isaWithdrawalTargetAge",
          next.isaDrawAge + 0.25,
        );
      }
    }

    if (patch.alphaStartAge !== undefined) {
      const alphaStartAge = clampNumber(
        patch.alphaStartAge,
        Math.max(next.alphaPensionLeaveAge, minimumAlphaAccessAge),
        Math.min(70, statePensionAge),
      );
      next.alphaPensionDrawAge = normalizeAlphaPensionDrawAge(
        alphaStartAge,
        next.dateOfBirth,
      );
    }

    if (patch.isaUseByAge !== undefined) {
      next.isaWithdrawalTargetAge = normalizeSetting(
        "isaWithdrawalTargetAge",
        clampNumber(
          patch.isaUseByAge,
          next.isaDrawAge + 0.25,
          Math.min(100, next.lifeExpectancy),
        ),
      );
    }

    if (
      next.showSipp &&
      next.sippDrawAge < Math.max(next.requirementAge, minimumSippAccessAge)
    ) {
      next.sippDrawAge = normalizeSippDrawAge(
        Math.max(next.requirementAge, minimumSippAccessAge),
        next.dateOfBirth,
      );
    }

    if (
      next.showSipp &&
      next.sippWithdrawalStrategy === "use_by_age" &&
      next.sippWithdrawalTargetAge <= next.sippDrawAge
    ) {
      next.sippWithdrawalTargetAge = normalizeSetting(
        "sippWithdrawalTargetAge",
        next.sippDrawAge + 0.25,
      );
    }

    if (
      next.showIsa &&
      next.isaWithdrawalStrategy === "use_by_age" &&
      next.isaWithdrawalTargetAge <= next.isaDrawAge
    ) {
      next.isaWithdrawalTargetAge = normalizeSetting(
        "isaWithdrawalTargetAge",
        next.isaDrawAge + 0.25,
      );
    }

    if (next.alphaPensionLeaveAge > next.alphaPensionDrawAge) {
      next.alphaPensionDrawAge = normalizeAlphaPensionDrawAge(
        next.alphaPensionLeaveAge,
        next.dateOfBirth,
      );
    }

    if (next.alphaPensionDrawAge > statePensionAge) {
      next.alphaPensionDrawAge = normalizeAlphaPensionDrawAge(
        Math.min(70, statePensionAge),
        next.dateOfBirth,
      );
    }

    return next;
  }

  function updateSetting<K extends SettingsKey>(key: K, value: PensionSettings[K]) {
    showSavedLabel();
    setChartUndoStack([]);

    if (key === "requirementAge") {
      setSettings((current) =>
        applyBridgeChartParameterPatch(current, {
          retirementAge: value as number,
        }),
      );
      return;
    }

    setSettings((current) => {
      const normalizedValue =
        key === "statePensionDrawDate"
          ? normalizeStatePensionDrawDate(value as string, current.dateOfBirth)
          : key === "alphaPensionDrawAge"
            ? normalizeAlphaPensionDrawAge(value as number, current.dateOfBirth)
          : key === "sippDrawAge"
            ? normalizeSippDrawAge(value as number, current.dateOfBirth)
          : normalizeSetting(key, value);

      return {
        ...current,
        [key]: normalizedValue,
        ...(key === "dateOfBirth"
          ? {
              normalPensionAge: calculateNormalPensionAge(value as string),
              alphaPensionDrawAge: normalizeAlphaPensionDrawAge(
                current.alphaPensionDrawAge,
                value as string,
              ),
              sippDrawAge: normalizeSippDrawAge(current.sippDrawAge, value as string),
              statePensionDrawDate: calculateStatePensionDrawDateFromAge(
                value as string,
                calculateMinimumStatePensionDrawAge(value as string),
              ),
            }
          : {}),
      };
    });
  }

  function updateBridgeChartParameters(
    patch: Partial<RetirementIncomeBridgeParameters>,
  ) {
    showSavedLabel();
    setChartUndoStack((current) => [...current.slice(-19), settings]);
    setSettings((current) => applyBridgeChartParameterPatch(current, patch));
  }

  function resetSettings() {
    showSavedLabel();
    setChartUndoStack([]);
    setSettingsFormVersion((current) => current + 1);
    setSettings(createDefaultSettings());
  }

  function showSavedLabel() {
    if (savedFeedbackTimer.current) {
      window.clearTimeout(savedFeedbackTimer.current);
    }

    setShowSavedFeedback(true);
    savedFeedbackTimer.current = window.setTimeout(() => {
      setShowSavedFeedback(false);
      savedFeedbackTimer.current = null;
    }, 1400);
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
              Cookies are used for analytics purposes only, and no financial or personal
              information is transmitted.
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
              Plan your retirement income by modelling your Civil Service pension
              together with SIPP withdrawals, ISA income and State Pension payments.
            </p>
          </div>

          <ModeSelectionPanel selectedMode={appMode} onSelectMode={selectAppMode} />
        </section>

        {appMode === "journey" ? (
          <GuidedJourney
            journey={GUIDED_JOURNEYS[0]}
            settings={settings}
            validationIssues={validationIssues}
            pensionSummary={pensionSummary}
            derivedInflationAssumptions={derivedInflationAssumptions}
            retirementIncomeDisplay={retirementIncomeDisplay}
            retirementIncomeItems={retirementIncomeItems}
            retirementIncomeTitle={retirementIncomeTitle}
            retirementIncomeTotal={retirementIncomeTotal}
            retirementIncomeTargetTitle={retirementIncomeTargetTitle}
            retirementIncomeTarget={retirementIncomeTarget}
            useDropdownDates={useDropdownDates}
            onChange={updateSetting}
            onRetirementIncomeDisplayChange={setRetirementIncomeDisplay}
            showLimitations={showLimitations}
            onToggleLimitations={() => setShowLimitations((current) => !current)}
          />
        ) : null}

        {appMode === "expert" ? (
          <>
            <SummarySection
              title="Pension Summary"
              headingLevel={2}
              variant="feature"
              description="This summary is generated from the current calculation result, so the same structure can later support side-by-side scenario comparisons."
              items={retirementIncomeItems}
              controls={
                <RetirementIncomeDisplayToggle
                  value={retirementIncomeDisplay}
                  onChange={setRetirementIncomeDisplay}
                />
              }
              footer={
                <>
                  <RetirementIncomeSummaryFooter
                    totalLabel={retirementIncomeTitle}
                    totalValue={retirementIncomeTotal}
                    targetLabel={retirementIncomeTargetTitle}
                    targetValue={retirementIncomeTarget}
                  />
                  <ModellerLimitations
                    showLimitations={showLimitations}
                    onToggleLimitations={() => setShowLimitations((current) => !current)}
                  />
                </>
              }
            />

            <section className="layout">
              <section className="panel settings-panel">
                <div className="panel-heading">
                  <h2>Your retirement assumptions</h2>
                  <p className="section-copy">
                    These inputs define your pension scenario, letting you see how
                    different assumptions affect your outcome.
                  </p>
                  <button
                    type="button"
                    className="secondary-button settings-reset-button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={resetSettings}
                  >
                    Reset parameters
                  </button>
                </div>

                <div className="settings-sections" key={settingsFormVersion}>
                  <ValidationIssuesSection validationIssues={validationIssues} />

                  <section className="settings-section">
                    <div className="section-heading">
                      <h3>Optional sections</h3>
                      <p className="section-copy">
                        Show or hide the optional modeller sections without losing any
                        settings you have already entered.
                      </p>
                    </div>

                    <OptionalSectionToggleGrid
                      settings={settings}
                      onChange={updateSetting}
                    />
                  </section>

            {fieldGroups
              .filter((group) => isSettingsGroupVisible(group.id, settings))
              .map((group) => (
              <section className="settings-section" key={group.id}>
                <div className="section-heading">
                  <h3>{group.title}</h3>
                  <p className="section-copy">{group.description}</p>
                </div>

                <SettingsFields
                  fields={group.fields}
                  settings={settings}
                  validationIssues={validationIssues}
                  onChange={updateSetting}
                  useDropdownDates={useDropdownDates}
                />

                {group.id === "alpha" ? (
                  <AddedPensionLumpSumsEditor
                    lumpSums={settings.alphaAddedPensionLumpSums}
                    defaultStartDate={settings.startDate}
                    useDropdownDates={useDropdownDates}
                    showFactorType
                    validationIssues={getValidationIssuesForField(
                      validationIssues,
                      "alphaAddedPensionLumpSums",
                    )}
                    onChange={(nextLumpSums) =>
                      updateSetting("alphaAddedPensionLumpSums", nextLumpSums)
                    }
                  />
                ) : null}

                {group.id === "sipp" ? (
                  <AddedPensionLumpSumsEditor
                    lumpSums={settings.sippLumpSums}
                    defaultStartDate={settings.startDate}
                    useDropdownDates={useDropdownDates}
                    title="SIPP lump sums"
                    description="Add one-off or yearly lump sum contributions. A yearly entry repeats on the same calendar date until its end date."
                    emptyText="No SIPP lump sum contributions set up yet."
                    itemLabel="SIPP lump sum"
                    addButtonLabel="Add SIPP lump sum"
                    removeButtonLabel="Remove SIPP lump sum"
                    validationIssues={getValidationIssuesForField(
                      validationIssues,
                      "sippLumpSums",
                    )}
                    onChange={(nextLumpSums) =>
                      updateSetting("sippLumpSums", nextLumpSums)
                    }
                  />
                ) : null}

                {group.id === "isa" ? (
                  <AddedPensionLumpSumsEditor
                    lumpSums={settings.isaLumpSums}
                    defaultStartDate={settings.startDate}
                    useDropdownDates={useDropdownDates}
                    title="ISA lump sums"
                    description="Add one-off or yearly lump sum ISA contributions. A yearly entry repeats on the same calendar date until its end date."
                    emptyText="No ISA lump sum contributions set up yet."
                    itemLabel="ISA lump sum"
                    addButtonLabel="Add ISA lump sum"
                    removeButtonLabel="Remove ISA lump sum"
                    validationIssues={getValidationIssuesForField(
                      validationIssues,
                      "isaLumpSums",
                    )}
                    onChange={(nextLumpSums) =>
                      updateSetting("isaLumpSums", nextLumpSums)
                    }
                  />
                ) : null}
              </section>
            ))}

            <SummarySection
              title="Calculated details"
              items={[
                {
                  label: "Normal Pension Age",
                  value: `${pensionSummary.calculated.normalPensionAge}`,
                },
                ...(settings.showStatePension
                  ? [
                      {
                        label: "State Pension start age",
                        value: formatAgeValue(
                          calculateStatePensionDrawAge(
                            settings.dateOfBirth,
                            settings.statePensionDrawDate,
                          ),
                        ),
                        infoUrl: knowledgeLinks.statePensionAge,
                        infoLinkText: "Check State Pension age",
                      },
                    ]
                  : []),
              ]}
            />
                </div>
              </section>
            </section>

            <InflationBasisPanel
              settings={deferredSettings}
              assumptions={derivedInflationAssumptions}
            />

            <RetirementIncomeBridgeChart
              data={retirementIncomeSeries}
              alphaLabel="Alpha pension"
              limits={bridgeChartLimits}
              statePensionEditable
              onChangeParameters={updateBridgeChartParameters}
              {...bridgeChartParameters}
            />

            <section className="panel">
              <div className="panel-heading">
                <h2>Monthly pension projection table</h2>
                <p className="section-copy">
                  The table is generated from the projection layer so each row stays
                  traceable back to the modeller inputs and factor tables.
                </p>
              </div>

              <ProjectionTable rows={projectionRows} settings={settings} />
            </section>
          </>
        ) : null}
      </main>
    </>
  );

  function acknowledgeNotice() {
    setHasAcknowledgedNotice(true);
    writeStorageItem(ACKNOWLEDGEMENT_STORAGE_KEY, ACKNOWLEDGEMENT_VERSION);
  }

  function selectAppMode(mode: AppMode) {
    setAppMode(mode);
    saveStoredAppMode(mode);
  }
}

type ModeSelectionPanelProps = {
  selectedMode: AppMode | null;
  onSelectMode: (mode: AppMode) => void;
};

function ModeSelectionPanel({
  selectedMode,
  onSelectMode,
}: ModeSelectionPanelProps) {
  return (
    <section className="mode-panel" aria-labelledby="mode-selection-title">
      <div className="panel-heading">
        <p className="eyebrow">Choose your route</p>
        <h2 id="mode-selection-title">How would you like to use the modeller?</h2>
        <p className="section-copy">
          Start with a guided journey if you want the questions one at a time, or
          use expert mode to edit every assumption directly.
        </p>
      </div>

      <div className="mode-card-grid">
        <button
          type="button"
          className={getModeCardClassName(selectedMode === "journey")}
          aria-pressed={selectedMode === "journey"}
          onClick={() => onSelectMode("journey")}
        >
          <span className="card-label">Guided journey</span>
          <strong>Take me through a journey</strong>
          <span>
            Answer a smaller set of questions in order, with optional sections
            included only when you choose them.
          </span>
        </button>

        <button
          type="button"
          className={getModeCardClassName(selectedMode === "expert")}
          aria-pressed={selectedMode === "expert"}
          onClick={() => onSelectMode("expert")}
        >
          <span className="card-label">Expert mode</span>
          <strong>Use expert mode</strong>
          <span>
            Keep the current full assumptions form, optional sections, lump sums
            and detailed projection table.
          </span>
        </button>
      </div>
    </section>
  );
}

function getModeCardClassName(isActive: boolean) {
  return ["mode-card", isActive ? "mode-card--active" : ""]
    .filter(Boolean)
    .join(" ");
}

type GuidedJourneyProps = {
  journey: JourneyDefinition;
  settings: PensionSettings;
  validationIssues: PensionValidationIssue[];
  pensionSummary: PensionSummary;
  derivedInflationAssumptions: ReturnType<typeof deriveInflationAssumptions>;
  retirementIncomeDisplay: RetirementIncomeDisplay;
  retirementIncomeItems: SummaryItem[];
  retirementIncomeTitle: string;
  retirementIncomeTotal: string;
  retirementIncomeTargetTitle: string;
  retirementIncomeTarget: string;
  useDropdownDates: boolean;
  onChange: FieldProps["onChange"];
  onRetirementIncomeDisplayChange: (display: RetirementIncomeDisplay) => void;
  showLimitations: boolean;
  onToggleLimitations: () => void;
};

function GuidedJourney({
  journey,
  settings,
  validationIssues,
  pensionSummary,
  derivedInflationAssumptions,
  retirementIncomeDisplay,
  retirementIncomeItems,
  retirementIncomeTitle,
  retirementIncomeTotal,
  retirementIncomeTargetTitle,
  retirementIncomeTarget,
  useDropdownDates,
  onChange,
  onRetirementIncomeDisplayChange,
  showLimitations,
  onToggleLimitations,
}: GuidedJourneyProps) {
  const visibleSteps = journey.steps.filter(
    (step) => !step.visible || step.visible(settings),
  );
  const [activeStepId, setActiveStepId] = useState(visibleSteps[0]?.id ?? "");
  const activeStep = visibleSteps.find((step) => step.id === activeStepId) ?? visibleSteps[0];
  const activeStepIndex = Math.max(
    0,
    visibleSteps.findIndex((step) => step.id === activeStep.id),
  );
  const isFirstStep = activeStepIndex === 0;
  const isLastStep = activeStepIndex === visibleSteps.length - 1;

  if (!activeStep) {
    return null;
  }

  const goToStep = (stepIndex: number) => {
    const nextStep = visibleSteps[stepIndex];

    if (nextStep) {
      setActiveStepId(nextStep.id);
    }
  };

  return (
    <section className="panel journey-panel" aria-labelledby="journey-title">
      <div className="journey-heading">
        <div>
          <p className="eyebrow">Guided journey</p>
          <h2 id="journey-title">{journey.title}</h2>
          <p className="section-copy">{journey.description}</p>
        </div>
        <div className="journey-progress" aria-label="Journey progress">
          Step {activeStepIndex + 1} of {visibleSteps.length}
        </div>
      </div>

      <div className="journey-layout">
        <nav className="journey-sidebar" aria-label="Journey steps">
          {visibleSteps.map((step, index) => (
            <button
              key={step.id}
              type="button"
              className={
                step.id === activeStep.id
                  ? "journey-step-button journey-step-button--active"
                  : "journey-step-button"
              }
              aria-current={step.id === activeStep.id ? "step" : undefined}
              onClick={() => setActiveStepId(step.id)}
            >
              <span>{index + 1}</span>
              {step.title}
            </button>
          ))}
        </nav>

        <section className="journey-step" aria-labelledby={`journey-step-${activeStep.id}`}>
          <div className="section-heading">
            <p className="eyebrow">{activeStep.eyebrow}</p>
            <h3 id={`journey-step-${activeStep.id}`}>{activeStep.title}</h3>
            <p className="section-copy">{activeStep.description}</p>
          </div>

          <JourneyStepContent
            step={activeStep}
            settings={settings}
            validationIssues={validationIssues}
            pensionSummary={pensionSummary}
            derivedInflationAssumptions={derivedInflationAssumptions}
            retirementIncomeDisplay={retirementIncomeDisplay}
            retirementIncomeItems={retirementIncomeItems}
            retirementIncomeTitle={retirementIncomeTitle}
            retirementIncomeTotal={retirementIncomeTotal}
            retirementIncomeTargetTitle={retirementIncomeTargetTitle}
            retirementIncomeTarget={retirementIncomeTarget}
            useDropdownDates={useDropdownDates}
            onChange={onChange}
            onRetirementIncomeDisplayChange={onRetirementIncomeDisplayChange}
            showLimitations={showLimitations}
            onToggleLimitations={onToggleLimitations}
          />

          <div className="journey-actions">
            <button
              type="button"
              className="secondary-button"
              disabled={isFirstStep}
              onClick={() => goToStep(activeStepIndex - 1)}
            >
              Back
            </button>
            <button
              type="button"
              className="primary-button"
              disabled={isLastStep}
              onClick={() => goToStep(activeStepIndex + 1)}
            >
              {activeStepIndex === visibleSteps.length - 2 ? "Show my answer" : "Next"}
            </button>
          </div>
        </section>
      </div>
    </section>
  );
}

type JourneyStepContentProps = Omit<GuidedJourneyProps, "journey"> & {
  step: JourneyStepDefinition;
};

function JourneyStepContent({
  step,
  settings,
  validationIssues,
  pensionSummary,
  derivedInflationAssumptions,
  retirementIncomeDisplay,
  retirementIncomeItems,
  retirementIncomeTitle,
  retirementIncomeTotal,
  retirementIncomeTargetTitle,
  retirementIncomeTarget,
  useDropdownDates,
  onChange,
  onRetirementIncomeDisplayChange,
  showLimitations,
  onToggleLimitations,
}: JourneyStepContentProps) {
  if (step.kind === "optional-sections") {
    return <OptionalSectionToggleGrid settings={settings} onChange={onChange} />;
  }

  if (step.kind === "answer") {
    return (
      <div className="journey-answer">
        {validationIssues.length > 0 ? (
          <ValidationIssuesSection validationIssues={validationIssues} />
        ) : null}

        <InflationBasisPanel
          settings={settings}
          assumptions={derivedInflationAssumptions}
        />

        <SummarySection
          title="Pension Summary"
          variant="feature"
          description="This answer updates automatically as you adjust the journey assumptions."
          items={retirementIncomeItems}
          controls={
            <RetirementIncomeDisplayToggle
              value={retirementIncomeDisplay}
              onChange={onRetirementIncomeDisplayChange}
            />
          }
          footer={
            <>
              <RetirementIncomeSummaryFooter
                totalLabel={retirementIncomeTitle}
                totalValue={retirementIncomeTotal}
                targetLabel={retirementIncomeTargetTitle}
                targetValue={retirementIncomeTarget}
              />
              <ModellerLimitations
                showLimitations={showLimitations}
                onToggleLimitations={onToggleLimitations}
              />
            </>
          }
        />

        <SummarySection
          title="Key dates"
          items={[
            {
              label: "Alpha pension starts",
              value: formatDate(pensionSummary.keyDates.startsAlphaPension),
            },
            ...(settings.showStatePension
              ? [
                  {
                    label: "State Pension starts",
                    value: formatDate(pensionSummary.keyDates.startsStatePension),
                  },
                ]
              : []),
            {
              label: "Normal Pension Age",
              value: `${pensionSummary.calculated.normalPensionAge}`,
            },
          ]}
        />
      </div>
    );
  }

  if (step.kind === "fields") {
    return (
      <SettingsFields
        fields={getFieldsByIds(step.fieldIds)}
        settings={settings}
        validationIssues={validationIssues}
        onChange={onChange}
        useDropdownDates={useDropdownDates}
      />
    );
  }

  return null;
}

function OptionalSectionToggleGrid({
  settings,
  onChange,
}: {
  settings: PensionSettings;
  onChange: FieldProps["onChange"];
}) {
  return (
    <div className="field-grid">
      {OPTIONAL_SECTION_TOGGLES.map((toggle) => (
        <label key={toggle.key} className="field-card checkbox-field-card">
          <span className="field-header">
            <span className="field-label-group">
              <span className="field-label">{toggle.label}</span>
            </span>
          </span>
          <span className="checkbox-row">
            <input
              aria-label={toggle.label}
              type="checkbox"
              checked={settings[toggle.key]}
              onChange={(event) =>
                onChange(
                  toggle.key,
                  event.target.checked as PensionSettings[typeof toggle.key],
                )
              }
            />
            <span>{toggle.description}</span>
          </span>
        </label>
      ))}
    </div>
  );
}

function ValidationIssuesSection({
  validationIssues,
}: {
  validationIssues: PensionValidationIssue[];
}) {
  if (validationIssues.length === 0) {
    return null;
  }

  return (
    <section className="settings-section" aria-live="polite">
      <div className="section-heading">
        <h3>Check these assumptions</h3>
        <p className="section-copy">
          The projection is paused until these settings are brought back into a
          valid range.
        </p>
      </div>

      <ul className="section-copy">
        {validationIssues.map((issue) => (
          <li key={`${issue.field}-${issue.itemId ?? "field"}-${issue.message}`}>
            {issue.message}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ModellerLimitations({
  showLimitations,
  onToggleLimitations,
}: {
  showLimitations: boolean;
  onToggleLimitations: () => void;
}) {
  return (
    <div className="summary-limitations" aria-label="Modeller limitations">
      <p className="section-copy">
        This modeller supports planning decisions, not scheme statements, HMRC
        calculations, or regulated advice.
      </p>
      <button
        type="button"
        className="secondary-button limitations-toggle"
        aria-expanded={showLimitations}
        aria-controls="pension-summary-limitations-list"
        onClick={onToggleLimitations}
      >
        {showLimitations ? "Hide limitations" : "Show limitations"}
      </button>

      {showLimitations ? (
        <div id="pension-summary-limitations-list" className="limitations-content">
          <p className="section-copy">
            Important assumptions and omissions to keep in mind:
          </p>
          <ul className="limitations-list">
            {MODELLER_LIMITATIONS.map((limitation) => (
              <li key={limitation}>{limitation}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function InflationBasisPanel({
  settings,
  assumptions,
}: {
  settings: PensionSettings;
  assumptions: ReturnType<typeof deriveInflationAssumptions>;
}) {
  const isRealTerms = settings.projectionBasis === "real";
  const basisLabel = isRealTerms
    ? "Projection basis: Real terms, today's money"
    : "Projection basis: Nominal terms, future inflated values";
  const explanation = isRealTerms
    ? "You are viewing results in real terms. This means all figures are shown in today's money. Inflation-linked increases have been removed from Alpha, nuvos, and State Pension where they only preserve purchasing power. SIPP and ISA growth uses inflation-adjusted real returns."
    : "You are viewing results in nominal terms. This means future figures include assumed inflation. Retirement income targets, pension increases, and investment balances are projected as future pound amounts.";

  const rows = [
    {
      assumption: "Inflation",
      userValue: formatPercent(assumptions.inflationRateAnnual),
      modelledValue: formatPercent(assumptions.inflationRateAnnual),
    },
    ...(settings.showSipp
      ? [
          {
            assumption: "SIPP nominal return",
            userValue: settings.sippApplyRealInterest
              ? formatPercent(assumptions.sippNominalReturnAnnual)
              : "Not applied",
            modelledValue: settings.sippApplyRealInterest
              ? formatModelledReturn(
                  assumptions.sippModelledReturnAnnual,
                  settings.projectionBasis,
                )
              : "0%",
          },
        ]
      : []),
    ...(settings.showIsa
      ? [
          {
            assumption: "ISA nominal return",
            userValue: settings.isaApplyRealInterest
              ? formatPercent(assumptions.isaNominalReturnAnnual)
              : "Not applied",
            modelledValue: settings.isaApplyRealInterest
              ? formatModelledReturn(
                  assumptions.isaModelledReturnAnnual,
                  settings.projectionBasis,
                )
              : "0%",
          },
        ]
      : []),
    {
      assumption: "Alpha in-service revaluation",
      userValue: "CPI + 1.5%",
      modelledValue: settings.applyPensionIncreases
        ? isRealTerms
          ? "1.5% real"
          : formatPercent(assumptions.alphaModelledInServiceRevaluationAnnual)
        : "Not applied",
    },
    {
      assumption: "Deferred Alpha increase",
      userValue: "CPI",
      modelledValue: settings.applyPensionIncreases
        ? isRealTerms
          ? "0% real"
          : formatPercent(assumptions.alphaModelledDeferredIncreaseAnnual)
        : "Not applied",
    },
    ...(settings.showNuvos
      ? [
          {
            assumption: "Deferred nuvos increase",
            userValue: "CPI",
            modelledValue: settings.nuvosApplyPensionIncreases
              ? isRealTerms
                ? "0% real"
                : formatPercent(assumptions.nuvosModelledDeferredIncreaseAnnual)
              : "Not applied",
          },
        ]
      : []),
    ...(settings.showStatePension
      ? [
          {
            assumption: "State Pension increase",
            userValue: settings.statePensionApplyFutureGrowth
              ? formatPercent(assumptions.statePensionNominalIncreaseAnnual)
              : "Not applied",
            modelledValue: settings.statePensionApplyFutureGrowth
              ? formatModelledReturn(
                  assumptions.statePensionModelledIncreaseAnnual,
                  settings.projectionBasis,
                )
              : "0%",
          },
        ]
      : []),
  ];

  return (
    <section className="panel inflation-panel" aria-labelledby="inflation-summary-title">
      <div className="panel-heading">
        <h2 id="inflation-summary-title">{basisLabel}</h2>
        <p className="section-copy">{explanation}</p>
      </div>

      <div className="assumption-table-shell">
        <table className="assumption-table">
          <thead>
            <tr>
              <th scope="col">Assumption</th>
              <th scope="col">User value</th>
              <th scope="col">Modelled value</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.assumption}>
                <th scope="row">{row.assumption}</th>
                <td>{row.userValue}</td>
                <td>{row.modelledValue}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RetirementIncomeDisplayToggle({
  value,
  onChange,
}: {
  value: RetirementIncomeDisplay;
  onChange: (display: RetirementIncomeDisplay) => void;
}) {
  return (
    <div
      className="summary-toggle"
      role="group"
      aria-label="Pension Summary display"
    >
      <button
        type="button"
        className={
          value === "monthly"
            ? "summary-toggle-button summary-toggle-button--active"
            : "summary-toggle-button"
        }
        aria-pressed={value === "monthly"}
        onClick={() => onChange("monthly")}
      >
        Monthly
      </button>
      <button
        type="button"
        className={
          value === "annual"
            ? "summary-toggle-button summary-toggle-button--active"
            : "summary-toggle-button"
        }
        aria-pressed={value === "annual"}
        onClick={() => onChange("annual")}
      >
        Annual
      </button>
    </div>
  );
}

function RetirementIncomeSummaryFooter({
  totalLabel,
  totalValue,
  targetLabel,
  targetValue,
}: {
  totalLabel: string;
  totalValue: string;
  targetLabel: string;
  targetValue: string;
}) {
  return (
    <>
      <div className="summary-total" aria-label={totalLabel}>
        <span>{totalLabel}</span>
        <strong>{totalValue}</strong>
      </div>
      <div className="summary-target" aria-label={targetLabel}>
        <span>{targetLabel}</span>
        <strong>{targetValue}</strong>
      </div>
    </>
  );
}

function getFieldsByIds(fieldIds: readonly FieldDefinition["id"][]) {
  return fieldIds
    .map((fieldId) =>
      fieldGroups.flatMap((group) => group.fields).find((field) => field.id === fieldId),
    )
    .filter((field): field is FieldDefinition => Boolean(field));
}

type SummaryItem = {
  label: string;
  value: string;
  infoUrl?: string;
  infoLinkText?: string;
};

type SummarySectionProps = {
  title: string;
  items: SummaryItem[];
  headingLevel?: 2 | 3;
  description?: string;
  groupTitle?: string;
  variant?: "compact" | "feature";
  controls?: ReactNode;
  footer?: ReactNode;
};

function SummarySection({
  title,
  items,
  headingLevel = 3,
  description,
  groupTitle,
  variant = "compact",
  controls,
  footer,
}: SummarySectionProps) {
  const Heading = headingLevel === 2 ? "h2" : "h3";

  return (
    <section className={`summary-section summary-section--${variant}`}>
      <div className="summary-section-header">
        <Heading>{title}</Heading>
        {controls}
      </div>
      {description ? <p className="section-copy">{description}</p> : null}
      <div className="summary-section-inner">
        {groupTitle ? <h3>{groupTitle}</h3> : null}
        <dl className="snapshot-list">
          {items.map(({ label, value, infoUrl, infoLinkText }) => (
            <div key={label}>
              <dt>
                <span className="field-label-group">
                  <span>{label}</span>
                  {infoUrl ? (
                    <InfoLink href={infoUrl} text={infoLinkText ?? `More about ${label}`} />
                  ) : null}
                </span>
              </dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        {footer}
      </div>
    </section>
  );
}

function FieldLabel({ field }: { field: FieldDefinition }) {
  const infoUrl = "infoUrl" in field ? field.infoUrl : undefined;
  const infoLinkText = "infoLinkText" in field ? field.infoLinkText : undefined;

  return (
    <span className="field-label-group">
      <span className="field-label">{field.label}</span>
      {infoUrl ? (
        <InfoLink href={infoUrl} text={infoLinkText ?? `More about ${field.label}`} />
      ) : null}
    </span>
  );
}

function FieldHelp({ field }: { field: FieldDefinition }) {
  const description = "description" in field ? field.description : undefined;

  return description ? <p className="field-help">{description}</p> : null;
}

function InfoLink({ href, text }: { href: string; text: string }) {
  return (
    <a className="field-info-link" href={href} target="_blank" rel="noreferrer">
      {text}
    </a>
  );
}

type SettingsFieldsProps = {
  fields: readonly FieldDefinition[];
  settings: PensionSettings;
  validationIssues: PensionValidationIssue[];
  onChange: FieldProps["onChange"];
  useDropdownDates: boolean;
};

function SettingsFields({
  fields,
  settings,
  validationIssues,
  onChange,
  useDropdownDates,
}: SettingsFieldsProps) {
  const baseFields = fields.filter(
    (field) =>
      !["applyPensionIncreases", "assumedCpiPercent"].includes(field.id) &&
      shouldRenderField(field.id, settings),
  );
  const pensionIncreaseFields = fields.filter((field) =>
    ["applyPensionIncreases", "assumedCpiPercent"].includes(field.id),
  );

  return (
    <>
      <div className="field-grid">
        {baseFields.map((field) => (
          <Field
            key={field.id}
            field={field}
            value={settings[field.id]}
            settings={settings}
            onChange={onChange}
            useDropdownDates={useDropdownDates}
            disabled={isFieldDisabled(field.id, settings)}
            hideOnMobile={isFieldHiddenOnMobile(field.id, settings)}
            validationIssue={getValidationIssueForField(validationIssues, field.id)}
          />
        ))}
      </div>

      {pensionIncreaseFields.length > 0 ? (
        <div className="settings-subsection">
          <div className="settings-subsection-heading">
            <h4>Pension increases</h4>
            <p className="section-copy">
              Revalue Alpha benefits annually by CPI + 1.5% while active, and CPI
              after leaving Alpha service, using the selected projection basis.
            </p>
          </div>
          <div className="field-grid">
            {pensionIncreaseFields.map((field) => (
              <Field
                key={field.id}
                field={field}
                value={settings[field.id]}
                settings={settings}
                onChange={onChange}
                useDropdownDates={useDropdownDates}
                disabled={isFieldDisabled(field.id, settings)}
                hideOnMobile={isFieldHiddenOnMobile(field.id, settings)}
                validationIssue={getValidationIssueForField(validationIssues, field.id)}
              />
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}

function shouldRenderField(fieldId: FieldDefinition["id"], settings: PensionSettings) {
  return (
    (fieldId !== "sippWithdrawalTargetAge" ||
      settings.sippWithdrawalStrategy === "use_by_age") &&
    (fieldId !== "isaWithdrawalTargetAge" ||
      settings.isaWithdrawalStrategy === "use_by_age")
  );
}

function isFieldDisabled(fieldId: FieldDefinition["id"], settings: PensionSettings) {
  return (
    (isTaxAssumptionField(fieldId) && !settings.taxationEnabled) ||
    (isPartialRetirementField(fieldId) && !settings.partialRetirementEnabled) ||
    (fieldId === "assumedCpiPercent" && !settings.applyPensionIncreases) ||
    (fieldId === "nuvosAssumedCpiPercent" &&
      !settings.nuvosApplyPensionIncreases) ||
    (["statePensionCpiPercent", "statePensionWageGrowthPercent"].includes(
      fieldId,
    ) &&
      !settings.statePensionApplyFutureGrowth) ||
    (fieldId === "sippRealInterestPercent" && !settings.sippApplyRealInterest) ||
    (fieldId === "sippWithdrawalPercent" &&
      settings.sippWithdrawalStrategy !== "percentage") ||
    (fieldId === "sippWithdrawalTargetAge" &&
      settings.sippWithdrawalStrategy !== "use_by_age") ||
    (fieldId === "isaRealInterestPercent" && !settings.isaApplyRealInterest) ||
    (fieldId === "isaWithdrawalPercent" &&
      settings.isaWithdrawalStrategy !== "percentage") ||
    (fieldId === "isaWithdrawalTargetAge" &&
      settings.isaWithdrawalStrategy !== "use_by_age") ||
    (["alphaEpaYearsBeforeNpa", "alphaEpaStartDate", "alphaEpaEndDate"].includes(
      fieldId,
    ) &&
      !settings.alphaEpaEnabled)
  );
}

function isFieldHiddenOnMobile(fieldId: FieldDefinition["id"], settings: PensionSettings) {
  return (
    (isTaxAssumptionField(fieldId) && !settings.taxationEnabled) ||
    (isPartialRetirementField(fieldId) && !settings.partialRetirementEnabled) ||
    (fieldId === "assumedCpiPercent" && !settings.applyPensionIncreases) ||
    (fieldId === "nuvosAssumedCpiPercent" &&
      !settings.nuvosApplyPensionIncreases) ||
    (["statePensionCpiPercent", "statePensionWageGrowthPercent"].includes(
      fieldId,
    ) &&
      !settings.statePensionApplyFutureGrowth) ||
    (fieldId === "sippRealInterestPercent" && !settings.sippApplyRealInterest) ||
    (fieldId === "sippWithdrawalPercent" &&
      settings.sippWithdrawalStrategy !== "percentage") ||
    (fieldId === "sippWithdrawalTargetAge" &&
      settings.sippWithdrawalStrategy !== "use_by_age") ||
    (fieldId === "isaRealInterestPercent" && !settings.isaApplyRealInterest) ||
    (fieldId === "isaWithdrawalPercent" &&
      settings.isaWithdrawalStrategy !== "percentage") ||
    (fieldId === "isaWithdrawalTargetAge" &&
      settings.isaWithdrawalStrategy !== "use_by_age") ||
    (["alphaEpaYearsBeforeNpa", "alphaEpaStartDate", "alphaEpaEndDate"].includes(
      fieldId,
    ) &&
      !settings.alphaEpaEnabled)
  );
}

function isTaxAssumptionField(fieldId: FieldDefinition["id"]) {
  return [
    "taxPersonalAllowance",
    "taxPersonalAllowanceTaperThreshold",
    "taxBasicRateLimit",
    "taxAdditionalRateThreshold",
    "taxBasicRatePercent",
    "taxHigherRatePercent",
    "taxAdditionalRatePercent",
    "taxSippTaxFreeWithdrawalPercent",
  ].includes(fieldId);
}

function isPartialRetirementField(fieldId: FieldDefinition["id"]) {
  return [
    "partialRetirementStartAge",
    "partialRetirementWorkPercent",
  ].includes(fieldId);
}

function getValidationIssueForField(
  validationIssues: PensionValidationIssue[],
  fieldId: FieldDefinition["id"],
) {
  return validationIssues.find((issue) => issue.field === fieldId);
}

function getValidationIssuesForField(
  validationIssues: PensionValidationIssue[],
  fieldId: SettingsKey,
) {
  return validationIssues.filter((issue) => issue.field === fieldId);
}

function getFieldCardClassName(
  disabled: boolean,
  hideOnMobile: boolean,
  hasValidationIssue = false,
) {
  return [
    "field-card",
    disabled ? "field-card--disabled" : "",
    hideOnMobile ? "field-card--mobile-hidden" : "",
    hasValidationIssue ? "field-card--invalid" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

type FieldProps = {
  field: FieldDefinition;
  value: PensionSettings[SettingsKey];
  settings: PensionSettings;
  onChange: <K extends SettingsKey>(key: K, value: PensionSettings[K]) => void;
  useDropdownDates: boolean;
  disabled?: boolean;
  hideOnMobile?: boolean;
  validationIssue?: PensionValidationIssue;
};

function Field({
  field,
  value,
  settings,
  onChange,
  useDropdownDates,
  disabled = false,
  hideOnMobile = false,
  validationIssue,
}: FieldProps) {
  if (field.id === "statePensionDrawDate") {
    return (
      <StatePensionAgeField
        field={field as DateField}
        value={value as string}
        settings={settings}
        onChange={onChange}
        disabled={disabled}
        hideOnMobile={hideOnMobile}
        validationIssue={validationIssue}
      />
    );
  }

  if (field.type === "date") {
    return (
      <DateSettingField
        field={field}
        value={value as string}
        settings={settings}
        onChange={onChange}
        useDropdowns={useDropdownDates}
        disabled={disabled}
        hideOnMobile={hideOnMobile}
        validationIssue={validationIssue}
      />
    );
  }

  if (field.type === "year") {
    return (
      <YearSettingField
        field={field as DateField & { type: "year" }}
        value={value as string}
        onChange={onChange}
        validationIssue={validationIssue}
      />
    );
  }

  if (field.type === "range") {
    return (
      <RangeSettingField
        field={field}
        value={value as number}
        settings={settings}
        onChange={onChange}
        disabled={disabled}
        hideOnMobile={hideOnMobile}
        validationIssue={validationIssue}
      />
    );
  }

  if (field.type === "select") {
    return (
      <SelectSettingField
        field={field as SelectField}
        value={value as string}
        onChange={onChange}
        disabled={disabled}
        hideOnMobile={hideOnMobile}
        validationIssue={validationIssue}
      />
    );
  }

  if (field.type === "checkbox") {
    const validationId = validationIssue ? `${field.id}-validation` : undefined;

    return (
      <label
        className={`${getFieldCardClassName(false, false, Boolean(validationIssue))} checkbox-field-card`}
      >
        <span className="field-header">
          <FieldLabel field={field} />
        </span>
        <span className="checkbox-row">
          <input
            aria-label={field.label}
            type="checkbox"
            checked={value as boolean}
            aria-invalid={Boolean(validationIssue) || undefined}
            aria-describedby={validationId}
            onChange={(event) =>
              onChange(
                field.id,
                event.target.checked as PensionSettings[typeof field.id],
              )
            }
          />
          <span>{field.description}</span>
        </span>
        <FieldValidationMessage id={validationId} issue={validationIssue} />
      </label>
    );
  }

  if (field.type === "currency-input") {
    return (
      <CurrencySettingField
        field={field as CurrencyInputField}
        value={value as number}
        onChange={onChange}
        disabled={disabled}
        hideOnMobile={hideOnMobile}
        validationIssue={validationIssue}
      />
    );
  }

  return null;
}

function StatePensionAgeField({
  field,
  value,
  settings,
  onChange,
  disabled = false,
  hideOnMobile = false,
  validationIssue,
}: {
  field: DateField;
  value: string;
  settings: PensionSettings;
  onChange: FieldProps["onChange"];
  disabled?: boolean;
  hideOnMobile?: boolean;
  validationIssue?: PensionValidationIssue;
}) {
  const minimumStatePensionAge = calculateMinimumStatePensionDrawAge(
    settings.dateOfBirth,
  );
  const maximumStatePensionAge = Math.max(
    minimumStatePensionAge,
    settings.lifeExpectancy,
  );
  const currentStatePensionAge = calculateStatePensionDrawAge(
    settings.dateOfBirth,
    value,
  );
  const [draftValue, setDraftValue] = useState<number | null>(null);
  const [draftExactValue, setDraftExactValue] = useState<string | null>(null);
  const parsedDraftExactValue =
    draftExactValue === null || draftExactValue.trim() === ""
      ? Number.NaN
      : Number(draftExactValue);
  const hasValidDraftExactValue =
    Number.isFinite(parsedDraftExactValue) &&
    parsedDraftExactValue >= minimumStatePensionAge &&
    parsedDraftExactValue <= maximumStatePensionAge;
  const displayedRangeValue = hasValidDraftExactValue
    ? parsedDraftExactValue
    : Math.min(
        maximumStatePensionAge,
        Math.max(minimumStatePensionAge, draftValue ?? currentStatePensionAge),
      );
  const displayedExactValue = draftExactValue ?? displayedRangeValue.toString();
  const validationId = validationIssue ? `${field.id}-validation` : undefined;

  const commitAgeValue = (nextValue: number) => {
    const normalizedAge = normalizeStatePensionDrawAge(
      Math.min(maximumStatePensionAge, Math.max(minimumStatePensionAge, nextValue)),
      settings.dateOfBirth,
    );

    onChange(
      "statePensionDrawDate",
      calculateStatePensionDrawDateFromAge(settings.dateOfBirth, normalizedAge),
    );
    setDraftValue(null);
    setDraftExactValue(null);
  };

  const updateDraftExactValue = (nextDraftValue: string) => {
    const parsedValue = Number(nextDraftValue);

    if (
      nextDraftValue.trim() !== "" &&
      Number.isFinite(parsedValue) &&
      parsedValue >= minimumStatePensionAge &&
      parsedValue <= maximumStatePensionAge
    ) {
      setDraftValue(parsedValue);
    }
  };

  const normalizeExactValue = (nextDraftValue: string) => {
    const parsedValue = Number(nextDraftValue);
    const nextValue =
      nextDraftValue.trim() === "" || !Number.isFinite(parsedValue)
        ? displayedRangeValue
        : parsedValue;

    commitAgeValue(nextValue);
  };

  return (
    <div className={getFieldCardClassName(disabled, hideOnMobile, Boolean(validationIssue))}>
      <span className="field-header">
        <FieldLabel field={field} />
      </span>
      <div className="range-control-grid">
        <div className="range-slider-group">
          <input
            aria-label={field.label}
            className="range-input"
            type="range"
            min={minimumStatePensionAge}
            max={maximumStatePensionAge}
            step={0.25}
            value={displayedRangeValue}
            disabled={disabled}
            aria-invalid={Boolean(validationIssue) || undefined}
            aria-describedby={validationId}
            onChange={(event) => {
              const nextValue = Number(event.target.value);
              setDraftValue(nextValue);
              setDraftExactValue(null);
            }}
            onMouseUp={(event) => commitAgeValue(Number(event.currentTarget.value))}
            onTouchEnd={(event) => commitAgeValue(Number(event.currentTarget.value))}
            onBlur={(event) => commitAgeValue(Number(event.currentTarget.value))}
          />
          <div className="range-scale">
            <span>{formatAgeValue(minimumStatePensionAge)}</span>
            <span>{formatAgeValue(maximumStatePensionAge)}</span>
          </div>
        </div>
        <input
          aria-label={`${field.label} exact value`}
          className="number-input"
          type="number"
          min={minimumStatePensionAge}
          max={maximumStatePensionAge}
          step={0.25}
          value={displayedExactValue}
          disabled={disabled}
          aria-invalid={Boolean(validationIssue) || undefined}
          aria-describedby={validationId}
          onFocus={(event) => {
            setDraftExactValue(event.currentTarget.value);
          }}
          onChange={(event) => {
            const nextDraftValue = event.target.value;
            setDraftExactValue(nextDraftValue);
            updateDraftExactValue(nextDraftValue);
          }}
          onBlur={(event) => {
            normalizeExactValue(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              normalizeExactValue(event.currentTarget.value);
              event.currentTarget.blur();
            }
          }}
        />
      </div>
      <button
        type="button"
        className="secondary-button field-reset-button"
        aria-label="Reset State Pension start age to default"
        disabled={disabled}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          onChange(
            "statePensionDrawDate",
            calculateStatePensionDrawDateFromAge(
              settings.dateOfBirth,
              minimumStatePensionAge,
            ),
          );
          setDraftValue(null);
          setDraftExactValue(null);
        }}
      >
        Reset to default
      </button>
      <FieldHelp field={field} />
      <FieldValidationMessage id={validationId} issue={validationIssue} />
    </div>
  );
}

function YearSettingField({
  field,
  value,
  onChange,
  validationIssue,
}: {
  field: DateField & { type: "year" };
  value: string;
  onChange: FieldProps["onChange"];
  validationIssue?: PensionValidationIssue;
}) {
  const draftYear = getAlphaAbsYear(value);
  const currentYear = new Date().getUTCFullYear();
  const firstAbsYear = 2015;
  const yearOptions = Array.from(
    { length: currentYear - firstAbsYear + 1 },
    (_, index) => currentYear - index,
  );

  return (
    <YearSettingFieldEditor
      key={value}
      field={field}
      initialYear={draftYear.toString()}
      yearOptions={yearOptions}
      onChange={onChange}
      validationIssue={validationIssue}
    />
  );
}

function YearSettingFieldEditor({
  field,
  initialYear,
  yearOptions,
  onChange,
  validationIssue,
}: {
  field: DateField & { type: "year" };
  initialYear: string;
  yearOptions: number[];
  onChange: FieldProps["onChange"];
  validationIssue?: PensionValidationIssue;
}) {
  const [localYear, setLocalYear] = useState(initialYear);
  const validationId = validationIssue ? `${field.id}-validation` : undefined;

  return (
    <label className={getFieldCardClassName(false, false, Boolean(validationIssue))}>
      <span className="field-header">
        <FieldLabel field={field} />
      </span>
      <select
        aria-label={field.label}
        className="select-input"
        value={localYear}
        aria-invalid={Boolean(validationIssue) || undefined}
        aria-describedby={validationId}
        onChange={(event) => {
          setLocalYear(event.target.value);
        }}
        onBlur={(event) => {
          onChange(field.id, event.target.value as PensionSettings[typeof field.id]);
        }}
      >
        {yearOptions.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
      <FieldValidationMessage id={validationId} issue={validationIssue} />
    </label>
  );
}

function SelectSettingField({
  field,
  value,
  onChange,
  disabled = false,
  hideOnMobile = false,
  validationIssue,
}: {
  field: SelectField;
  value: string;
  onChange: FieldProps["onChange"];
  disabled?: boolean;
  hideOnMobile?: boolean;
  validationIssue?: PensionValidationIssue;
}) {
  return (
    <SelectSettingFieldEditor
      key={value}
      field={field}
      initialValue={value}
      onChange={onChange}
      disabled={disabled}
      hideOnMobile={hideOnMobile}
      validationIssue={validationIssue}
    />
  );
}

function SelectSettingFieldEditor({
  field,
  initialValue,
  onChange,
  disabled = false,
  hideOnMobile = false,
  validationIssue,
}: {
  field: SelectField;
  initialValue: string;
  onChange: FieldProps["onChange"];
  disabled?: boolean;
  hideOnMobile?: boolean;
  validationIssue?: PensionValidationIssue;
}) {
  const [draftValue, setDraftValue] = useState(initialValue);
  const validationId = validationIssue ? `${field.id}-validation` : undefined;

  return (
    <label className={getFieldCardClassName(disabled, hideOnMobile, Boolean(validationIssue))}>
      <span className="field-header">
        <FieldLabel field={field} />
      </span>
      <select
        aria-label={field.label}
        className="select-input"
        value={draftValue}
        disabled={disabled}
        aria-invalid={Boolean(validationIssue) || undefined}
        aria-describedby={validationId}
        onChange={(event) => {
          const nextValue = event.target.value;
          setDraftValue(nextValue);
          onChange(
            field.id,
            nextValue as PensionSettings[typeof field.id],
          );
        }}
        onBlur={(event) =>
          onChange(
            field.id,
            event.target.value as PensionSettings[typeof field.id],
          )
        }
      >
        {field.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <FieldHelp field={field} />
      <FieldValidationMessage id={validationId} issue={validationIssue} />
    </label>
  );
}

function CurrencySettingField({
  field,
  value,
  onChange,
  disabled = false,
  hideOnMobile = false,
  validationIssue,
}: {
  field: CurrencyInputField;
  value: number;
  onChange: FieldProps["onChange"];
  disabled?: boolean;
  hideOnMobile?: boolean;
  validationIssue?: PensionValidationIssue;
}) {
  const resetValue = defaultSettings[field.id] as PensionSettings[typeof field.id];

  return (
    <CurrencySettingFieldEditor
      key={value}
      field={field}
      initialValue={value}
      resetValue={resetValue}
      onChange={onChange}
      disabled={disabled}
      hideOnMobile={hideOnMobile}
      validationIssue={validationIssue}
    />
  );
}

function CurrencySettingFieldEditor({
  field,
  initialValue,
  resetValue,
  onChange,
  disabled = false,
  hideOnMobile = false,
  validationIssue,
}: {
  field: CurrencyInputField;
  initialValue: number;
  resetValue: PensionSettings[typeof field.id];
  onChange: FieldProps["onChange"];
  disabled?: boolean;
  hideOnMobile?: boolean;
  validationIssue?: PensionValidationIssue;
}) {
  const [draftValue, setDraftValue] = useState(initialValue.toString());
  const showsResetButton = field.id !== "desiredRetirementIncome";
  const validationId = validationIssue ? `${field.id}-validation` : undefined;

  const commitDraftValue = (nextDraftValue: string) => {
    const parsedValue = nextDraftValue.trim() === "" ? 0 : Number(nextDraftValue);
    const nextValue = Number.isFinite(parsedValue) ? parsedValue : initialValue;
    onChange(field.id, nextValue as PensionSettings[typeof field.id]);
    setDraftValue(
      normalizeSetting(field.id, nextValue as PensionSettings[typeof field.id]).toString(),
    );
  };

  const applyPresetValue = (
    presetValue: NonNullable<CurrencyInputField["presets"]>[number]["value"],
  ) => {
    setDraftValue(presetValue.toString());
    onChange(field.id, presetValue as PensionSettings[typeof field.id]);
  };

  return (
    <div className={getFieldCardClassName(disabled, hideOnMobile, Boolean(validationIssue))}>
      <span className="field-header">
        <FieldLabel field={field} />
      </span>
      <input
        aria-label={field.label}
        className="select-input"
        type="number"
        min={field.min}
        max={field.max}
        step={field.step}
        value={draftValue}
        disabled={disabled}
        aria-invalid={Boolean(validationIssue) || undefined}
        aria-describedby={validationId}
        onChange={(event) => {
          setDraftValue(event.target.value);
        }}
        onBlur={(event) => {
          commitDraftValue(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            commitDraftValue(event.currentTarget.value);
            event.currentTarget.blur();
          }
        }}
      />
      {field.presets?.length ? (
        <div className="field-preset-group" aria-label={`${field.label} presets`}>
          {field.presets.map((preset) => (
            <button
              key={`${preset.label}-${preset.value}-${preset.description ?? ""}`}
              type="button"
              className="field-preset-button"
              aria-label={preset.description ? `${preset.label}: ${preset.description}` : preset.label}
              title={preset.description}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                applyPresetValue(preset.value);
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>
      ) : null}
      <FieldHelp field={field} />
      {showsResetButton ? (
        <button
          type="button"
          className="secondary-button field-reset-button"
          aria-label={`Reset ${field.label} to default`}
          disabled={disabled}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            setDraftValue(resetValue.toString());
            onChange(field.id, resetValue);
          }}
        >
          Reset to default
        </button>
      ) : null}
      <FieldValidationMessage id={validationId} issue={validationIssue} />
    </div>
  );
}

function RangeSettingField({
  field,
  value,
  settings,
  onChange,
  disabled = false,
  hideOnMobile = false,
  validationIssue,
}: {
  field: RangeField;
  value: number;
  settings: PensionSettings;
  onChange: FieldProps["onChange"];
  disabled?: boolean;
  hideOnMobile?: boolean;
  validationIssue?: PensionValidationIssue;
}) {
  const effectiveField = getEffectiveRangeField(field, settings);
  const [draftValue, setDraftValue] = useState<number | null>(null);
  const [draftExactValue, setDraftExactValue] = useState<string | null>(null);
  const canResetToDefault = field.id === "assumedCpiPercent";
  const resetValue = defaultSettings[field.id] as PensionSettings[typeof field.id];
  const isEditingExactValue = draftExactValue !== null;
  const parsedDraftExactValue =
    draftExactValue === null || draftExactValue.trim() === ""
      ? Number.NaN
      : Number(draftExactValue);
  const hasValidDraftExactValue =
    Number.isFinite(parsedDraftExactValue) &&
    parsedDraftExactValue >= effectiveField.min &&
    parsedDraftExactValue <= effectiveField.max;
  const displayedRangeValue = hasValidDraftExactValue
    ? parsedDraftExactValue
    : Math.min(effectiveField.max, Math.max(effectiveField.min, draftValue ?? value));
  const displayedExactValue = draftExactValue ?? displayedRangeValue.toString();
  const validationId = validationIssue ? `${field.id}-validation` : undefined;

  const commitRangeValue = (nextValue: number) => {
    const boundedValue = Math.min(
      effectiveField.max,
      Math.max(effectiveField.min, nextValue),
    );

    onChange(field.id, boundedValue as PensionSettings[typeof field.id]);
    setDraftValue(null);
    setDraftExactValue(null);
  };

  const updateDraftExactValue = (nextDraftValue: string) => {
    const parsedValue = Number(nextDraftValue);

    if (
      nextDraftValue.trim() !== "" &&
      Number.isFinite(parsedValue) &&
      parsedValue >= effectiveField.min &&
      parsedValue <= effectiveField.max
    ) {
      setDraftValue(parsedValue);
    }
  };

  const normalizeExactValue = (nextDraftValue: string) => {
    const parsedValue = Number(nextDraftValue);
    const nextValue =
      nextDraftValue.trim() === "" || !Number.isFinite(parsedValue)
        ? displayedRangeValue
        : parsedValue;

    commitRangeValue(nextValue);
  };

  return (
    <div className={getFieldCardClassName(disabled, hideOnMobile, Boolean(validationIssue))}>
      <span className="field-header">
        <FieldLabel field={effectiveField} />
      </span>
      <div className="range-control-grid">
        <div className="range-slider-group">
          <input
            aria-label={effectiveField.label}
            className="range-input"
            type="range"
            min={effectiveField.min}
            max={effectiveField.max}
            step={effectiveField.step}
            value={displayedRangeValue}
            disabled={disabled}
            aria-invalid={Boolean(validationIssue) || undefined}
            aria-describedby={validationId}
            onChange={(event) => {
              const nextValue = Number(event.target.value);
              setDraftValue(nextValue);
              if (!isEditingExactValue) {
                setDraftExactValue(null);
              }
            }}
            onMouseUp={(event) => commitRangeValue(Number(event.currentTarget.value))}
            onTouchEnd={(event) => commitRangeValue(Number(event.currentTarget.value))}
            onBlur={(event) => commitRangeValue(Number(event.currentTarget.value))}
          />
          <div className="range-scale">
            <span>{formatFieldValue(effectiveField.min, effectiveField.format)}</span>
            <span>{formatFieldValue(effectiveField.max, effectiveField.format)}</span>
          </div>
        </div>
        <input
          aria-label={`${effectiveField.label} exact value`}
          className="number-input"
          type="number"
          min={effectiveField.min}
          max={effectiveField.max}
          step={effectiveField.inputStep ?? effectiveField.step}
          value={displayedExactValue}
          disabled={disabled}
          aria-invalid={Boolean(validationIssue) || undefined}
          aria-describedby={validationId}
          onFocus={(event) => {
            setDraftExactValue(event.currentTarget.value);
          }}
          onChange={(event) => {
            const nextDraftValue = event.target.value;
            setDraftExactValue(nextDraftValue);
            updateDraftExactValue(nextDraftValue);
          }}
          onBlur={(event) => {
            normalizeExactValue(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              normalizeExactValue(event.currentTarget.value);
              event.currentTarget.blur();
            }
          }}
        />
      </div>
      {canResetToDefault ? (
        <button
          type="button"
          className="secondary-button field-reset-button"
          aria-label="Reset assumed CPI to default"
          disabled={disabled}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            onChange(field.id, resetValue);
            setDraftValue(null);
            setDraftExactValue(null);
          }}
        >
          Reset to default
        </button>
      ) : null}
      <FieldHelp field={field} />
      <FieldValidationMessage id={validationId} issue={validationIssue} />
    </div>
  );
}

function getEffectiveRangeField(field: RangeField, settings: PensionSettings): RangeField {
  let effectiveField = field;

  if (field.id === "sippDrawAge") {
    effectiveField = {
      ...effectiveField,
      min: calculateMinimumSippAccessAge(settings.dateOfBirth),
    };
  }

  if (field.id === "alphaPensionDrawAge") {
    effectiveField = {
      ...effectiveField,
      min: calculateMinimumPensionAccessAge(settings.dateOfBirth),
    };
  }

  if (field.id === "sippWithdrawalTargetAge") {
    effectiveField = {
      ...effectiveField,
      min: settings.sippDrawAge + 0.25,
      max: Math.max(settings.sippDrawAge + 0.25, Math.min(effectiveField.max, settings.lifeExpectancy)),
    };
  }

  if (field.id === "isaWithdrawalTargetAge") {
    effectiveField = {
      ...effectiveField,
      min: settings.isaDrawAge + 0.25,
      max: Math.max(settings.isaDrawAge + 0.25, Math.min(effectiveField.max, settings.lifeExpectancy)),
    };
  }

  if (
    field.id === "alphaPensionLeaveAge" ||
    field.id === "isaDrawAge" ||
    field.id === "requirementAge"
  ) {
    effectiveField = {
      ...effectiveField,
      min: Math.min(effectiveField.max, calculateCurrentPlanningAge(settings)),
    };
  }

  if (
    settings.alphaAddedPensionMonthly <= 0 ||
    (field.id !== "alphaPensionDrawAge" && field.id !== "alphaPensionLeaveAge")
  ) {
    return effectiveField;
  }

  const pairedStopAge =
    field.id === "alphaPensionDrawAge"
      ? settings.alphaPensionLeaveAge
      : settings.alphaPensionDrawAge;

  if (pairedStopAge <= MAX_ADDED_PENSION_PURCHASE_INPUT_AGE) {
    return effectiveField;
  }

  const cappedMax = Math.min(effectiveField.max, MAX_ADDED_PENSION_PURCHASE_INPUT_AGE);

  return {
    ...effectiveField,
    min: Math.min(effectiveField.min, cappedMax),
    max: cappedMax,
  };
}

type DateParts = {
  year: string;
  month: string;
  day: string;
};

type DateSelectFieldProps = {
  label: string;
  value: string;
  onChange: (nextValue: string) => void;
  idPrefix: string;
  yearRange: {
    min: number;
    max: number;
  };
  disabled?: boolean;
  describedBy?: string;
  hasValidationIssue?: boolean;
};

function DateSelectField({
  label,
  value,
  onChange,
  idPrefix,
  yearRange,
  disabled = false,
  describedBy,
  hasValidationIssue = false,
}: DateSelectFieldProps) {
  const parts = getDateParts(value);
  const selectedYear = Number(parts.year);
  const selectedMonth = Number(parts.month);
  const minYear = Math.min(
    yearRange.min,
    Number.isFinite(selectedYear) ? selectedYear : yearRange.min,
  );
  const maxYear = Math.max(
    yearRange.max,
    Number.isFinite(selectedYear) ? selectedYear : yearRange.max,
  );
  const yearOptions = Array.from(
    { length: maxYear - minYear + 1 },
    (_, index) => String(maxYear - index),
  );
  const dayCount = getDaysInMonth(selectedYear, selectedMonth);
  const dayOptions = Array.from({ length: dayCount }, (_, index) =>
    String(index + 1).padStart(2, "0"),
  );

  const commit = (nextParts: DateParts) => {
    const nextValue = `${nextParts.year}-${nextParts.month}-${nextParts.day}`;
    onChange(nextValue);
  };

  return (
    <div
      className="date-select-grid"
      role="group"
      aria-label={label}
      aria-describedby={describedBy}
    >
      <label className="date-select-field" htmlFor={`${idPrefix}-day`}>
        <span className="date-select-label">Day</span>
        <select
          id={`${idPrefix}-day`}
          aria-label={`${label} day`}
          className="select-input"
          value={parts.day}
          disabled={disabled}
          aria-invalid={hasValidationIssue || undefined}
          onChange={(event) => commit({ ...parts, day: event.target.value })}
        >
          {dayOptions.map((day) => (
            <option key={day} value={day}>
              {day}
            </option>
          ))}
        </select>
      </label>

      <label className="date-select-field" htmlFor={`${idPrefix}-month`}>
        <span className="date-select-label">Month</span>
        <select
          id={`${idPrefix}-month`}
          aria-label={`${label} month`}
          className="select-input"
          value={parts.month}
          disabled={disabled}
          aria-invalid={hasValidationIssue || undefined}
          onChange={(event) => {
            const nextMonth = event.target.value;
            const nextDay = clampDay(parts.day, parts.year, nextMonth);
            commit({ ...parts, month: nextMonth, day: nextDay });
          }}
        >
          {monthOptions.map((month) => (
            <option key={month.value} value={month.value}>
              {month.label}
            </option>
          ))}
        </select>
      </label>

      <label className="date-select-field" htmlFor={`${idPrefix}-year`}>
        <span className="date-select-label">Year</span>
        <select
          id={`${idPrefix}-year`}
          aria-label={`${label} year`}
          className="select-input"
          value={parts.year}
          disabled={disabled}
          aria-invalid={hasValidationIssue || undefined}
          onChange={(event) => {
            const nextYear = event.target.value;
            const nextDay = clampDay(parts.day, nextYear, parts.month);
            commit({ ...parts, year: nextYear, day: nextDay });
          }}
        >
          {yearOptions.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function DateSettingField({
  field,
  value,
  settings,
  onChange,
  useDropdowns,
  disabled = false,
  hideOnMobile = false,
  validationIssue,
}: {
  field: DateField;
  value: string;
  settings: PensionSettings;
  onChange: FieldProps["onChange"];
  useDropdowns: boolean;
  disabled?: boolean;
  hideOnMobile?: boolean;
  validationIssue?: PensionValidationIssue;
}) {
  const validationId = validationIssue ? `${field.id}-validation` : undefined;
  const statePensionDefaultDrawDate =
    field.id === "statePensionDrawDate"
      ? calculateStatePensionDrawDate(settings.dateOfBirth)
      : undefined;

  function commitDateValue(nextValue: string) {
    const normalizedValue =
      field.id === "statePensionDrawDate"
        ? normalizeStatePensionDrawDate(nextValue, settings.dateOfBirth)
        : (normalizeSetting(
            field.id,
            nextValue as PensionSettings[typeof field.id],
          ) as string);

    onChange(field.id, normalizedValue as PensionSettings[typeof field.id]);
    return normalizedValue;
  }

  return (
    <div className={getFieldCardClassName(disabled, hideOnMobile, Boolean(validationIssue))}>
      <span className="field-header">
        <FieldLabel field={field} />
      </span>
      {useDropdowns ? (
        <DateSelectField
          label={field.label}
          value={value}
          idPrefix={field.id}
          yearRange={getPrimaryDateYearRange(field.id, settings)}
          disabled={disabled}
          describedBy={validationId}
          hasValidationIssue={Boolean(validationIssue)}
          onChange={(nextValue) => {
            commitDateValue(nextValue);
          }}
        />
      ) : (
        <DateInputFieldEditor
          key={value}
          label={field.label}
          initialValue={value}
          min={statePensionDefaultDrawDate}
          disabled={disabled}
          describedBy={validationId}
          hasValidationIssue={Boolean(validationIssue)}
          onCommit={commitDateValue}
        />
      )}
      {statePensionDefaultDrawDate ? (
        <button
          type="button"
          className="secondary-button field-reset-button"
          aria-label="Reset State Pension draw date to default"
          disabled={disabled}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            onChange(field.id, statePensionDefaultDrawDate);
          }}
        >
          Reset to default
        </button>
      ) : null}
      <FieldValidationMessage id={validationId} issue={validationIssue} />
    </div>
  );
}

function DateInputFieldEditor({
  label,
  initialValue,
  min,
  disabled = false,
  describedBy,
  hasValidationIssue = false,
  onCommit,
}: {
  label: string;
  initialValue: string;
  min?: string;
  disabled?: boolean;
  describedBy?: string;
  hasValidationIssue?: boolean;
  onCommit: (nextValue: string) => string;
}) {
  const [draftValue, setDraftValue] = useState(initialValue);

  return (
    <input
      aria-label={label}
      className="date-input"
      type="date"
      min={min}
      value={draftValue}
      disabled={disabled}
      aria-invalid={hasValidationIssue || undefined}
      aria-describedby={describedBy}
      onChange={(event) => {
        setDraftValue(event.target.value);
      }}
      onBlur={(event) => {
        setDraftValue(onCommit(event.target.value));
      }}
    />
  );
}

function FieldValidationMessage({
  id,
  issue,
}: {
  id?: string;
  issue?: PensionValidationIssue;
}) {
  if (!issue || !id) {
    return null;
  }

  return (
    <p id={id} className="field-error">
      {issue.message}
    </p>
  );
}

function FieldValidationMessages({
  id,
  issues,
}: {
  id?: string;
  issues: PensionValidationIssue[];
}) {
  if (!id || issues.length === 0) {
    return null;
  }

  return (
    <ul id={id} className="field-error-list">
      {issues.map((issue) => (
        <li key={`${issue.itemId ?? "field"}-${issue.message}`}>{issue.message}</li>
      ))}
    </ul>
  );
}

function formatFieldValue(value: number, format?: "currency") {
  if (format === "currency") {
    return formatCurrency(value);
  }

  return value.toString();
}

type ProjectionTableProps = {
  rows: ProjectionRow[];
  settings: PensionSettings;
};

type ProjectionTableColumn = {
  key: string;
  label: string;
  width: string;
  setting?: "showNuvos" | "showStatePension" | "showSipp" | "showIsa" | "taxationEnabled";
};

const projectionTableColumns: ProjectionTableColumn[] = [
  { key: "date", label: "Date", width: "7rem" },
  {
    key: "totalMonthlyPensionTakeHomePay",
    label: "Total monthly income",
    width: "8rem",
  },
  {
    key: "monthlyIncomeTax",
    label: "Estimated monthly Income Tax",
    width: "8rem",
    setting: "taxationEnabled",
  },
  {
    key: "totalMonthlyPensionIncomeBeforeTax",
    label: "Total monthly income before tax",
    width: "8rem",
    setting: "taxationEnabled",
  },
  { key: "age", label: "Age (years/months)", width: "7rem" },
  { key: "monthlyAddedPension", label: "Monthly Added Pension", width: "7rem" },
  { key: "lumpSumAddedPension", label: "Lump sum added pension", width: "7rem" },
  { key: "annualStandardAlphaPension", label: "Standard Alpha Pension", width: "8rem" },
  { key: "annualEpaAlphaPension", label: "EPA Alpha Pension", width: "8rem" },
  { key: "annualAccruedAlphaPension", label: "Annual Accrued Alpha Pension", width: "8rem" },
  {
    key: "annualAlphaPensionIncludingReduction",
    label: "Annual Alpha Pension Including Reduction",
    width: "9rem",
  },
  { key: "monthlyAlphaPensionTakeHome", label: "Monthly Alpha pension before tax", width: "7rem" },
  {
    key: "annualNuvosPension",
    label: "Annual nuvos Pension",
    width: "8rem",
    setting: "showNuvos",
  },
  {
    key: "annualNuvosPensionIncludingReduction",
    label: "Annual nuvos Pension Including Reduction",
    width: "9rem",
    setting: "showNuvos",
  },
  {
    key: "monthlyNuvosPensionTakeHome",
    label: "Monthly nuvos pension before tax",
    width: "7rem",
    setting: "showNuvos",
  },
  {
    key: "monthlyStatePension",
    label: "Monthly State pension",
    width: "6rem",
    setting: "showStatePension",
  },
  {
    key: "monthlySippPension",
    label: "Monthly SIPP pension",
    width: "7rem",
    setting: "showSipp",
  },
  {
    key: "sippPot",
    label: "SIPP balance",
    width: "7rem",
    setting: "showSipp",
  },
  {
    key: "monthlyIsaPension",
    label: "Monthly ISA pension",
    width: "7rem",
    setting: "showIsa",
  },
  {
    key: "isaPot",
    label: "ISA balance",
    width: "7rem",
    setting: "showIsa",
  },
] as const;

function ProjectionTable({ rows, settings }: ProjectionTableProps) {
  const headerScrollRef = useRef<HTMLDivElement | null>(null);
  const [showMilestonesOnly, setShowMilestonesOnly] = useState(true);
  const visibleColumns = projectionTableColumns.filter(
    (column) => !column.setting || settings[column.setting],
  );
  const visibleRows = showMilestonesOnly
    ? rows.filter((row) => row.milestones.length > 0)
    : rows;
  const milestoneRowCount = rows.filter((row) => row.milestones.length > 0).length;

  const syncHeaderScroll = (scrollLeft: number) => {
    if (headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = scrollLeft;
    }
  };

  if (rows.length === 0) {
    return (
      <div className="table-shell">
        <p>No projection rows are available for the current settings.</p>
      </div>
    );
  }

  return (
    <div className="table-shell">
      <div className="table-controls">
        <button
          type="button"
          className="secondary-button"
          aria-pressed={showMilestonesOnly}
          onClick={() => setShowMilestonesOnly((current) => !current)}
        >
          {showMilestonesOnly ? "Show all rows" : "Only show milestone rows"}
        </button>
        <p className="table-status">
          Showing {visibleRows.length} of {rows.length} rows
          {showMilestonesOnly ? ` (${milestoneRowCount} milestones)` : ""}.
        </p>
        <p className="table-status table-status--basis">
          {settings.projectionBasis === "real"
            ? "Projection basis: Real terms, today's money"
            : "Projection basis: Nominal terms, future inflated values"}
        </p>
      </div>

      <div className="table-header-shell">
        <div className="table-header-scroll" ref={headerScrollRef}>
          <table className="projection-table projection-table--header" aria-hidden="true">
            <colgroup>
              {visibleColumns.map((column) => (
                <col key={column.key} style={{ width: column.width }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                {visibleColumns.map((column) => (
                  <th key={column.key} scope="col">
                    {getProjectionTableColumnLabel(column, settings)}
                  </th>
                ))}
              </tr>
            </thead>
          </table>
        </div>
      </div>

      <div className="table-body-shell" onScroll={(event) => syncHeaderScroll(event.currentTarget.scrollLeft)}>
        <table className="projection-table projection-table--body">
          <colgroup>
            {visibleColumns.map((column) => (
              <col key={column.key} style={{ width: column.width }} />
            ))}
          </colgroup>
          <thead className="projection-table-sr-only">
            <tr>
              {visibleColumns.map((column) => (
                <th key={column.key} scope="col">
                  {getProjectionTableColumnLabel(column, settings)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr
                key={row.date}
                className={row.milestones.length > 0 ? "projection-row projection-row--milestone" : "projection-row"}
                title={row.milestones.length > 0 ? row.milestones.join(", ") : undefined}
              >
                <td>
                  <div className="projection-date-cell">
                    <span>{formatDate(row.milestoneDates[0] ?? row.date)}</span>
                    {row.milestones.length > 0 ? (
                      <span className="milestone-badges">
                        {row.milestones.map((milestone: string) => (
                          <span className="milestone-badge" key={`${row.date}-${milestone}`}>
                            {milestone}
                          </span>
                        ))}
                      </span>
                    ) : null}
                  </div>
                </td>
                <td>{formatCurrencyDetailed(row.totalMonthlyPensionTakeHomePay)}</td>
                {settings.taxationEnabled ? (
                  <td>{formatCurrencyDetailed(row.monthlyIncomeTax)}</td>
                ) : null}
                {settings.taxationEnabled ? (
                  <td>{formatCurrencyDetailed(row.totalMonthlyPensionIncomeBeforeTax)}</td>
                ) : null}
                <td>{formatAge(row.age, row.ageMonths)}</td>
                <td>{formatCurrencyDetailed(row.monthlyAddedPension)}</td>
                <td>{formatCurrencyDetailed(row.lumpSumAddedPension)}</td>
                <td>{formatCurrencyDetailed(row.annualStandardAlphaPension)}</td>
                <td>{formatCurrencyDetailed(row.annualEpaAlphaPension)}</td>
                <td>{formatCurrencyDetailed(row.annualAccruedAlphaPension)}</td>
                <td>{formatCurrencyDetailed(row.annualAlphaPensionIncludingReduction)}</td>
                <td>{formatCurrencyDetailed(row.monthlyAlphaPensionTakeHome)}</td>
                {settings.showNuvos ? (
                  <td>{formatCurrencyDetailed(row.annualNuvosPension)}</td>
                ) : null}
                {settings.showNuvos ? (
                  <td>{formatCurrencyDetailed(row.annualNuvosPensionIncludingReduction)}</td>
                ) : null}
                {settings.showNuvos ? (
                  <td>{formatCurrencyDetailed(row.monthlyNuvosPensionTakeHome)}</td>
                ) : null}
                {settings.showStatePension ? (
                  <td>{formatCurrencyDetailed(row.monthlyStatePension)}</td>
                ) : null}
                {settings.showSipp ? (
                  <td>{formatCurrencyDetailed(row.monthlySippPension)}</td>
                ) : null}
                {settings.showSipp ? (
                  <td>{formatCurrencyDetailed(row.sippPot)}</td>
                ) : null}
                {settings.showIsa ? (
                  <td>{formatCurrencyDetailed(row.monthlyIsaPension)}</td>
                ) : null}
                {settings.showIsa ? (
                  <td>{formatCurrencyDetailed(row.isaPot)}</td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function getProjectionTableColumnLabel(
  column: ProjectionTableColumn,
  settings: PensionSettings,
) {
  if (column.key === "totalMonthlyPensionTakeHomePay") {
    return settings.taxationEnabled
      ? "Total monthly take-home income"
      : "Total monthly income before tax";
  }

  return column.label;
}

function formatDate(value: string) {
  if (!value) {
    return "Not set";
  }

  const parsed = new Date(`${value}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function formatCurrencyDetailed(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(rate: number) {
  return `${(rate * 100).toFixed(2).replace(/\.?0+$/, "")}%`;
}

function formatModelledReturn(
  rate: number,
  projectionBasis: PensionSettings["projectionBasis"],
) {
  return projectionBasis === "real"
    ? `${formatPercent(rate)} real return`
    : formatPercent(rate);
}

export function createRetirementIncomeSeries(
  rows: ProjectionRow[],
  settings: PensionSettings,
): RetirementIncomePoint[] {
  const statePensionAge = calculateDateAge(
    settings.dateOfBirth,
    settings.statePensionDrawDate,
  );
  const requirementDate = addYearsToIsoDate(
    settings.dateOfBirth,
    settings.requirementAge,
  );
  const alphaDrawDate = addYearsToIsoDate(
    settings.dateOfBirth,
    settings.alphaPensionDrawAge,
  );
  const nuvosDrawDate = addYearsToIsoDate(
    settings.dateOfBirth,
    settings.nuvosPensionDrawAge,
  );
  const sippDrawDate = addYearsToIsoDate(settings.dateOfBirth, settings.sippDrawAge);
  const isaDrawDate = addYearsToIsoDate(settings.dateOfBirth, settings.isaDrawAge);

  const baseSeries = rows
    .filter((row) => row.date >= settings.startDate)
    .map((row) => {
      const age = row.age + row.ageMonths / 12;
      const isaIncomeAnnual =
        settings.showIsa && row.date >= isaDrawDate ? row.monthlyIsaPension * 12 : 0;
      const sippIncomeAnnual =
        settings.showSipp && row.date >= sippDrawDate ? row.monthlySippPension * 12 : 0;
      const alphaIncomeAnnual =
        row.date >= alphaDrawDate ? row.monthlyAlphaPensionTakeHome * 12 : 0;
      const nuvosIncomeAnnual =
        settings.showNuvos && row.date >= nuvosDrawDate
          ? row.monthlyNuvosPensionTakeHome * 12
          : 0;
      const partialRetirementIncomeAnnual = calculatePartialRetirementIncomeAnnual(
        settings,
        row.date,
        requirementDate,
      );
      const statePensionIncomeAnnual =
        settings.showStatePension && row.date >= settings.statePensionDrawDate
          ? row.monthlyStatePension * 12
          : 0;
      const targetIncomeAnnual = calculateRetirementIncomeTargetAtDate(
        settings,
        row.date,
      );
      const totalIncomeAnnual =
        isaIncomeAnnual +
        sippIncomeAnnual +
        partialRetirementIncomeAnnual +
        alphaIncomeAnnual +
        nuvosIncomeAnnual +
        statePensionIncomeAnnual;

      return {
        date: row.date,
        age,
        targetIncomeAnnual,
        isaIncomeAnnual,
        sippIncomeAnnual,
        partialRetirementIncomeAnnual,
        alphaIncomeAnnual,
        nuvosIncomeAnnual,
        statePensionIncomeAnnual,
        totalIncomeAnnual,
        shortfallAnnual:
          row.date >= requirementDate
            ? Math.max(0, targetIncomeAnnual - totalIncomeAnnual)
            : 0,
        isaBalance: row.isaPot,
        sippBalance: row.sippPot,
        phase: getRetirementIncomePhase(age, settings, statePensionAge),
      };
    });

  return insertChartTransitionPoints(baseSeries, settings);
}

function insertChartTransitionPoints(
  points: RetirementIncomePoint[],
  settings: PensionSettings,
) {
  const transitionDates = [
    addYearsToIsoDate(settings.dateOfBirth, settings.requirementAge),
    addYearsToIsoDate(settings.dateOfBirth, settings.isaDrawAge),
    settings.showSipp ? addYearsToIsoDate(settings.dateOfBirth, settings.sippDrawAge) : "",
    addYearsToIsoDate(settings.dateOfBirth, settings.alphaPensionDrawAge),
    settings.showStatePension ? settings.statePensionDrawDate : "",
    settings.partialRetirementEnabled
      ? addYearsToIsoDate(settings.dateOfBirth, settings.partialRetirementStartAge)
      : "",
  ]
    .filter(Boolean)
    .filter((date, index, dates) => dates.indexOf(date) === index)
    .sort();

  let nextPoints = [...points];

  transitionDates.forEach((transitionDate) => {
    nextPoints = insertChartTransitionPoint(nextPoints, settings, transitionDate);
  });

  return nextPoints;
}

function insertChartTransitionPoint(
  points: RetirementIncomePoint[],
  settings: PensionSettings,
  transitionDate: string,
) {
  if (points.length === 0 || points.some((point) => point.date === transitionDate)) {
    return points;
  }

  const insertionIndex = points.findIndex((point) => point.date > transitionDate);

  if (insertionIndex <= 0) {
    return points;
  }

  const nextPoint = points[insertionIndex];

  if (!nextPoint) {
    return points;
  }

  const transitionPoint: RetirementIncomePoint = {
    ...nextPoint,
    date: transitionDate,
    age: calculateDateAge(settings.dateOfBirth, transitionDate),
  };

  return [
    ...points.slice(0, insertionIndex),
    transitionPoint,
    ...points.slice(insertionIndex),
  ];
}

function calculatePartialRetirementIncomeAnnual(
  settings: PensionSettings,
  rowDate: string,
  requirementDate: string,
) {
  const partialRetirementStartDate = addYearsToIsoDate(
    settings.dateOfBirth,
    settings.partialRetirementStartAge,
  );

  if (
    !settings.partialRetirementEnabled ||
    rowDate < partialRetirementStartDate ||
    rowDate >= requirementDate
  ) {
    return 0;
  }

  return settings.pensionableEarnings * (settings.partialRetirementWorkPercent / 100);
}

function createBridgeChartParameters(
  settings: PensionSettings,
): RetirementIncomeBridgeParameters {
  return {
    targetIncomeAnnual: settings.desiredRetirementIncome,
    alphaMonthlyAddedPension: settings.alphaAddedPensionMonthly,
    isaMonthlyContribution: settings.isaMonthlyContribution,
    sippMonthlyContribution: settings.sippMonthlyContribution,
    retirementAge: settings.requirementAge,
    alphaLeaveAge: settings.alphaPensionLeaveAge,
    sippAccessAge: settings.sippDrawAge,
    sippUseByAge: settings.sippWithdrawalTargetAge,
    isaAccessAge: settings.isaDrawAge,
    alphaStartAge: settings.alphaPensionDrawAge,
    isaUseByAge: settings.isaWithdrawalTargetAge,
    partialRetirementStartAge: settings.partialRetirementStartAge,
    partialRetirementWorkPercent: settings.partialRetirementWorkPercent,
    partialRetirementEnabled: settings.partialRetirementEnabled,
    statePensionAge: calculateStatePensionDrawAge(
      settings.dateOfBirth,
      settings.statePensionDrawDate,
    ),
    showIsa: settings.showIsa,
    showSipp: settings.showSipp,
    sippUseByAgeEnabled:
      settings.showSipp && settings.sippWithdrawalStrategy === "use_by_age",
    showNuvos: settings.showNuvos,
    isaUseByAgeEnabled:
      settings.showIsa && settings.isaWithdrawalStrategy === "use_by_age",
    showStatePension: settings.showStatePension,
  };
}

function createBridgeChartLimits(settings: PensionSettings): RetirementIncomeBridgeLimits {
  const statePensionAge = calculateStatePensionDrawAge(
    settings.dateOfBirth,
    settings.statePensionDrawDate,
  );
  const minimumSippAccessAge = calculateMinimumSippAccessAge(settings.dateOfBirth);
  const minimumAlphaAccessAge = calculateMinimumPensionAccessAge(settings.dateOfBirth);
  const currentPlanningAge = calculateCurrentPlanningAge(settings);
  const defaultStatePensionAge = calculateMinimumStatePensionDrawAge(
    settings.dateOfBirth,
  );
  const ageUpperLimit = Math.max(currentPlanningAge, Math.min(70, statePensionAge));
  const partialRetirementMaxAge = Math.max(
    currentPlanningAge,
    Math.min(settings.requirementAge - 0.25, 70, settings.lifeExpectancy),
  );
  const sippUseByMin = settings.sippDrawAge + 0.25;
  const isaUseByMin = settings.isaDrawAge + 0.25;
  const useByMax = Math.min(100, settings.lifeExpectancy);

  return {
    targetIncomeAnnual: { min: 0, max: 200000, step: 600 },
    alphaMonthlyAddedPension: { min: 0, max: 1000, step: 25 },
    isaMonthlyContribution: { min: 0, max: 5000, step: 25 },
    sippMonthlyContribution: { min: 0, max: 5000, step: 25 },
    retirementAge: { min: currentPlanningAge, max: ageUpperLimit, step: 0.25 },
    alphaLeaveAge: { min: currentPlanningAge, max: ageUpperLimit, step: 0.25 },
    sippAccessAge: {
      min: Math.max(settings.requirementAge, minimumSippAccessAge),
      max: ageUpperLimit,
      step: 0.25,
    },
    sippUseByAge: {
      min: sippUseByMin,
      max: Math.max(sippUseByMin, useByMax),
      step: 0.25,
    },
    isaAccessAge: {
      min: currentPlanningAge,
      max: ageUpperLimit,
      step: 0.25,
    },
    alphaStartAge: {
      min: Math.max(settings.alphaPensionLeaveAge, minimumAlphaAccessAge),
      max: ageUpperLimit,
      step: 0.25,
    },
    isaUseByAge: {
      min: isaUseByMin,
      max: Math.max(isaUseByMin, useByMax),
      step: 0.25,
    },
    partialRetirementStartAge: {
      min: currentPlanningAge,
      max: partialRetirementMaxAge,
      step: 0.25,
    },
    partialRetirementWorkPercent: { min: 0, max: 100, step: 1 },
    statePensionAge: {
      min: defaultStatePensionAge,
      max: Math.max(defaultStatePensionAge, settings.lifeExpectancy),
      step: 0.25,
    },
  };
}

function getRetirementIncomePhase(
  age: number,
  settings: PensionSettings,
  statePensionAge: number,
): RetirementIncomePoint["phase"] {
  if (age < settings.isaDrawAge) {
    return "build-up";
  }

  if (settings.showIsa && (!settings.showSipp || age < settings.sippDrawAge)) {
    return "isa-bridge";
  }

  if (settings.showSipp && age < settings.alphaPensionDrawAge) {
    return "sipp-bridge";
  }

  if (!settings.showStatePension || age < statePensionAge) {
    if (!settings.showSipp) {
      return "alpha-only";
    }

    return "alpha-sipp";
  }

  return "alpha-state";
}

function calculateCurrentPlanningAge(settings: PensionSettings) {
  return Math.max(0, Math.ceil(calculateDateAge(settings.dateOfBirth, settings.startDate)));
}

function addYearsToIsoDate(value: string, years: number) {
  const [year, month, day] = value.split("-").map(Number);
  const wholeYears = Math.floor(years);
  const remainingMonths = Math.round((years - wholeYears) * 12);
  const nextDate = new Date(Date.UTC(year + wholeYears, month - 1 + remainingMonths, day));

  return [
    nextDate.getUTCFullYear(),
    String(nextDate.getUTCMonth() + 1).padStart(2, "0"),
    String(nextDate.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatAge(years: number, months: number) {
  return `${years}y ${months}m`;
}

function formatAgeValue(value: number) {
  return value.toFixed(2).replace(/\.00$/, "");
}

function isSettingsGroupVisible(groupId: string, settings: PensionSettings) {
  if (groupId === "nuvos") {
    return settings.showNuvos;
  }

  if (groupId === "state") {
    return settings.showStatePension;
  }

  if (groupId === "sipp") {
    return settings.showSipp;
  }

  if (groupId === "isa") {
    return settings.showIsa;
  }

  if (groupId === "tax") {
    return settings.taxationEnabled;
  }

  if (groupId === "partial-retirement") {
    return settings.partialRetirementEnabled;
  }

  return true;
}

type AddedPensionLumpSumsEditorProps = {
  lumpSums: AddedPensionLumpSum[];
  defaultStartDate: string;
  useDropdownDates: boolean;
  title?: string;
  description?: string;
  emptyText?: string;
  itemLabel?: string;
  addButtonLabel?: string;
  removeButtonLabel?: string;
  showFactorType?: boolean;
  validationIssues?: PensionValidationIssue[];
  onChange: (nextLumpSums: AddedPensionLumpSum[]) => void;
};

function AddedPensionLumpSumsEditor({
  lumpSums,
  defaultStartDate,
  useDropdownDates,
  title = "Lump sum purchases",
  description = "Add one-off or yearly lump sum purchases. A yearly entry repeats on the same calendar date until its end date.",
  emptyText = "No lump sum added pension purchases set up yet.",
  itemLabel = "Lump sum",
  addButtonLabel = "Add lump sum purchase",
  removeButtonLabel = "Remove lump sum",
  showFactorType = false,
  validationIssues = [],
  onChange,
}: AddedPensionLumpSumsEditorProps) {
  function updateLumpSum(
    id: string,
    patch: Partial<AddedPensionLumpSum>,
  ) {
    onChange(
      lumpSums.map((lumpSum) => (lumpSum.id === id ? { ...lumpSum, ...patch } : lumpSum)),
    );
  }

  function addLumpSum() {
    onChange([
      ...lumpSums,
      createDefaultAddedPensionLumpSum(
        defaultStartDate,
        showFactorType ? "self" : undefined,
      ),
    ]);
  }

  function removeLumpSum(id: string) {
    onChange(lumpSums.filter((lumpSum) => lumpSum.id !== id));
  }

  return (
    <div className="lump-sum-editor">
      <div className="lump-sum-editor-heading">
        <h4>{title}</h4>
        <p className="section-copy">{description}</p>
      </div>

      <div className="field-grid">
        {lumpSums.length === 0 ? (
          <p className="section-copy">{emptyText}</p>
        ) : null}

        {lumpSums.map((lumpSum, index) => {
          const lumpSumValidationIssues = validationIssues.filter(
            (issue) => issue.itemId === lumpSum.id,
          );
          const validationId = lumpSumValidationIssues.length
            ? `lump-sum-${lumpSum.id}-validation`
            : undefined;
          const hasValidationIssue = lumpSumValidationIssues.length > 0;

          return (
          <div
            className={getFieldCardClassName(false, false, hasValidationIssue)}
            key={lumpSum.id}
          >
            <span className="field-header">
              <span className="field-label">{itemLabel} #{index + 1}</span>
            </span>

            <label className="field-label" htmlFor={`lump-sum-amount-${lumpSum.id}`}>
              Amount (£)
            </label>
            <input
              id={`lump-sum-amount-${lumpSum.id}`}
              aria-label={`${itemLabel} amount ${index + 1}`}
              className="select-input"
              min={0}
              step={500}
              type="number"
              value={lumpSum.amount}
              aria-invalid={hasValidationIssue || undefined}
              aria-describedby={validationId}
              onChange={(event) =>
                updateLumpSum(lumpSum.id, { amount: Number(event.target.value) })
              }
            />

            <span className="field-label">Payment start date</span>
            {useDropdownDates ? (
              <DateSelectField
                label={`${itemLabel} start date ${index + 1}`}
                value={lumpSum.startDate}
                idPrefix={`lump-sum-start-${lumpSum.id}`}
                yearRange={getLumpSumDateYearRange("start")}
                describedBy={validationId}
                hasValidationIssue={hasValidationIssue}
                onChange={(nextValue) =>
                  updateLumpSum(lumpSum.id, { startDate: nextValue })
                }
              />
            ) : (
              <input
                id={`lump-sum-start-${lumpSum.id}`}
                aria-label={`${itemLabel} start date ${index + 1}`}
                className="date-input"
                type="date"
                value={lumpSum.startDate}
                aria-invalid={hasValidationIssue || undefined}
                aria-describedby={validationId}
                onChange={(event) =>
                  updateLumpSum(lumpSum.id, { startDate: event.target.value })
                }
              />
            )}

            <label className="field-label" htmlFor={`lump-sum-cadence-${lumpSum.id}`}>
              Cadence
            </label>
            <select
              id={`lump-sum-cadence-${lumpSum.id}`}
              aria-label={`${itemLabel} cadence ${index + 1}`}
              className="date-input"
              value={lumpSum.cadence}
              aria-invalid={hasValidationIssue || undefined}
              aria-describedby={validationId}
              onChange={(event) =>
                updateLumpSum(lumpSum.id, {
                  cadence: event.target.value as AddedPensionLumpSum["cadence"],
                })
              }
            >
              <option value="once">One-off</option>
              <option value="yearly">Yearly</option>
            </select>

            {showFactorType ? (
              <>
                <label className="field-label" htmlFor={`lump-sum-factor-type-${lumpSum.id}`}>
                  Cover
                </label>
                <select
                  id={`lump-sum-factor-type-${lumpSum.id}`}
                  aria-label={`${itemLabel} cover ${index + 1}`}
                  className="date-input"
                  value={lumpSum.factorType ?? "self"}
                  aria-invalid={hasValidationIssue || undefined}
                  aria-describedby={validationId}
                  onChange={(event) =>
                    updateLumpSum(lumpSum.id, {
                      factorType: event.target.value as AddedPensionLumpSum["factorType"],
                    })
                  }
                >
                  <option value="self">Self only</option>
                  <option value="self_plus_beneficiaries">Self and dependants</option>
                </select>
              </>
            ) : null}

            {lumpSum.cadence === "yearly" ? (
              <>
                <span className="field-label">Repeat until</span>
                {useDropdownDates ? (
                  <DateSelectField
                    label={`${itemLabel} end date ${index + 1}`}
                    value={lumpSum.endDate}
                    idPrefix={`lump-sum-end-${lumpSum.id}`}
                    yearRange={getLumpSumDateYearRange("end")}
                    describedBy={validationId}
                    hasValidationIssue={hasValidationIssue}
                    onChange={(nextValue) =>
                      updateLumpSum(lumpSum.id, { endDate: nextValue })
                    }
                  />
                ) : (
                  <input
                    id={`lump-sum-end-${lumpSum.id}`}
                    aria-label={`${itemLabel} end date ${index + 1}`}
                    className="date-input"
                    type="date"
                    value={lumpSum.endDate}
                    aria-invalid={hasValidationIssue || undefined}
                    aria-describedby={validationId}
                    onChange={(event) =>
                      updateLumpSum(lumpSum.id, { endDate: event.target.value })
                    }
                  />
                )}
              </>
            ) : null}

            <button
              type="button"
              className="secondary-button"
              onClick={() => removeLumpSum(lumpSum.id)}
            >
              {removeButtonLabel}
            </button>
            <FieldValidationMessages
              id={validationId}
              issues={lumpSumValidationIssues}
            />
          </div>
          );
        })}
      </div>

      <button type="button" className="secondary-button" onClick={addLumpSum}>
        {addButtonLabel}
      </button>
    </div>
  );
}

const monthOptions = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
] as const;

function getDateParts(value: string): DateParts {
  const [year = "", month = "", day = ""] = value.split("-");
  return { year, month, day };
}

function getDaysInMonth(year: number, month: number) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return 31;
  }

  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function clampDay(day: string, year: string, month: string) {
  const maxDay = getDaysInMonth(Number(year), Number(month));
  const nextDay = Math.min(Number(day), maxDay);
  return String(nextDay).padStart(2, "0");
}

function getPrimaryDateYearRange(
  fieldId: DateField["id"],
  settings?: PensionSettings,
) {
  const currentYear = new Date().getUTCFullYear();

  switch (fieldId) {
    case "dateOfBirth":
      return { min: currentYear - 100, max: currentYear };
    case "startDate":
      return { min: currentYear - 5, max: currentYear + 5 };
    case "alphaPensionAbsDate":
      return { min: 2015, max: currentYear };
    case "statePensionDrawDate": {
      const defaultDrawYear = Number(
        calculateStatePensionDrawDate(
          settings?.dateOfBirth ?? defaultSettings.dateOfBirth,
        ).slice(0, 4),
      );

      return { min: defaultDrawYear, max: defaultDrawYear + 30 };
    }
    default:
      return { min: currentYear - 25, max: currentYear + 25 };
  }
}

function getLumpSumDateYearRange(kind: "start" | "end") {
  const currentYear = new Date().getUTCFullYear();

  if (kind === "start") {
    return { min: currentYear - 5, max: currentYear + 40 };
  }

  return { min: currentYear - 5, max: currentYear + 50 };
}

function useMobileDateDropdowns() {
  const mobileBreakpoint = "(max-width: 480px)";
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return false;
    }

    return window.matchMedia(mobileBreakpoint).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia(mobileBreakpoint);
    const updateMatch = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    mediaQuery.addEventListener("change", updateMatch);

    return () => {
      mediaQuery.removeEventListener("change", updateMatch);
    };
  }, []);

  return matches;
}

function loadAcknowledgementState() {
  return readStorageItem(ACKNOWLEDGEMENT_STORAGE_KEY) === ACKNOWLEDGEMENT_VERSION;
}

function loadStoredAppMode(): AppMode | null {
  const storedMode = readStorageItem(APP_MODE_STORAGE_KEY);

  return storedMode === "journey" || storedMode === "expert" ? storedMode : null;
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

function saveStoredAppMode(mode: AppMode) {
  writeStorageItem(APP_MODE_STORAGE_KEY, mode);
}

export default App;
