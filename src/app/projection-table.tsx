import {
  startTransition,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ProjectionRow } from "../projection";
import type { PensionSettings } from "../settings";
import { useMobileDateDropdowns } from "./form-fields";

type ProjectionTableProps = {
  rows: ProjectionRow[];
  settings: PensionSettings;
};

type ProjectionTableSectionContainerProps = {
  children: ReactNode;
};

export type TableColumn = {
  key: string;
  label: string;
  width: string;
};

type ProjectionTableColumn = TableColumn & {
  setting?:
    | "showAlpha"
    | "showNuvos"
    | "showStatePension"
    | "showSipp"
    | "showIsa"
    | "taxationEnabled";
};

const projectionTableColumns: ProjectionTableColumn[] = [
  { key: "date", label: "Date", width: "7rem" },
  {
    key: "totalMonthlyNetIncome",
    label: "Total monthly income",
    width: "8rem",
  },
  {
    key: "monthlyIncomeTax",
    label: "Estimated monthly Income Tax",
    width: "8rem",
    setting: "taxationEnabled",
  },
  {
    key: "totalMonthlyIncomeBeforeTax",
    label: "Total monthly income before tax",
    width: "8rem",
    setting: "taxationEnabled",
  },
  { key: "age", label: "Age (years/months)", width: "7rem" },
  {
    key: "monthlyAddedPension",
    label: "Monthly Added Pension",
    width: "7rem",
    setting: "showAlpha",
  },
  {
    key: "lumpSumAddedPension",
    label: "Lump sum added pension",
    width: "7rem",
    setting: "showAlpha",
  },
  {
    key: "annualStandardAlphaPension",
    label: "Standard Alpha Pension",
    width: "8rem",
    setting: "showAlpha",
  },
  {
    key: "annualEpaAlphaPension",
    label: "EPA Alpha Pension",
    width: "8rem",
    setting: "showAlpha",
  },
  {
    key: "annualAccruedAlphaPension",
    label: "Annual Accrued Alpha Pension",
    width: "8rem",
    setting: "showAlpha",
  },
  {
    key: "annualAlphaPensionIncludingReduction",
    label: "Annual Alpha Pension Including Reduction",
    width: "9rem",
    setting: "showAlpha",
  },
  {
    key: "monthlyAlphaPensionGross",
    label: "Monthly Alpha pension before tax",
    width: "7rem",
    setting: "showAlpha",
  },
  {
    key: "annualNuvosPension",
    label: "Annual nuvos Pension",
    width: "8rem",
    setting: "showNuvos",
  },
  {
    key: "annualNuvosPensionIncludingReduction",
    label: "Annual nuvos Pension Including Reduction",
    width: "9rem",
    setting: "showNuvos",
  },
  {
    key: "monthlyNuvosPensionGross",
    label: "Monthly nuvos pension before tax",
    width: "7rem",
    setting: "showNuvos",
  },
  {
    key: "monthlyStatePension",
    label: "Monthly State pension",
    width: "6rem",
    setting: "showStatePension",
  },
  {
    key: "monthlySippPension",
    label: "Monthly SIPP pension",
    width: "7rem",
    setting: "showSipp",
  },
  {
    key: "sippPot",
    label: "SIPP balance",
    width: "7rem",
    setting: "showSipp",
  },
  {
    key: "monthlyIsaPension",
    label: "ISA",
    width: "7rem",
    setting: "showIsa",
  },
  {
    key: "isaPot",
    label: "ISA balance",
    width: "7rem",
    setting: "showIsa",
  },
] as const;

export function ProjectionTableSectionContainer({
  children,
}: ProjectionTableSectionContainerProps) {
  return <>{children}</>;
}

export function ProjectionTableSection({
  rows,
  settings,
}: ProjectionTableProps) {
  const [shouldRenderTable, setShouldRenderTable] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      startTransition(() => {
        setShouldRenderTable(true);
      });
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>Monthly pension projection table</h2>
        <p className="section-copy">
          The table is generated from the projection layer so each row stays
          traceable back to the modeller inputs and factor tables. It renders
          after the main results so the initial interaction stays responsive.
        </p>
      </div>

      {shouldRenderTable ? (
        <ProjectionTable rows={rows} settings={settings} />
      ) : (
        <p className="table-status" aria-live="polite">
          Preparing projection table...
        </p>
      )}
    </section>
  );
}

