import { act, renderHook, waitFor } from "@testing-library/react";
import { calculateRetirementPlan } from "../calculation/retirement-plan";
import { createDefaultSettings, type PensionSettings } from "../settings";
import type { RetirementPlanCalculationWorkerResponse } from "./retirement-plan-calculation-worker";
import { type RetirementPlanResultCache } from "./retirement-plan-result-cache";
import { useProjectionCalculations } from "./use-projection-calculations";

type WorkerListener = (event: MessageEvent<never>) => void;

class MockCalculationWorker {
  static instances: MockCalculationWorker[] = [];

  readonly messages: PensionSettings[] = [];
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

  postMessage(settings: PensionSettings) {
    this.messages.push(settings);
  }

  terminate() {
    this.terminated = true;
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
    expect(cache.get(JSON.stringify(updatedSettings))).toEqual(updatedPlan);
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
});
