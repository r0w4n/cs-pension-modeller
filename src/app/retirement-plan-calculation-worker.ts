import { calculateRetirementPlan } from "../calculation/retirement-plan";
import type { PensionSettings } from "../settings";

export type RetirementPlanCalculationWorkerResponse =
  | {
      ok: true;
      result: ReturnType<typeof calculateRetirementPlan>;
    }
  | {
      ok: false;
      message: string;
    };

self.addEventListener("message", (event: MessageEvent<PensionSettings>) => {
  try {
    const response: RetirementPlanCalculationWorkerResponse = {
      ok: true,
      result: calculateRetirementPlan(event.data),
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
});
