import { trackAnalyticsEvent } from "../analytics";
import {
  SUPPORT_PROMPT_ANALYTICS_EVENTS,
  trackSupportPromptEvent,
  type SupportPromptAnalyticsEvent,
} from "./support-prompt-analytics";
import { SUPPORT_PAYMENT_LINK_URL } from "./support-prompt-config";

vi.mock("../analytics", () => ({
  trackAnalyticsEvent: vi.fn(),
}));

const SUPPORT_ANALYTICS_EVENT_KEYS = Object.keys(
  SUPPORT_PROMPT_ANALYTICS_EVENTS
) as SupportPromptAnalyticsEvent[];

describe("support prompt analytics", () => {
  beforeEach(() => {
    vi.mocked(trackAnalyticsEvent).mockClear();
  });

  it("emits each support prompt event through the shared analytics abstraction without parameters", () => {
    for (const eventKey of SUPPORT_ANALYTICS_EVENT_KEYS) {
      trackSupportPromptEvent(eventKey);
    }

    expect(trackAnalyticsEvent).toHaveBeenCalledTimes(
      SUPPORT_ANALYTICS_EVENT_KEYS.length
    );
    for (const eventName of Object.values(SUPPORT_PROMPT_ANALYTICS_EVENTS)) {
      expect(trackAnalyticsEvent).toHaveBeenCalledWith(eventName);
    }
  });

  it("keeps support event names coarse and free of Stripe or financial values", () => {
    expect(Object.values(SUPPORT_PROMPT_ANALYTICS_EVENTS)).toEqual([
      "support_prompt_shown",
      "support_payment_link_selected",
      "support_prompt_maybe_later_selected",
      "support_prior_support_selected",
      "support_prompt_decline_selected",
      "support_prompt_dismissed",
      "support_payment_returned",
    ]);

    const blockedValues = [
      SUPPORT_PAYMENT_LINK_URL,
      "buy.stripe.com",
      "stripe",
      "bJe00j",
      "£",
      "5",
      "payment-link",
    ];

    for (const eventName of Object.values(SUPPORT_PROMPT_ANALYTICS_EVENTS)) {
      for (const blockedValue of blockedValues) {
        expect(eventName.toLowerCase()).not.toContain(
          blockedValue.toLowerCase()
        );
      }
    }
  });
});