export function ProjectionTable({ rows, settings }: ProjectionTableProps) {
  const [showMilestonesOnly, setShowMilestonesOnly] = useState(true);
  const visibleColumns = projectionTableColumns.filter(
    (column) => !column.setting || settings[column.setting]
  );
  const visibleRows = showMilestonesOnly
    ? rows.filter((row) => row.milestones.length > 0)
    : rows;
  const milestoneRowCount = rows.filter(
    (row) => row.milestones.length > 0
  ).length;

  return (
    <ProjectionTableFrame
      columns={visibleColumns.map((column) => ({
        ...column,
        label: getProjectionTableColumnLabel(column, settings),
      }))}
      rows={visibleRows}
      emptyMessage="No projection rows are available for the current settings."
      getRowKey={(row) => row.date}
      getRowClassName={(row) =>
        row.milestones.length > 0
          ? "projection-row projection-row--milestone"
          : "projection-row"
      }
      getRowTitle={(row) =>
        row.milestones.length > 0 ? row.milestones.join(", ") : undefined
      }
      controls={
        <>
          <button
            type="button"
            className="secondary-button"
            aria-pressed={showMilestonesOnly}
            onClick={() => setShowMilestonesOnly((current) => !current)}
          >
            {showMilestonesOnly ? "Show all rows" : "Only show milestone rows"}
          </button>
          <p className="table-status">
            Showing {visibleRows.length} of {rows.length} rows
            {showMilestonesOnly ? ` (${milestoneRowCount} milestones)` : ""}.
          </p>
          <p className="table-status table-status--basis">
            {settings.projectionBasis === "real"
              ? "Projection basis: Real terms, today's money"
              : "Projection basis: Nominal terms, future inflated values"}
          </p>
        </>
      }
      renderCells={(row) =>
        visibleColumns.map((column) =>
          renderProjectionTableCell(row, column.key)
        )
      }
    />
  );
}

