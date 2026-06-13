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
  getPartialRetirementStartAgeBounds,
  getPensionStartAgeBounds,
  getSippChartAccessAgeBounds,
  getStatePensionAgeBounds,
  getUseByAgeBounds,
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
  applyAccessAgePatch(next, patch, context);
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
    const partialRetirementStartAgeBounds = getPartialRetirementStartAgeBounds({
      currentPlanningAge: context.currentPlanningAge,
      lifeExpectancy: next.lifeExpectancy,
      retirementAge: next.requirementAge,
    });
    next.partialRetirementStartAge = normalizeSetting(
      "partialRetirementStartAge",
      clampNumber(
        patch.partialRetirementStartAge,
        partialRetirementStartAgeBounds.min,
        partialRetirementStartAgeBounds.max
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
  if (patch.showAlpha !== undefined) {
    next.showAlpha = patch.showAlpha;
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
}

function applyStatePensionPatch(
  next: PensionSettings,
  patch: Partial<RetirementIncomeBridgeParameters>,
  context: ChartStateContext
) {
  const requestedStateAge =
    patch.statePensionAge ??
    calculateStatePensionDrawAge(next.dateOfBirth, next.statePensionDrawDate);
  const statePensionAgeBounds = getStatePensionAgeBounds({
    defaultStatePensionAge: context.defaultStatePensionAge,
    lifeExpectancy: next.lifeExpectancy,
  });
  const statePensionAge = clampNumber(
    requestedStateAge,
    statePensionAgeBounds.min,
    statePensionAgeBounds.max
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
    next.showAlpha
      ? Math.min(70, statePensionAge, next.alphaPensionDrawAge)
      : Math.min(70, statePensionAge)
  );
  next.requirementAge = normalizeSetting("requirementAge", retirementAge);

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
    const partialRetirementStartAgeBounds = getPartialRetirementStartAgeBounds({
      currentPlanningAge: context.currentPlanningAge,
      lifeExpectancy: next.lifeExpectancy,
      retirementAge: next.requirementAge,
    });
    next.partialRetirementStartAge = normalizeSetting(
      "partialRetirementStartAge",
      clampNumber(
        partialRetirementStartAgeBounds.max,
        partialRetirementStartAgeBounds.min,
        partialRetirementStartAgeBounds.max
      )
    );
  }

  if (next.showSipp && next.sippDrawAge < context.minimumSippAccessAge) {
    next.sippDrawAge = normalizeSippDrawAge(
      context.minimumSippAccessAge,
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
  context: ChartStateContext
) {
  if (patch.sippAccessAge !== undefined) {
    const sippAccessAgeBounds = getSippChartAccessAgeBounds({
      lifeExpectancy: next.lifeExpectancy,
      minimumSippAccessAge: context.minimumSippAccessAge,
      retirementAge: next.requirementAge,
    });
    const sippAccessAge = clampNumber(
      patch.sippAccessAge,
      sippAccessAgeBounds.min,
      sippAccessAgeBounds.max
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
        Math.max(context.currentPlanningAge, next.lifeExpectancy)
      )
    );
    reconcileIsaWithdrawalTarget(next);
  }

  if (patch.alphaStartAge !== undefined) {
    const alphaStartAgeBounds = getPensionStartAgeBounds({
      currentPlanningAge: context.currentPlanningAge,
      leaveAge: next.alphaPensionLeaveAge,
      minimumPensionAccessAge: context.minimumAlphaAccessAge,
      retirementAge: next.requirementAge,
    });
    const alphaStartAge = clampNumber(
      patch.alphaStartAge,
      alphaStartAgeBounds.min,
      alphaStartAgeBounds.max
    );
    next.alphaPensionDrawAge = normalizeAlphaPensionDrawAge(
      alphaStartAge,
      next.dateOfBirth
    );
  }

  if (patch.nuvosStartAge !== undefined) {
    const nuvosStartAgeBounds = getPensionStartAgeBounds({
      currentPlanningAge: context.currentPlanningAge,
      leaveAge: next.nuvosPensionLeaveAge,
      minimumPensionAccessAge: context.minimumAlphaAccessAge,
      retirementAge: next.requirementAge,
    });
    const nuvosStartAge = clampNumber(
      patch.nuvosStartAge,
      nuvosStartAgeBounds.min,
      nuvosStartAgeBounds.max
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
    const sippUseByAgeBounds = getUseByAgeBounds({
      drawAge: next.sippDrawAge,
      lifeExpectancy: next.lifeExpectancy,
    });
    next.sippWithdrawalTargetAge = normalizeSetting(
      "sippWithdrawalTargetAge",
      clampNumber(
        patch.sippUseByAge,
        sippUseByAgeBounds.min,
        sippUseByAgeBounds.max
      )
    );
  }

  if (patch.isaUseByAge !== undefined) {
    const isaUseByAgeBounds = getUseByAgeBounds({
      drawAge: next.isaDrawAge,
      lifeExpectancy: next.lifeExpectancy,
    });
    next.isaWithdrawalTargetAge = normalizeSetting(
      "isaWithdrawalTargetAge",
      clampNumber(
        patch.isaUseByAge,
        isaUseByAgeBounds.min,
        isaUseByAgeBounds.max
      )
    );
  }
}

function reconcileChartState(
  next: PensionSettings,
  context: ChartStateContext
) {
  const sippAccessAgeBounds = getSippChartAccessAgeBounds({
    lifeExpectancy: next.lifeExpectancy,
    minimumSippAccessAge: context.minimumSippAccessAge,
    retirementAge: next.requirementAge,
  });

  if (next.showSipp && next.sippDrawAge < sippAccessAgeBounds.min) {
    next.sippDrawAge = normalizeSippDrawAge(
      sippAccessAgeBounds.min,
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
  const sippUseByAgeBounds = getUseByAgeBounds({
    drawAge: next.sippDrawAge,
    lifeExpectancy: next.lifeExpectancy,
  });

  if (
    next.showSipp &&
    next.sippWithdrawalStrategy === "use_by_age" &&
    next.sippWithdrawalTargetAge < sippUseByAgeBounds.min
  ) {
    next.sippWithdrawalTargetAge = normalizeSetting(
      "sippWithdrawalTargetAge",
      sippUseByAgeBounds.min
    );
  }
}

function reconcileIsaWithdrawalTarget(next: PensionSettings) {
  const isaUseByAgeBounds = getUseByAgeBounds({
    drawAge: next.isaDrawAge,
    lifeExpectancy: next.lifeExpectancy,
  });

  if (
    next.showIsa &&
    next.isaWithdrawalStrategy === "use_by_age" &&
    next.isaWithdrawalTargetAge < isaUseByAgeBounds.min
  ) {
    next.isaWithdrawalTargetAge = normalizeSetting(
      "isaWithdrawalTargetAge",
      isaUseByAgeBounds.min
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
