import { afterEach, beforeEach, expect, it, vi } from "vitest";

function resetAnalyticsDom() {
  document.getElementById("google-analytics-script")?.remove();
  delete window.dataLayer;
  delete window.gtag;
}

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
  resetAnalyticsDom();
});

afterEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
  resetAnalyticsDom();
});

it("does not load Google Analytics without a measurement ID", async () => {
  const { initialiseAnalytics, trackAnalyticsEvent } =
    await import("./analytics");

  initialiseAnalytics();
  trackAnalyticsEvent("setting_changed", { field_id: "requirementAge" });

  expect(window.gtag).toBeUndefined();
  expect(window.dataLayer).toBeUndefined();
  expect(document.getElementById("google-analytics-script")).toBeNull();
});

it("loads Google Analytics with reporting enabled and advertising storage denied when configured", async () => {
  vi.stubEnv("VITE_GA_MEASUREMENT_ID", "G-TEST123");

  const { initialiseAnalytics, trackAnalyticsEvent } =
    await import("./analytics");

  initialiseAnalytics();
  trackAnalyticsEvent("setting_changed", {
    field_id: "desiredRetirementIncome",
    journey_mode: "simple",
  });

  const script = document.getElementById(
    "google-analytics-script"
  ) as HTMLScriptElement | null;

  expect(script?.src).toBe(
    "https://www.googletagmanager.com/gtag/js?id=G-TEST123"
  );
  expect(window.dataLayer).toEqual(
    expect.arrayContaining([
      [
        "consent",
        "default",
        expect.objectContaining({
          ad_personalization: "denied",
          ad_storage: "denied",
          ad_user_data: "denied",
          analytics_storage: "granted",
        }),
      ],
      [
        "config",
        "G-TEST123",
        expect.objectContaining({
          allow_ad_personalization_signals: false,
          allow_google_signals: false,
          anonymize_ip: true,
          send_page_view: false,
        }),
      ],
      [
        "event",
        "setting_changed",
        expect.objectContaining({
          app_name: "civil_service_pension_modeller",
          field_id: "desiredRetirementIncome",
          journey_mode: "simple",
          transport_type: "beacon",
        }),
      ],
    ])
  );
});
