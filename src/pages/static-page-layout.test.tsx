import { render } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import { saveLocalStoragePreference } from "../settings";
import {
  clearStoredAppPreferences,
  saveAnalyticsConsentState,
} from "../app/app-persistence";
import { StaticPageLayout } from "./static-page-layout";

vi.mock("../analytics", () => ({
  applyAnalyticsConsent: vi.fn((consentGranted: boolean) => consentGranted),
  trackPageView: vi.fn(),
}));

import { applyAnalyticsConsent, trackPageView } from "../analytics";

function renderStaticPage() {
  return render(
    <StaticPageLayout
      title="Privacy"
      lead="This modeller runs entirely in your browser."
    >
      <p>Static page body</p>
    </StaticPageLayout>
  );
}

describe("StaticPageLayout analytics", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.mocked(applyAnalyticsConsent).mockClear();
    vi.mocked(trackPageView).mockClear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("does not track a fresh visitor without stored analytics consent", () => {
    renderStaticPage();

    expect(applyAnalyticsConsent).toHaveBeenCalledWith(false);
    expect(trackPageView).not.toHaveBeenCalled();
  });

  it("does not track after analytics consent is rejected", () => {
    saveAnalyticsConsentState(false);

    renderStaticPage();

    expect(applyAnalyticsConsent).toHaveBeenCalledWith(false);
    expect(trackPageView).not.toHaveBeenCalled();
  });

  it("tracks direct static-page navigation after analytics consent is accepted", () => {
    saveAnalyticsConsentState(true);

    renderStaticPage();

    expect(applyAnalyticsConsent).toHaveBeenCalledWith(true);
    expect(trackPageView).toHaveBeenCalledTimes(1);
  });

  it("stops tracking after previously accepted consent is withdrawn", () => {
    saveAnalyticsConsentState(true);
    const { unmount } = renderStaticPage();
    unmount();
    vi.mocked(applyAnalyticsConsent).mockClear();
    vi.mocked(trackPageView).mockClear();

    saveAnalyticsConsentState(false);
    renderStaticPage();

    expect(applyAnalyticsConsent).toHaveBeenCalledWith(false);
    expect(trackPageView).not.toHaveBeenCalled();
  });

  it("does not track after clearing stored app preferences", () => {
    saveAnalyticsConsentState(true);
    clearStoredAppPreferences();

    renderStaticPage();

    expect(applyAnalyticsConsent).toHaveBeenCalledWith(false);
    expect(trackPageView).not.toHaveBeenCalled();
  });

  it("does not track when local saving is disabled", () => {
    saveAnalyticsConsentState(true);
    saveLocalStoragePreference(false);

    renderStaticPage();

    expect(applyAnalyticsConsent).toHaveBeenCalledWith(false);
    expect(trackPageView).not.toHaveBeenCalled();
  });
});
