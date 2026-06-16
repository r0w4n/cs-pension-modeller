import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { StaticPageLayout } from "./static-page-layout";
import "../index.css";

function AboutPage() {
  return (
    <StaticPageLayout
      eyebrow="Civil Service"
      title="About"
      lead="A local-first planning tool for exploring pension timing and retirement income scenarios."
      description="Learn what the Civil Service Pension Modeller does, what it can include, how it stores data locally, and where it should be used cautiously."
    >
      <section>
        <h2>What it is</h2>
        <p className="section-copy">
          The Civil Service Pension Modeller helps you compare how different
          assumptions could affect projected retirement income over time. It
          turns pension, savings, inflation, tax and retirement-timing inputs
          into charts, summaries, saved scenarios and month-by-month projection
          rows.
        </p>
      </section>

      <section>
        <h2>What it can include</h2>
        <p className="section-copy">
          A scenario can include Civil Service Alpha pension, nuvos pension,
          State Pension, SIPP and ISA bridge funding, partial retirement,
          simplified Income Tax, real or nominal projection values, and
          side-by-side scenario comparison.
        </p>
      </section>

      <section>
        <h2>What it isn&apos;t</h2>
        <p className="section-copy">
          This tool is for planning and illustration only. It is not financial
          advice and is not affiliated with the Civil Service Pension Scheme,
          Capita, the Cabinet Office, or the Alpha Pension Scheme.
        </p>
        <p className="section-copy">
          Results depend on the assumptions entered. Check important decisions
          against your official pension statement and seek regulated financial
          advice where appropriate.
        </p>
      </section>

      <section>
        <h2>Your data</h2>
        <p className="section-copy">
          By default, settings are saved locally in this browser so you can
          return to the same assumptions later. You can turn local saving off,
          export parameters, load parameters, or clear saved data from the
          Settings page.
        </p>
        <p className="section-copy">
          Analytics are only sent when configured for the site build, and are
          limited to coarse interaction events. Entered amounts, dates, ages,
          scenario names, pension identifiers, saved settings and calculated
          retirement income figures are not included in analytics events.
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
