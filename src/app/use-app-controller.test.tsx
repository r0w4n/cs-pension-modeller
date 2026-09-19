import { act, renderHook, waitFor } from "@testing-library/react";
import {
  createComparisonResult,
  type ComparisonScenario,
} from "../result-projection/comparison-result";
import { calculateRetirementPlan } from "../calculation/retirement-plan";
import { createDefaultSettings, type PensionSettings } from "../settings";

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

  emitMessage(response: {
    ok: boolean;
    result?: ReturnType<typeof calculateRetirementPlan>;
    message?: string;
  }) {
    this.listeners
      .get("message")
      ?.forEach((listener) =>
        listener({ data: response } as MessageEvent<never>)
      );
  }
}

describe("useAppController calculation lifecycle", () => {
  beforeEach(() => {
    window.localStorage.clear();
    MockCalculationWorker.instances = [];
    vi.stubGlobal("Worker", MockCalculationWorker);
  });

  afterEach(() => {
    vi.doUnmock("../calculation/retirement-plan");
    vi.resetModules();
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it("retries a failed main calculation when Results is reopened through the controller", async () => {
    let fallbackShouldFail = false;
    vi.doMock("../calculation/retirement-plan", async (importOriginal) => {
      const actual =
        await importOriginal<typeof import("../calculation/retirement-plan")>();

      return {
        ...actual,
        calculateRetirementPlan: vi.fn(
          (
            settings: PensionSettings,
            options?: import("../calculation/retirement-plan").RetirementPlanCalculationOptions
          ) => {
            if (fallbackShouldFail) {
              fallbackShouldFail = false;
              throw new Error("calculation unavailable");
            }

            return actual.calculateRetirementPlan(settings, options);
          }
        ),
      };
    });

    const { useAppController } = await import("./use-app-controller");
    const { result } = renderHook(() => useAppController());
    const settingsBeforeFailure = result.current.settings;

    act(() => {
      result.current.onResultsStepActiveChange(true);
    });
    await waitFor(() =>
      expect(MockCalculationWorker.instances).toHaveLength(1)
    );
    act(() => {
      fallbackShouldFail = true;
      MockCalculationWorker.instances[0]?.emitMessage({
        ok: false,
        message: "worker failed",
      });
    });
    await waitFor(() =>
      expect(result.current.journeyStepViewModel.calculationError).toBe(true)
    );

    act(() => {
      result.current.onResultsStepActiveChange(false);
    });
    act(() => {
      result.current.onResultsStepActiveChange(true);
    });

    await waitFor(() =>
      expect(MockCalculationWorker.instances).toHaveLength(2)
    );
    expect(result.current.settings).toEqual(settingsBeforeFailure);
    act(() => {
      MockCalculationWorker.instances[1]?.emitMessage({
        ok: false,
        message: "worker failed again",
      });
    });

    await waitFor(() =>
      expect(result.current.journeyStepViewModel.calculationError).toBe(false)
    );
    expect(result.current.journeyStepViewModel.retirementPlanResult).toEqual(
      calculateRetirementPlan(settingsBeforeFailure, {
        includeTargetBasedWithdrawalPreviews: false,
      })
    );
    expect(result.current.settings).toEqual(settingsBeforeFailure);
  });

  it("clears the exposed comparison cache and scenarios through the production clear action", async () => {
    const { useAppController } = await import("./use-app-controller");
    const { result } = renderHook(() => useAppController());
    const settings = createDefaultSettings();
    const scenario: ComparisonScenario = {
      id: "scenario-1",
      name: "Scenario 1",
      settings,
      createdAt: "",
      updatedAt: "",
    };
    const comparisonResult = createComparisonResult(
      scenario,
      JSON.stringify(settings),
      calculateRetirementPlan(settings)
    );
    const {
      currentMatchesSaved: _currentMatchesSaved,
      scenario: _scenario,
      ...cachedResult
    } = comparisonResult;

    act(() => {
      result.current.comparisonResultCache.set(
        JSON.stringify(settings),
        cachedResult
      );
      result.current.setComparisonScenarios([scenario]);
    });

    expect(result.current.comparisonResultCache.size).toBe(1);
    expect(result.current.comparisonScenarios).toHaveLength(1);

    act(() => {
      result.current.clearAllData();
    });

    expect(result.current.comparisonResultCache.size).toBe(0);
    expect(result.current.comparisonScenarios).toHaveLength(0);
  });
});
