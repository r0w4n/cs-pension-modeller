import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { resolveAppBaseHref } from "../app/app-base";
import { StaticPageLayout } from "./static-page-layout";
import "../index.css";

function PrivacyPage() {
  const appBaseHref = resolveAppBaseHref();

  return (
    <StaticPageLayout
      eyebrow="Civil Service Pensions"
      title="Privacy"
      lead="This modeller runs entirely in your browser."
      description="See what the modeller stores locally in your browser and what it does not collect or transmit."
    >
      <section>
        <h2>What we collect</h2>
        <p className="section-copy">
          There is no account system, and the modeller does not collect names,
          email addresses, pension identifiers, or the financial assumptions you
          enter.
        </p>
      </section>

      <section>
        <h2>What is stored on your device</h2>
        <p className="section-copy">
          The modeller uses your browser&apos;s local storage to remember your
          inputs, the selected mode, a few UI preferences, and any support
          prompt preference on this device only when local saving is enabled.
        </p>
        <p className="section-copy">
          You can manage this from the{" "}
          <a href={`${appBaseHref}settings/`}>Settings page</a>. Use Clear all
          data to remove saved data from this device, or turn off Save inputs on
          this device if you do not want the app to save anything locally.
        </p>
      </section>

      <section>
        <h2>Cookies and analytics</h2>
        <p className="section-copy">
          Google Analytics is only loaded if you accept analytics in the start
          dialog or turn it on later in Settings. Analytics events are limited
          to coarse interactions, such as selected journey, journey step,
          changed field identifier, comparison actions, chart control names, and
          support prompt impressions or action selections.
        </p>
        <p className="section-copy">
          The app does not send entered amounts, dates, ages, scenario names,
          pension identifiers, or calculated retirement income figures in
          analytics events. Support prompt analytics do not include payment
          details or the Stripe payment link.
        </p>
        <p className="section-copy">
          You can turn analytics off at any time from the Settings page.
        </p>
      </section>

      <section>
        <h2>Optional support prompt</h2>
        <p className="section-copy">
          If local saving is enabled, the app may store whether the voluntary
          support prompt has been snoozed, declined, or marked as already
          supported. Stripe is contacted only if you activate the support link
          and open the Stripe-hosted payment page. Payment information is
          handled by Stripe and is not collected or stored by the modeller.
        </p>
      </section>
    </StaticPageLayout>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PrivacyPage />
  </StrictMode>
);
