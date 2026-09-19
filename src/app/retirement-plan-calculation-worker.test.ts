import { calculateRetirementPlan } from "../calculation/retirement-plan";
import { createDefaultSettings } from "../settings";
import type {
  RetirementPlanCalculationWorkerRequest,
  RetirementPlanCalculationWorkerResponse,
} from "./retirement-plan-calculation-worker";

type WorkerMessageListener = (
  event: MessageEvent<RetirementPlanCalculationWorkerRequest>
) => void;
type WorkerPostMessage = (
  response: RetirementPlanCalculationWorkerResponse
) => void;
type WorkerPostMessageMock = ReturnType<typeof vi.fn<WorkerPostMessage>>;

type LoadedWorker = {
  listener: WorkerMessageListener;
  postMessage: WorkerPostMessageMock;
  workerModule: typeof import("./retirement-plan-calculation-worker");
};

describe("normalizeWorkerRequest", () => {
  afterEach(() => {
    vi.doUnmock("../calculation/retirement-plan");
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it("treats legacy settings-only requests as fast calculations", async () => {
    const { workerModule } = await loadWorker();
    const settings = createDefaultSettings();

    expect(workerModule.normalizeWorkerRequest(settings)).toEqual({
      settings,
      options: { includeTargetBasedWithdrawalPreviews: false },
    });
  });

  it("preserves calculation options sent with structured requests", async () => {
    const { workerModule } = await loadWorker();
    const settings = createDefaultSettings();
    const request = {
      settings,
      options: { includeTargetBasedWithdrawalPreviews: true },
    };

    expect(workerModule.normalizeWorkerRequest(request)).toBe(request);
  });
});

describe("retirement plan calculation worker protocol", () => {
  afterEach(() => {
    vi.doUnmock("../calculation/retirement-plan");
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it("responds with a fast result for a legacy settings-only message", async () => {
    const { listener, postMessage } = await loadWorker();
    const settings = createDefaultSettings();

    listener({
      data: settings,
    } as MessageEvent<RetirementPlanCalculationWorkerRequest>);

    const response = getPostedResponse(postMessage);
    expectSuccessfulResponse(response);
    expect(response.result).toEqual(
      calculateRetirementPlan(settings, {
        includeTargetBasedWithdrawalPreviews: false,
      })
    );
    expect(response.result.targetBasedWithdrawalPreviews).toHaveLength(0);
  });

  it("responds with a full result when calculation options request previews", async () => {
    const { listener, postMessage } = await loadWorker();
    const settings = {
      ...createDefaultSettings(),
      showAlpha: false,
      showStatePension: false,
      showIsa: true,
      isaCurrentPot: 120_000,
      isaMonthlyContribution: 0,
      isaWithdrawalStrategy: "percentage" as const,
      isaWithdrawalPercent: 10,
      desiredRetirementIncome: 6_000,
    };

    listener({
      data: {
        settings,
        options: { includeTargetBasedWithdrawalPreviews: true },
      },
    } as MessageEvent<RetirementPlanCalculationWorkerRequest>);

    const response = getPostedResponse(postMessage);
    expectSuccessfulResponse(response);
    expect(
      response.result.targetBasedWithdrawalPreviews.length
    ).toBeGreaterThan(0);
  });

  it("responds with an actionable error when calculation throws", async () => {
    vi.doMock("../calculation/retirement-plan", async (importOriginal) => {
      const actual =
        await importOriginal<typeof import("../calculation/retirement-plan")>();

      return {
        ...actual,
        calculateRetirementPlan: vi.fn(() => {
          throw new Error("calculation exploded");
        }),
      };
    });
    const { listener, postMessage } = await loadWorker();
    const settings = createDefaultSettings();

    listener({
      data: {
        settings,
        options: { includeTargetBasedWithdrawalPreviews: true },
      },
    } as MessageEvent<RetirementPlanCalculationWorkerRequest>);

    const response = getPostedResponse(postMessage);
    expect(response.ok).toBe(false);
    if (response.ok) {
      throw new Error("Expected worker to post a calculation failure.");
    }
    expect(typeof response.message).toBe("string");
    expect(response.message).toBe("calculation exploded");
  });

  it("responds with an actionable error when request normalisation throws", async () => {
    const { listener, postMessage } = await loadWorker();

    listener({
      data: null as unknown as RetirementPlanCalculationWorkerRequest,
    } as MessageEvent<RetirementPlanCalculationWorkerRequest>);

    const response = getPostedResponse(postMessage);
    expect(response.ok).toBe(false);
    if (response.ok) {
      throw new Error("Expected worker to post a malformed-request failure.");
    }
    expect(typeof response.message).toBe("string");
  });
});

async function loadWorker(): Promise<LoadedWorker> {
  let listener: WorkerMessageListener | undefined;
  const postMessage = vi.fn<WorkerPostMessage>();

  vi.resetModules();
  vi.stubGlobal("self", {
    addEventListener: vi.fn(
      (type: string, candidate: WorkerMessageListener) => {
        if (type === "message") {
          listener = candidate;
        }
      }
    ),
    postMessage,
  });

  const workerModule = await import("./retirement-plan-calculation-worker");

  if (!listener) {
    throw new Error("Expected worker module to register a message listener.");
  }

  return { listener, postMessage, workerModule };
}

function getPostedResponse(
  postMessage: WorkerPostMessageMock
): RetirementPlanCalculationWorkerResponse {
  expect(postMessage).toHaveBeenCalledTimes(1);
  const response = postMessage.mock.calls[0]?.[0];

  if (!response) {
    throw new Error("Expected worker to post a response.");
  }

  return response;
}

function expectSuccessfulResponse(
  response: RetirementPlanCalculationWorkerResponse
): asserts response is Extract<
  RetirementPlanCalculationWorkerResponse,
  { ok: true }
> {
  expect(response.ok).toBe(true);

  if (!response.ok) {
    throw new Error("Expected worker to post a successful response.");
  }
}
