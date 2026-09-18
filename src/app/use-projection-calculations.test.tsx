import { act, renderHook, waitFor } from "@testing-library/react";
import { calculateRetirementPlan } from "../calculation/retirement-plan";
import { createDefaultSettings, type PensionSettings } from "../settings";
import type { RetirementPlanCalculationWorkerResponse } from "./retirement-plan-calculation-worker";
import {
  getRetirementPlanCacheKey,
  type RetirementPlanResultCache,
} from "./retirement-plan-result-cache";
import { useProjectionCalculations } from "./use-projection-calculations";

type WorkerListener = (event: MessageEvent<never>) => void;

class MockCalculationWorker {
  static instances: MockCalculationWorker[] = [];

  readonly messages: unknown[] = [];
  readonly listeners = new Map<string, WorkerListener[]>();
  terminated = false;

  constructor() {
    MockCalculationWorker.instances.push(this);
  }

  addEventListener(type: string, listener: WorkerListener) {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: WorkerListener) {
    this.listeners.set(
      type,
      (this.listeners.get(type) ?? []).filter(
        (candidate) => candidate !== listener
      )
    );
  }

  postMessage(message: unknown) {
    this.messages.push(message);
  }

  terminate() {
    this.terminated = true;
  }

  emitError() {
    this.listeners
      .get("error")
      ?.forEach((listener) => listener({} as MessageEvent<never>));
  }

  emitMessage(response: RetirementPlanCalculationWorkerResponse) {
    this.listeners
      .get("message")
      ?.forEach((listener) =>
        listener({ data: response } as MessageEvent<never>)
      );
  }
}

function createFastSettings(): PensionSettings {
  return {
    ...createDefaultSettings(),
    showAlpha: false,
    showClassic: false,
    showClassicPlus: false,
    showNuvos: false,
    showPremium: false,
    showStatePension: false,
    showSipp: false,
    showCsAvc: false,
    showIsa: false,
    showLisa: false,
  };
}

function createPreviewSettings(): PensionSettings {
  return {
    ...createFastSettings(),
    showIsa: true,
    isaCurrentPot: 120_000,
    isaMonthlyContribution: 0,
    isaWithdrawalStrategy: "percentage",
    isaWithdrawalPercent: 10,
    desiredRetirementIncome: 6_000,
  };
}

