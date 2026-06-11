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
          Nothing is sent to a server by this app. There is no account system,
          and the modeller does not collect names, email addresses, or pension
          identifiers.
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
          This site does not set analytics cookies and does not include any
          analytics scripts.
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
