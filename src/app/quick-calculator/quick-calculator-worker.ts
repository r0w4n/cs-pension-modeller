import {
  runQuickCalculatorScenarios,
  type QuickCalculatorBatchResult,
} from "../../calculation/quick-calculator-scenarios";
import type { PensionSettings } from "../../settings";

export type QuickCalculatorWorkerRequest = {
  requestId: number;
  settingsSignature: string;
  calculationDate: string;
  baseSettings: PensionSettings;
};

export type QuickCalculatorWorkerResponse =
  | {
      ok: true;
      requestId: number;
      settingsSignature: string;
      result: QuickCalculatorBatchResult;
    }
  | {
      ok: false;
      requestId: number;
      settingsSignature: string;
      message: string;
    };

self.addEventListener(
  "message",
  (event: MessageEvent<QuickCalculatorWorkerRequest>) => {
    const request = event.data;
    try {
      const result = runQuickCalculatorScenarios({
        baseSettings: request.baseSettings,
        calculationDate: request.calculationDate,
        settingsSignature: request.settingsSignature,
      });
      const response: QuickCalculatorWorkerResponse = {
        ok: true,
        requestId: request.requestId,
        settingsSignature: request.settingsSignature,
        result,
      };
      self.postMessage(response);
    } catch {
      const response: QuickCalculatorWorkerResponse = {
        ok: false,
        requestId: request.requestId,
        settingsSignature: request.settingsSignature,
        message:
          "The estimates could not be calculated. Check your inputs and try again.",
      };
      self.postMessage(response);
    }
  }
);