describe("useProjectionCalculations", () => {
  beforeEach(() => {
    MockCalculationWorker.instances = [];
    vi.stubGlobal("Worker", MockCalculationWorker);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps the completed result while calculating changed settings in a worker", async () => {
    const initialSettings = createFastSettings();
    const updatedSettings = {
      ...initialSettings,
      desiredRetirementIncome: initialSettings.desiredRetirementIncome + 1000,
    };
    const cache: RetirementPlanResultCache = new Map();
    const { result, rerender } = renderHook(
      ({ settings }) =>
        useProjectionCalculations({
          settings,
          retirementIncomeDisplay: "annual",
          retirementPlanResultCache: cache,
          calculationEnabled: true,
        }),
      { initialProps: { settings: initialSettings } }
    );

    rerender({ settings: updatedSettings });

    await waitFor(() =>
      expect(MockCalculationWorker.instances).toHaveLength(1)
    );
    const worker = MockCalculationWorker.instances[0];
    expect(worker?.messages).toEqual([updatedSettings]);
    expect(result.current.isProjectionPending).toBe(true);
    expect(result.current.retirementPlanResult?.settings).toEqual(
      initialSettings
    );

    const updatedPlan = calculateRetirementPlan(updatedSettings);
    act(() => {
      worker?.emitMessage({ ok: true, result: updatedPlan });
    });

    expect(result.current.isProjectionPending).toBe(false);
    expect(result.current.retirementPlanResult).toEqual(updatedPlan);
    expect(
      cache.get(
        getRetirementPlanCacheKey(updatedSettings, {
          includeTargetBasedWithdrawalPreviews: false,
        })
      )
    ).toEqual(updatedPlan);
    expect(worker?.terminated).toBe(true);
  });

  it("terminates obsolete work and ignores its result after another change", async () => {
    const initialSettings = createFastSettings();
    const firstSettings = {
      ...initialSettings,
      desiredRetirementIncome: initialSettings.desiredRetirementIncome + 1000,
    };
    const latestSettings = {
      ...initialSettings,
      desiredRetirementIncome: initialSettings.desiredRetirementIncome + 2000,
    };
    const { result, rerender } = renderHook(
      ({ settings }) =>
        useProjectionCalculations({
          settings,
          retirementIncomeDisplay: "annual",
          calculationEnabled: true,
        }),
      { initialProps: { settings: initialSettings } }
    );

    rerender({ settings: firstSettings });
    await waitFor(() =>
      expect(MockCalculationWorker.instances).toHaveLength(1)
    );
    const obsoleteWorker = MockCalculationWorker.instances[0];

    rerender({ settings: latestSettings });
    await waitFor(() =>
      expect(MockCalculationWorker.instances).toHaveLength(2)
    );
    const latestWorker = MockCalculationWorker.instances[1];
    expect(obsoleteWorker?.terminated).toBe(true);

    act(() => {
      obsoleteWorker?.emitMessage({
        ok: true,
        result: calculateRetirementPlan(firstSettings),
      });
    });
    expect(result.current.retirementPlanResult?.settings).toEqual(
      initialSettings
    );

    const latestPlan = calculateRetirementPlan(latestSettings);
    act(() => {
      latestWorker?.emitMessage({ ok: true, result: latestPlan });
    });
    expect(result.current.retirementPlanResult).toEqual(latestPlan);
    expect(result.current.isProjectionPending).toBe(false);
  });

  it("invalidates pending worker success when the caller clears calculation state", async () => {
    const settings = createFastSettings();
    const updatedSettings = {
      ...settings,
      desiredRetirementIncome: settings.desiredRetirementIncome + 1000,
    };
    const { result, rerender } = renderHook(
      ({ currentSettings, invalidationToken }) =>
        useProjectionCalculations({
          settings: currentSettings,
          retirementIncomeDisplay: "annual",
          calculationEnabled: true,
          invalidationToken,
        }),
      { initialProps: { currentSettings: settings, invalidationToken: 0 } }
    );

    rerender({ currentSettings: updatedSettings, invalidationToken: 0 });
    await waitFor(() =>
      expect(MockCalculationWorker.instances).toHaveLength(1)
    );
    const pendingWorker = MockCalculationWorker.instances[0];

    rerender({ currentSettings: updatedSettings, invalidationToken: 1 });

    expect(pendingWorker?.terminated).toBe(true);
    expect(result.current.retirementPlanResult).toBeNull();

    act(() => {
      pendingWorker?.emitMessage({
        ok: true,
        result: calculateRetirementPlan(updatedSettings),
      });
    });

    expect(result.current.retirementPlanResult).toBeNull();
  });

  it("clears a retained result when the caller resets calculation state", () => {
    const settings = createFastSettings();
    const initialPlan = calculateRetirementPlan(settings);
    const cache: RetirementPlanResultCache = new Map([
      [JSON.stringify(settings), initialPlan],
    ]);
    const { result, rerender } = renderHook(
      ({ calculationEnabled, invalidationToken }) =>
        useProjectionCalculations({
          settings,
          retirementIncomeDisplay: "annual",
          retirementPlanResultCache: cache,
          calculationEnabled,
          invalidationToken,
        }),
      { initialProps: { calculationEnabled: true, invalidationToken: 0 } }
    );

    expect(result.current.retirementPlanResult).toEqual(initialPlan);

    act(() => {
      result.current.clearCalculationState();
    });
    rerender({ calculationEnabled: false, invalidationToken: 1 });

    expect(result.current.retirementPlanResult).toBeNull();
  });

  it("does not calculate until calculation is enabled", async () => {
    const settings = createFastSettings();
    const cache: RetirementPlanResultCache = new Map();
    const { result, rerender } = renderHook(
      ({ calculationEnabled }) =>
        useProjectionCalculations({
          settings,
          retirementIncomeDisplay: "annual",
          retirementPlanResultCache: cache,
          calculationEnabled,
        }),
      { initialProps: { calculationEnabled: false } }
    );

    expect(result.current.retirementPlanResult).toBeNull();
    expect(result.current.isProjectionPending).toBe(false);
    expect(MockCalculationWorker.instances).toHaveLength(0);
    expect(cache).toHaveLength(0);

    rerender({ calculationEnabled: true });

    await waitFor(() =>
      expect(MockCalculationWorker.instances).toHaveLength(1)
    );
    expect(MockCalculationWorker.instances[0]?.messages).toEqual([settings]);
    expect(result.current.isProjectionPending).toBe(true);
  });

  it("shows an actionable error when worker and fallback calculation both fail, then recovers", async () => {
    const initialSettings = createFastSettings();
    const updatedSettings = {
      ...initialSettings,
      desiredRetirementIncome: initialSettings.desiredRetirementIncome + 1000,
    };
    const recoverySettings = {
      ...initialSettings,
      desiredRetirementIncome: initialSettings.desiredRetirementIncome + 2000,
    };
    const failingCache = new Map() as RetirementPlanResultCache;
    let cacheReads = 0;
    vi.spyOn(failingCache, "get").mockImplementation(() => {
      cacheReads += 1;
      if (cacheReads === 1) {
        return undefined;
      }

      throw new Error("cache unavailable");
    });
    const recoveryCache: RetirementPlanResultCache = new Map();
    const { result, rerender } = renderHook(
      ({ settings, cache }) =>
        useProjectionCalculations({
          settings,
          retirementIncomeDisplay: "annual",
          retirementPlanResultCache: cache,
          calculationEnabled: true,
        }),
      {
        initialProps: {
          settings: initialSettings,
          cache: recoveryCache,
        },
      }
    );

    rerender({ settings: updatedSettings, cache: failingCache });
    await waitFor(() =>
      expect(MockCalculationWorker.instances).toHaveLength(1)
    );

    act(() => {
      MockCalculationWorker.instances[0]?.emitError();
    });

    await waitFor(() => expect(result.current.calculationError).toBe(true));
    expect(result.current.retirementPlanResult).toBeNull();
    expect(result.current.isProjectionPending).toBe(false);

    rerender({ settings: recoverySettings, cache: recoveryCache });
    await waitFor(() =>
      expect(MockCalculationWorker.instances).toHaveLength(2)
    );
    const recoveredPlan = calculateRetirementPlan(recoverySettings);
    act(() => {
      MockCalculationWorker.instances[1]?.emitMessage({
        ok: true,
        result: recoveredPlan,
      });
    });

    expect(result.current.calculationError).toBe(false);
    expect(result.current.retirementPlanResult).toEqual(recoveredPlan);
  });

  it("retries a failed calculation when requested for the same settings", async () => {
    const initialSettings = createFastSettings();
    const updatedSettings = {
      ...initialSettings,
      desiredRetirementIncome: initialSettings.desiredRetirementIncome + 1000,
    };
    const failingCache = new Map() as RetirementPlanResultCache;
    let cacheReads = 0;
    vi.spyOn(failingCache, "get").mockImplementation(() => {
      cacheReads += 1;

      if (cacheReads === 2) {
        throw new Error("cache unavailable");
      }

      return undefined;
    });
    const { result, rerender } = renderHook(
      ({ settings, cache }) =>
        useProjectionCalculations({
          settings,
          retirementIncomeDisplay: "annual",
          retirementPlanResultCache: cache,
          calculationEnabled: true,
        }),
      {
        initialProps: {
          settings: initialSettings,
          cache: new Map() as RetirementPlanResultCache,
        },
      }
    );

    rerender({ settings: updatedSettings, cache: failingCache });
    expect(MockCalculationWorker.instances).toHaveLength(1);
    act(() => {
      MockCalculationWorker.instances[0]?.emitError();
    });

    await waitFor(() => expect(result.current.calculationError).toBe(true));

    act(() => {
      result.current.retryFailedCalculation();
    });

    await waitFor(() =>
      expect(MockCalculationWorker.instances).toHaveLength(2)
    );
    expect(MockCalculationWorker.instances[1]?.messages).toEqual([
      updatedSettings,
    ]);
  });

  it("runs deferred previews again after cache clearing and invalidation", async () => {
    const initialSettings = createFastSettings();
    const previewSettings = createPreviewSettings();
    const cache: RetirementPlanResultCache = new Map();
    const { result, rerender } = renderHook(
      ({ settings, invalidationToken }) =>
        useProjectionCalculations({
          settings,
          retirementIncomeDisplay: "annual",
          retirementPlanResultCache: cache,
          calculationEnabled: true,
          invalidationToken,
        }),
      { initialProps: { settings: initialSettings, invalidationToken: 0 } }
    );

    rerender({ settings: previewSettings, invalidationToken: 0 });
    await waitFor(() =>
      expect(MockCalculationWorker.instances).toHaveLength(1)
    );
    act(() => {
      MockCalculationWorker.instances[0]?.emitMessage({
        ok: true,
        result: calculateRetirementPlan(previewSettings, {
          includeTargetBasedWithdrawalPreviews: false,
        }),
      });
    });
    await waitFor(() =>
      expect(MockCalculationWorker.instances).toHaveLength(2)
    );
    act(() => {
      MockCalculationWorker.instances[1]?.emitMessage({
        ok: true,
        result: calculateRetirementPlan(previewSettings, {
          includeTargetBasedWithdrawalPreviews: true,
        }),
      });
    });
    await waitFor(() =>
      expect(result.current.targetBasedWithdrawalPreviews).toHaveLength(1)
    );

    const completedWorkerCount = MockCalculationWorker.instances.length;
    cache.clear();
    act(() => {
      result.current.clearCalculationState();
    });
    rerender({ settings: previewSettings, invalidationToken: 1 });
    await waitFor(() =>
      expect(MockCalculationWorker.instances.length).toBeGreaterThan(
        completedWorkerCount
      )
    );
    let latestWorker = MockCalculationWorker.instances.at(-1);

    if (!isFullPreviewRequest(latestWorker?.messages[0])) {
      act(() => {
        latestWorker?.emitMessage({
          ok: true,
          result: calculateRetirementPlan(previewSettings, {
            includeTargetBasedWithdrawalPreviews: false,
          }),
        });
      });
      await waitFor(() => {
        if (
          MockCalculationWorker.instances.length <=
          completedWorkerCount + 1
        ) {
          throw new Error("Expected another worker");
        }
      });
      latestWorker = MockCalculationWorker.instances.at(-1);
    }

    expect(isFullPreviewRequest(latestWorker?.messages[0])).toBe(true);
    expect(result.current.targetBasedWithdrawalPreviews).toHaveLength(0);
    await waitFor(() =>
      expect(result.current.isTargetBasedWithdrawalPreviewPending).toBe(true)
    );
  });

  it("restarts a cancelled deferred preview when Results is re-entered", async () => {
    const initialSettings = createFastSettings();
    const previewSettings = createPreviewSettings();
    const { result, rerender } = renderHook(
      ({ calculationEnabled, settings }) =>
        useProjectionCalculations({
          settings,
          retirementIncomeDisplay: "annual",
          calculationEnabled,
        }),
      {
        initialProps: {
          calculationEnabled: true,
          settings: initialSettings,
        },
      }
    );

    rerender({ calculationEnabled: true, settings: previewSettings });
    await waitFor(() =>
      expect(MockCalculationWorker.instances).toHaveLength(1)
    );
    act(() => {
      MockCalculationWorker.instances[0]?.emitMessage({
        ok: true,
        result: calculateRetirementPlan(previewSettings, {
          includeTargetBasedWithdrawalPreviews: false,
        }),
      });
    });

    await waitFor(() =>
      expect(MockCalculationWorker.instances).toHaveLength(2)
    );
    const cancelledPreviewWorker = MockCalculationWorker.instances[1];
    expect(isFullPreviewRequest(cancelledPreviewWorker?.messages[0])).toBe(
      true
    );
    await waitFor(() =>
      expect(result.current.isTargetBasedWithdrawalPreviewPending).toBe(true)
    );

    rerender({ calculationEnabled: false, settings: previewSettings });
    expect(cancelledPreviewWorker?.terminated).toBe(true);
    await waitFor(() =>
      expect(result.current.isTargetBasedWithdrawalPreviewPending).toBe(false)
    );

    rerender({ calculationEnabled: true, settings: previewSettings });
    await waitFor(() =>
      expect(MockCalculationWorker.instances).toHaveLength(3)
    );
    const replacementPreviewWorker = MockCalculationWorker.instances[2];
    expect(isFullPreviewRequest(replacementPreviewWorker?.messages[0])).toBe(
      true
    );

    const replacementPlan = calculateRetirementPlan(previewSettings, {
      includeTargetBasedWithdrawalPreviews: true,
    });
    act(() => {
      replacementPreviewWorker?.emitMessage({
        ok: true,
        result: replacementPlan,
      });
    });
    await waitFor(() =>
      expect(result.current.targetBasedWithdrawalPreviews).toHaveLength(1)
    );
    expect(result.current.isTargetBasedWithdrawalPreviewPending).toBe(false);

    act(() => {
      cancelledPreviewWorker?.emitMessage({
        ok: true,
        result: {
          ...replacementPlan,
          targetBasedWithdrawalPreviews: [],
        },
      });
    });
    expect(result.current.targetBasedWithdrawalPreviews).toHaveLength(1);
    expect(result.current.retirementPlanResult).toEqual(replacementPlan);
  });

  it("cancels a pending deferred preview when settings change", async () => {
    const initialSettings = createFastSettings();
    const firstPreviewSettings = createPreviewSettings();
    const latestPreviewSettings = {
      ...firstPreviewSettings,
      desiredRetirementIncome: firstPreviewSettings.desiredRetirementIncome + 1,
    };
    const { result, rerender } = renderHook(
      ({ settings }) =>
        useProjectionCalculations({
          settings,
          retirementIncomeDisplay: "annual",
          calculationEnabled: true,
        }),
      { initialProps: { settings: initialSettings } }
    );

    rerender({ settings: firstPreviewSettings });
    await waitFor(() =>
      expect(MockCalculationWorker.instances).toHaveLength(1)
    );
    act(() => {
      MockCalculationWorker.instances[0]?.emitMessage({
        ok: true,
        result: calculateRetirementPlan(firstPreviewSettings, {
          includeTargetBasedWithdrawalPreviews: false,
        }),
      });
    });
    await waitFor(() =>
      expect(MockCalculationWorker.instances).toHaveLength(2)
    );
    const obsoletePreviewWorker = MockCalculationWorker.instances[1];
    await waitFor(() =>
      expect(result.current.isTargetBasedWithdrawalPreviewPending).toBe(true)
    );

    rerender({ settings: latestPreviewSettings });
    await waitFor(() =>
      expect(MockCalculationWorker.instances).toHaveLength(3)
    );
    expect(obsoletePreviewWorker?.terminated).toBe(true);
    expect(result.current.isTargetBasedWithdrawalPreviewPending).toBe(false);

    act(() => {
      MockCalculationWorker.instances[2]?.emitMessage({
        ok: true,
        result: calculateRetirementPlan(latestPreviewSettings, {
          includeTargetBasedWithdrawalPreviews: false,
        }),
      });
    });
    await waitFor(() =>
      expect(MockCalculationWorker.instances).toHaveLength(4)
    );
    const latestPreviewWorker = MockCalculationWorker.instances[3];
    expect(isFullPreviewRequest(latestPreviewWorker?.messages[0])).toBe(true);

    const latestPreviewPlan = calculateRetirementPlan(latestPreviewSettings, {
      includeTargetBasedWithdrawalPreviews: true,
    });
    act(() => {
      latestPreviewWorker?.emitMessage({
        ok: true,
        result: latestPreviewPlan,
      });
      obsoletePreviewWorker?.emitMessage({
        ok: true,
        result: {
          ...latestPreviewPlan,
          settings: firstPreviewSettings,
          targetBasedWithdrawalPreviews: [],
        },
      });
    });

    await waitFor(() =>
      expect(result.current.targetBasedWithdrawalPreviews).toHaveLength(1)
    );
    expect(result.current.retirementPlanResult).toEqual(latestPreviewPlan);
    expect(result.current.isTargetBasedWithdrawalPreviewPending).toBe(false);
  });

  it("does not permanently complete a failed deferred preview and can retry it", async () => {
    const initialSettings = createFastSettings();
    const previewSettings = createPreviewSettings();
    const { result, rerender } = renderHook(
      ({ settings }) =>
        useProjectionCalculations({
          settings,
          retirementIncomeDisplay: "annual",
          calculationEnabled: true,
        }),
      { initialProps: { settings: initialSettings } }
    );

    rerender({ settings: previewSettings });
    await waitFor(() =>
      expect(MockCalculationWorker.instances).toHaveLength(1)
    );
    act(() => {
      MockCalculationWorker.instances[0]?.emitMessage({
        ok: true,
        result: calculateRetirementPlan(previewSettings, {
          includeTargetBasedWithdrawalPreviews: false,
        }),
      });
    });
    await waitFor(() =>
      expect(MockCalculationWorker.instances).toHaveLength(2)
    );
    act(() => {
      MockCalculationWorker.instances[1]?.emitMessage({
        ok: false,
        message: "preview failed",
      });
    });

    await waitFor(() =>
      expect(result.current.targetBasedWithdrawalPreviewError).toBe(true)
    );
    expect(result.current.targetBasedWithdrawalPreviews).toHaveLength(0);

    act(() => {
      result.current.retryTargetBasedWithdrawalPreviews();
    });

    await waitFor(() =>
      expect(MockCalculationWorker.instances).toHaveLength(3)
    );
  });
});

function isFullPreviewRequest(message: unknown) {
  return (
    typeof message === "object" &&
    message !== null &&
    "options" in message &&
    (
      message as {
        options?: { includeTargetBasedWithdrawalPreviews?: boolean };
      }
    ).options?.includeTargetBasedWithdrawalPreviews === true
  );
}
