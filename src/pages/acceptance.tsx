import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { acceptanceFeatures } from "../generated/acceptance-features";
import { StaticPageLayout } from "./static-page-layout";
import "../index.css";

type AcceptanceStatus = "covered" | "under-review";

type AcceptanceTableRow = {
  id: string;
  cells: readonly {
    id: string;
    value: string;
  }[];
};

type AcceptanceTable = readonly AcceptanceTableRow[];

type AcceptanceStep = {
  id: string;
  keyword: string;
  text: string;
  table?: AcceptanceTable;
  docString?: string;
};

type AcceptanceExample = {
  id: string;
  name: string;
  tags: readonly string[];
  status: AcceptanceStatus;
  table: AcceptanceTable;
};

type AcceptanceScenario = {
  id: string;
  keyword: string;
  name: string;
  description: string;
  tags: readonly string[];
  status: AcceptanceStatus;
  hasUnderReviewExamples: boolean;
  steps: readonly AcceptanceStep[];
  examples: readonly AcceptanceExample[];
};

type AcceptanceFeature = {
  path: string;
  name: string;
  description: string;
  tags: readonly string[];
  status: AcceptanceStatus;
  scenarios: readonly AcceptanceScenario[];
};

const features: readonly AcceptanceFeature[] = acceptanceFeatures;

const PUBLIC_STATUS_LABELS = {
  covered: "Covered by tests",
  "under-review": "Under review",
} as const;

const totalScenarios = features.reduce(
  (total, feature) => total + feature.scenarios.length,
  0
);

const coveredScenarios = features.reduce(
  (total, feature) =>
    total +
    feature.scenarios.filter((scenario) => scenario.status === "covered")
      .length,
  0
);

const underReviewScenarios = totalScenarios - coveredScenarios;

function statusLabel(status: keyof typeof PUBLIC_STATUS_LABELS) {
  return PUBLIC_STATUS_LABELS[status];
}

function formatTags(tags: readonly string[]) {
  return tags.length > 0 ? tags.join(" ") : "No tags";
}

function AcceptanceTableView({
  caption,
  table,
}: {
  caption: string;
  table: AcceptanceTable;
}) {
  const [header, ...rows] = table;

  if (!header) {
    return null;
  }

  return (
    <div className="acceptance-table-scroll">
      <table className="acceptance-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            {header.cells.map((cell) => (
              <th key={cell.id} scope="col">
                {cell.value}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {row.cells.map((cell) => (
                <td key={cell.id}>{cell.value}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ScenarioExamples({
  examples,
}: {
  examples: readonly AcceptanceExample[];
}) {
  if (examples.length === 0) {
    return null;
  }

  return (
    <div className="acceptance-examples">
      {examples.map((example) => (
        <section className="acceptance-example" key={example.id}>
          <h4>{example.name || "Examples"}</h4>
          <p className="section-copy">
            <span
              className={`acceptance-status acceptance-status--${example.status}`}
            >
              {statusLabel(example.status)}
            </span>
            <span className="acceptance-tags">{formatTags(example.tags)}</span>
          </p>
          <AcceptanceTableView
            caption={`${example.name || "Examples"} data`}
            table={example.table}
          />
        </section>
      ))}
    </div>
  );
}

function ScenarioDetails({ scenario }: { scenario: AcceptanceScenario }) {
  return (
    <details className="acceptance-scenario">
      <summary>
        <span>
          <span className="acceptance-scenario-keyword">
            {scenario.keyword}
          </span>{" "}
          {scenario.name}
        </span>
        <span
          className={`acceptance-status acceptance-status--${scenario.status}`}
        >
          {statusLabel(scenario.status)}
        </span>
      </summary>
      <div className="acceptance-scenario-body">
        {scenario.description ? (
          <p className="section-copy">{scenario.description}</p>
        ) : null}
        <p className="section-copy">
          <span className="acceptance-tags">{formatTags(scenario.tags)}</span>
          {scenario.hasUnderReviewExamples ? (
            <span className="acceptance-review-note">
              Some example rows are still under review.
            </span>
          ) : null}
        </p>
        <ol className="acceptance-steps">
          {scenario.steps.map((step) => (
            <li key={step.id}>
              <p>
                <strong>{step.keyword}</strong> {step.text}
              </p>
              {step.table ? (
                <AcceptanceTableView
                  caption={`${scenario.name} ${step.keyword} data`}
                  table={step.table}
                />
              ) : null}
              {step.docString ? (
                <pre className="section-copy formula-block">
                  {step.docString}
                </pre>
              ) : null}
            </li>
          ))}
        </ol>
        <ScenarioExamples examples={scenario.examples} />
      </div>
    </details>
  );
}

function FeatureSection({ feature }: { feature: AcceptanceFeature }) {
  const coveredCount = feature.scenarios.filter(
    (scenario) => scenario.status === "covered"
  ).length;
  const underReviewCount = feature.scenarios.length - coveredCount;

  return (
    <details className="acceptance-feature">
      <summary>
        <span>{feature.name}</span>
        <span className="acceptance-feature-count">
          {coveredCount} covered
          {underReviewCount > 0 ? `, ${underReviewCount} under review` : ""}
        </span>
      </summary>
      <div className="acceptance-feature-body">
        <p className="section-copy">{feature.description}</p>
        <p className="section-copy">
          <span className="acceptance-tags">{formatTags(feature.tags)}</span>
          <span className="acceptance-source">{feature.path}</span>
        </p>
        <div className="acceptance-scenario-list">
          {feature.scenarios.map((scenario) => (
            <ScenarioDetails
              key={`${feature.path}-${scenario.id}`}
              scenario={scenario}
            />
          ))}
        </div>
      </div>
    </details>
  );
}

export function AcceptancePage() {
  return (
    <StaticPageLayout
      eyebrow="Behaviour tests"
      title="Acceptance criteria"
      lead="These scenarios are the readable behaviour checks used to test the modeller. They describe what the model is expected to do, not a guarantee of pension outcomes."
      description="Read the behaviour scenarios used to check the Civil Service Pension Modeller."
    >
      <section>
        <h2>What this page shows</h2>
        <p className="section-copy">
          The criteria below are generated from the project&apos;s Gherkin
          feature files. They are included to make the model&apos;s tested
          behaviour easier to inspect alongside the public methodology.
        </p>
        <p className="section-copy">
          Scenarios marked as covered are included in the behaviour test suite.
          Items marked under review are retained as visible modelling questions
          or future acceptance criteria.
        </p>
      </section>

      <section className="acceptance-summary" aria-label="Acceptance summary">
        <p>
          <strong>{features.length}</strong> feature files
        </p>
        <p>
          <strong>{coveredScenarios}</strong> covered scenarios
        </p>
        <p>
          <strong>{underReviewScenarios}</strong> scenarios under review
        </p>
      </section>

      <section>
        <h2>Feature files</h2>
        <div className="acceptance-feature-list">
          {features.map((feature) => (
            <FeatureSection key={feature.path} feature={feature} />
          ))}
        </div>
      </section>
    </StaticPageLayout>
  );
}

const acceptanceRoot = document.getElementById("root");

if (acceptanceRoot) {
  createRoot(acceptanceRoot).render(
    <StrictMode>
      <AcceptancePage />
    </StrictMode>
  );
}
