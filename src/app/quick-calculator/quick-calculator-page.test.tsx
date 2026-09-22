import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runQuickCalculatorScenarios } from "../../calculation/quick-calculator-scenarios";
import { createDefaultSettings } from "../../settings";
import {
  QUICK_CALCULATOR_STORAGE_KEY,
  saveQuickCalculatorState,
  type QuickCalculatorStoredInputs,
} from "./quick-calculator-storage";
import type {
  QuickCalculatorWorkerRequest,
  QuickCalculatorWorkerResponse,
} from "./quick-calculator-worker";
import { QuickCalculatorPage } from "./quick-calculator-page";

class ControlledWorker {
  static instances: ControlledWorker[] = [];
  request: QuickCalculatorWorkerRequest | undefined;
  terminated = false;
  private messageListeners = new Set<
    (event: MessageEvent<QuickCalculatorWorkerResponse>) => void
  >();
  private errorListeners = new Set<(event: Event) => void>();

  constructor() {
    ControlledWorker.instances.push(this);
  }

  addEventListener(type: string, listener: EventListener) {
    if (type === "message") {
      this.messageListeners.add(listener);
    } else if (type === "error") {
      this.errorListeners.add(listener);
    }
  }

  removeEventListener(type: string, listener: EventListener) {
    if (type === "message") {
      this.messageListeners.delete(listener);
    } else if (type === "error") {
      this.errorListeners.delete(listener);
    }
  }

  postMessage(request: QuickCalculatorWorkerRequest) {
    this.request = request;
  }

  terminate() {
    this.terminated = true;
  }

  respond() {
    if (!this.request) throw new Error("Worker request missing");
    const response: QuickCalculatorWorkerResponse = {
      ok: true,
      requestId: this.request.requestId,
      settingsSignature: this.request.settingsSignature,
      result: runQuickCalculatorScenarios({
        baseSettings: this.request.baseSettings,
        calculationDate: this.request.calculationDate,
        settingsSignature: this.request.settingsSignature,
      }),
    };
    for (const listener of this.messageListeners) {
      listener(new MessageEvent("message", { data: response }));
    }
  }

  fail() {
    for (const listener of this.errorListeners) listener(new Event("error"));
  }
}

function saveCompleteQuickState(
  overrides: Partial<QuickCalculatorStoredInputs> = {}
) {
  const defaults = createDefaultSettings();
  saveQuickCalculatorState({
    inputs: {
      dateOfBirth: "1987-06-01",
      alphaPensionAbsDate: "2025",
      accruedPensionAtLastAbs: 5_000,
      pensionableEarnings: 42_000,
      alphaPensionDrawAge: 60,
      alphaAddedPensionMonthly: 200,
      alphaAddedPensionFactorType: "self",
      partialRetirementStartAge: 55,
      partialRetirementWorkPercent: 50,
      showStatePension: true,
      currentStatePension: defaults.currentStatePension,
      statePensionForecastConfirmed: false,
      alphaEpaEnabled: false,
      alphaEpaPeriods: [],
      ...overrides,
    },
    completion: {
      dateOfBirth: true,
      accruedPensionAtLastAbs: true,
      pensionableEarnings: true,
      retirementAgeInitialised: true,
      partialRetirementAgeInitialised: true,
    },
  });
}

async function latestWorker() {
  await waitFor(() =>
    expect(ControlledWorker.instances.length).toBeGreaterThan(0)
  );
  const worker = ControlledWorker.instances.at(-1);
  if (!worker) throw new Error("Worker was not created");
  await waitFor(() => expect(worker.request).toBeDefined());
  return worker;
}

