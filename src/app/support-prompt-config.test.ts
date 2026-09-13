import {
  SUPPORT_PAYMENT_LINK_URL,
  isValidSupportPaymentLinkUrl,
} from "./support-prompt-config";

describe("support prompt config", () => {
  it("exposes a valid HTTPS Stripe Payment Link", () => {
    expect(isValidSupportPaymentLinkUrl(SUPPORT_PAYMENT_LINK_URL)).toBe(true);
  });

  it("rejects missing, non-Stripe, and non-HTTPS support links", () => {
    expect(
      isValidSupportPaymentLinkUrl("<INSERT_DIRECT_STRIPE_PAYMENT_LINK>")
    ).toBe(false);
    expect(isValidSupportPaymentLinkUrl("http://buy.stripe.com/test")).toBe(
      false
    );
    expect(
      isValidSupportPaymentLinkUrl("https://js.stripe.com/v3/buy-button.js")
    ).toBe(false);
    expect(isValidSupportPaymentLinkUrl("https://example.com/support")).toBe(
      false
    );
  });
});
