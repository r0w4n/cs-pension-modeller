import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { StaticPageLayout } from "./static-page-layout";
import "../index.css";

function AboutPage() {
  return (
    <StaticPageLayout
      eyebrow="Civil Service"
      title="About"
      lead="A small, local-first modeller for exploring pension timing and retirement income."
      description="Learn what the Civil Service Pension Modeller does, how it stores data locally, and where it should be used cautiously."
    >
      <section>
        <h2>What it is</h2>
        <p className="section-copy">
          The Retirement Income Modeller helps you explore how different pension
          and savings assumptions can affect expected retirement income over
          time.
        </p>
      </section>

      <section>
        <h2>What it isn&apos;t</h2>
        <p className="section-copy">
          This tool is for planning and illustration only. It is not financial
          advice and is not affiliated with the Civil Service Pension Scheme,
          Capita, the Cabinet Office, or the Alpha Pension Scheme.
        </p>
      </section>

      <section>
        <h2>Your data</h2>
        <p className="section-copy">
          Settings are saved locally in your browser storage so you can return
          to the same assumptions later. Nothing is transmitted by the app.
        </p>
      </section>
    </StaticPageLayout>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AboutPage />
  </StrictMode>
);