describe("QuickCalculatorPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem("cs-pension-modeller.acknowledgement", "v1");
    ControlledWorker.instances = [];
    vi.stubGlobal("Worker", ControlledWorker);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("starts required financial inputs unanswered and keeps estimates incomplete", () => {
    render(<QuickCalculatorPage />);

    expect(
      screen.getByRole("heading", { name: "Quick Alpha calculator" })
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Alpha pension on your statement (£ per year)")
    ).toHaveValue(null);
    expect(
      screen.getByLabelText("Pensionable earnings (£ per year) exact value")
    ).toHaveValue(null);
    expect(
      screen.getByText(
        /Complete birth date, accrued Alpha pension and pensionable earnings/
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Planning and illustration only/)
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Birth month and year month"), {
      target: { value: "06" },
    });
    expect(
      window.localStorage.getItem("cs-pension-quick-calculator")
    ).toBeNull();
  });

  it("shows shared advanced controls in the State Pension and EPA disclosure", () => {
    render(<QuickCalculatorPage />);

    fireEvent.click(screen.getByText("State Pension and EPA"));
    expect(
      screen.getByRole("checkbox", { name: /Include State Pension/ })
    ).toBeChecked();
    expect(
      screen.getByLabelText("State Pension forecast (£ per year)")
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("This is my personalised State Pension forecast")
    ).not.toBeChecked();
    expect(screen.getByLabelText("Add EPA")).not.toBeChecked();
  });

  it("resets only after the established destructive confirmation", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<QuickCalculatorPage />);

    fireEvent.click(
      screen.getByRole("button", { name: "Reset quick calculator" })
    );
    expect(confirm).toHaveBeenCalledWith(
      expect.stringContaining("removes only quick calculator inputs")
    );
    expect(
      screen.getByText("Quick calculator inputs were reset.")
    ).toBeInTheDocument();
  });

  it("reports a failed quick-storage removal without retaining in-memory results", async () => {
    saveCompleteQuickState();
    vi.spyOn(window.localStorage, "removeItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<QuickCalculatorPage />);
    const pending = await latestWorker();

    fireEvent.click(
      screen.getByRole("button", { name: "Reset quick calculator" })
    );
    expect(
      screen.getByText(
        /browser could not remove the saved quick calculator data/
      )
    ).toBeVisible();
    expect(pending.terminated).toBe(true);
    expect(
      screen.getByText(/Complete birth date, accrued Alpha pension/)
    ).toBeVisible();
  });

  it("suppresses stale and invalid estimates until the latest worker reply is current", async () => {
    saveCompleteQuickState();
    render(<QuickCalculatorPage />);
    const first = await latestWorker();
    const addedPension = screen.getByLabelText(
      "Monthly Added Pension payment (£ per month) exact value"
    );

    fireEvent.change(addedPension, { target: { value: "300" } });
    await waitFor(() => expect(first.terminated).toBe(true));
    act(() => first.respond());
    expect(screen.queryAllByRole("article")).toHaveLength(0);

    fireEvent.blur(addedPension);
    const second = await latestWorker();
    fireEvent.change(addedPension, { target: { value: "400" } });
    fireEvent.blur(addedPension);
    const third = await waitFor(() => {
      expect(ControlledWorker.instances.length).toBeGreaterThanOrEqual(3);
      return ControlledWorker.instances.at(-1)!;
    });
    act(() => second.respond());
    expect(screen.queryAllByRole("article")).toHaveLength(0);
    act(() => third.respond());
    await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(8));

    const retirementAge = screen.getByLabelText(
      "Selected retirement age exact value"
    );
    fireEvent.change(retirementAge, { target: { value: "60.2" } });
    fireEvent.keyDown(retirementAge, { key: "Enter" });
    expect(
      screen.getByText("Use whole years or 3, 6 or 9 months.")
    ).toBeVisible();
    expect(screen.queryAllByRole("article")).toHaveLength(0);

    fireEvent.change(retirementAge, { target: { value: "60.25" } });
    fireEvent.keyDown(retirementAge, { key: "Enter" });
    const corrected = await waitFor(() => {
      expect(ControlledWorker.instances.length).toBeGreaterThanOrEqual(4);
      return ControlledWorker.instances.at(-1)!;
    });
    act(() => corrected.respond());
    await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(8));
  });

  it("shows worker failure, retries, and terminates active work on unmount", async () => {
    saveCompleteQuickState();
    const view = render(<QuickCalculatorPage />);
    const failed = await latestWorker();
    act(() => failed.fail());
    expect(screen.getByRole("alert")).toHaveTextContent(
      "The estimates could not be calculated"
    );

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    const retry = await waitFor(() => {
      expect(ControlledWorker.instances.length).toBe(2);
      return ControlledWorker.instances[1];
    });
    act(() => retry.respond());
    await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(8));
    view.unmount();
    expect(retry.terminated).toBe(true);
  });

  it("applies an external quick reset even while a local draft is invalid", async () => {
    saveCompleteQuickState();
    render(<QuickCalculatorPage />);
    const pending = await latestWorker();
    const accrued = screen.getByLabelText(
      "Alpha pension on your statement (£ per year)"
    );
    fireEvent.change(accrued, { target: { value: "" } });
    fireEvent.blur(accrued);
    expect(accrued).toHaveValue(null);

    const oldValue = window.localStorage.getItem(QUICK_CALCULATOR_STORAGE_KEY);
    window.localStorage.removeItem(QUICK_CALCULATOR_STORAGE_KEY);
    void act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: QUICK_CALCULATOR_STORAGE_KEY,
          oldValue,
          newValue: null,
        })
      );
    });

    expect(screen.getByText(/reset in another open tab/)).toBeVisible();
    expect(accrued).toHaveValue(null);
    expect(
      screen.getByText(/Complete birth date, accrued Alpha pension/)
    ).toBeVisible();
    expect(pending.terminated).toBe(true);
    act(() => pending.respond());
    expect(screen.queryAllByRole("article")).toHaveLength(0);
    expect(
      window.localStorage.getItem(QUICK_CALCULATOR_STORAGE_KEY)
    ).toBeNull();
  });

  it("validates raw EPA dates and restores their errors after re-enabling EPA", async () => {
    saveCompleteQuickState({
      alphaEpaEnabled: true,
      alphaEpaPeriods: [
        {
          id: "epa-one",
          yearsBeforeNpa: 1,
          startDate: "2030-04-01",
          endDate: "2031-03-31",
        },
      ],
    });
    render(<QuickCalculatorPage />);
    const initial = await latestWorker();
    act(() => initial.respond());
    await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(8));

    fireEvent.click(screen.getByText("State Pension and EPA"));
    const startDate = screen.getByLabelText("EPA start date 1");
    fireEvent.change(startDate, { target: { value: "" } });
    expect(screen.getByText("Enter a valid EPA start date.")).toBeVisible();
    expect(screen.queryAllByRole("article")).toHaveLength(0);

    fireEvent.click(screen.getByLabelText("Add EPA"));
    const disabledWorker = await waitFor(() => {
      expect(ControlledWorker.instances.length).toBeGreaterThanOrEqual(2);
      return ControlledWorker.instances.at(-1)!;
    });
    act(() => disabledWorker.respond());
    await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(8));

    fireEvent.click(screen.getByLabelText("Add EPA"));
    expect(screen.getByText("Enter a valid EPA start date.")).toBeVisible();
    await waitFor(() =>
      expect(screen.queryAllByRole("article")).toHaveLength(0)
    );
    fireEvent.change(screen.getByLabelText("EPA start date 1"), {
      target: { value: "2030-04-01" },
    });
    const correctedWorker = await waitFor(() => {
      expect(ControlledWorker.instances.length).toBeGreaterThanOrEqual(3);
      return ControlledWorker.instances.at(-1)!;
    });
    act(() => correctedWorker.respond());
    await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(8));

    const endDate = screen.getByLabelText("EPA end date 1");
    fireEvent.change(endDate, { target: { value: "" } });
    expect(screen.getByText("Enter a valid EPA end date.")).toBeVisible();
    await waitFor(() =>
      expect(screen.queryAllByRole("article")).toHaveLength(0)
    );
  });

  it("gates an invalid State Pension draft only while that source is enabled", async () => {
    saveCompleteQuickState();
    render(<QuickCalculatorPage />);
    const initial = await latestWorker();
    act(() => initial.respond());
    await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(8));
    fireEvent.click(screen.getByText("State Pension and EPA"));
    const amount = screen.getByLabelText("State Pension forecast (£ per year)");
    fireEvent.change(amount, { target: { value: "-1" } });
    fireEvent.blur(amount);
    expect(amount).toHaveValue(-1);
    expect(screen.queryAllByRole("article")).toHaveLength(0);

    fireEvent.click(
      screen.getByRole("checkbox", { name: /Include State Pension/ })
    );
    const excludedWorker = await waitFor(() => {
      expect(ControlledWorker.instances.length).toBeGreaterThanOrEqual(2);
      return ControlledWorker.instances.at(-1)!;
    });
    act(() => excludedWorker.respond());
    await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(8));
    expect(amount).toHaveValue(-1);

    fireEvent.click(
      screen.getByRole("checkbox", { name: /Include State Pension/ })
    );
    await waitFor(() =>
      expect(screen.queryAllByRole("article")).toHaveLength(0)
    );
    expect(amount).toHaveValue(-1);
    fireEvent.change(amount, { target: { value: "12000" } });
    fireEvent.blur(amount);
    const corrected = await waitFor(() => {
      expect(ControlledWorker.instances.length).toBeGreaterThanOrEqual(3);
      return ControlledWorker.instances.at(-1)!;
    });
    act(() => corrected.respond());
    await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(8));
  });

  it("renders past normal-age variants unavailable while future selected variants remain", async () => {
    saveCompleteQuickState({
      dateOfBirth: "1959-06-01",
      alphaPensionAbsDate: "2026",
      alphaPensionDrawAge: 68,
    });
    render(<QuickCalculatorPage />);
    const worker = await latestWorker();
    act(() => worker.respond());

    await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(8));
    expect(screen.getAllByText("Estimate unavailable")).toHaveLength(4);
    expect(
      screen.getAllByText(/cannot reconstruct retirement already taken/)
    ).toHaveLength(4);
    expect(
      screen.getByRole("heading", { name: /At your selected age/ })
    ).toHaveTextContent("68 years");
  });

  it("does not replace a locally invalid draft with an external update", async () => {
    saveCompleteQuickState();
    render(<QuickCalculatorPage />);
    await latestWorker();
    fireEvent.click(screen.getByText("State Pension and EPA"));
    const amount = screen.getByLabelText("State Pension forecast (£ per year)");
    fireEvent.change(amount, { target: { value: "-1" } });
    fireEvent.blur(amount);

    const oldValue = window.localStorage.getItem(QUICK_CALCULATOR_STORAGE_KEY);
    saveCompleteQuickState({ currentStatePension: 14_000 });
    const newValue = window.localStorage.getItem(QUICK_CALCULATOR_STORAGE_KEY);
    void act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: QUICK_CALCULATOR_STORAGE_KEY,
          oldValue,
          newValue,
        })
      );
    });

    expect(amount).toHaveValue(-1);
    expect(screen.getByText("Enter 0 or more.")).toBeVisible();
  });
});
