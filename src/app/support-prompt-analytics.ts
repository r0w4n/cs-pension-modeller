import { trackAnalyticsEvent } from "../analytics";

export const SUPPORT_PROMPT_ANALYTICS_EVENTS = {
  shown: "support_prompt_shown",
  paymentLinkSelected: "support_payment_link_selected",
  maybeLaterSelected: "support_prompt_maybe_later_selected",
  priorSupportSelected: "support_prior_support_selected",
  declineSelected: "support_prompt_decline_selected",
  dismissed: "support_prompt_dismissed",
  paymentReturned: "support_payment_returned",
} as const;

export type SupportPromptAnalyticsEvent =
  keyof typeof SUPPORT_PROMPT_ANALYTICS_EVENTS;

export function trackSupportPromptEvent(event: SupportPromptAnalyticsEvent) {
  // GA4 Enhanced Measurement is configured outside this repository. If outbound
  // click tracking is enabled there, Google may separately record the Stripe
  // Payment Link URL in addition to these parameter-free custom events.
  trackAnalyticsEvent(SUPPORT_PROMPT_ANALYTICS_EVENTS[event]);
}
