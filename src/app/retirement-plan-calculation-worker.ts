import {
  calculateRetirementPlan,
  type RetirementPlanCalculationOptions,
} from "../calculation/retirement-plan";
import type { PensionSettings } from "../settings";

export type RetirementPlanCalculationWorkerRequest =
  | PensionSettings
  | {
      settings: PensionSettings;
      options?: RetirementPlanCalculationOptions;
    };

export type RetirementPlanCalculationWorkerResponse =
  | {
      ok: true;
      result: ReturnType<typeof calculateRetirementPlan>;
    }
  | {
      ok: false;
      message: string;
    };

self.addEventListener(
  "message",
  (event: MessageEvent<RetirementPlanCalculationWorkerRequest>) => {
    try {
      const request = normalizeWorkerRequest(event.data);
      const response: RetirementPlanCalculationWorkerResponse = {
        ok: true,
        result: calculateRetirementPlan(request.settings, request.options),
      };
      self.postMessage(response);
    } catch (error) {
      const response: RetirementPlanCalculationWorkerResponse = {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "The retirement plan calculation failed.",
      };
      self.postMessage(response);
    }
  }
);

export function normalizeWorkerRequest(
  request: RetirementPlanCalculationWorkerRequest
) {
  if ("settings" in request) {
    return request;
  }

  return {
    settings: request,
    options: { includeTargetBasedWithdrawalPreviews: false },
  };
}
