export const SUPPORT_PROMPT_DELAY_MS = 60_000;
export const SUPPORT_PROMPT_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
export const SUPPORT_PROMPT_DECLINE_MONTHS = 1;
export const SUPPORT_PROMPT_SUPPORTED_MONTHS = 6;
export const SUPPORT_PROMPT_DEBUG_SHOW_EVENT =
  "cs-pension-modeller:show-support-prompt";

export const SUPPORT_PAYMENT_LINK_URL =
  "https://buy.stripe.com/bJe00j5KM0tB1qd919fYY01";

export function getSupportPaymentLinkUrl() {
  return isValidSupportPaymentLinkUrl(SUPPORT_PAYMENT_LINK_URL)
    ? SUPPORT_PAYMENT_LINK_URL
    : null;
}

export function isValidSupportPaymentLinkUrl(url: string) {
  try {
    const parsedUrl = new URL(url);

    return (
      parsedUrl.protocol === "https:" &&
      parsedUrl.hostname === "buy.stripe.com" &&
      parsedUrl.pathname.length > 1
    );
  } catch {
    return false;
  }
}
