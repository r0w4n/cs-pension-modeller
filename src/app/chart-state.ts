import type { Dispatch, SetStateAction, TransitionStartFunction } from "react";
import type { SettingsKey } from "../fieldDefinitions";
import type { RetirementIncomeBridgeParameters } from "../RetirementIncomeBridgeChart";
import {
  calculateMinimumStatePensionDrawAge,
  calculateMinimumPensionAccessAge,
  calculateMinimumSippAccessAge,
  calculateNormalPensionAge,
  calculateStatePensionDrawAge,
  calculateStatePensionDrawDateFromAge,
  normalizeAlphaPensionDrawAge,
  normalizeSetting,
  normalizeSippDrawAge,
  normalizeStatePensionDrawAge,
  normalizeStatePensionDrawDate,
  type PensionSettings,
} from "../settings";
import {
  calculateCurrentPlanningAge,
  clampNumber,
  isOptionalSectionToggleKey,
} from "../app-domains";

type SetSettings = Dispatch<SetStateAction<PensionSettings>>;
type SetChartUndoStack = Dispatch<SetStateAction<PensionSettings[]>>;

type ChartStateContext = {
  currentPlanningAge: number;
  defaultStatePensionAge: number;
  minimumAlphaAccessAge: number;
  minimumSippAccessAge: number;
};

export function applyBridgeChartParameterPatch(
  current: PensionSettings,
  patch: Partial<RetirementIncomeBridgeParameters>
) {
  const next = { ...current };
  const context = createChartStateContext(next);

  applyIncomeAndContributionPatch(next, patch, context);
  applyVisibilityPatch(next, patch);

  const statePensionAge = applyStatePensionPatch(next, patch, context);

  applyRetirementAgePatch(next, patch, context, statePensionAge);
  applyAlphaLeaveAgePatch(next, patch, context, statePensionAge);
  applyAccessAgePatch(next, patch, context, statePensionAge);
  applyUseByAgePatch(next, patch);
  reconcileChartState(next, context);

  return next;
}

function createChartStateContext(settings: PensionSettings): ChartStateContext {
  return {
    currentPlanningAge: calculateCurrentPlanningAge(settings),
    defaultStatePensionAge: calculateMinimumStatePensionDrawAge(
      settings.dateOfBirth
    ),
    minimumAlphaAccessAge: calculateMinimumPensionAccessAge(
      settings.dateOfBirth
    ),
    minimumSippAccessAge: calculateMinimumSippAccessAge(settings.dateOfBirth),
  };
}

function applyIncomeAndContributionPatch(
  next: PensionSettings,
  patch: Partial<RetirementIncomeBridgeParameters>,
  context: ChartStateContext
) {
  assignNormalizedNumber(
    next,
    "desiredRetirementIncome",
    patch.targetIncomeAnnual
  );
  assignNormalizedNumber(
    next,
    "alphaAddedPensionMonthly",
    patch.alphaMonthlyAddedPension
  );
  assignNormalizedNumber(
    next,
    "isaMonthlyContribution",
    patch.isaMonthlyContribution
  );
  assignNormalizedNumber(
    next,
    "sippMonthlyContribution",
    patch.sippMonthlyContribution
  );

  if (patch.partialRetirementStartAge !== undefined) {
    const latestPartialRetirementStartAge = Math.max(
      context.currentPlanningAge,
      Math.min(next.requirementAge - 0.25, 70, next.lifeExpectancy)
    );
    next.partialRetirementStartAge = normalizeSetting(
      "partialRetirementStartAge",
      clampNumber(
        patch.partialRetirementStartAge,
        context.currentPlanningAge,
        latestPartialRetirementStartAge
      )
    );
  }

  assignNormalizedNumber(
    next,
    "partialRetirementWorkPercent",
    patch.partialRetirementWorkPercent
  );

  if (patch.partialRetirementEnabled !== undefined) {
    next.partialRetirementEnabled = patch.partialRetirementEnabled;
  }
}

function applyVisibilityPatch(
  next: PensionSettings,
  patch: Partial<RetirementIncomeBridgeParameters>
) {
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
}

function applyStatePensionPatch(
  next: PensionSettings,
  patch: Partial<RetirementIncomeBridgeParameters>,
  context: ChartStateContext
) {
  const requestedStateAge =
    patch.statePensionAge ??
    calculateStatePensionDrawAge(next.dateOfBirth, next.statePensionDrawDate);
  const statePensionAge = clampNumber(
    requestedStateAge,
    context.defaultStatePensionAge,
    Math.max(context.defaultStatePensionAge, next.lifeExpectancy)
  );

  if (patch.statePensionAge !== undefined) {
    next.statePensionDrawDate = calculateStatePensionDrawDateFromAge(
      next.dateOfBirth,
      normalizeStatePensionDrawAge(statePensionAge, next.dateOfBirth)
    );
  }

  return statePensionAge;
}

