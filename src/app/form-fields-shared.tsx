import type { FieldDefinition } from "../fieldDefinitions";
import type { PensionValidationIssue } from "../settings";

export function getFieldCardClassName(
  disabled: boolean,
  hideOnMobile: boolean,
  hasValidationIssue = false
) {
  return [
    "field-card",
    disabled ? "field-card--disabled" : "",
    hideOnMobile ? "field-card--mobile-hidden" : "",
    hasValidationIssue ? "field-card--invalid" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function FieldLabel({
  field,
  showInfoLinks = true,
}: {
  field: FieldDefinition;
  showInfoLinks?: boolean;
}) {
  const infoUrl = "infoUrl" in field ? field.infoUrl : undefined;
  const infoLinkText = "infoLinkText" in field ? field.infoLinkText : undefined;
  const extraInfoLinks = "infoLinks" in field ? (field.infoLinks ?? []) : [];
  const infoLinks = showInfoLinks
    ? [
        ...(infoUrl
          ? [
              {
                href: infoUrl,
                text: infoLinkText ?? `More about ${field.label}`,
              },
            ]
          : []),
        ...extraInfoLinks,
      ]
    : [];

  return (
    <span className="field-label-group">
      <span className="field-label">{field.label}</span>
      {infoLinks.map((link) => (
        <a
          className="field-info-link"
          href={link.href}
          target="_blank"
          rel="noreferrer"
          key={`${link.href}-${link.text}`}
        >
          {link.text}
        </a>
      ))}
    </span>
  );
}

export function FieldHelp({
  field,
  showGuidanceNotes,
}: {
  field: FieldDefinition;
  showGuidanceNotes: boolean;
}) {
  const description = "description" in field ? field.description : undefined;

  return showGuidanceNotes && description ? (
    <p className="field-help">{description}</p>
  ) : null;
}

export function FieldValidationMessage({
  id,
  issue,
}: {
  id?: string;
  issue?: PensionValidationIssue;
}) {
  if (!issue || !id) {
    return null;
  }

  return (
    <p id={id} className="field-error">
      {issue.message}
    </p>
  );
}

export function FieldValidationMessages({
  id,
  issues,
}: {
  id?: string;
  issues: PensionValidationIssue[];
}) {
  if (!id || issues.length === 0) {
    return null;
  }

  return (
    <ul id={id} className="field-error-list">
      {issues.map((issue) => (
        <li key={`${issue.itemId ?? "field"}-${issue.message}`}>
          {issue.message}
        </li>
      ))}
    </ul>
  );
}
