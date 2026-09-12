import { useEffect, type ReactNode } from "react";
import {
  applyAnalyticsConsent,
  disableAnalytics,
  trackPageView,
} from "../analytics";
import { resolveAppBaseHref } from "../app/app-base";
import {
  ANALYTICS_CONSENT_STORAGE_KEY,
  loadAnalyticsConsentState,
} from "../app/app-persistence";
import { SiteFooter } from "../app/site-footer";
import { Helmet } from "../helmet";
import {
  LOCAL_DATA_RESET_SIGNAL_KEY,
  LOCAL_STORAGE_ENABLED_KEY,
} from "../settings";

type StaticPageLayoutProps = {
  eyebrow?: string;
  title: string;
  lead?: string;
  description?: string;
  children: ReactNode;
};

export function StaticPageLayout({
  eyebrow,
  title,
  lead,
  description,
  children,
}: StaticPageLayoutProps) {
  const appBaseHref = resolveAppBaseHref();

  return (
    <main className="app-shell">
      <Helmet>
        <title>{`${title} | Civil Service Pension Modeller`}</title>
        <meta
          name="description"
          content={description ?? lead ?? "Civil Service Pension Modeller"}
        />
      </Helmet>
      <StaticPageAnalytics />

      <section className="hero">
        <div className="hero-copy">
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h1>{title}</h1>
          {lead ? <p className="lead">{lead}</p> : null}
          <a className="static-backlink" href={appBaseHref}>
            Back to the modeller
          </a>
        </div>
      </section>

      <section className="panel static-panel">{children}</section>

      <SiteFooter />
    </main>
  );
}

function StaticPageAnalytics() {
  useEffect(() => {
    if (applyAnalyticsConsent(loadAnalyticsConsentState())) {
      trackPageView();
    }

    function handleStorage(event: StorageEvent) {
      if (
        event.key === LOCAL_DATA_RESET_SIGNAL_KEY ||
        event.key === null ||
        (event.key === LOCAL_STORAGE_ENABLED_KEY && event.newValue === "false")
      ) {
        disableAnalytics();
        return;
      }

      if (event.key === ANALYTICS_CONSENT_STORAGE_KEY) {
        if (event.newValue === "true") {
          if (applyAnalyticsConsent(true)) {
            trackPageView();
          }
          return;
        }

        disableAnalytics();
      }
    }

    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  return null;
}