function applyRetirementAgePatch(
  next: PensionSettings,
  patch: Partial<RetirementIncomeBridgeParameters>,
  context: ChartStateContext,
  statePensionAge: number
) {
  if (patch.retirementAge === undefined) {
    return;
  }

  const retirementAge = clampNumber(
    patch.retirementAge,
    context.currentPlanningAge,
    Math.min(70, statePensionAge, next.alphaPensionDrawAge)
  );
  next.requirementAge = normalizeSetting("requirementAge", retirementAge);
  next.isaDrawAge = normalizeSetting("isaDrawAge", retirementAge);

  if (next.alphaPensionLeaveAge > next.requirementAge) {
    next.alphaPensionLeaveAge = normalizeSetting(
      "alphaPensionLeaveAge",
      next.requirementAge
    );
  }

  if (
    next.partialRetirementEnabled &&
    next.partialRetirementStartAge >= next.requirementAge
  ) {
    next.partialRetirementStartAge = normalizeSetting(
      "partialRetirementStartAge",
      clampNumber(
        next.requirementAge - 0.25,
        context.currentPlanningAge,
        Math.min(70, next.lifeExpectancy)
      )
    );
  }

  if (
    next.showSipp &&
    next.sippDrawAge < Math.max(retirementAge, context.minimumSippAccessAge)
  ) {
    next.sippDrawAge = normalizeSippDrawAge(
      Math.max(retirementAge, context.minimumSippAccessAge),
      next.dateOfBirth
    );
  }
}

function applyAlphaLeaveAgePatch(
  next: PensionSettings,
  patch: Partial<RetirementIncomeBridgeParameters>,
  context: ChartStateContext,
  statePensionAge: number
) {
  if (patch.alphaLeaveAge === undefined) {
    return;
  }

  const alphaLeaveAge = clampNumber(
    patch.alphaLeaveAge,
    context.currentPlanningAge,
    Math.min(70, statePensionAge, next.requirementAge)
  );
  next.alphaPensionLeaveAge = normalizeSetting(
    "alphaPensionLeaveAge",
    alphaLeaveAge
  );
}

function applyAccessAgePatch(
  next: PensionSettings,
  patch: Partial<RetirementIncomeBridgeParameters>,
  context: ChartStateContext,
  statePensionAge: number
) {
  if (patch.sippAccessAge !== undefined) {
    const sippAccessAge = clampNumber(
      patch.sippAccessAge,
      Math.max(next.requirementAge, context.minimumSippAccessAge),
      Math.min(70, statePensionAge)
    );
    next.sippDrawAge = normalizeSippDrawAge(sippAccessAge, next.dateOfBirth);
    reconcileSippWithdrawalTarget(next);
  }

  if (patch.isaAccessAge !== undefined) {
    next.isaDrawAge = normalizeSetting(
      "isaDrawAge",
      clampNumber(
        patch.isaAccessAge,
        context.currentPlanningAge,
        Math.min(70, statePensionAge)
      )
    );
    reconcileIsaWithdrawalTarget(next);
  }

  if (patch.alphaStartAge !== undefined) {
    const alphaStartAgeMin = Math.max(
      next.alphaPensionLeaveAge,
      context.minimumAlphaAccessAge,
      next.requirementAge
    );
    const alphaStartAge = clampNumber(
      patch.alphaStartAge,
      alphaStartAgeMin,
      Math.max(alphaStartAgeMin, 70)
    );
    next.alphaPensionDrawAge = normalizeAlphaPensionDrawAge(
      alphaStartAge,
      next.dateOfBirth
    );
  }

  if (patch.nuvosStartAge !== undefined) {
    const nuvosStartAgeMin = Math.max(
      next.nuvosPensionLeaveAge,
      context.minimumAlphaAccessAge,
      next.requirementAge
    );
    const nuvosStartAge = clampNumber(
      patch.nuvosStartAge,
      nuvosStartAgeMin,
      Math.max(nuvosStartAgeMin, 70)
    );
    next.nuvosPensionDrawAge = normalizeSetting(
      "nuvosPensionDrawAge",
      nuvosStartAge
    );
  }
}

