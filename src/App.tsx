import {
  createContext,
  useCallback,
  useDeferredValue,
  useEffect,
  useContext,
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
  generateRetirementBridgeAnalysis,
  generatePensionSummary,
  prepareBridgeProjectionSettings,
  type RetirementBridgeAnalysis,
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
  getPartialRetirementSavingsContributionMultiplier,
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
const GUIDANCE_NOTES_STORAGE_KEY = "cs-pension-modeller.guidanceNotes";
const COMPARISON_SCENARIOS_STORAGE_KEY =
  "cs-pension-modeller.comparisonScenarios";
const MAX_COMPARISON_SCENARIOS = 5;
const GuidanceNotesContext = createContext(true);
const MODELLER_LIMITATIONS = [
  "Income Tax is estimated from configurable standard assumptions. It does not cover Scottish tax bands, benefit interactions, tax code changes, or other personal reliefs.",
  "Inflation is only modelled where explicit CPI or growth assumptions are enabled.",
  "State Pension modelling does not cover benefit interactions, overseas rules, lump-sum arrears choices, or pre-2016 deferral rules.",
  "Added pension purchase revaluation is simplified.",
  "Scheme-specific edge cases are not exhaustively represented.",
] as const;
const OPTIONAL_SECTION_TOGGLES = [
  {
    key: "showAlpha",
    label: "Alpha",
    description: "Show Alpha inputs and include Alpha pension values in the modeller.",
  },
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

type OptionalSectionToggleKey = (typeof OPTIONAL_SECTION_TOGGLES)[number]["key"];
type JourneyFieldLabels = Partial<Record<FieldDefinition["id"], string>>;

type AppMode = "journey" | "bridge" | "simple" | "expert";

type JourneyStepDefinition =
  | {
      id: string;
      eyebrow: string;
      title: string;
      description: string;
      kind: "optional-sections" | "answer" | "bridge-answer";
      toggleKeys?: readonly OptionalSectionToggleKey[];
      visible?: (settings: PensionSettings) => boolean;
    }
  | {
      id: string;
      eyebrow: string;
      title: string;
      description: string;
      kind: "fields";
      fieldIds: readonly FieldDefinition["id"][];
      fieldLabels?: JourneyFieldLabels;
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
          "Choose the parts of your retirement picture you want to model. Turn sections on when that income source belongs in the scenario. Settings you have entered are kept if you hide a section and come back later.",
        kind: "optional-sections",
      },
      {
        id: "basics",
        eyebrow: "Step 2",
        title: "Your planning basics",
        description:
          "Set the personal dates and income target that anchor the projection.",
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
          "Choose the basis used to compare future values with today’s spending power.",
        kind: "fields",
        fieldIds: ["projectionBasis", "inflationRateAnnual"],
      },
      {
        id: "alpha",
        eyebrow: "Step 4",
        title: "Your Alpha pension plan",
        description:
          "Enter your Alpha statement values, pensionable earnings, and draw/leave ages.",
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
        visible: (settings) => settings.showAlpha,
      },
      {
        id: "state",
        eyebrow: "Optional",
        title: "State Pension",
        description:
          "Add your forecast, start date, and any future uprating assumption.",
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
        description:
          "Add any nuvos statement value, earnings, and draw timing you want to model.",
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
          "Add personal pension balances, contributions, tax relief, growth, and drawdown rules.",
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
          "Add ISA savings, contributions, growth, and drawdown rules for flexible bridge money.",
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
          "Model a reduced work pattern and lower regular accruals or savings from that point.",
        kind: "fields",
        fieldIds: [
          "partialRetirementStartAge",
          "fullSalary",
          "partialRetirementWorkPercent",
        ],
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
          "Review the scenario answer from the assumptions you have just walked through.",
        kind: "answer",
      },
    ],
  },
  {
    id: "early-retirement-bridge",
    title: "Work out what I need to retire early",
    description:
      "Test whether your chosen retirement age works, then see the ISA and SIPP bridge needed before secure pension income is fully in place.",
    steps: [
      {
        id: "target",
        eyebrow: "Step 1",
        title: "Your retirement target",
        description:
          "Set the age you want to stop work and the income you want that retirement to support.",
        kind: "fields",
        fieldIds: ["requirementAge", "desiredRetirementIncome"],
        fieldLabels: {
          requirementAge: "Target retirement age",
          desiredRetirementIncome: "Income you want in retirement (£ per year)",
        },
      },
      {
        id: "personal",
        eyebrow: "Step 2",
        title: "Your personal details",
        description:
          "Set the dates that define current age, access ages, and the length of the bridge.",
        kind: "fields",
        fieldIds: ["startDate", "dateOfBirth", "lifeExpectancy"],
        fieldLabels: {
          startDate: "Start modelling from",
        },
      },
      {
        id: "include",
        eyebrow: "Step 3",
        title: "Your Civil Service pensions",
        description:
          "We include State Pension, ISA and SIPP by default. Tell us which Civil Service pensions you have. Settings you have entered are kept if you hide a section and come back later.",
        kind: "optional-sections",
        toggleKeys: ["showAlpha", "showNuvos"],
      },
      {
        id: "alpha",
        eyebrow: "Step 4",
        title: "Your Alpha pension",
        description:
          "Add the Alpha pension you have built up and the age you would prefer to draw it.",
        kind: "fields",
        fieldIds: [
          "alphaPensionDrawAge",
          "alphaPensionAbsDate",
          "accruedPensionAtLastAbs",
          "pensionableEarnings",
          "alphaAddedPensionMonthly",
          "applyPensionIncreases",
          "assumedCpiPercent",
        ],
        visible: (settings) => settings.showAlpha,
      },
      {
        id: "nuvos",
        eyebrow: "Optional",
        title: "Your nuvos pension",
        description:
          "Add nuvos benefits if they should be part of the bridge calculation.",
        kind: "fields",
        fieldIds: [
          "nuvosPensionDrawAge",
          "nuvosPensionAbsDate",
          "nuvosAccruedPensionAtLastAbs",
          "nuvosPensionableEarnings",
          "nuvosApplyPensionIncreases",
          "nuvosAssumedCpiPercent",
        ],
        visible: (settings) => settings.showNuvos,
      },
      {
        id: "state",
        eyebrow: "Optional",
        title: "State Pension",
        description:
          "Check your State Pension forecast and the date it becomes available.",
        kind: "fields",
        fieldIds: [
          "currentStatePension",
          "statePensionDrawDate",
          "statePensionApplyFutureGrowth",
          "statePensionCpiPercent",
          "statePensionWageGrowthPercent",
        ],
        visible: (settings) => settings.showStatePension,
        fieldLabels: {
          currentStatePension: "State Pension forecast (£ per year)",
        },
      },
      {
        id: "pots",
        eyebrow: "Step 5",
        title: "Your bridging pots",
        description:
          "Keep ISA and SIPP separate so the model respects tax relief, access ages, and drawdown timing.",
        kind: "fields",
        fieldIds: [
          "isaCurrentPot",
          "isaMonthlyContribution",
          "isaApplyRealInterest",
          "isaRealInterestPercent",
          "sippCurrentPot",
          "sippMonthlyContribution",
          "sippDrawAge",
          "sippTaxReliefRate",
          "sippApplyRealInterest",
          "sippRealInterestPercent",
        ],
        fieldLabels: {
          isaCurrentPot: "Current ISA balance (£)",
          isaMonthlyContribution: "Planned monthly ISA contribution before retirement",
          sippCurrentPot: "Current SIPP balance (£)",
          sippMonthlyContribution: "Planned monthly SIPP contribution before retirement",
          sippDrawAge: "SIPP access age",
        },
      },
      {
        id: "answer",
        eyebrow: "Result",
        title: "Your retirement bridge",
        description:
          "Review the gap between stopping work and secure pension income starting.",
        kind: "bridge-answer",
      },
    ],
  },
  {
    id: "simple-early-retirement",
    title: "Simple early retirement journey",
    description:
      "Follow a short early-retirement journey based on the main Civil Service pension calculator inputs, then review the chart at the end.",
    steps: [
      {
        id: "basics",
        eyebrow: "Step 1",
        title: "About you and your target",
        description:
          "Start with your date of birth, the age you want to retire, and the income you want the plan to support.",
        kind: "fields",
        fieldIds: ["dateOfBirth", "requirementAge", "desiredRetirementIncome"],
        fieldLabels: {
          dateOfBirth: "Date of birth",
          requirementAge: "Early retirement age",
          desiredRetirementIncome: "Target retirement income (£ per year)",
        },
      },
      {
        id: "alpha",
        eyebrow: "Step 2",
        title: "Your Alpha pension",
        description:
          "Enter the main figures from your latest statement together with the age you expect to leave and draw Alpha.",
        kind: "fields",
        fieldIds: [
          "alphaPensionAbsDate",
          "accruedPensionAtLastAbs",
          "pensionableEarnings",
          "alphaPensionLeaveAge",
          "alphaPensionDrawAge",
        ],
        fieldLabels: {
          alphaPensionAbsDate: "Annual Benefits Statement year",
          accruedPensionAtLastAbs: "Accrued pension to date (£ per year)",
          pensionableEarnings: "Pensionable earnings (£ per year)",
          alphaPensionLeaveAge: "Age you leave Alpha",
          alphaPensionDrawAge: "Alpha pension draw age",
        },
      },
      {
        id: "alpha-options",
        eyebrow: "Step 3",
        title: "Added pension and EPA",
        description:
          "Add any monthly added pension and EPA choices you want reflected in the plan.",
        kind: "fields",
        fieldIds: [
          "alphaAddedPensionMonthly",
          "alphaAddedPensionFactorType",
          "alphaEpaEnabled",
          "alphaEpaYearsBeforeNpa",
        ],
        fieldLabels: {
          alphaAddedPensionMonthly: "Monthly added pension payments (£)",
          alphaAddedPensionFactorType: "Added pension type",
        },
      },
      {
        id: "partial-retirement",
        eyebrow: "Optional",
        title: "Reduced hours",
        description:
          "Model a reduced-hours period before full retirement if that is part of your plan.",
        kind: "fields",
        fieldIds: [
          "partialRetirementStartAge",
          "fullSalary",
          "partialRetirementWorkPercent",
        ],
        fieldLabels: {
          partialRetirementStartAge: "Reduced hours age",
          fullSalary: "Full salary before reduced hours (£ per year)",
          partialRetirementWorkPercent: "Reduced hours percentage",
        },
        visible: (settings) => settings.partialRetirementEnabled,
      },
      {
        id: "nuvos",
        eyebrow: "Optional",
        title: "nuvos pension",
        description:
          "Add nuvos benefits if they should be part of the projection.",
        kind: "fields",
        fieldIds: [
          "nuvosPensionDrawAge",
          "nuvosPensionAbsDate",
          "nuvosAccruedPensionAtLastAbs",
          "nuvosPensionableEarnings",
          "nuvosApplyPensionIncreases",
          "nuvosAssumedCpiPercent",
        ],
        visible: (settings) => settings.showNuvos,
      },
      {
        id: "pots",
        eyebrow: "Optional",
        title: "ISA and SIPP",
        description:
          "Add personal pots only if you want the chart to show how they help bridge the gap to secure pension income.",
        kind: "fields",
        fieldIds: [
          "isaCurrentPot",
          "isaMonthlyContribution",
          "isaApplyRealInterest",
          "isaRealInterestPercent",
          "sippCurrentPot",
          "sippMonthlyContribution",
          "sippDrawAge",
          "sippTaxReliefRate",
          "sippApplyRealInterest",
          "sippRealInterestPercent",
        ],
        fieldLabels: {
          isaCurrentPot: "Current ISA balance (£)",
          isaMonthlyContribution: "Monthly ISA contribution (£)",
          sippCurrentPot: "Current SIPP balance (£)",
          sippMonthlyContribution: "Monthly SIPP contribution (£)",
          sippDrawAge: "SIPP access age",
        },
        visible: (settings) => settings.showIsa || settings.showSipp,
      },
      {
        id: "answer",
        eyebrow: "Result",
        title: "Your chart and answer",
        description:
          "Review the income chart and the main gaps or surpluses in your plan.",
        kind: "bridge-answer",
      },
    ],
  },
] as const satisfies readonly JourneyDefinition[];

