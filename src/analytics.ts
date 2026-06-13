type AnalyticsEventParameters = Record<
  string,
  string | number | boolean | undefined
>;

type GtagCommand =
  | ["consent", "default", AnalyticsEventParameters]
  | ["js", Date]
  | ["config", string, AnalyticsEventParameters]
  | ["event", string, AnalyticsEventParameters];

type GtagFunction = (...args: GtagCommand) => void;

declare global {
  interface Window {
    dataLayer?: GtagCommand[];
    gtag?: GtagFunction;
  }
}

const GA_SCRIPT_ID = "google-analytics-script";
const APP_EVENT_PARAMETERS = {
  app_name: "civil_service_pension_modeller",
  transport_type: "beacon",
};

export function getAnalyticsMeasurementId() {
  const env = import.meta.env as unknown as Record<string, unknown>;
  const measurementId = env.VITE_GA_MEASUREMENT_ID;

  return typeof measurementId === "string" ? measurementId.trim() : "";
}

export function isAnalyticsConfigured() {
  return getAnalyticsMeasurementId().length > 0;
}

export function initialiseAnalytics() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const measurementId = getAnalyticsMeasurementId();

  if (!measurementId || window.gtag) {
    return;
  }

  window.dataLayer = window.dataLayer ?? [];
  window.gtag = (...args) => {
    window.dataLayer?.push(args);
  };

  window.gtag("consent", "default", {
    ad_personalization: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    analytics_storage: "denied",
  });
  window.gtag("js", new Date());
  window.gtag("config", measurementId, {
    allow_ad_personalization_signals: false,
    allow_google_signals: false,
    anonymize_ip: true,
    send_page_view: false,
  });

  if (!document.getElementById(GA_SCRIPT_ID)) {
    const script = document.createElement("script");
    script.async = true;
    script.id = GA_SCRIPT_ID;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(
      measurementId
    )}`;
    document.head.appendChild(script);
  }
}

export function trackPageView(path?: string) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const pagePath = path ?? window.location.pathname;

  trackAnalyticsEvent("page_view", {
    page_location: `${window.location.origin}${pagePath}`,
    page_path: pagePath,
    page_title: document.title,
  });
}

export function trackAnalyticsEvent(
  eventName: string,
  parameters: AnalyticsEventParameters = {}
) {
  if (
    typeof window === "undefined" ||
    !isAnalyticsConfigured() ||
    !window.gtag
  ) {
    return;
  }

  window.gtag("event", eventName, {
    ...APP_EVENT_PARAMETERS,
    ...removeEmptyParameters(parameters),
  });
}

function removeEmptyParameters(parameters: AnalyticsEventParameters) {
  const cleanedParameters: AnalyticsEventParameters = {};

  for (const [key, value] of Object.entries(parameters)) {
    if (value !== undefined) {
      cleanedParameters[key] = value;
    }
  }

  return cleanedParameters;
}
