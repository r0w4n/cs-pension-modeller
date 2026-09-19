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
      [
        getRetirementPlanCacheKey(settings, {
          includeTargetBasedWithdrawalPreviews: false,
        }),
        initialPlan,
      ],
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

  it("shows an actionable error without stale results when worker construction and fallback calculation fail", async () => {
    const initialSettings = createFastSettings();
    const updatedSettings = {
      ...initialSettings,
      desiredRetirementIncome: initialSettings.desiredRetirementIncome + 1000,
    };
    const initialPlan = calculateRetirementPlan(initialSettings);
    const failingCache = createFallbackFailureCache({
      initialSettings,
      initialPlan,
      updatedSettings,
      shouldFailFallback: () => workerConstructionAttempted,
    });
    let workerConstructionAttempted = false;

    vi.stubGlobal(
      "Worker",
      class {
        constructor() {
          workerConstructionAttempted = true;
          throw new Error("worker unavailable");
        }
      }
    );
    const { result, rerender } = renderHook(
      ({ settings }) =>
        useProjectionCalculations({
          settings,
          retirementIncomeDisplay: "annual",
          retirementPlanResultCache: failingCache,
          calculationEnabled: true,
        }),
      { initialProps: { settings: initialSettings } }
    );

    expect(result.current.retirementPlanResult).toEqual(initialPlan);

    rerender({ settings: updatedSettings });

    await waitFor(() => expect(result.current.calculationError).toBe(true));
    expect(workerConstructionAttempted).toBe(true);
    expect(result.current.retirementPlanResult).toBeNull();
    expect(result.current.isProjectionPending).toBe(false);
  });

  it("uses the main-thread fallback successfully when worker construction fails", async () => {
    const initialSettings = createFastSettings();
    const updatedSettings = {
      ...initialSettings,
      desiredRetirementIncome: initialSettings.desiredRetirementIncome + 1000,
    };
    let workerConstructionAttempted = false;

    vi.stubGlobal(
      "Worker",
      class {
        constructor() {
          workerConstructionAttempted = true;
          throw new Error("worker unavailable");
        }
      }
    );
    const { result, rerender } = renderHook(
      ({ settings }) =>
        useProjectionCalculations({
          settings,
          retirementIncomeDisplay: "annual",
          calculationEnabled: true,
        }),
      { initialProps: { settings: initialSettings } }
    );

    rerender({ settings: updatedSettings });

    const fallbackPlan = calculateRetirementPlan(updatedSettings, {
      includeTargetBasedWithdrawalPreviews: false,
    });
    await waitFor(() =>
      expect(result.current.retirementPlanResult).toEqual(fallbackPlan)
    );
    expect(workerConstructionAttempted).toBe(true);
    expect(result.current.calculationError).toBe(false);
    expect(result.current.isProjectionPending).toBe(false);
  });

  it("shows an actionable error without stale results when worker postMessage and fallback calculation fail", async () => {
    const initialSettings = createFastSettings();
    const updatedSettings = {
      ...initialSettings,
      desiredRetirementIncome: initialSettings.desiredRetirementIncome + 1000,
    };
    const initialPlan = calculateRetirementPlan(initialSettings);
    const failingCache = createFallbackFailureCache({
      initialSettings,
      initialPlan,
      updatedSettings,
      shouldFailFallback: () => postMessageAttempted,
    });
    let postMessageAttempted = false;

    vi.stubGlobal(
      "Worker",
      class extends MockCalculationWorker {
        override postMessage(message: unknown) {
          postMessageAttempted = true;
          super.postMessage(message);
          throw new Error("worker send failed");
        }
      }
    );
    const { result, rerender } = renderHook(
      ({ settings }) =>
        useProjectionCalculations({
          settings,
          retirementIncomeDisplay: "annual",
          retirementPlanResultCache: failingCache,
          calculationEnabled: true,
        }),
      { initialProps: { settings: initialSettings } }
    );

    expect(result.current.retirementPlanResult).toEqual(initialPlan);

    rerender({ settings: updatedSettings });

    await waitFor(() => expect(result.current.calculationError).toBe(true));
    expect(postMessageAttempted).toBe(true);
    expect(result.current.retirementPlanResult).toBeNull();
    expect(result.current.isProjectionPending).toBe(false);
  });

  it("uses the main-thread fallback successfully when worker postMessage fails", async () => {
    const initialSettings = createFastSettings();
    const updatedSettings = {
      ...initialSettings,
      desiredRetirementIncome: initialSettings.desiredRetirementIncome + 1000,
    };
    let postMessageAttempted = false;

    vi.stubGlobal(
      "Worker",
      class extends MockCalculationWorker {
        override postMessage(message: unknown) {
          postMessageAttempted = true;
          super.postMessage(message);
          throw new Error("worker send failed");
        }
      }
    );
    const { result, rerender } = renderHook(
      ({ settings }) =>
        useProjectionCalculations({
          settings,
          retirementIncomeDisplay: "annual",
          calculationEnabled: true,
        }),
      { initialProps: { settings: initialSettings } }
    );

    rerender({ settings: updatedSettings });

    const fallbackPlan = calculateRetirementPlan(updatedSettings, {
      includeTargetBasedWithdrawalPreviews: false,
    });
    await waitFor(() =>
      expect(result.current.retirementPlanResult).toEqual(fallbackPlan)
    );
    expect(postMessageAttempted).toBe(true);
    expect(result.current.calculationError).toBe(false);
    expect(result.current.isProjectionPending).toBe(false);
  });

  it("retries a failed main calculation when Results is reopened", async () => {
    const initialSettings = createFastSettings();
    const updatedSettings = {
      ...initialSettings,
      desiredRetirementIncome: initialSettings.desiredRetirementIncome + 1000,
    };
    let firstFallbackShouldFail = false;
    const cache = new Map() as RetirementPlanResultCache;
    const updatedKey = getRetirementPlanCacheKey(updatedSettings, {
      includeTargetBasedWithdrawalPreviews: false,
    });
    vi.spyOn(cache, "get").mockImplementation((key: string) => {
      if (key === updatedKey && firstFallbackShouldFail) {
        firstFallbackShouldFail = false;
        throw new Error("fallback unavailable");
      }

      return undefined;
    });
    const { result, rerender } = renderHook(
      ({ settings, calculationEnabled }) =>
        useProjectionCalculations({
          settings,
          retirementIncomeDisplay: "annual",
          retirementPlanResultCache: cache,
          calculationEnabled,
        }),
      {
        initialProps: {
          settings: initialSettings,
          calculationEnabled: true,
        },
      }
    );

    rerender({ settings: updatedSettings, calculationEnabled: true });
    await waitFor(() =>
      expect(MockCalculationWorker.instances).toHaveLength(1)
    );
    act(() => {
      firstFallbackShouldFail = true;
      MockCalculationWorker.instances[0]?.emitMessage({
        ok: false,
        message: "calculation failed",
      });
    });
    await waitFor(() => expect(result.current.calculationError).toBe(true));

    rerender({ settings: updatedSettings, calculationEnabled: false });
    act(() => {
      result.current.retryFailedCalculation();
    });
    rerender({ settings: updatedSettings, calculationEnabled: true });

    await waitFor(() =>
      expect(MockCalculationWorker.instances).toHaveLength(2)
    );
    expect(MockCalculationWorker.instances[1]?.messages).toEqual([
      updatedSettings,
    ]);
    const recoveredPlan = calculateRetirementPlan(updatedSettings);
    act(() => {
      MockCalculationWorker.instances[1]?.emitMessage({
        ok: true,
        result: recoveredPlan,
      });
    });

    expect(result.current.calculationError).toBe(false);
    expect(result.current.retirementPlanResult).toEqual(recoveredPlan);
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

  it("clears retained results, preview state and pending preview work explicitly", async () => {
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
    const pendingPreviewWorker = MockCalculationWorker.instances[1];
    await waitFor(() =>
      expect(result.current.isTargetBasedWithdrawalPreviewPending).toBe(true)
    );

    act(() => {
      result.current.clearCalculationState();
    });

    await waitFor(() => expect(pendingPreviewWorker?.terminated).toBe(true));
    expect(result.current.retirementPlanResult).toBeNull();
    expect(result.current.targetBasedWithdrawalPreviews).toHaveLength(0);
    expect(result.current.isTargetBasedWithdrawalPreviewPending).toBe(false);
    expect(result.current.targetBasedWithdrawalPreviewError).toBe(false);

    act(() => {
      pendingPreviewWorker?.emitMessage({
        ok: true,
        result: calculateRetirementPlan(previewSettings, {
          includeTargetBasedWithdrawalPreviews: true,
        }),
      });
    });

    expect(result.current.retirementPlanResult).toBeNull();
    expect(result.current.targetBasedWithdrawalPreviews).toHaveLength(0);
  });

  it("invalidates retained results, preview state and pending preview work by token", async () => {
    const initialSettings = createFastSettings();
    const previewSettings = createPreviewSettings();
    const { result, rerender } = renderHook(
      ({ settings, invalidationToken }) =>
        useProjectionCalculations({
          settings,
          retirementIncomeDisplay: "annual",
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
    const invalidatedPreviewWorker = MockCalculationWorker.instances[1];
    await waitFor(() =>
      expect(result.current.isTargetBasedWithdrawalPreviewPending).toBe(true)
    );

    rerender({ settings: previewSettings, invalidationToken: 1 });

    await waitFor(() =>
      expect(invalidatedPreviewWorker?.terminated).toBe(true)
    );
    expect(result.current.retirementPlanResult).toBeNull();
    expect(result.current.targetBasedWithdrawalPreviews).toHaveLength(0);
    expect(result.current.isTargetBasedWithdrawalPreviewPending).toBe(false);
    expect(result.current.targetBasedWithdrawalPreviewError).toBe(false);

    act(() => {
      invalidatedPreviewWorker?.emitMessage({
        ok: true,
        result: calculateRetirementPlan(previewSettings, {
          includeTargetBasedWithdrawalPreviews: true,
        }),
      });
    });

    expect(result.current.retirementPlanResult).toBeNull();
    expect(result.current.targetBasedWithdrawalPreviews).toHaveLength(0);
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
    expect(result.current.calculationError).toBe(false);
    expect(result.current.retirementPlanResult?.settings).toEqual(
      previewSettings
    );
    expect(result.current.targetBasedWithdrawalPreviews).toHaveLength(0);

    act(() => {
      result.current.retryTargetBasedWithdrawalPreviews();
    });

    await waitFor(() =>
      expect(MockCalculationWorker.instances).toHaveLength(3)
    );
    const retryPreviewWorker = MockCalculationWorker.instances[2];
    expect(isFullPreviewRequest(retryPreviewWorker?.messages[0])).toBe(true);

    const retriedPlan = calculateRetirementPlan(previewSettings, {
      includeTargetBasedWithdrawalPreviews: true,
    });
    act(() => {
      retryPreviewWorker?.emitMessage({
        ok: true,
        result: retriedPlan,
      });
    });

    await waitFor(() =>
      expect(result.current.targetBasedWithdrawalPreviews).toHaveLength(1)
    );
    expect(result.current.targetBasedWithdrawalPreviewError).toBe(false);
    expect(result.current.isTargetBasedWithdrawalPreviewPending).toBe(false);
    expect(result.current.retirementPlanResult).toEqual(retriedPlan);
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

function createFallbackFailureCache({
  initialSettings,
  initialPlan,
  updatedSettings,
  shouldFailFallback,
}: {
  initialSettings: PensionSettings;
  initialPlan: ReturnType<typeof calculateRetirementPlan>;
  updatedSettings: PensionSettings;
  shouldFailFallback: () => boolean;
}): RetirementPlanResultCache {
  const cache = new Map() as RetirementPlanResultCache;
  const initialKey = getRetirementPlanCacheKey(initialSettings, {
    includeTargetBasedWithdrawalPreviews: false,
  });
  const updatedKey = getRetirementPlanCacheKey(updatedSettings, {
    includeTargetBasedWithdrawalPreviews: false,
  });

  vi.spyOn(cache, "get").mockImplementation((key: string) => {
    if (key === initialKey) {
      return initialPlan;
    }

    if (key === updatedKey && shouldFailFallback()) {
      throw new Error("fallback unavailable");
    }

    return undefined;
  });

  return cache;
}
