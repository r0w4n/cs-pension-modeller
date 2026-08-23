import type { FlexibleWithdrawalSummary } from "../result-projection/flexible-withdrawals";
import type { TargetBasedWithdrawalPreview } from "../calculation/target-based-withdrawal-previews";
import { formatCurrencyDetailed } from "../result-projection/formatting";
import type { FlexibleFundAccountId } from "../settings";

export function FlexibleWithdrawalInsightPanel({
  summary,
  previews,
  onApplyTargetBasedStrategy,
  onReviewStrategy,
}: {
  summary: FlexibleWithdrawalSummary;
  previews: TargetBasedWithdrawalPreview[];
  onApplyTargetBasedStrategy: (accountId: FlexibleFundAccountId) => void;
  onReviewStrategy: (accountId: FlexibleFundAccountId) => void;
}) {
  if (summary.accounts.length === 0) {
    return null;
  }

  const largestContributor = [...summary.accounts].sort(
    (first, second) =>
      second.reducibleGrossWithdrawal - first.reducibleGrossWithdrawal
  )[0];
  const firstAge = summary.affectedAges[0];
  const lastAge = summary.affectedAges.at(-1);

  return (
    <section
      className="flexible-withdrawal-insight"
      aria-labelledby="flexible-withdrawal-insight-title"
    >
      <div>
        <p className="eyebrow">Flexible-fund insight</p>
        <h3 id="flexible-withdrawal-insight-title">
          Your flexible withdrawals may be higher than needed
        </h3>
        <p>
          The current settings produce income above the selected target.
          Reducing these withdrawals could leave more money invested for later
          retirement. These are estimates, not a recommendation or a guaranteed
          outcome.
        </p>
      </div>

      <dl className="snapshot-list">
        <div>
          <dt>Potentially avoidable withdrawals</dt>
          <dd>
            {formatCurrencyDetailed(summary.totalReducibleGrossWithdrawal)}{" "}
            gross
          </dd>
        </div>
        <div>
          <dt>Estimated unspent income accumulated</dt>
          <dd>{formatCurrencyDetailed(summary.totalAvoidableNetSurplus)}</dd>
        </div>
        <div>
          <dt>Affected ages</dt>
          <dd>{firstAge === lastAge ? firstAge : `${firstAge}–${lastAge}`}</dd>
        </div>
        <div>
          <dt>Largest annual avoidable surplus</dt>
          <dd>
            {formatCurrencyDetailed(summary.largestAnnualAvoidableSurplus)}
          </dd>
        </div>
        <div>
          <dt>Largest contributor</dt>
          <dd>{largestContributor.label}</dd>
        </div>
      </dl>

      <p className="section-copy">
        Unspent income is shown as unallocated cash with no assumed growth. It
        is not silently placed back into an ISA, LISA, SIPP or Civil Service
        AVC.
      </p>

      <div className="flexible-withdrawal-account-insights">
        {summary.accounts.map((account) => {
          const preview = previews.find(
            (candidate) => candidate.accountId === account.accountId
          );
          const accountFirstAge = account.affectedAges[0];
          const accountLastAge = account.affectedAges.at(-1);

          return (
            <article key={account.accountId}>
              <h4>{account.label}</h4>
              <p>
                Approximately{" "}
                <strong>
                  {formatCurrencyDetailed(account.reducibleGrossWithdrawal)}{" "}
                  gross
                </strong>{" "}
                could be reduced between ages{" "}
                {accountFirstAge === accountLastAge
                  ? accountFirstAge
                  : `${accountFirstAge} and ${accountLastAge}`}
                .
              </p>
              {preview ? (
                <details>
                  <summary>Preview “Use to meet income target”</summary>
                  <dl className="snapshot-list">
                    <div>
                      <dt>Current projected withdrawals</dt>
                      <dd>
                        {formatCurrencyDetailed(
                          preview.currentGrossWithdrawals
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Target-based projected withdrawals</dt>
                      <dd>
                        {formatCurrencyDetailed(
                          preview.targetBasedGrossWithdrawals
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Current unallocated surplus</dt>
                      <dd>
                        {formatCurrencyDetailed(
                          preview.currentUnallocatedSurplus
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Target-based unallocated surplus</dt>
                      <dd>
                        {formatCurrencyDetailed(
                          preview.targetBasedUnallocatedSurplus
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Current ending balance</dt>
                      <dd>
                        {formatCurrencyDetailed(preview.currentEndingBalance)}
                      </dd>
                    </div>
                    <div>
                      <dt>Target-based ending balance</dt>
                      <dd>
                        {formatCurrencyDetailed(
                          preview.targetBasedEndingBalance
                        )}
                      </dd>
                    </div>
                  </dl>
                  <p className="section-copy">
                    This preview recalculates tax, later withdrawals, investment
                    growth, shortfalls and ending balances without changing the
                    saved scenario.
                  </p>
                </details>
              ) : null}
              <div className="flexible-withdrawal-insight-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => onReviewStrategy(account.accountId)}
                >
                  Review withdrawal strategy
                </button>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => onApplyTargetBasedStrategy(account.accountId)}
                >
                  Apply “Use to meet income target”
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