function applyBridgeJourneyDefaults(settings: PensionSettings): PensionSettings {
  return {
    ...settings,
    showStatePension: true,
    showSipp: true,
    showIsa: true,
    taxationEnabled: false,
    partialRetirementEnabled: false,
  };
}

function applySimpleJourneyDefaults(settings: PensionSettings): PensionSettings {
  return {
    ...settings,
    showStatePension: true,
    showSipp: false,
    showIsa: false,
    showNuvos: false,
    statePensionApplyFutureGrowth: false,
    applyPensionIncreases: true,
    assumedCpiPercent: 0,
    taxationEnabled: false,
    partialRetirementEnabled: false,
  };
}

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
  const useDropdownDates = useMobileDateDropdowns();
  const deferredSettings = useDeferredValue(settings);
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
  const retirementIncomeTitle =
    retirementIncomeDisplay === "monthly"
      ? settings.taxationEnabled
        ? "Monthly take-home retirement income"
        : "Monthly retirement income before tax"
      : settings.taxationEnabled
        ? "Annual take-home retirement income"
        : "Annual retirement income before tax";
  const retirementIncomeItems =
    pensionSummary?.retirementIncome.sources.map((source) => ({
      label:
        retirementIncomeDisplay === "monthly"
          ? `Monthly ${source.label}`
          : `Annual ${source.label}`,
      value: formatCurrencyDetailed(
        retirementIncomeDisplay === "monthly"
          ? source.monthlyIncome
          : source.annualIncome,
      ),
    })) ?? [];
  const retirementIncomeTotal = formatCurrencyDetailed(
    retirementIncomeDisplay === "monthly"
      ? (pensionSummary?.retirementIncome.totalMonthlyIncome ?? 0)
      : (pensionSummary?.retirementIncome.totalAnnualIncome ?? 0),
  );
  const retirementIncomeTargetTitle =
    retirementIncomeDisplay === "monthly"
      ? "Monthly target retirement income"
      : "Annual target retirement income";
  const annualRetirementIncomeTarget = calculateRetirementIncomeTargetAtDate(
    settings,
    addYearsToIsoDate(settings.dateOfBirth, settings.requirementAge),
  );
  const retirementIncomeTarget = formatCurrencyDetailed(
    retirementIncomeDisplay === "monthly"
      ? annualRetirementIncomeTarget / 12
      : annualRetirementIncomeTarget,
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
              normalPensionAge: calculateNormalPensionAge(normalizedValue as string),
              alphaPensionDrawAge: normalizeAlphaPensionDrawAge(
                current.alphaPensionDrawAge,
                normalizedValue as string,
              ),
              sippDrawAge: normalizeSippDrawAge(
                current.sippDrawAge,
                normalizedValue as string,
              ),
              statePensionDrawDate: calculateStatePensionDrawDateFromAge(
                normalizedValue as string,
                calculateMinimumStatePensionDrawAge(normalizedValue as string),
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

  function loadComparisonScenario(scenarioSettings: PensionSettings) {
    showSavedLabel();
    setChartUndoStack([]);
    setSettingsFormVersion((current) => current + 1);
    setSettings(clonePensionSettings(scenarioSettings));
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
    <GuidanceNotesContext.Provider value={showGuidanceNotes}>
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
              Work through a simple Civil Service pension journey, then review your
              income chart at the end. Expert mode is still there when you want every
              setting.
            </p>
          </div>

          <ModeSelectionPanel selectedMode={appMode} onSelectMode={selectAppMode} />
        </section>

        {appMode === "journey" ? (
          <div ref={activeModeRef} className="active-mode-region" tabIndex={-1}>
            <GuidedJourney
              key="retirement-date"
              journey={GUIDED_JOURNEYS[0]}
              settings={settings}
              validationIssues={validationIssues}
              pensionSummary={pensionSummary}
              projectionRows={projectionRows}
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
              onScenariosChange={setComparisonScenarios}
              onLoadScenario={loadComparisonScenario}
              onRetirementIncomeDisplayChange={setRetirementIncomeDisplay}
              showLimitations={showLimitations}
              onToggleLimitations={() => setShowLimitations((current) => !current)}
              showGuidanceNotes={showGuidanceNotes}
              onShowGuidanceNotesChange={setShowGuidanceNotes}
            />
          </div>
        ) : null}

        {appMode === "bridge" ? (
          <div ref={activeModeRef} className="active-mode-region" tabIndex={-1}>
            <GuidedJourney
              key="early-retirement-bridge"
              journey={GUIDED_JOURNEYS[1]}
              settings={settings}
              validationIssues={validationIssues}
              pensionSummary={pensionSummary}
              projectionRows={projectionRows}
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
              onScenariosChange={setComparisonScenarios}
              onLoadScenario={loadComparisonScenario}
              onRetirementIncomeDisplayChange={setRetirementIncomeDisplay}
              showLimitations={showLimitations}
              onToggleLimitations={() => setShowLimitations((current) => !current)}
              showGuidanceNotes={showGuidanceNotes}
              onShowGuidanceNotesChange={setShowGuidanceNotes}
            />
          </div>
        ) : null}

        {appMode === "simple" ? (
          <div ref={activeModeRef} className="active-mode-region" tabIndex={-1}>
            <GuidedJourney
              key="simple-early-retirement"
              journey={GUIDED_JOURNEYS[2]}
              settings={settings}
              validationIssues={validationIssues}
              pensionSummary={pensionSummary}
              projectionRows={projectionRows}
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
              onScenariosChange={setComparisonScenarios}
              onLoadScenario={loadComparisonScenario}
              onRetirementIncomeDisplayChange={setRetirementIncomeDisplay}
              showLimitations={showLimitations}
              onToggleLimitations={() => setShowLimitations((current) => !current)}
              showGuidanceNotes={showGuidanceNotes}
              onShowGuidanceNotesChange={setShowGuidanceNotes}
            />
          </div>
        ) : null}

        {appMode === "expert" ? (
          <div ref={activeModeRef} className="active-mode-region" tabIndex={-1}>
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
                        Choose which parts of the modeller are in this scenario.
                        Hidden sections keep their saved values, and guidance notes
                        can be turned off once the controls feel familiar.
                      </p>
                      <GuidanceNotesToggle
                        checked={showGuidanceNotes}
                        onChange={setShowGuidanceNotes}
                      />
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

            {pensionSummary ? (
              <SummarySection
                title="Calculated details"
                items={[
                  {
                    label: "Normal Pension Age",
                    value: formatDecimalAge(pensionSummary.calculated.normalPensionAge),
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
            ) : null}
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

          </div>
        ) : null}

        {appMode === "expert" ? (
          <ComparisonPrototype
            settings={settings}
            validationIssues={validationIssues}
            scenarios={comparisonScenarios}
            onScenariosChange={setComparisonScenarios}
            onLoadScenario={loadComparisonScenario}
          />
        ) : null}

        {appMode === "expert" ? (
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
        ) : null}
      </main>
    </GuidanceNotesContext.Provider>
  );

  function acknowledgeNotice() {
    setHasAcknowledgedNotice(true);
    writeStorageItem(ACKNOWLEDGEMENT_STORAGE_KEY, ACKNOWLEDGEMENT_VERSION);

    if (appMode === null) {
      selectAppMode("simple");
    }
  }

  function selectAppMode(mode: AppMode) {
    if (mode === "bridge") {
      setSettings((current) => applyBridgeJourneyDefaults(current));
      setChartUndoStack([]);
    }

    if (mode === "simple") {
      setSettings((current) => applySimpleJourneyDefaults(current));
      setChartUndoStack([]);
    }

    shouldFocusActiveMode.current = true;
    if (mode === appMode) {
      scrollActiveModeIntoView();
    }
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
        <h2 id="mode-selection-title">Choose the level of detail</h2>
        <p className="section-copy">
          The simple planner is the quickest way through. Switch to expert mode any
          time if you want every modelling control.
        </p>
      </div>

      <div className="mode-card-grid">
        <button
          type="button"
          className={getModeCardClassName(selectedMode === "simple")}
          aria-pressed={selectedMode === "simple"}
          onClick={() => onSelectMode("simple")}
        >
          <span className="card-label">Simple journey</span>
          <strong>Use the simple early retirement journey</strong>
          <span>
            Follow a shorter flow with State Pension assumptions handled for you
            and the chart at the end.
          </span>
        </button>

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
          className={getModeCardClassName(selectedMode === "bridge")}
          aria-pressed={selectedMode === "bridge"}
          onClick={() => onSelectMode("bridge")}
        >
          <span className="card-label">Early retirement</span>
          <strong>Work out what I need to retire early</strong>
          <span>
            Follow a short, statement-led flow that closely matches the main Civil
            Service calculator inputs and ends on the chart.
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

type ComparisonScenario = {
  id: string;
  name: string;
  settings: PensionSettings;
  createdAt: string;
  updatedAt: string;
};

type ComparisonResult = {
  scenario: ComparisonScenario;
  rows: ProjectionRow[];
  summary: PensionSummary;
  annualIncome: number;
  annualTarget: number;
  annualGap: number;
  isaDepletedAge: number | null;
  sippDepletedAge: number | null;
  retirementAnnualIncome: number;
  statePensionAnnualIncome: number;
  lifeExpectancyAnnualIncome: number;
  targetMissMonths: number;
  currentMatchesSaved: boolean;
};

type ComparisonTableRow = {
  key: string;
  section: string;
  metric: string;
  values: ReactNode[];
  sectionStart: boolean;
};

function ComparisonPrototype({
  settings,
  validationIssues,
  scenarios,
  onScenariosChange,
  onLoadScenario,
}: {
  settings: PensionSettings;
  validationIssues: PensionValidationIssue[];
  scenarios: ComparisonScenario[];
  onScenariosChange: (scenarios: ComparisonScenario[]) => void;
  onLoadScenario: (settings: PensionSettings) => void;
}) {
  const [scenarioNameDraft, setScenarioNameDraft] = useState("");
  const currentSettingsSignature = useMemo(() => getSettingsSignature(settings), [settings]);
  const currentScenarioIsValid = validationIssues.length === 0;
  const comparisonLimitReached = scenarios.length >= MAX_COMPARISON_SCENARIOS;
  const results = useMemo(
    () =>
      scenarios.map((scenario) =>
        createComparisonResult(scenario, currentSettingsSignature),
      ),
    [currentSettingsSignature, scenarios],
  );
  const earliestRetirementResult = results.reduce<ComparisonResult | null>(
    (best, result) =>
      !best ||
      result.scenario.settings.requirementAge < best.scenario.settings.requirementAge
        ? result
        : best,
    null,
  );
  const bestTargetResult = results.reduce<ComparisonResult | null>(
    (best, result) =>
      !best || result.targetMissMonths < best.targetMissMonths ? result : best,
    null,
  );
  const lowestShortfallRiskResult = results.reduce<ComparisonResult | null>(
    (best, result) => {
      if (!best) {
        return result;
      }

      const bestShortfall = Math.max(0, -best.annualGap);
      const resultShortfall = Math.max(0, -result.annualGap);

      return resultShortfall < bestShortfall ? result : best;
    },
    null,
  );
  const longestCapitalResult = results.reduce<ComparisonResult | null>(
    (best, result) => {
      if (!best) {
        return result;
      }

      return getCapitalPreservationScore(result) > getCapitalPreservationScore(best)
        ? result
        : best;
    },
    null,
  );
  const highestLaterIncomeResult = results.reduce<ComparisonResult | null>(
    (best, result) =>
      !best || result.lifeExpectancyAnnualIncome > best.lifeExpectancyAnnualIncome
        ? result
        : best,
    null,
  );

  function addCurrentScenario() {
    if (!currentScenarioIsValid || comparisonLimitReached) {
      return;
    }

    const scenarioNumber = scenarios.length + 1;
    const now = new Date().toISOString();
    const name = scenarioNameDraft.trim() || `Scenario ${scenarioNumber}`;

    onScenariosChange([
      ...scenarios,
      {
        id: createComparisonScenarioId(),
        name,
        settings: clonePensionSettings(settings),
        createdAt: now,
        updatedAt: now,
      },
    ]);
    setScenarioNameDraft("");
  }

  function renameScenario(id: string, name: string) {
    onScenariosChange(
      scenarios.map((scenario, index) =>
        scenario.id === id
          ? {
              ...scenario,
              name: name.trim() || `Scenario ${index + 1}`,
              updatedAt: new Date().toISOString(),
            }
          : scenario,
      ),
    );
  }

  function removeScenario(id: string) {
    onScenariosChange(scenarios.filter((scenario) => scenario.id !== id));
  }

  function replaceScenario(id: string) {
    if (!currentScenarioIsValid) {
      return;
    }

    onScenariosChange(
      scenarios.map((scenario) =>
        scenario.id === id
          ? {
              ...scenario,
              settings: clonePensionSettings(settings),
              updatedAt: new Date().toISOString(),
            }
          : scenario,
      ),
    );
  }

  return (
    <section className="panel comparison-panel" aria-labelledby="comparison-title">
      <div className="panel-heading">
        <p className="eyebrow">Scenario comparison</p>
        <h2 id="comparison-title">Compare saved scenarios</h2>
        <p className="section-copy">
          Add snapshots from the current modeller inputs, then compare the saved
          scenarios side by side. Saved scenarios stay fixed until you replace
          them with the current model state.
        </p>
      </div>

      <section className="comparison-builder" aria-labelledby="comparison-builder-title">
        <div>
          <h3 id="comparison-builder-title">Add the current model</h3>
          <p className="section-copy">
            Up to {MAX_COMPARISON_SCENARIOS} scenarios can be held in this
            comparison set during the current session.
          </p>
        </div>
        <div className="comparison-add-row">
          <label className="comparison-name-field">
            <span>Scenario name</span>
            <input
              className="text-input"
              type="text"
              value={scenarioNameDraft}
              placeholder={`Scenario ${scenarios.length + 1}`}
              onChange={(event) => setScenarioNameDraft(event.target.value)}
            />
          </label>
          <button
            type="button"
            className="primary-button"
            disabled={!currentScenarioIsValid || comparisonLimitReached}
            onClick={addCurrentScenario}
          >
            Add to comparison
          </button>
        </div>
        {!currentScenarioIsValid ? (
          <p className="table-status">
            Fix the current validation issues before adding or replacing a scenario.
          </p>
        ) : null}
        {comparisonLimitReached ? (
          <p className="table-status">
            Comparison limit reached. Remove a scenario before adding another.
          </p>
        ) : null}
      </section>

      <section className="comparison-saved-section" aria-labelledby="saved-scenarios-title">
        <div className="summary-section-header">
          <h3 id="saved-scenarios-title">Saved scenarios</h3>
          <span className="table-status">
            {scenarios.length} of {MAX_COMPARISON_SCENARIOS} saved
          </span>
        </div>

        {scenarios.length === 0 ? (
          <p className="section-copy">
            No scenarios saved yet. Configure the model, name the scenario if you
            want, then add it to the comparison set.
          </p>
        ) : (
          <div className="comparison-card-grid" role="list">
            {results.map((result) => {
              return (
                <article
                  className="comparison-card"
                  key={result.scenario.id}
                >
                  <label className="comparison-name-field">
                    <span>Scenario name</span>
                    <input
                      className="text-input"
                      type="text"
                      value={result.scenario.name}
                      onChange={(event) =>
                        renameScenario(result.scenario.id, event.target.value)
                      }
                    />
                  </label>
                  <strong>{formatCurrencyDetailed(result.annualIncome)}</strong>
                  <span>
                    {formatShortfallOrSurplus(
                      Math.max(0, -result.annualGap),
                      Math.max(0, result.annualGap),
                    )}{" "}
                    against target
                  </span>
                  <small>
                    {result.currentMatchesSaved
                      ? "Matches current model inputs"
                      : "Current model inputs differ from this saved snapshot"}
                  </small>
                  <div className="comparison-card-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => onLoadScenario(result.scenario.settings)}
                    >
                      Load this scenario
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      disabled={!currentScenarioIsValid}
                      onClick={() => replaceScenario(result.scenario.id)}
                    >
                      Replace with current
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => removeScenario(result.scenario.id)}
                    >
                      Remove
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {results.length < 2 ? (
        <section className="summary-section summary-section--compact">
          <div className="summary-section-header">
            <h3>Comparison appears after two scenarios</h3>
          </div>
          <p className="section-copy">
            Add at least two saved scenarios to unlock the side-by-side summary.
          </p>
        </section>
      ) : (
        <>
          <div className="comparison-insight-grid">
            <SummarySection
              title="Earliest retirement"
              items={[
                {
                  label: earliestRetirementResult?.scenario.name ?? "Not available",
                  value: earliestRetirementResult
                    ? formatDecimalAge(
                        earliestRetirementResult.scenario.settings.requirementAge,
                      )
                    : "Not available",
                },
              ]}
            />
            <SummarySection
              title="Best maintains target"
              items={[
                {
                  label: bestTargetResult?.scenario.name ?? "Not available",
                  value: bestTargetResult
                    ? formatTargetMissDuration(bestTargetResult.targetMissMonths)
                    : "Not available",
                },
              ]}
            />
            <SummarySection
              title="Lowest shortfall risk"
              items={[
                {
                  label: lowestShortfallRiskResult?.scenario.name ?? "Not available",
                  value: lowestShortfallRiskResult
                    ? formatShortfallOrSurplus(
                        Math.max(0, -lowestShortfallRiskResult.annualGap),
                        Math.max(0, lowestShortfallRiskResult.annualGap),
                      )
                    : "Not available",
                },
              ]}
            />
            <SummarySection
              title="Preserves pots longest"
              items={[
                {
                  label: longestCapitalResult?.scenario.name ?? "Not available",
                  value: longestCapitalResult
                    ? formatCapitalPreservation(longestCapitalResult)
                    : "Not available",
                },
              ]}
            />
            <SummarySection
              title="Highest later income"
              items={[
                {
                  label: highestLaterIncomeResult?.scenario.name ?? "Not available",
                  value: highestLaterIncomeResult
                    ? `${formatCurrencyDetailed(
                        highestLaterIncomeResult.lifeExpectancyAnnualIncome,
                      )} per year`
                    : "Not available",
                },
              ]}
            />
          </div>

          <ComparisonSummaryTable results={results} />

        </>
      )}
    </section>
  );
}

function ComparisonSummaryTable({ results }: { results: ComparisonResult[] }) {
  const columns: TableColumn[] = [
    { key: "section", label: "Section", width: "14rem" },
    { key: "metric", label: "Metric", width: "18rem" },
    ...results.map((result, index) => ({
      key: result.scenario.id,
      label: result.scenario.name || `Scenario ${index + 1}`,
      width: "13rem",
    })),
  ];
  const rows = buildComparisonTableRows(results);
  const minWidth = `${32 + results.length * 13}rem`;

  return (
    <section className="bridge-table-section">
      <div className="summary-section-header">
        <h3>Comparison table</h3>
      </div>
      <p className="section-copy">
        These are saved snapshots. Changing the live model will not change these
        rows unless you replace a saved scenario.
      </p>
      <ProjectionTableFrame
        columns={columns}
        rows={rows}
        emptyMessage="No comparison rows are available."
        getRowKey={(row) => row.key}
        getRowClassName={(row) =>
          row.sectionStart ? "comparison-summary-row comparison-summary-row--section" : "comparison-summary-row"
        }
        minWidth={minWidth}
        renderCells={(row) => [
          row.sectionStart ? <strong>{row.section}</strong> : "",
          row.metric,
          ...row.values,
        ]}
      />
    </section>
  );
}

function buildComparisonTableRows(results: ComparisonResult[]): ComparisonTableRow[] {
  return [
    createComparisonSection("Headline outcome", results, [
      ["Overall status", (result) => renderComparisonStatusCell(result)],
      [
        "Retirement pathway",
        (result) =>
          result.scenario.settings.partialRetirementEnabled
            ? "Partial retirement"
            : "Full retirement",
      ],
      ["Target annual income", (result) => formatAnnualCurrency(result.annualTarget)],
      [
        "Lowest annual income",
        (result) =>
          formatAnnualCurrency(
            getLowestAnnualIncome(result.rows, result.scenario.settings),
          ),
      ],
      [
        "Years below target",
        (result) =>
          renderComparisonToneCell(
            formatYearsBelowTarget(result.targetMissMonths),
            result.targetMissMonths > 0 ? "caution" : "good",
          ),
      ],
      [
        "Largest annual shortfall",
        (result) =>
          renderComparisonToneCell(
            formatAnnualCurrency(
              getLargestAnnualShortfall(result.rows, result.scenario.settings),
            ),
            getLargestAnnualShortfall(result.rows, result.scenario.settings) > 0
              ? "caution"
              : "good",
          ),
      ],
      [
        "Total lifetime shortfall",
        (result) =>
          renderComparisonToneCell(
            formatCurrencyDetailed(
              getTotalLifetimeShortfall(result.rows, result.scenario.settings),
            ),
            getTotalLifetimeShortfall(result.rows, result.scenario.settings) > 0
              ? "caution"
              : "good",
          ),
      ],
    ]),
    createComparisonSection("Retirement timing", results, [
      [
        "Requirement age",
        (result) => formatDecimalAge(result.scenario.settings.requirementAge),
      ],
      [
        "Partial retirement start age",
        (result) =>
          result.scenario.settings.partialRetirementEnabled
            ? formatDecimalAge(result.scenario.settings.partialRetirementStartAge)
            : "n/a",
      ],
      [
        "Pro-rata work level",
        (result) =>
          result.scenario.settings.partialRetirementEnabled
            ? formatWholePercent(
                result.scenario.settings.partialRetirementWorkPercent / 100,
              )
            : "n/a",
      ],
      [
        "Final work exit age",
        (result) => formatDecimalAge(result.scenario.settings.requirementAge),
      ],
      [
        "Age leaving Alpha scheme",
        (result) => formatDecimalAge(result.scenario.settings.alphaPensionLeaveAge),
      ],
      [
        "Alpha draw age",
        (result) => formatDecimalAge(result.scenario.settings.alphaPensionDrawAge),
      ],
      [
        "SIPP draw start age",
        (result) =>
          result.scenario.settings.showSipp
            ? formatDecimalAge(result.scenario.settings.sippDrawAge)
            : "n/a",
      ],
      [
        "ISA draw start age",
        (result) =>
          result.scenario.settings.showIsa
            ? formatDecimalAge(result.scenario.settings.isaDrawAge)
            : "n/a",
      ],
      [
        "State Pension start age",
        (result) =>
          result.scenario.settings.showStatePension
            ? formatDecimalAge(result.summary.calculated.statePensionAge)
            : "n/a",
      ],
      [
        "Life expectancy age",
        (result) => formatDecimalAge(result.scenario.settings.lifeExpectancy),
      ],
    ]),
    createComparisonSection("Partial retirement impact", results, [
      [
        "Partial retirement income",
        (result) =>
          result.scenario.settings.partialRetirementEnabled
            ? formatAnnualCurrency(
                result.scenario.settings.fullSalary *
                  (result.scenario.settings.partialRetirementWorkPercent / 100),
              )
            : "n/a",
      ],
      [
        "Full salary before partial retirement",
        (result) =>
          result.scenario.settings.partialRetirementEnabled
            ? formatAnnualCurrency(result.scenario.settings.fullSalary)
            : "n/a",
      ],
      [
        "Pensionable earnings during partial retirement",
        (result) =>
          result.scenario.settings.partialRetirementEnabled
            ? formatAnnualCurrency(
                result.scenario.settings.pensionableEarnings *
                  (result.scenario.settings.partialRetirementWorkPercent / 100),
              )
            : "n/a",
      ],
      [
        "Additional Alpha earned after partial retirement starts",
        (result) =>
          result.scenario.settings.partialRetirementEnabled
            ? formatAnnualCurrency(
                getAdditionalAlphaEarnedAfterPartialRetirement(
                  result.rows,
                  result.scenario.settings,
                  result.summary,
                ),
              )
            : "n/a",
      ],
      [
        "ISA contribution during partial retirement",
        (result) =>
          result.scenario.settings.partialRetirementEnabled &&
          result.scenario.settings.showIsa
            ? formatMonthlyCurrency(
                result.scenario.settings.isaMonthlyContribution *
                  getPartialRetirementSavingsContributionMultiplier(
                    result.scenario.settings,
                    getPartialRetirementStartDateString(result.scenario.settings),
                  ),
              )
            : "n/a",
      ],
      [
        "SIPP contribution during partial retirement",
        (result) =>
          result.scenario.settings.partialRetirementEnabled &&
          result.scenario.settings.showSipp
            ? formatMonthlyCurrency(
                result.scenario.settings.sippMonthlyContribution *
                  getPartialRetirementSavingsContributionMultiplier(
                    result.scenario.settings,
                    getPartialRetirementStartDateString(result.scenario.settings),
                  ),
              )
            : "n/a",
      ],
    ]),
    createComparisonSection("Secure pension income", results, [
      [
        "Alpha income at draw age",
        (result) => formatAnnualCurrency(result.summary.alphaPension.annualAtDraw),
      ],
      [
        "Alpha Normal Pension Age",
        (result) => formatDecimalAge(result.summary.calculated.normalPensionAge),
      ],
      [
        "Alpha early reduction applied",
        (result) => formatYesNo(result.summary.calculated.earlyRetirementReductionPercent > 0),
      ],
      [
        "nuvos income at draw age",
        (result) =>
          result.scenario.settings.showNuvos
            ? formatAnnualCurrency(result.summary.nuvosPension.annualAtDraw)
            : "n/a",
      ],
      [
        "State Pension income at start age",
        (result) =>
          result.scenario.settings.showStatePension
            ? formatAnnualCurrency(result.summary.incomeOverTime.monthlyStatePension * 12)
            : "n/a",
      ],
      [
        "Combined secure pension at State Pension age",
        (result) =>
          result.scenario.settings.showStatePension
            ? formatAnnualCurrency(getCombinedSecurePensionAtStateAge(result))
            : "n/a",
      ],
      [
        "Secure pension as % of target",
        (result) =>
          result.scenario.settings.showStatePension
            ? formatWholePercent(
                getCombinedSecurePensionAtStateAge(result) /
                  calculateRetirementIncomeTargetAtDate(
                    result.scenario.settings,
                    result.scenario.settings.statePensionDrawDate,
                  ),
              )
            : "n/a",
      ],
    ]),
    createComparisonSection("ISA bridge", results, [
      [
        "Current ISA balance",
        (result) =>
          result.scenario.settings.showIsa
            ? formatCurrencyDetailed(result.scenario.settings.isaCurrentPot)
            : "n/a",
      ],
      [
        "ISA draw start age",
        (result) =>
          result.scenario.settings.showIsa
            ? formatDecimalAge(result.scenario.settings.isaDrawAge)
            : "n/a",
      ],
      [
        "ISA use-by age",
        (result) => formatUseByAge(result.scenario.settings, "isa"),
      ],
      [
        "Total ISA withdrawals",
        (result) =>
          result.scenario.settings.showIsa
            ? formatCurrencyDetailed(getTotalWithdrawals(result.rows, "monthlyIsaPension"))
            : "n/a",
      ],
      [
        "ISA depleted age",
        (result) =>
          result.scenario.settings.showIsa
            ? renderComparisonToneCell(
                formatDepletionAgeOrNa(result.isaDepletedAge),
                getPotDepletionTone(result.isaDepletedAge, result.scenario.settings),
              )
            : "n/a",
      ],
      [
        "Final ISA balance",
        (result) =>
          result.scenario.settings.showIsa
            ? formatCurrencyDetailed(getFinalPotBalance(result.rows, "isaPot"))
            : "n/a",
      ],
    ]),
    createComparisonSection("SIPP bridge", results, [
      [
        "Current SIPP balance",
        (result) =>
          result.scenario.settings.showSipp
            ? formatCurrencyDetailed(result.scenario.settings.sippCurrentPot)
            : "n/a",
      ],
      [
        "SIPP draw start age",
        (result) =>
          result.scenario.settings.showSipp
            ? formatDecimalAge(result.scenario.settings.sippDrawAge)
            : "n/a",
      ],
      [
        "SIPP use-by age",
        (result) => formatUseByAge(result.scenario.settings, "sipp"),
      ],
      [
        "SIPP withdrawal strategy",
        (result) => formatSippWithdrawalStrategy(result.scenario.settings),
      ],
      [
        "Total SIPP withdrawals",
        (result) =>
          result.scenario.settings.showSipp
            ? formatCurrencyDetailed(getTotalWithdrawals(result.rows, "monthlySippPension"))
            : "n/a",
      ],
      [
        "SIPP depleted age",
        (result) =>
          result.scenario.settings.showSipp
            ? renderComparisonToneCell(
                formatDepletionAgeOrNa(result.sippDepletedAge),
                getPotDepletionTone(result.sippDepletedAge, result.scenario.settings),
              )
            : "n/a",
      ],
      [
        "Final SIPP balance",
        (result) =>
          result.scenario.settings.showSipp
            ? formatCurrencyDetailed(getFinalPotBalance(result.rows, "sippPot"))
            : "n/a",
      ],
    ]),
    createComparisonSection("Flexible asset position", results, [
      [
        "Total ISA + SIPP withdrawals",
        (result) =>
          formatCurrencyDetailed(
            getTotalWithdrawals(result.rows, "monthlyIsaPension") +
              getTotalWithdrawals(result.rows, "monthlySippPension"),
          ),
      ],
      [
        "Final ISA + SIPP balance",
        (result) =>
          formatCurrencyDetailed(
            getFinalPotBalance(result.rows, "isaPot") +
              getFinalPotBalance(result.rows, "sippPot"),
          ),
      ],
      [
        "Flexible assets exhausted",
        (result) => renderFlexibleAssetsExhaustedCell(result),
      ],
    ]),
    createComparisonSection("Assumptions", results, [
      [
        "Projection basis",
        (result) =>
          result.scenario.settings.projectionBasis === "real"
            ? "Real terms"
            : "Nominal",
      ],
      [
        "Tax basis",
        (result) =>
          result.scenario.settings.taxationEnabled ? "After tax" : "Before tax",
      ],
      [
        "Inflation assumption",
        (result) => formatPercent(result.scenario.settings.inflationRateAnnual / 100),
      ],
      [
        "ISA nominal return",
        (result) =>
          formatPercent(
            deriveInflationAssumptions(result.scenario.settings).isaNominalReturnAnnual,
          ),
      ],
      [
        "ISA modelled real return",
        (result) =>
          formatPercent(
            deriveInflationAssumptions(result.scenario.settings).isaModelledReturnAnnual,
          ),
      ],
      [
        "SIPP nominal return",
        (result) =>
          formatPercent(
            deriveInflationAssumptions(result.scenario.settings).sippNominalReturnAnnual,
          ),
      ],
      [
        "SIPP modelled real return",
        (result) =>
          formatPercent(
            deriveInflationAssumptions(result.scenario.settings).sippModelledReturnAnnual,
          ),
      ],
      [
        "State Pension growth projected",
        (result) => formatYesNo(result.scenario.settings.statePensionApplyFutureGrowth),
      ],
      [
        "Taxation enabled",
        (result) => formatYesNo(result.scenario.settings.taxationEnabled),
      ],
    ]),
  ].flat();
}

function createComparisonSection(
  section: string,
  results: ComparisonResult[],
  rows: Array<[metric: string, getValue: (result: ComparisonResult) => ReactNode]>,
) {
  return rows.map(([metric, getValue], index) => ({
    key: `${section}-${metric}`,
    section,
    metric,
    values: results.map(getValue),
    sectionStart: index === 0,
  }));
}

function createComparisonResult(
  scenario: ComparisonScenario,
  currentSettingsSignature: string,
): ComparisonResult {
  const rows = createProjectionTable(scenario.settings);
  const summary = generatePensionSummary(rows, scenario.settings);
  const retirementDate = addYearsToIsoDate(
    scenario.settings.dateOfBirth,
    scenario.settings.requirementAge,
  );
  const annualTarget = calculateRetirementIncomeTargetAtDate(
    scenario.settings,
    retirementDate,
  );
  const annualIncome = summary.retirementIncome.totalAnnualIncome;
  const statePensionAge = calculateStatePensionDrawAge(
    scenario.settings.dateOfBirth,
    scenario.settings.statePensionDrawDate,
  );

  return {
    scenario,
    rows,
    summary,
    annualIncome,
    annualTarget,
    annualGap: annualIncome - annualTarget,
    isaDepletedAge: findPotDepletedAge(
      rows,
      "isaPot",
      scenario.settings.isaDrawAge,
      scenario.settings.showIsa &&
        scenario.settings.isaWithdrawalStrategy === "use_by_age"
        ? scenario.settings.isaWithdrawalTargetAge
        : null,
    ),
    sippDepletedAge: findPotDepletedAge(
      rows,
      "sippPot",
      scenario.settings.sippDrawAge,
      scenario.settings.showSipp &&
        scenario.settings.sippWithdrawalStrategy === "use_by_age"
        ? scenario.settings.sippWithdrawalTargetAge
        : null,
    ),
    retirementAnnualIncome: findAnnualIncomeAtAge(
      rows,
      scenario.settings.requirementAge,
    ),
    statePensionAnnualIncome: findAnnualIncomeAtAge(rows, statePensionAge),
    lifeExpectancyAnnualIncome: findAnnualIncomeAtAge(
      rows,
      scenario.settings.lifeExpectancy,
    ),
    targetMissMonths: countTargetMissMonths(rows, scenario.settings),
    currentMatchesSaved:
      getSettingsSignature(scenario.settings) === currentSettingsSignature,
  };
}

function createComparisonScenarioId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `scenario-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function clonePensionSettings(settings: PensionSettings): PensionSettings {
  return JSON.parse(JSON.stringify(settings)) as PensionSettings;
}

function getSettingsSignature(settings: PensionSettings) {
  return JSON.stringify(settings);
}

function findPotDepletedAge(
  rows: ProjectionRow[],
  potKey: "isaPot" | "sippPot",
  drawAge: number,
  targetAge: number | null = null,
) {
  const depletionRow = rows.find(
    (row) => row.age + row.ageMonths / 12 >= drawAge && row[potKey] <= 0,
  );

  if (!depletionRow) {
    return null;
  }

  const depletionAge = depletionRow.age + depletionRow.ageMonths / 12;

  if (targetAge !== null && depletionAge < targetAge) {
    return targetAge;
  }

  return depletionAge;
}

function findAnnualIncomeAtAge(rows: ProjectionRow[], targetAge: number) {
  const row = findRowAtAge(rows, targetAge);

  return (row?.totalMonthlyPensionTakeHomePay ?? 0) * 12;
}

function findRowAtAge(rows: ProjectionRow[], targetAge: number) {
  return (
    rows.find((candidate) => candidate.age + candidate.ageMonths / 12 >= targetAge) ??
    rows.at(-1)
  );
}

function getLowestAnnualIncome(rows: ProjectionRow[], settings: PensionSettings) {
  const incomes = createRetirementIncomeSeries(rows, settings)
    .filter(
      (point) =>
        point.age >= settings.requirementAge && point.age <= settings.lifeExpectancy,
    )
    .map((point) => point.assessedIncomeAnnual);

  return incomes.length ? Math.min(...incomes) : 0;
}

function getLargestAnnualShortfall(rows: ProjectionRow[], settings: PensionSettings) {
  return createRetirementIncomeSeries(rows, settings).reduce((largest, point) => {
    if (point.age < settings.requirementAge || point.age > settings.lifeExpectancy) {
      return largest;
    }

    return Math.max(largest, point.shortfallAnnual);
  }, 0);
}

function getTotalLifetimeShortfall(rows: ProjectionRow[], settings: PensionSettings) {
  return createRetirementIncomeSeries(rows, settings).reduce((total, point) => {
    if (point.age < settings.requirementAge || point.age > settings.lifeExpectancy) {
      return total;
    }

    return total + point.shortfallAnnual / 12;
  }, 0);
}

function getFinalPotBalance(rows: ProjectionRow[], key: "isaPot" | "sippPot") {
  return rows.at(-1)?.[key] ?? 0;
}

function getTotalWithdrawals(
  rows: ProjectionRow[],
  key: "monthlyIsaPension" | "monthlySippPension",
) {
  return rows.reduce((total, row) => total + row[key], 0);
}

function getAdditionalAlphaEarnedAfterPartialRetirement(
  rows: ProjectionRow[],
  settings: PensionSettings,
  summary: PensionSummary,
) {
  const partialStartRow = findRowAtAge(rows, settings.partialRetirementStartAge);
  const accruedAtPartialStart = partialStartRow?.annualAccruedAlphaPension ?? 0;

  return Math.max(0, summary.alphaPension.maximumAnnualAccrued - accruedAtPartialStart);
}

function getPartialRetirementStartDateString(settings: PensionSettings) {
  return addYearsToIsoDate(settings.dateOfBirth, settings.partialRetirementStartAge);
}

function getCombinedSecurePensionAtStateAge(result: ComparisonResult) {
  const stateAgeRow = findRowAtAge(
    result.rows,
    result.summary.calculated.statePensionAge,
  );

  return (
    ((stateAgeRow?.monthlyAlphaPensionTakeHome ?? 0) +
      (stateAgeRow?.monthlyNuvosPensionTakeHome ?? 0) +
      (stateAgeRow?.monthlyStatePension ?? 0)) *
    12
  );
}

function findFlexibleAssetsExhaustedAge(result: ComparisonResult) {
  const startAge = Math.min(
    result.scenario.settings.showIsa ? result.scenario.settings.isaDrawAge : Number.POSITIVE_INFINITY,
    result.scenario.settings.showSipp ? result.scenario.settings.sippDrawAge : Number.POSITIVE_INFINITY,
  );

  if (!Number.isFinite(startAge)) {
    return null;
  }

  const depletionRow = result.rows.find((row) => {
    const rowAge = row.age + row.ageMonths / 12;
    return rowAge >= startAge && row.isaPot + row.sippPot <= 0;
  });

  return depletionRow ? depletionRow.age + depletionRow.ageMonths / 12 : null;
}

function getComparisonStatusLabel(result: ComparisonResult) {
  if (result.targetMissMonths === 0) {
    return "Meets target";
  }

  const exhaustedAge = findFlexibleAssetsExhaustedAge(result);

  if (exhaustedAge !== null && exhaustedAge < result.scenario.settings.lifeExpectancy) {
    return "Problem";
  }

  return "Caution";
}

function renderComparisonStatusCell(result: ComparisonResult) {
  const status = getComparisonStatusLabel(result);
  const tone =
    status === "Problem" ? "problem" : status === "Caution" ? "caution" : "good";

  return renderComparisonToneCell(status, tone);
}

function countTargetMissMonths(rows: ProjectionRow[], settings: PensionSettings) {
  return createRetirementIncomeSeries(rows, settings).filter(
    (point) =>
      point.age >= settings.requirementAge &&
      point.age <= settings.lifeExpectancy &&
      point.shortfallAnnual > 0,
  ).length;
}

function formatTargetMissDuration(months: number) {
  if (months <= 0) {
    return "Target met throughout";
  }

  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (years === 0) {
    return `${remainingMonths}m`;
  }

  return remainingMonths === 0 ? `${years}y` : `${years}y ${remainingMonths}m`;
}

function formatDepletionAgeOrNa(age: number | null) {
  return age === null ? "Not depleted" : formatDecimalAge(age);
}

function formatAnnualCurrency(value: number) {
  return `${formatCurrencyDetailed(value)}/year`;
}

function formatMonthlyCurrency(value: number) {
  return `${formatCurrencyDetailed(value)}/month`;
}

function formatWholePercent(value: number) {
  return `${(value * 100).toFixed(0)}%`;
}

function formatYesNo(value: boolean) {
  return value ? "Yes" : "No";
}

function formatYearsBelowTarget(months: number) {
  if (months <= 0) {
    return "0 years";
  }

  const years = months / 12;
  const formattedYears =
    years % 1 === 0 ? years.toFixed(0) : years.toFixed(1).replace(/\.0$/, "");

  return `${formattedYears} years`;
}

function formatUseByAge(settings: PensionSettings, pot: "isa" | "sipp") {
  if (pot === "isa") {
    if (!settings.showIsa) {
      return "n/a";
    }

    return settings.isaWithdrawalStrategy === "use_by_age"
      ? formatDecimalAge(settings.isaWithdrawalTargetAge)
      : "n/a";
  }

  if (!settings.showSipp) {
    return "n/a";
  }

  return settings.sippWithdrawalStrategy === "use_by_age"
    ? formatDecimalAge(settings.sippWithdrawalTargetAge)
    : "n/a";
}

function formatSippWithdrawalStrategy(settings: PensionSettings) {
  if (!settings.showSipp) {
    return "n/a";
  }

  if (settings.sippWithdrawalStrategy === "use_by_age") {
    return `Use by ${formatDecimalAge(settings.sippWithdrawalTargetAge)}`;
  }

  if (settings.sippWithdrawalStrategy === "percentage") {
    return formatWholePercent(settings.sippWithdrawalPercent / 100);
  }

  return "Life expectancy";
}

function renderFlexibleAssetsExhaustedCell(result: ComparisonResult) {
  const exhaustedAge = findFlexibleAssetsExhaustedAge(result);

  if (exhaustedAge === null) {
    return renderComparisonToneCell("No", "good");
  }

  const tone =
    exhaustedAge < result.scenario.settings.lifeExpectancy ? "problem" : "caution";

  return renderComparisonToneCell(
    `Yes at age ${formatDecimalAge(exhaustedAge)}`,
    tone,
  );
}

function getPotDepletionTone(
  age: number | null,
  settings: PensionSettings,
): "good" | "caution" | "problem" {
  if (age === null) {
    return "good";
  }

  return age < settings.lifeExpectancy ? "problem" : "caution";
}

function renderComparisonToneCell(
  value: ReactNode,
  tone: "good" | "caution" | "problem",
) {
  return <span className={`comparison-cell comparison-cell--${tone}`}>{value}</span>;
}

function getCapitalPreservationScore(result: ComparisonResult) {
  const isaAge = result.isaDepletedAge ?? result.scenario.settings.lifeExpectancy + 1;
  const sippAge = result.sippDepletedAge ?? result.scenario.settings.lifeExpectancy + 1;

  return Math.min(isaAge, sippAge);
}

function formatCapitalPreservation(result: ComparisonResult) {
  const score = getCapitalPreservationScore(result);

  return score > result.scenario.settings.lifeExpectancy
    ? "Pots last through model"
    : `First depletion at ${formatDecimalAge(score)}`;
}

function GuidanceNotesToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="guidance-toggle">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>Show guidance notes</span>
    </label>
  );
}

type GuidedJourneyProps = {
  journey: JourneyDefinition;
  settings: PensionSettings;
  validationIssues: PensionValidationIssue[];
  pensionSummary: PensionSummary | null;
  projectionRows: ProjectionRow[];
  retirementIncomeSeries: RetirementIncomePoint[];
  bridgeChartParameters: RetirementIncomeBridgeParameters;
  bridgeChartLimits: RetirementIncomeBridgeLimits;
  derivedInflationAssumptions: ReturnType<typeof deriveInflationAssumptions>;
  retirementIncomeDisplay: RetirementIncomeDisplay;
  retirementIncomeItems: SummaryItem[];
  retirementIncomeTitle: string;
  retirementIncomeTotal: string;
  retirementIncomeTargetTitle: string;
  retirementIncomeTarget: string;
  useDropdownDates: boolean;
  onChange: FieldProps["onChange"];
  onChangeChartParameters: (
    patch: Partial<RetirementIncomeBridgeParameters>,
  ) => void;
  comparisonScenarios: ComparisonScenario[];
  onScenariosChange: (scenarios: ComparisonScenario[]) => void;
  onLoadScenario: (scenarioSettings: PensionSettings) => void;
  onRetirementIncomeDisplayChange: (display: RetirementIncomeDisplay) => void;
  showLimitations: boolean;
  onToggleLimitations: () => void;
  showGuidanceNotes: boolean;
  onShowGuidanceNotesChange: (checked: boolean) => void;
};

function GuidedJourney({
  journey,
  settings,
  validationIssues,
  pensionSummary,
  projectionRows,
  retirementIncomeSeries,
  bridgeChartParameters,
  bridgeChartLimits,
  derivedInflationAssumptions,
  retirementIncomeDisplay,
  retirementIncomeItems,
  retirementIncomeTitle,
  retirementIncomeTotal,
  retirementIncomeTargetTitle,
  retirementIncomeTarget,
  useDropdownDates,
  onChange,
  onChangeChartParameters,
  comparisonScenarios,
  onScenariosChange,
  onLoadScenario,
  onRetirementIncomeDisplayChange,
  showLimitations,
  onToggleLimitations,
  showGuidanceNotes,
  onShowGuidanceNotesChange,
}: GuidedJourneyProps) {
  const visibleSteps = journey.steps.filter(
    (step) => !step.visible || step.visible(settings),
  );
  const [activeStepId, setActiveStepId] = useState(visibleSteps[0]?.id ?? "");
  const [showMobileSteps, setShowMobileSteps] = useState(false);
  const activeStep = visibleSteps.find((step) => step.id === activeStepId) ?? visibleSteps[0];
  const activeStepIndex = Math.max(
    0,
    visibleSteps.findIndex((step) => step.id === activeStep.id),
  );
  const isFirstStep = activeStepIndex === 0;
  const isLastStep = activeStepIndex === visibleSteps.length - 1;
  const stepRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (typeof stepRef.current?.scrollIntoView === "function") {
      stepRef.current.scrollIntoView({ block: "start" });
    }
  }, [activeStep.id]);

  if (!activeStep) {
    return null;
  }

  const goToStep = (stepIndex: number) => {
    const nextStep = visibleSteps[stepIndex];

    if (nextStep) {
      setActiveStepId(nextStep.id);
      setShowMobileSteps(false);
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
        <div className="journey-heading-actions">
          <div className="journey-progress" aria-label="Journey progress">
            Step {activeStepIndex + 1} of {visibleSteps.length}
          </div>
          <GuidanceNotesToggle
            checked={showGuidanceNotes}
            onChange={onShowGuidanceNotesChange}
          />
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
              onClick={() => goToStep(index)}
            >
              <span>{index + 1}</span>
              {step.title}
            </button>
          ))}
        </nav>

        <section
          className="journey-step"
          ref={stepRef}
          aria-labelledby={`journey-step-${activeStep.id}`}
        >
          <div className="journey-mobile-steps">
            <div className="journey-mobile-step-summary">
              <div>
                <span>
                  Step {activeStepIndex + 1} of {visibleSteps.length}
                </span>
                <strong>{activeStep.title}</strong>
              </div>
              <button
                type="button"
                className="secondary-button"
                aria-expanded={showMobileSteps}
                aria-controls="journey-mobile-step-list"
                onClick={() => setShowMobileSteps((current) => !current)}
              >
                {showMobileSteps ? "Hide steps" : "View all steps"}
              </button>
            </div>
            <div
              className="journey-progress-bar"
              role="progressbar"
              aria-label="Journey progress"
              aria-valuemin={1}
              aria-valuemax={visibleSteps.length}
              aria-valuenow={activeStepIndex + 1}
            >
              <span
                style={{
                  width: `${((activeStepIndex + 1) / visibleSteps.length) * 100}%`,
                }}
              />
            </div>
            {showMobileSteps ? (
              <nav
                id="journey-mobile-step-list"
                className="journey-mobile-step-list"
                aria-label="Journey steps"
              >
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
                    onClick={() => {
                      setActiveStepId(step.id);
                      setShowMobileSteps(false);
                    }}
                  >
                    <span>{index + 1}</span>
                    {step.title}
                  </button>
                ))}
              </nav>
            ) : null}
          </div>

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
            projectionRows={projectionRows}
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
            onChange={onChange}
            onChangeChartParameters={onChangeChartParameters}
            comparisonScenarios={comparisonScenarios}
            onScenariosChange={onScenariosChange}
            onLoadScenario={onLoadScenario}
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

type JourneyStepContentProps = Omit<
  GuidedJourneyProps,
  "journey" | "showGuidanceNotes" | "onShowGuidanceNotesChange"
> & {
  step: JourneyStepDefinition;
};

function JourneyStepContent({
  step,
  settings,
  validationIssues,
  pensionSummary,
  retirementIncomeSeries,
  bridgeChartParameters,
  bridgeChartLimits,
  derivedInflationAssumptions,
  retirementIncomeDisplay,
  retirementIncomeItems,
  retirementIncomeTitle,
  retirementIncomeTotal,
  retirementIncomeTargetTitle,
  retirementIncomeTarget,
  useDropdownDates,
  onChange,
  onChangeChartParameters,
  comparisonScenarios,
  onScenariosChange,
  onLoadScenario,
  onRetirementIncomeDisplayChange,
  showLimitations,
  onToggleLimitations,
}: JourneyStepContentProps) {
  if (step.kind === "optional-sections") {
    return (
      <OptionalSectionToggleGrid
        settings={settings}
        onChange={onChange}
        toggleKeys={step.toggleKeys}
      />
    );
  }

  if (step.kind === "answer") {
    if (!pensionSummary) {
      return null;
    }

    return (
      <div className="journey-answer">
        {validationIssues.length > 0 ? (
          <ValidationIssuesSection validationIssues={validationIssues} />
        ) : null}

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

        <InflationBasisPanel
          settings={settings}
          assumptions={derivedInflationAssumptions}
        />

        <SummarySection
          title="Key dates"
          items={[
            ...(settings.showAlpha
              ? [
                  {
                    label: "Alpha pension starts",
                    value: formatDate(pensionSummary.keyDates.startsAlphaPension),
                  },
                ]
              : []),
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
              value: formatDecimalAge(pensionSummary.calculated.normalPensionAge),
            },
          ]}
        />

        <RetirementIncomeBridgeChart
          data={retirementIncomeSeries}
          alphaLabel="Alpha pension"
          limits={bridgeChartLimits}
          statePensionEditable
          onChangeParameters={onChangeChartParameters}
          {...bridgeChartParameters}
        />

        <ComparisonPrototype
          settings={settings}
          validationIssues={validationIssues}
          scenarios={comparisonScenarios}
          onScenariosChange={onScenariosChange}
          onLoadScenario={onLoadScenario}
        />

      </div>
    );
  }

  if (step.kind === "bridge-answer") {
    return (
      <BridgeAnswer
        settings={settings}
        validationIssues={validationIssues}
        onChangeChartParameters={onChangeChartParameters}
        comparisonScenarios={comparisonScenarios}
        onScenariosChange={onScenariosChange}
        onLoadScenario={onLoadScenario}
        showLimitations={showLimitations}
        onToggleLimitations={onToggleLimitations}
      />
    );
  }

  if (step.kind === "fields") {
    return (
      <>
        <SettingsFields
          fields={getFieldsByIds(step.fieldIds, step.fieldLabels)}
          settings={settings}
          validationIssues={validationIssues}
          onChange={onChange}
          useDropdownDates={useDropdownDates}
        />

        {step.fieldIds.includes("alphaAddedPensionMonthly") ? (
          <AddedPensionLumpSumsEditor
            lumpSums={settings.alphaAddedPensionLumpSums}
            defaultStartDate={settings.startDate}
            useDropdownDates={useDropdownDates}
            title="Added pension lump sums"
            description="Add one-off or yearly added-pension lump sum purchases alongside the regular monthly amount."
            showFactorType
            validationIssues={getValidationIssuesForField(
              validationIssues,
              "alphaAddedPensionLumpSums",
            )}
            onChange={(nextLumpSums) =>
              onChange("alphaAddedPensionLumpSums", nextLumpSums)
            }
          />
        ) : null}
      </>
    );
  }

  return null;
}

function OptionalSectionToggleGrid({
  settings,
  onChange,
  toggleKeys,
}: {
  settings: PensionSettings;
  onChange: FieldProps["onChange"];
  toggleKeys?: readonly OptionalSectionToggleKey[];
}) {
  const visibleToggles = toggleKeys
    ? OPTIONAL_SECTION_TOGGLES.filter((toggle) => toggleKeys.includes(toggle.key))
    : OPTIONAL_SECTION_TOGGLES;

  return (
    <div className="field-grid">
      {visibleToggles.map((toggle) => (
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
                  event.target.checked,
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

function BridgeAnswer({
  settings,
  validationIssues,
  onChangeChartParameters,
  comparisonScenarios,
  onScenariosChange,
  onLoadScenario,
  showLimitations,
  onToggleLimitations,
}: {
  settings: PensionSettings;
  validationIssues: PensionValidationIssue[];
  onChangeChartParameters: (
    patch: Partial<RetirementIncomeBridgeParameters>,
  ) => void;
  comparisonScenarios: ComparisonScenario[];
  onScenariosChange: (scenarios: ComparisonScenario[]) => void;
  onLoadScenario: (scenarioSettings: PensionSettings) => void;
  showLimitations: boolean;
  onToggleLimitations: () => void;
}) {
  const bridgeSettings = useMemo(
    () => prepareBridgeProjectionSettings(settings),
    [settings],
  );
  const bridgeChartRows = useMemo(
    () => createProjectionTable(bridgeSettings),
    [bridgeSettings],
  );
  const bridgePensionRows = useMemo(
    () =>
      createProjectionTable({
        ...bridgeSettings,
        showSipp: false,
        showIsa: false,
      }),
    [bridgeSettings],
  );
  const bridgeChartData = useMemo(
    () => createRetirementIncomeSeries(bridgeChartRows, bridgeSettings),
    [bridgeChartRows, bridgeSettings],
  );
  const bridgeChartParameters = useMemo(
    () => createBridgeChartParameters(bridgeSettings),
    [bridgeSettings],
  );
  const bridgeChartLimits = useMemo(
    () => createBridgeChartLimits(bridgeSettings),
    [bridgeSettings],
  );
  const bridgeAnalysis = useMemo(
    () =>
      generateRetirementBridgeAnalysis(bridgePensionRows, bridgeSettings, {
        calculateSafeDrawAge: true,
      }),
    [bridgePensionRows, bridgeSettings],
  );

  return (
    <div className="journey-answer">
      {validationIssues.length > 0 ? (
        <ValidationIssuesSection validationIssues={validationIssues} />
      ) : null}

      <RetirementIncomeBridgeChart
        data={bridgeChartData}
        alphaLabel="Alpha pension"
        limits={bridgeChartLimits}
        statePensionEditable
        onChangeParameters={onChangeChartParameters}
        {...bridgeChartParameters}
      />

      <BridgeResult analysis={bridgeAnalysis} settings={bridgeSettings} />
      <ModellerLimitations
        showLimitations={showLimitations}
        onToggleLimitations={onToggleLimitations}
      />

      <ComparisonPrototype
        settings={settings}
        validationIssues={validationIssues}
        scenarios={comparisonScenarios}
        onScenariosChange={onScenariosChange}
        onLoadScenario={onLoadScenario}
      />
    </div>
  );
}

function BridgeResult({
  analysis,
  settings,
}: {
  analysis: RetirementBridgeAnalysis;
  settings: PensionSettings;
}) {
  const finalPotRow = analysis.potProjection.at(-1);
  const longTermPosition =
    analysis.stableAnnualGuaranteedSurplus >= 0
      ? `${formatCurrencyDetailed(analysis.stableAnnualGuaranteedSurplus)} surplus per year`
      : `${formatCurrencyDetailed(Math.abs(analysis.stableAnnualGuaranteedSurplus))} shortfall per year`;
  const fullSecurePositionAmount = Math.abs(analysis.fullSecureAnnualGuaranteedSurplus);
  const fullSecurePosition =
    analysis.fullSecureIncomeStartDate === null
      ? "Not reached within this model"
      : analysis.fullSecureAnnualGuaranteedSurplus >= 0
        ? `${formatCurrencyDetailed(fullSecurePositionAmount)} overshoot per year (${formatCurrencyDetailed(
            fullSecurePositionAmount / 12,
          )} per month)`
        : `${formatCurrencyDetailed(fullSecurePositionAmount)} shortfall per year (${formatCurrencyDetailed(
            fullSecurePositionAmount / 12,
          )} per month)`;
  const fullSecureIncomeStartLabel =
    analysis.fullSecureIncomeStartDate === null ||
    analysis.fullSecureIncomeStartAge === null ||
    analysis.fullSecureIncomeStartAgeMonths === null
      ? "Not reached within this model"
      : `${formatDate(analysis.fullSecureIncomeStartDate)} (${formatAge(
          analysis.fullSecureIncomeStartAge,
          analysis.fullSecureIncomeStartAgeMonths,
        )})`;
  const fullSecurePositionDescription =
    analysis.fullSecureIncomeStartDate === null
      ? "Not all selected secure pension sources start before the modelling end age, so there is no later steady-state pension position to compare."
      : analysis.fullSecureAnnualGuaranteedSurplus > 0
        ? "Once all selected Civil Service and State Pension income is active, the model shows more secure income than your target. This is the later overshoot you can use when testing whether to adjust draw ages, bridge spending, or target income assumptions."
        : analysis.fullSecureAnnualGuaranteedSurplus < 0
          ? "Once all selected Civil Service and State Pension income is active, the model still sits below your target before any ISA/SIPP top-up."
          : "Once all selected Civil Service and State Pension income is active, the model lands exactly on your target before any ISA/SIPP top-up.";
  const fullSecurePositionLabel =
    analysis.fullSecureIncomeStartDate === null
      ? "Later secure pension position"
      : analysis.fullSecureAnnualGuaranteedSurplus >= 0
        ? "Later overshoot after secure pensions start"
        : "Later shortfall after secure pensions start";
  const actionItems = [
    {
      label: "ISA-only gap before SIPP access",
      value: formatCurrencyDetailed(analysis.requiredIsaAtRetirement),
    },
    {
      label: "Later top-up gap after SIPP access",
      value: formatCurrencyDetailed(analysis.requiredSippAtAccess),
    },
    {
      label: "Bridge still unfunded",
      value: formatCurrencyDetailed(analysis.totalUnfundedShortfall),
    },
    {
      label: "Estimated extra monthly saving",
      value: formatCurrencyDetailed(analysis.additionalMonthlyContributionRequired),
    },
  ];

  return (
    <div className="bridge-result">
      <SummarySection
        title="Action required"
        description={
          analysis.planWorks
            ? "Your entered pots cover the modelled bridge on these assumptions."
            : "This is the approximate bridge gap to close before the target retirement date."
        }
        items={[
          ...actionItems,
          {
            label: "SIPP access age",
            value: formatDecimalAge(settings.sippDrawAge),
          },
          {
            label: fullSecurePositionLabel,
            value: fullSecurePosition,
          },
        ]}
      />

      <SummarySection
        title="Later secure income check"
        variant="feature"
        description={fullSecurePositionDescription}
        items={[
          {
            label: "Plan status",
            value: analysis.planWorks ? "Works on these assumptions" : "Shortfall remains",
          },
          {
            label: "All selected secure pensions active from",
            value: fullSecureIncomeStartLabel,
          },
          {
            label: "Secure income at that point",
            value:
              analysis.fullSecureIncomeStartDate === null
                ? "Not available"
                : `${formatCurrencyDetailed(analysis.fullSecureAnnualGuaranteedIncome)} per year`,
          },
          {
            label: "Against your target",
            value: fullSecurePosition,
          },
          {
            label: "Position by modelling end",
            value: longTermPosition,
          },
          {
            label: "First pot to fail",
            value: analysis.firstPotToFail
              ? `${analysis.firstPotToFail} (${formatDate(analysis.firstFailureDate ?? "")})`
              : "None",
          },
        ]}
      />

      <SummarySection
        title="Scenario recap"
        description="The main assumptions used in this bridge calculation."
        items={[
          {
            label: "Target retirement",
            value: `${formatDate(analysis.target.retirementDate)} (${formatDecimalAge(analysis.target.retirementAge)})`,
          },
          {
            label: "Target income",
            value: `${formatCurrencyDetailed(analysis.target.annualIncome)} per year`,
          },
          {
            label: "Covered by existing bridge pots",
            value: formatCurrencyDetailed(analysis.totalBridgeRequired),
          },
          {
            label: "Bridge still unfunded",
            value: formatCurrencyDetailed(analysis.totalUnfundedShortfall),
          },
          {
            label: "Earliest sustainable pension draw age",
            value:
              analysis.earliestSustainablePensionDrawAge === null
                ? "Not found"
                : formatDecimalAge(analysis.earliestSustainablePensionDrawAge),
          },
          {
            label: "Projected ISA at end",
            value: formatCurrencyDetailed(finalPotRow?.isaBalance ?? 0),
          },
          {
            label: "Projected SIPP at end",
            value: formatCurrencyDetailed(finalPotRow?.sippBalance ?? 0),
          },
        ]}
      />
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
                <td data-label="User value">{row.userValue}</td>
                <td data-label="Modelled value">{row.modelledValue}</td>
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

function getFieldsByIds(
  fieldIds: readonly FieldDefinition["id"][],
  fieldLabels: JourneyFieldLabels = {},
) {
  return fieldIds
    .map((fieldId) => {
      const field = fieldGroups
        .flatMap((group) => group.fields)
        .find((candidate) => candidate.id === fieldId);

      if (!field) {
        return undefined;
      }

      return fieldLabels[fieldId] ? { ...field, label: fieldLabels[fieldId] } : field;
    })
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
  const extraInfoLinks = "infoLinks" in field ? (field.infoLinks ?? []) : [];
  const infoLinks = [
    ...(infoUrl
      ? [{ href: infoUrl, text: infoLinkText ?? `More about ${field.label}` }]
      : []),
    ...extraInfoLinks,
  ];

  return (
    <span className="field-label-group">
      <span className="field-label">{field.label}</span>
      {infoLinks.map((link) => (
        <InfoLink
          href={link.href}
          text={link.text}
          key={`${link.href}-${link.text}`}
        />
      ))}
    </span>
  );
}

function FieldHelp({ field }: { field: FieldDefinition }) {
  const showGuidanceNotes = useContext(GuidanceNotesContext);
  const description = "description" in field ? field.description : undefined;

  return showGuidanceNotes && description ? (
    <p className="field-help">{description}</p>
  ) : null;
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
    (fieldId !== "sippWithdrawalPercent" ||
      (settings.showSipp && settings.sippWithdrawalStrategy === "percentage")) &&
    (fieldId !== "sippWithdrawalTargetAge" ||
      (settings.showSipp && settings.sippWithdrawalStrategy === "use_by_age")) &&
    (fieldId !== "isaWithdrawalPercent" ||
      (settings.showIsa && settings.isaWithdrawalStrategy === "percentage")) &&
    (fieldId !== "isaWithdrawalTargetAge" ||
      (settings.showIsa && settings.isaWithdrawalStrategy === "use_by_age"))
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
    "fullSalary",
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
  const showGuidanceNotes = useContext(GuidanceNotesContext);

  if (field.id === "statePensionDrawDate") {
    return (
      <StatePensionAgeField
        field={field}
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
        field={field}
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
                event.target.checked,
              )
            }
          />
          {showGuidanceNotes ? <span>{field.description}</span> : null}
        </span>
        <FieldValidationMessage id={validationId} issue={validationIssue} />
      </label>
    );
  }

  if (field.type === "currency-input") {
    return (
      <CurrencySettingField
        field={field}
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
          onChange(field.id, event.target.value);
        }}
      >
        {yearOptions.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
      <FieldHelp field={field} />
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
  const resetValue = defaultSettings[field.id];

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
    onChange(field.id, nextValue);
    setDraftValue(
      normalizeSetting(field.id, nextValue).toString(),
    );
  };

  const applyPresetValue = (
    presetValue: NonNullable<CurrencyInputField["presets"]>[number]["value"],
  ) => {
    setDraftValue(presetValue.toString());
    onChange(field.id, presetValue);
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
  const canResetToDefault = [
    "inflationRateAnnual",
    "assumedCpiPercent",
    "sippRealInterestPercent",
    "isaRealInterestPercent",
  ].includes(field.id);
  const resetValue = defaultSettings[field.id];
  const resetLabel = `Reset ${field.label} to default`;
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

    onChange(field.id, boundedValue);
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
          aria-label={resetLabel}
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
            nextValue,
          ));

    onChange(field.id, normalizedValue);
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
      <FieldHelp field={field} />
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

type TableColumn = {
  key: string;
  label: string;
  width: string;
};

type ProjectionTableColumn = TableColumn & {
  setting?:
    | "showAlpha"
    | "showNuvos"
    | "showStatePension"
    | "showSipp"
    | "showIsa"
    | "taxationEnabled";
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
  {
    key: "monthlyAddedPension",
    label: "Monthly Added Pension",
    width: "7rem",
    setting: "showAlpha",
  },
  {
    key: "lumpSumAddedPension",
    label: "Lump sum added pension",
    width: "7rem",
    setting: "showAlpha",
  },
  {
    key: "annualStandardAlphaPension",
    label: "Standard Alpha Pension",
    width: "8rem",
    setting: "showAlpha",
  },
  {
    key: "annualEpaAlphaPension",
    label: "EPA Alpha Pension",
    width: "8rem",
    setting: "showAlpha",
  },
  {
    key: "annualAccruedAlphaPension",
    label: "Annual Accrued Alpha Pension",
    width: "8rem",
    setting: "showAlpha",
  },
  {
    key: "annualAlphaPensionIncludingReduction",
    label: "Annual Alpha Pension Including Reduction",
    width: "9rem",
    setting: "showAlpha",
  },
  {
    key: "monthlyAlphaPensionTakeHome",
    label: "Monthly Alpha pension before tax",
    width: "7rem",
    setting: "showAlpha",
  },
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
    label: "ISA",
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
  const [showMilestonesOnly, setShowMilestonesOnly] = useState(true);
  const visibleColumns = projectionTableColumns.filter(
    (column) => !column.setting || settings[column.setting],
  );
  const visibleRows = showMilestonesOnly
    ? rows.filter((row) => row.milestones.length > 0)
    : rows;
  const milestoneRowCount = rows.filter((row) => row.milestones.length > 0).length;

  return (
    <ProjectionTableFrame
      columns={visibleColumns.map((column) => ({
        ...column,
        label: getProjectionTableColumnLabel(column, settings),
      }))}
      rows={visibleRows}
      emptyMessage="No projection rows are available for the current settings."
      getRowKey={(row) => row.date}
      getRowClassName={(row) =>
        row.milestones.length > 0
          ? "projection-row projection-row--milestone"
          : "projection-row"
      }
      getRowTitle={(row) =>
        row.milestones.length > 0 ? row.milestones.join(", ") : undefined
      }
      controls={
        <>
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
        </>
      }
      renderCells={(row) =>
        visibleColumns.map((column) =>
          renderProjectionTableCell(row, column.key),
        )
      }
    />
  );
}

function ProjectionTableFrame<Row>({
  columns,
  rows,
  emptyMessage,
  getRowKey,
  renderCells,
  getRowClassName,
  getRowTitle,
  controls,
  minWidth = "62rem",
}: {
  columns: TableColumn[];
  rows: Row[];
  emptyMessage: string;
  getRowKey: (row: Row, rowIndex: number) => string;
  renderCells: (row: Row, rowIndex: number) => ReactNode[];
  getRowClassName?: (row: Row, rowIndex: number) => string | undefined;
  getRowTitle?: (row: Row, rowIndex: number) => string | undefined;
  controls?: ReactNode;
  minWidth?: string;
}) {
  const headerScrollRef = useRef<HTMLDivElement | null>(null);
  const showMobileCards = useMobileDateDropdowns();

  const syncHeaderScroll = (scrollLeft: number) => {
    if (headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = scrollLeft;
    }
  };

  if (rows.length === 0) {
    return (
      <div className="table-shell">
        {controls ? <div className="table-controls">{controls}</div> : null}
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="table-shell">
      {controls ? <div className="table-controls">{controls}</div> : null}

      {showMobileCards ? (
        <div className="projection-mobile-cards">
          {rows.map((row, rowIndex) => {
            const rowKey = getRowKey(row, rowIndex);
            const cells = renderCells(row, rowIndex);

            return (
              <article
                key={`${rowKey}-mobile`}
                className={`projection-mobile-card ${getRowClassName?.(row, rowIndex) ?? ""}`}
                title={getRowTitle?.(row, rowIndex)}
              >
                {cells.map((cell, cellIndex) => (
                  <div
                    key={`${rowKey}-mobile-${columns[cellIndex]?.key}`}
                    className="projection-mobile-card-row"
                  >
                    <span>{columns[cellIndex]?.label}</span>
                    <div className="projection-mobile-card-value">{cell}</div>
                  </div>
                ))}
              </article>
            );
          })}
        </div>
      ) : null}

      <div className="table-header-shell">
        <div className="table-header-scroll" ref={headerScrollRef}>
          <table
            className="projection-table projection-table--header"
            style={{ minWidth }}
            aria-hidden="true"
          >
            <colgroup>
              {columns.map((column) => (
                <col key={column.key} style={{ width: column.width }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column.key} scope="col">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
          </table>
        </div>
      </div>

      <div
        className="table-body-shell"
        onScroll={(event) => syncHeaderScroll(event.currentTarget.scrollLeft)}
      >
        <table
          className="projection-table projection-table--body"
          style={{ minWidth }}
        >
          <colgroup>
            {columns.map((column) => (
              <col key={column.key} style={{ width: column.width }} />
            ))}
          </colgroup>
          <thead className="projection-table-sr-only">
            <tr>
              {columns.map((column) => (
                <th key={column.key} scope="col">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => {
              const rowKey = getRowKey(row, rowIndex);
              const cells = renderCells(row, rowIndex);

              return (
                <tr
                  key={rowKey}
                  className={getRowClassName?.(row, rowIndex)}
                  title={getRowTitle?.(row, rowIndex)}
                >
                  {cells.map((cell, cellIndex) => (
                    <td
                      key={`${rowKey}-${columns[cellIndex]?.key}`}
                      data-label={columns[cellIndex]?.label}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function renderProjectionTableCell(
  row: ProjectionRow,
  columnKey: ProjectionTableColumn["key"],
): ReactNode {
  switch (columnKey) {
    case "date":
      return (
        <ProjectionDateCell
          date={row.date}
          milestones={row.milestones}
          milestoneDates={row.milestoneDates}
        />
      );
    case "totalMonthlyPensionTakeHomePay":
      return formatCurrencyDetailed(row.totalMonthlyPensionTakeHomePay);
    case "monthlyIncomeTax":
      return formatCurrencyDetailed(row.monthlyIncomeTax);
    case "totalMonthlyPensionIncomeBeforeTax":
      return formatCurrencyDetailed(row.totalMonthlyPensionIncomeBeforeTax);
    case "age":
      return formatAge(row.age, row.ageMonths);
    case "monthlyAddedPension":
      return formatCurrencyDetailed(row.monthlyAddedPension);
    case "lumpSumAddedPension":
      return formatCurrencyDetailed(row.lumpSumAddedPension);
    case "annualStandardAlphaPension":
      return formatCurrencyDetailed(row.annualStandardAlphaPension);
    case "annualEpaAlphaPension":
      return formatCurrencyDetailed(row.annualEpaAlphaPension);
    case "annualAccruedAlphaPension":
      return formatCurrencyDetailed(row.annualAccruedAlphaPension);
    case "annualAlphaPensionIncludingReduction":
      return formatCurrencyDetailed(row.annualAlphaPensionIncludingReduction);
    case "monthlyAlphaPensionTakeHome":
      return formatCurrencyDetailed(row.monthlyAlphaPensionTakeHome);
    case "annualNuvosPension":
      return formatCurrencyDetailed(row.annualNuvosPension);
    case "annualNuvosPensionIncludingReduction":
      return formatCurrencyDetailed(row.annualNuvosPensionIncludingReduction);
    case "monthlyNuvosPensionTakeHome":
      return formatCurrencyDetailed(row.monthlyNuvosPensionTakeHome);
    case "monthlyStatePension":
      return formatCurrencyDetailed(row.monthlyStatePension);
    case "monthlySippPension":
      return formatCurrencyDetailed(row.monthlySippPension);
    case "sippPot":
      return formatCurrencyDetailed(row.sippPot);
    case "monthlyIsaPension":
      return formatCurrencyDetailed(row.monthlyIsaPension);
    case "isaPot":
      return formatCurrencyDetailed(row.isaPot);
    default:
      return "";
  }
}

function ProjectionDateCell({
  date,
  milestones,
  milestoneDates,
}: {
  date: string;
  milestones: string[];
  milestoneDates: string[];
}) {
  return (
    <div className="projection-date-cell">
      <span>{formatDate(milestoneDates[0] ?? date)}</span>
      {milestones.length > 0 ? (
        <span className="milestone-badges">
          {milestones.map((milestone: string) => (
            <span className="milestone-badge" key={`${date}-${milestone}`}>
              {milestone}
            </span>
          ))}
        </span>
      ) : null}
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

function formatShortfallOrSurplus(shortfall: number, surplus: number) {
  if (shortfall > 0) {
    return `${formatCurrencyDetailed(shortfall)} shortfall`;
  }

  if (surplus > 0) {
    return `${formatCurrencyDetailed(surplus)} surplus`;
  }

  return formatCurrencyDetailed(0);
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
  const sippUseByDate = addYearsToIsoDate(
    settings.dateOfBirth,
    settings.sippWithdrawalTargetAge,
  );
  const isaUseByDate = addYearsToIsoDate(
    settings.dateOfBirth,
    settings.isaWithdrawalTargetAge,
  );

  const baseSeries = rows
    .filter((row) => row.date >= settings.startDate)
    .map((row, index) => {
      const age = row.age + row.ageMonths / 12;
      const previousRow = index > 0 ? rows[index - 1] : undefined;
      const isaIncomeAnnual =
        settings.showIsa
          ? getBridgePotIncomeAnnual({
              row,
              previousRow,
              rowDate: row.date,
              drawDate: isaDrawDate,
              stopDate:
                settings.isaWithdrawalStrategy === "use_by_age" ? isaUseByDate : null,
              monthlyIncome: row.monthlyIsaPension,
              previousMonthlyIncome: previousRow?.monthlyIsaPension ?? 0,
            })
          : 0;
      const sippIncomeAnnual =
        settings.showSipp
          ? getBridgePotIncomeAnnual({
              row,
              previousRow,
              rowDate: row.date,
              drawDate: sippDrawDate,
              stopDate:
                settings.sippWithdrawalStrategy === "use_by_age" ? sippUseByDate : null,
              monthlyIncome: row.monthlySippPension,
              previousMonthlyIncome: previousRow?.monthlySippPension ?? 0,
            })
          : 0;
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
        assessedIncomeAnnual:
          row.totalMonthlyPensionTakeHomePay * 12 + partialRetirementIncomeAnnual,
        shortfallAnnual:
          row.date >= requirementDate
            ? Math.max(
                0,
                targetIncomeAnnual -
                  (row.totalMonthlyPensionTakeHomePay * 12 + partialRetirementIncomeAnnual),
              )
            : 0,
        isaBalance: row.isaPot,
        sippBalance: row.sippPot,
        phase: getRetirementIncomePhase(age, settings, statePensionAge),
      };
    });

  return insertChartTransitionPoints(baseSeries, settings);
}

function getBridgePotIncomeAnnual(input: {
  row: ProjectionRow;
  previousRow?: ProjectionRow;
  rowDate: string;
  drawDate: string;
  stopDate: string | null;
  monthlyIncome: number;
  previousMonthlyIncome: number;
}) {
  const {
    rowDate,
    drawDate,
    stopDate,
    monthlyIncome,
    previousMonthlyIncome,
  } = input;

  if (rowDate < drawDate) {
    return 0;
  }

  if (stopDate && rowDate < stopDate && monthlyIncome <= 0 && previousMonthlyIncome > 0) {
    return previousMonthlyIncome * 12;
  }

  return monthlyIncome * 12;
}

function insertChartTransitionPoints(
  points: RetirementIncomePoint[],
  settings: PensionSettings,
) {
  const transitionDates = [
    addYearsToIsoDate(settings.dateOfBirth, settings.requirementAge),
    addYearsToIsoDate(settings.dateOfBirth, settings.isaDrawAge),
    settings.showIsa && settings.isaWithdrawalStrategy === "use_by_age"
      ? addYearsToIsoDate(settings.dateOfBirth, settings.isaWithdrawalTargetAge)
      : "",
    settings.showSipp ? addYearsToIsoDate(settings.dateOfBirth, settings.sippDrawAge) : "",
    settings.showSipp && settings.sippWithdrawalStrategy === "use_by_age"
      ? addYearsToIsoDate(settings.dateOfBirth, settings.sippWithdrawalTargetAge)
      : "",
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

  return settings.fullSalary * (settings.partialRetirementWorkPercent / 100);
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

function formatDecimalAge(age: number) {
  const totalMonths = Math.round(age * 12);
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  return months === 0 ? `${years}` : `${years}y ${months}m`;
}

function formatAgeValue(value: number) {
  return value.toFixed(2).replace(/\.00$/, "");
}

function isSettingsGroupVisible(groupId: string, settings: PensionSettings) {
  if (groupId === "alpha") {
    return settings.showAlpha;
  }

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

  return storedMode === "journey" ||
    storedMode === "bridge" ||
    storedMode === "simple" ||
    storedMode === "expert"
    ? storedMode
    : null;
}

function loadStoredGuidanceNotes() {
  const storedPreference = readStorageItem(GUIDANCE_NOTES_STORAGE_KEY);

  return storedPreference === null ? true : storedPreference !== "false";
}

function loadStoredComparisonScenarios(): ComparisonScenario[] {
  const storedScenarios = readStorageItem(COMPARISON_SCENARIOS_STORAGE_KEY);

  if (!storedScenarios) {
    return [];
  }

  try {
    const parsed = JSON.parse(storedScenarios) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((scenario, index) => normalizeStoredComparisonScenario(scenario, index))
      .filter((scenario): scenario is ComparisonScenario => Boolean(scenario))
      .slice(0, MAX_COMPARISON_SCENARIOS);
  } catch {
    return [];
  }
}

function normalizeStoredComparisonScenario(
  scenario: unknown,
  index: number,
): ComparisonScenario | null {
  if (!scenario || typeof scenario !== "object") {
    return null;
  }

  const candidate = scenario as Partial<ComparisonScenario>;
  const settings = candidate.settings;

  if (!settings || typeof settings !== "object") {
    return null;
  }

  const now = new Date().toISOString();

  return {
    id:
      typeof candidate.id === "string" && candidate.id
        ? candidate.id
        : createComparisonScenarioId(),
    name:
      typeof candidate.name === "string" && candidate.name.trim()
        ? candidate.name
        : `Scenario ${index + 1}`,
    settings: clonePensionSettings(settings),
    createdAt:
      typeof candidate.createdAt === "string" && candidate.createdAt
        ? candidate.createdAt
        : now,
    updatedAt:
      typeof candidate.updatedAt === "string" && candidate.updatedAt
        ? candidate.updatedAt
        : now,
  };
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

function saveStoredComparisonScenarios(scenarios: ComparisonScenario[]) {
  writeStorageItem(
    COMPARISON_SCENARIOS_STORAGE_KEY,
    JSON.stringify(scenarios.slice(0, MAX_COMPARISON_SCENARIOS)),
  );
}

function saveStoredGuidanceNotes(showGuidanceNotes: boolean) {
  writeStorageItem(
    GUIDANCE_NOTES_STORAGE_KEY,
    showGuidanceNotes ? "true" : "false",
  );
}

export default App;
