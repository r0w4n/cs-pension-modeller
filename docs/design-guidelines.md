# Interface And Design Guidelines

Use this guide for material interface, journey, content-design, responsive, or
accessibility work. The existing product remains the primary visual and
interaction reference.

## Before Designing Or Building

- Inspect nearby screens and search for an equivalent component, control,
  status, or content pattern.
- Review desktop and narrow viewport presentations of the surrounding journey.
- Consider empty, entered, selected, disabled, validation, warning, and
  completed states where relevant.
- Identify existing design tokens, CSS custom properties, utility classes, and
  shared components before adding styles.
- Check whether a repeated change belongs in a shared component.
- Review relevant Gherkin scenarios, component tests, and browser journeys.

Prefer extending an established pattern when meaning and behaviour are
substantially the same. Do not force unlike concepts into one component merely
to maximise reuse.

## Visual Hierarchy And Structure

- Give each screen one clear purpose and one primary page heading.
- Keep heading levels semantic and sequential.
- Make the next required action visually clear without obscuring secondary
  actions.
- Use whitespace, typography, and grouping before adding backgrounds, borders,
  or cards.
- Keep related labels, controls, units, help text, validation, and consequences
  together.
- Present essential information first and progressively disclose advanced
  explanations.
- Avoid repeating the same heading, status, amount, or explanation nearby.
- Keep content order meaningful when columns or visual containers are removed.
- Use cards only when they communicate a genuine grouping or boundary.

## Layout, Typography, Colour, And Icons

- Reuse established content widths, grids, breakpoints, spacing, radii,
  alignment, type scale, weights, and line heights.
- Prefer predictable shared gaps over one-off margins or pixel values.
- Allow content to grow with browser zoom, larger text, realistic wrapping,
  validation messages, and long financial values.
- Avoid fixed content heights unless the behaviour requires them.
- Do not solve narrow-screen problems by shrinking text or controls below the
  accessible scale.
- Use existing semantic colour roles and tokens rather than near-match or
  hard-coded colours.
- Never rely on colour alone for status, selection, gain, loss, or risk.
- Reuse the existing icon style and prefer short text when it is clearer.
- Keep decorative imagery subordinate to pension inputs, assumptions, and
  results.

## Components And Interactions

- Reuse established buttons, links, fields, summaries, disclosures, tables,
  notices, and navigation patterns.
- Keep one primary action per decision area and preserve the established roles
  of secondary, back, cancel, reset, and destructive actions.
- Prefer native HTML controls and make interactive elements visibly
  interactive.
- Do not make an entire container clickable when a labelled link or button is
  more predictable.
- Preserve relevant hover, focus, active, selected, disabled, error, and loading
  states.
- Do not hide required actions behind hover, drag, precise pointer gestures, or
  unexplained icons.
- Keep the meaning and placement of Back, Continue, Save, Reset, and Start again
  consistent.
- Confirm destructive or difficult-to-reverse actions and explain what they
  remove.

## Forms And Questions

- Treat the existing settings form components as the default implementation
  pattern, not merely visual inspiration. When a new setting has an equivalent
  existing field type, reuse its field card, grid placement, label/header,
  help, validation, reset and responsive behaviour.
- Do not introduce a bespoke input, wrapper, or near-match styling for an
  equivalent field just to deliver a feature more quickly. A genuinely new
  interaction must have a clear user benefit, review its accessibility and
  maintenance impact, and have explicit user agreement before implementation.
- Ask plain-English questions and use labels describing the information needed,
  not internal model fields.
- Put units and tax or time bases next to entered values and repeat them in
  summaries.
- Use hint text for useful context, not to repair an unclear label.
- Mark optional questions explicitly.
- Choose controls based on the answer: radios for a small visible set,
  checkboxes for independent choices, selects for longer lists, and inputs for
  open values.
- Do not silently preselect financially material assumptions as if the user
  entered them.
- Preserve entered values when validation fails and put an actionable error by
  the affected control.
- Prevent impossible or contradictory values where practical and explain why a
  value cannot be used.
- Summarise consequential answers before results and provide an obvious way to
  change them.

## Financial Results And Content

- Give prominent amounts an unambiguous time and tax basis.
- Distinguish user inputs, defaults, model estimates, assumptions, and official
  statement figures.
- Do not make an estimate look more certain than its underlying data.
- Put the main outcome and its most important caveat before detailed charts or
  tables.
- Use consistent formatting and rounding for equivalent values.
- Pair charts with a text or tabular equivalent and use labels or patterns as
  well as colour.
- Explain empty, incomplete, unavailable, and zero values differently.
- Use calm, qualified status language and keep supporting assumptions easy to
  find.
- Write short, concrete UK English; explain unavoidable pension terms where
  they appear.
- Use action labels describing the result, such as “See my projection”, rather
  than vague labels such as “Submit”.
- Ensure links make sense out of context and identify official or external
  sources when relevant.

## Responsive And Accessible Behaviour

- Treat mobile and desktop as presentations of the same pattern, with the same
  meaning, priorities, and actions.
- Stack content in a logical reading order rather than squeezing desktop
  columns into narrow screens.
- Preserve keyboard order, accessible names, visible focus, error announcement,
  zoom, text enlargement, and reduced-motion preferences.
- Check text and essential control contrast, and keep touch targets comfortably
  usable.
- Move focus deliberately after journey navigation, validation summaries,
  dialogs, and dynamically revealed content.
- Do not use placeholders as labels or tooltips as the only source of essential
  information.
- Use semantic landmarks, lists, tables, fieldsets, legends, and live regions
  where they describe the interface accurately.
- Avoid animation unless it clarifies a state change; keep it subtle and supply
  a reduced-motion treatment.
- Make horizontal scrolling intentional and reserve it for content such as wide
  data tables that cannot be presented more clearly another way.

## Implementation And Review

- Keep visual values in tokens or shared styles rather than scattering one-off
  values through components.
- Add shared variants only for a clear semantic purpose and credible reuse.
- Name components and variants for meaning, not colour, position, or one screen.
- Keep visual changes scoped and do not redesign unrelated screens.
- When changing a shared pattern, review all uses and migrate them coherently or
  explain why staged migration is safer.
- Test realistic values, long content, errors, empty states, keyboard use,
  narrow screens, zoom, and relevant assistive-technology behaviour.
- Update component, journey, Gherkin, accessibility, and browser tests wherever
  observable behaviour changes.

A materially different pattern should have a concrete user benefit and an
explicitly considered consistency, accessibility, maintenance, and migration
impact. Agreement is required unless the user already requested that departure.