function applyUseByAgePatch(
  next: PensionSettings,
  patch: Partial<RetirementIncomeBridgeParameters>
) {
  if (patch.sippUseByAge !== undefined) {
    next.sippWithdrawalTargetAge = normalizeSetting(
      "sippWithdrawalTargetAge",
      clampNumber(
        patch.sippUseByAge,
        next.sippDrawAge + 0.25,
        Math.min(100, next.lifeExpectancy)
      )
    );
  }

  if (patch.isaUseByAge !== undefined) {
    next.isaWithdrawalTargetAge = normalizeSetting(
      "isaWithdrawalTargetAge",
      clampNumber(
        patch.isaUseByAge,
        next.isaDrawAge + 0.25,
        Math.min(100, next.lifeExpectancy)
      )
    );
  }
}

function reconcileChartState(
  next: PensionSettings,
  context: ChartStateContext
) {
  if (
    next.showSipp &&
    next.sippDrawAge <
      Math.max(next.requirementAge, context.minimumSippAccessAge)
  ) {
    next.sippDrawAge = normalizeSippDrawAge(
      Math.max(next.requirementAge, context.minimumSippAccessAge),
      next.dateOfBirth
    );
  }

  reconcileSippWithdrawalTarget(next);
  reconcileIsaWithdrawalTarget(next);

  if (next.alphaPensionLeaveAge > next.alphaPensionDrawAge) {
    next.alphaPensionDrawAge = normalizeAlphaPensionDrawAge(
      next.alphaPensionLeaveAge,
      next.dateOfBirth
    );
  }
}

function reconcileSippWithdrawalTarget(next: PensionSettings) {
  if (
    next.showSipp &&
    next.sippWithdrawalStrategy === "use_by_age" &&
    next.sippWithdrawalTargetAge <= next.sippDrawAge
  ) {
    next.sippWithdrawalTargetAge = normalizeSetting(
      "sippWithdrawalTargetAge",
      next.sippDrawAge + 0.25
    );
  }
}

function reconcileIsaWithdrawalTarget(next: PensionSettings) {
  if (
    next.showIsa &&
    next.isaWithdrawalStrategy === "use_by_age" &&
    next.isaWithdrawalTargetAge <= next.isaDrawAge
  ) {
    next.isaWithdrawalTargetAge = normalizeSetting(
      "isaWithdrawalTargetAge",
      next.isaDrawAge + 0.25
    );
  }
}

type NormalizedNumberKey =
  | "desiredRetirementIncome"
  | "alphaAddedPensionMonthly"
  | "isaMonthlyContribution"
  | "sippMonthlyContribution"
  | "partialRetirementWorkPercent";

function assignNormalizedNumber(
  settings: PensionSettings,
  key: NormalizedNumberKey,
  value: number | undefined
) {
  if (value === undefined) {
    return;
  }

  settings[key] = normalizeSetting(key, value);
}

export function updateSetting({
  key,
  value,
  showSavedLabel,
  startTransition,
  setChartUndoStack,
  setSettings,
}: {
  key: SettingsKey;
  value: PensionSettings[SettingsKey];
  showSavedLabel: () => void;
  startTransition: TransitionStartFunction;
  setChartUndoStack: SetChartUndoStack;
  setSettings: SetSettings;
}) {
  showSavedLabel();
  setChartUndoStack([]);

  if (isOptionalSectionToggleKey(key)) {
    const nextValue = value as boolean;

    startTransition(() => {
      setSettings((current) => ({
        ...current,
        [key]: nextValue,
      }));
    });

    return;
  }

  if (key === "requirementAge") {
    setSettings((current) =>
      applyBridgeChartParameterPatch(current, {
        retirementAge: value as number,
      })
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
            normalPensionAge: calculateNormalPensionAge(
              normalizedValue as string
            ),
            alphaPensionDrawAge: normalizeAlphaPensionDrawAge(
              current.alphaPensionDrawAge,
              normalizedValue as string
            ),
            sippDrawAge: normalizeSippDrawAge(
              current.sippDrawAge,
              normalizedValue as string
            ),
            statePensionDrawDate: calculateStatePensionDrawDateFromAge(
              normalizedValue as string,
              calculateMinimumStatePensionDrawAge(normalizedValue as string)
            ),
          }
        : {}),
    };
  });
}

export function updateBridgeChartParameters({
  patch,
  settings,
  showSavedLabel,
  setChartUndoStack,
  setSettings,
}: {
  patch: Partial<RetirementIncomeBridgeParameters>;
  settings: PensionSettings;
  showSavedLabel: () => void;
  setChartUndoStack: SetChartUndoStack;
  setSettings: SetSettings;
}) {
  showSavedLabel();
  setChartUndoStack((current) => [...current.slice(-19), settings]);
  setSettings((current) => applyBridgeChartParameterPatch(current, patch));
}
