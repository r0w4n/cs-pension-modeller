import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { StaticPageLayout } from "./static-page-layout";
import "../index.css";

function PrivacyPage() {
  return (
    <StaticPageLayout
      eyebrow="Civil Service"
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
          inputs, the selected mode, and a few UI preferences on this device
          only.
        </p>
        <p className="section-copy">
          You can remove this at any time by clearing this site&apos;s storage
          in your browser settings.
        </p>
      </section>

      <section>
        <h2>Cookies and analytics</h2>
        <p className="section-copy">
          This site uses Google Analytics. Analytics events are limited to
          coarse interactions, such as selected journey, journey step, changed
          field identifier, comparison actions, and chart control names.
        </p>
        <p className="section-copy">
          The app does not send entered amounts, dates, ages, scenario names,
          pension identifiers, or calculated retirement income figures in
          analytics events.
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
