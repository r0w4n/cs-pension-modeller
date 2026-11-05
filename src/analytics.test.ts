import { afterEach, beforeEach, expect, it, vi } from "vitest";

function resetAnalyticsDom() {
  document.getElementById("google-analytics-script")?.remove();
  delete window.dataLayer;
  delete window.gtag;
  Reflect.deleteProperty(window, "ga-disable-G-TEST123");
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

it("keeps support prompt tracking disabled without analytics configuration", async () => {
  const { trackSupportPromptEvent } =
    await import("./app/support-prompt-analytics");

  trackSupportPromptEvent("paymentLinkSelected");

  expect(window.gtag).toBeUndefined();
  expect(window.dataLayer).toBeUndefined();
  expect(document.getElementById("google-analytics-script")).toBeNull();
});

it("loads Google Analytics with reporting enabled when configured", async () => {
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
  const dataLayer = window.dataLayer as Array<ArrayLike<unknown>> | undefined;
  const dataLayerCommands = dataLayer?.map((command): unknown[] =>
    Array.from(command)
  );

  expect(Object.prototype.toString.call(dataLayer?.[0])).toBe(
    "[object Arguments]"
  );
  expect(dataLayerCommands).toEqual(
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

it("does not load or track Google Analytics when configured without consent", async () => {
  vi.stubEnv("VITE_GA_MEASUREMENT_ID", "G-TEST123");

  const { applyAnalyticsConsent, trackAnalyticsEvent } =
    await import("./analytics");
  const { trackSupportPromptEvent } =
    await import("./app/support-prompt-analytics");

  expect(applyAnalyticsConsent(false)).toBe(false);
  trackAnalyticsEvent("setting_changed", { field_id: "requirementAge" });
  trackSupportPromptEvent("paymentReturned");

  expect(window.gtag).toBeUndefined();
  expect(window.dataLayer).toBeUndefined();
  expect(document.getElementById("google-analytics-script")).toBeNull();
});

it("loads Google Analytics through the shared consent policy", async () => {
  vi.stubEnv("VITE_GA_MEASUREMENT_ID", "G-TEST123");

  const { applyAnalyticsConsent } = await import("./analytics");

  expect(applyAnalyticsConsent(true)).toBe(true);
  expect(window.gtag).toBeTypeOf("function");
  expect(document.getElementById("google-analytics-script")).not.toBeNull();
});

it("disables Google Analytics after consent is withdrawn", async () => {
  vi.stubEnv("VITE_GA_MEASUREMENT_ID", "G-TEST123");

  const { disableAnalytics, initialiseAnalytics } = await import("./analytics");

  initialiseAnalytics();
  expect(window.gtag).toBeTypeOf("function");
  expect(document.getElementById("google-analytics-script")).not.toBeNull();

  disableAnalytics();

  expect(window.gtag).toBeUndefined();
  expect(window.dataLayer).toBeUndefined();
  expect(document.getElementById("google-analytics-script")).toBeNull();
});

it("sets the SDK opt-out before notifying an already loaded SDK of withdrawal", async () => {
  vi.stubEnv("VITE_GA_MEASUREMENT_ID", "G-TEST123");
  const { initialiseAnalytics, disableAnalytics } = await import("./analytics");
  initialiseAnalytics();
  const observations: unknown[] = [];
  window.gtag = vi.fn(() =>
    observations.push(Reflect.get(window, "ga-disable-G-TEST123"))
  );
  disableAnalytics();
  expect(observations).toEqual([true]);
  expect(Reflect.get(window, "ga-disable-G-TEST123")).toBe(true);
});

it("blocks retained SDK callbacks until consent is explicitly granted again", async () => {
  vi.stubEnv("VITE_GA_MEASUREMENT_ID", "G-TEST123");
  const { applyAnalyticsConsent } = await import("./analytics");
  const send = vi.fn();
  // Models an already loaded SDK checking Google's documented opt-out flag.
  const retainedSdkCallback = () => {
    if (Reflect.get(window, "ga-disable-G-TEST123") !== true) send();
  };
  applyAnalyticsConsent(true);
  retainedSdkCallback();
  expect(send).toHaveBeenCalledTimes(1);
  applyAnalyticsConsent(false);
  retainedSdkCallback();
  expect(send).toHaveBeenCalledTimes(1);
  applyAnalyticsConsent(true);
  retainedSdkCallback();
  expect(send).toHaveBeenCalledTimes(2);
});

it("keeps a script that executes late opted out and blocks new app events", async () => {
  vi.stubEnv("VITE_GA_MEASUREMENT_ID", "G-TEST123");
  const { applyAnalyticsConsent, trackAnalyticsEvent } =
    await import("./analytics");
  applyAnalyticsConsent(true);
  applyAnalyticsConsent(false);
  // Removing a script element cannot prevent already fetched code from running.
  const lateSdk = vi.fn();
  window.gtag = lateSdk;
  trackAnalyticsEvent("setting_changed");
  expect(lateSdk).not.toHaveBeenCalled();
  expect(Reflect.get(window, "ga-disable-G-TEST123")).toBe(true);
  applyAnalyticsConsent(true);
  expect(lateSdk).toHaveBeenCalledWith(
    "consent",
    "update",
    expect.objectContaining({ analytics_storage: "granted" })
  );
  trackAnalyticsEvent("setting_changed");
  expect(lateSdk).toHaveBeenCalledWith(
    "event",
    "setting_changed",
    expect.any(Object)
  );
});

it("clears retained queued events on withdrawal rather than replaying them on re-consent", async () => {
  vi.stubEnv("VITE_GA_MEASUREMENT_ID", "G-TEST123");
  const { applyAnalyticsConsent, trackAnalyticsEvent } =
    await import("./analytics");
  applyAnalyticsConsent(true);
  trackAnalyticsEvent("before_withdrawal");
  const retainedQueue = window.dataLayer;
  expect(retainedQueue?.length).toBeGreaterThan(0);
  applyAnalyticsConsent(false);
  expect(retainedQueue).toHaveLength(0);
  trackAnalyticsEvent("while_withdrawn");
  applyAnalyticsConsent(true);
  const events = window.dataLayer
    ?.map((command): unknown[] => Array.from(command))
    .filter((command) => command[0] === "event");
  expect(events).toEqual([]);
});

it("sets opt-out even when the SDK and its globals are absent", async () => {
  vi.stubEnv("VITE_GA_MEASUREMENT_ID", "G-TEST123");
  const { disableAnalytics } = await import("./analytics");
  disableAnalytics();
  expect(Reflect.get(window, "ga-disable-G-TEST123")).toBe(true);
  expect(window.gtag).toBeUndefined();
  expect(document.getElementById("google-analytics-script")).toBeNull();
});