export function ProjectionTableFrame<Row>({
  columns,
  rows,
  emptyMessage,
  getRowKey,
  renderCells,
  getRowClassName,
  getRowTitle,
  controls,
  minWidth = "62rem",
}: {
  columns: TableColumn[];
  rows: Row[];
  emptyMessage: string;
  getRowKey: (row: Row, rowIndex: number) => string;
  renderCells: (row: Row, rowIndex: number) => ReactNode[];
  getRowClassName?: (row: Row, rowIndex: number) => string | undefined;
  getRowTitle?: (row: Row, rowIndex: number) => string | undefined;
  controls?: ReactNode;
  minWidth?: string;
}) {
  const headerScrollRef = useRef<HTMLDivElement | null>(null);
  const showMobileCards = useMobileDateDropdowns("(max-width: 640px)");

  const syncHeaderScroll = (scrollLeft: number) => {
    if (headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = scrollLeft;
    }
  };

  if (rows.length === 0) {
    return (
      <div className="table-shell">
        {controls ? <div className="table-controls">{controls}</div> : null}
        <p>{emptyMessage}</p>
      </div>
    );
  }

  if (showMobileCards) {
    return (
      <div className="table-shell">
        {controls ? <div className="table-controls">{controls}</div> : null}
        <div className="projection-mobile-cards projection-mobile-cards--active">
          {rows.map((row, rowIndex) => {
            const rowKey = getRowKey(row, rowIndex);
            const cells = renderCells(row, rowIndex);

            return (
              <article
                key={`${rowKey}-mobile`}
                className={`projection-mobile-card ${getRowClassName?.(row, rowIndex) ?? ""}`}
                title={getRowTitle?.(row, rowIndex)}
              >
                {cells.map((cell, cellIndex) => (
                  <div
                    key={`${rowKey}-mobile-${columns[cellIndex]?.key}`}
                    className="projection-mobile-card-row"
                  >
                    <span>{columns[cellIndex]?.label}</span>
                    <div className="projection-mobile-card-value">{cell}</div>
                  </div>
                ))}
              </article>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="table-shell">
      {controls ? <div className="table-controls">{controls}</div> : null}

      <div className="table-header-shell">
        <div className="table-header-scroll" ref={headerScrollRef}>
          <table
            className="projection-table projection-table--header"
            style={{ minWidth }}
            aria-hidden="true"
          >
            <colgroup>
              {columns.map((column) => (
                <col key={column.key} style={{ width: column.width }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column.key} scope="col">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
          </table>
        </div>
      </div>

      <div
        className="table-body-shell"
        tabIndex={0}
        aria-label="Scrollable monthly pension projection table"
        onScroll={(event) => syncHeaderScroll(event.currentTarget.scrollLeft)}
      >
        <table
          className="projection-table projection-table--body"
          style={{ minWidth }}
        >
          <colgroup>
            {columns.map((column) => (
              <col key={column.key} style={{ width: column.width }} />
            ))}
          </colgroup>
          <thead className="projection-table-sr-only">
            <tr>
              {columns.map((column) => (
                <th key={column.key} scope="col">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => {
              const rowKey = getRowKey(row, rowIndex);
              const cells = renderCells(row, rowIndex);

              return (
                <tr
                  key={rowKey}
                  className={getRowClassName?.(row, rowIndex)}
                  title={getRowTitle?.(row, rowIndex)}
                >
                  {cells.map((cell, cellIndex) => (
                    <td
                      key={`${rowKey}-${columns[cellIndex]?.key}`}
                      data-label={columns[cellIndex]?.label}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// eslint-disable-next-line sonarjs/cyclomatic-complexity
function renderProjectionTableCell(
  row: ProjectionRow,
  columnKey: ProjectionTableColumn["key"]
): ReactNode {
  switch (columnKey) {
    case "date":
      return (
        <ProjectionDateCell
          date={row.date}
          milestones={row.milestones}
          milestoneDates={row.milestoneDates}
        />
      );
    case "totalMonthlyNetIncome":
      return formatCurrencyDetailed(row.totalMonthlyNetIncome);
    case "monthlyIncomeTax":
      return formatCurrencyDetailed(row.monthlyIncomeTax);
    case "totalMonthlyIncomeBeforeTax":
      return formatCurrencyDetailed(row.totalMonthlyIncomeBeforeTax);
    case "age":
      return formatAge(row.age, row.ageMonths);
    case "monthlyAddedPension":
      return formatCurrencyDetailed(row.monthlyAddedPension);
    case "lumpSumAddedPension":
      return formatCurrencyDetailed(row.lumpSumAddedPension);
    case "annualStandardAlphaPension":
      return formatCurrencyDetailed(row.annualStandardAlphaPension);
    case "annualEpaAlphaPension":
      return formatCurrencyDetailed(row.annualEpaAlphaPension);
    case "annualAccruedAlphaPension":
      return formatCurrencyDetailed(row.annualAccruedAlphaPension);
    case "annualAlphaPensionIncludingReduction":
      return formatCurrencyDetailed(row.annualAlphaPensionIncludingReduction);
    case "monthlyAlphaPensionGross":
      return formatCurrencyDetailed(row.monthlyAlphaPensionGross);
    case "annualNuvosPension":
      return formatCurrencyDetailed(row.annualNuvosPension);
    case "annualNuvosPensionIncludingReduction":
      return formatCurrencyDetailed(row.annualNuvosPensionIncludingReduction);
    case "monthlyNuvosPensionGross":
      return formatCurrencyDetailed(row.monthlyNuvosPensionGross);
    case "monthlyStatePension":
      return formatCurrencyDetailed(row.monthlyStatePension);
    case "monthlySippPension":
      return formatCurrencyDetailed(row.monthlySippPension);
    case "sippPot":
      return formatCurrencyDetailed(row.sippPot);
    case "monthlyIsaPension":
      return formatCurrencyDetailed(row.monthlyIsaPension);
    case "isaPot":
      return formatCurrencyDetailed(row.isaPot);
    default:
      return "";
  }
}

function ProjectionDateCell({
  date,
  milestones,
  milestoneDates,
}: {
  date: string;
  milestones: string[];
  milestoneDates: string[];
}) {
  return (
    <div className="projection-date-cell">
      <span>{formatDate(milestoneDates[0] ?? date)}</span>
      {milestones.length > 0 ? (
        <span className="milestone-badges">
          {milestones.map((milestone: string) => (
            <span className="milestone-badge" key={`${date}-${milestone}`}>
              {milestone}
            </span>
          ))}
        </span>
      ) : null}
    </div>
  );
}

function getProjectionTableColumnLabel(
  column: ProjectionTableColumn,
  settings: PensionSettings
) {
  if (column.key === "totalMonthlyNetIncome") {
    return settings.taxationEnabled
      ? "Total monthly take-home income"
      : "Total monthly income before tax";
  }

  return column.label;
}

function formatDate(value: string) {
  if (!value) {
    return "Not set";
  }

  const parsed = new Date(`${value}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function formatCurrencyDetailed(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatAge(years: number, months: number) {
  return `${years}y ${months}m`;
}
