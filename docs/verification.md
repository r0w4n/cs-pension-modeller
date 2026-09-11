# Verification Record

This file records release-sensitive local verification that is not itself a
product feature or modelling assumption.

## 2026-09-10 Gherkin Integrity Remediation

The remediation is complete. The final state keeps Gherkin scenarios tied to
production domain, projection, settings and app-domain APIs, including the
local privacy lifecycle coverage for clearing data, disabling saving, editing
while saving is disabled, re-enabling saving and reloading without restoring
old settings or comparison scenarios.

Scenario counts changed from 366 example-expanded Gherkin scenarios across 229
scenario declarations to 352 example-expanded scenarios across 220 declarations.
The reduction is intentional: unsupported Premium salary-service, contribution
and optional-commutation examples were removed or consolidated around the
supported preserved-benefit input surface, while three local privacy lifecycle
scenarios were added. The generated Acceptance criteria page reports 352
executable scenarios and 0 scenarios under review.

Verification completed:

- `npm run check` passed in the prior verification with 875 Vitest tests and
  352 Gherkin scenarios.
- Focused Settings browser journeys passed in the prior verification.
- `npm run test:a11y -- --grep "Settings page|Acceptance criteria" --project=desktop-1440 --project=mobile-390`
  passed on 2026-09-10 with 4 Playwright axe checks across desktop and mobile.
- `npm run build` passed on 2026-09-10 and regenerated the Acceptance criteria
  data without leaving tracked changes.

The build still emits Vite's existing warning that some chunks exceed 500 kB
after minification. The relevant production output was:

- `render-app-CRj0BwNn.js`: 593.66 kB minified, 148.35 kB gzip.
- `retirement-plan-calculation-worker-Bja4Uj11.js`: 153.42 kB minified,
  37.61 kB gzip.
- `acceptance/index-BMelz5Pl.js`: 244.72 kB minified, 39.86 kB gzip.
- `helmet-CaiJFcbT.js`: 193.20 kB minified, 60.21 kB gzip.
- shared CSS: 53.51 kB minified, 9.64 kB gzip.

The warning does not indicate a concrete loading regression from this
remediation. The largest chunk is the interactive modeller shell and remains
about 148 kB over the wire when gzip-compressed; static pages are separately
chunked. No warning suppression or unrelated refactor was applied. A separate
performance follow-up would be justified if field data or production smoke
testing shows slow initial loading: investigate route-level code splitting for
the interactive modeller shell and keep the calculation worker isolated.

No temporary Playwright configuration or application behaviour change was kept.

## 2026-09-11 Consent And Generated-Artifact Remediation

Static pages now reuse the same stored analytics consent policy as the main
application. Direct navigation to footer pages, fresh visitors, rejected
consent, accepted consent, subsequent withdrawal, cleared data and disabled
local saving are covered by focused component checks. Production smoke tests
also build with `VITE_GA_MEASUREMENT_ID=G-TEST123` and intercept Google
Analytics and Google Tag Manager requests so the static-page consent path is
checked against the built artifact.

Acceptance-document generation now has a non-mutating drift check. `npm run check:acceptance`
compares the generated source with the tracked artifact and fails before build
if it is stale; `npm run generate:acceptance` remains the explicit update
command. CI runs the drift check before typecheck and build.

Verification completed:

- `node --version` reported `v22.23.1`, which is supported by `package.json`.
- `npm ci` restored locked direct dependency versions. The first sandboxed run
  failed with an npm internal exit-handler error; the approved rerun completed.
- `npm ls --depth=0` initially reported invalid direct packages and
  extraneous optional/transitive packages. After `npm ci`, removing the
  remaining locally extraneous optional runtime cluster from `node_modules`
  left `npm ls --depth=0` clean, with no `package-lock.json` diff.
- `npm run check` passed with 883 Vitest tests, 352 Gherkin scenarios and a
  production build.
- `npm run test:e2e` passed 24 Chromium Playwright tests across mobile and
  desktop projects.
- `npm run test:a11y` passed 26 Chromium axe checks across mobile and desktop
  projects.
- `npm run test:smoke:prod` passed 6 production-smoke tests across mobile and
  desktop projects.

Failure demonstrations:

- A temporary generated-artifact edit made `npm run check:acceptance` fail with
  the expected stale-artifact message, then the file was restored.
- A temporary static-page analytics regression that bypassed consent made the
  new static-page analytics component tests fail, then the file was restored.

Bundle and browser assessment:

- The build still emits Vite's existing large-chunk warning for the interactive
  modeller shell (`render-app-*.js`, about 517 kB minified and 134 kB gzip in
  this run). The static-page layout remains separately chunked and small. No
  warning suppression was added.
- The configured browser matrix remains Chromium at mobile and desktop
  viewport sizes. Firefox/WebKit coverage would improve browser breadth but
  should be weighed against CI runtime and maintenance cost before expanding
  the default matrix.

## 2026-09-11 Analytics Consent Withdrawal Test Closure

The production smoke test now serves a controlled local Google tag script stub
instead of aborting the loader. The stub drains queued `gtag` commands and
records subsequent commands emitted by the app while all other Google Analytics
and Google Tag Manager traffic remains blocked. This verifies the app's
commands only; it does not validate Google Analytics' internal consent runtime.

The smoke coverage now confirms that analytics does not initialise before
consent, accepted consent initialises the stub and emits an allowed page-view
event, consent withdrawal and clearing data both emit
`analytics_storage: "denied"`, and later navigation does not emit additional
tracking events after withdrawal or clearing.

The App settings unit test now starts from acknowledged accepted consent,
confirms analytics activation, clears mock history, then clicks "Clear all
data" and asserts that the clear-data action itself causes analytics shutdown.
This prevents initial render effects from satisfying the assertion.

Verification completed:

- Focused `npm run test -- src/App.test.tsx -t "clears all local storage data"`
  passed.
- Focused `npx playwright test e2e/production-smoke.spec.ts --config playwright.prod.config.ts --grep "gates analytics"`
  passed across the configured mobile and desktop Chromium projects after a
  production build with `VITE_GA_MEASUREMENT_ID=G-TEST123`.
- `npm run check` passed with formatting, lint, acceptance drift check,
  typecheck, 883 Vitest coverage tests, 352 Gherkin scenarios and a production
  build.
- `npm run test:smoke:prod` initially rebuilt successfully but the sandbox
  blocked the local preview server from binding to `127.0.0.1:4173`; the
  approved rerun passed all 6 production smoke checks across mobile and desktop
  Chromium projects.

Failure demonstrations:

- Temporarily removing the production `analytics_storage: "denied"` update in
  `disableAnalytics` made the focused production smoke test fail on the
  withdrawn-consent denial assertion, then the code was restored.
- Temporarily preventing the clear-data transition from calling
  `disableAnalytics` made the focused App unit test fail on the isolated
  shutdown assertion, then the code was restored.

Known limitations:

- The browser test uses a local command-recording script stub and deliberately
  blocks real analytics traffic. It proves the app emits, or stops emitting,
  the expected commands; it does not prove how Google's hosted script would
  process those commands internally.
- The build continues to emit Vite's existing large-chunk warning for the
  interactive modeller shell. No chunking change was part of this focused
  consent-test closure.
