export function ImportantInformationDialog({
  onContinue,
}: {
  onContinue: (analyticsConsentGranted: boolean) => void;
}) {
  return (
    <div
      className="app-dialog-overlay acknowledgement-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="acknowledgement-title"
    >
      <section className="app-dialog-card acknowledgement-card">
        <p className="eyebrow">Before you continue</p>
        <h2 id="acknowledgement-title">Important information</h2>
        <p className="section-copy">
          This modeller is for planning and illustration only. It is not
          financial advice and is not affiliated with the Civil Service Pension
          Scheme, Capita, the Cabinet Office, or the Alpha Pension Scheme.
        </p>
        <p className="section-copy">
          Results depend entirely on the assumptions you enter. Check important
          decisions against your official pension statement and, where
          appropriate, a regulated financial adviser.
        </p>
        <p className="section-copy">
          Your inputs are saved locally in your browser so you can come back to
          the same assumptions later. This site can use analytics to record
          coarse interaction events only, and no financial or personal inputs
          are sent. You can accept or decline analytics now and change that
          choice later in Settings.
        </p>
        <div className="acknowledgement-actions">
          <button
            type="button"
            className="primary-button"
            onClick={() => onContinue(true)}
          >
            Accept analytics and continue
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => onContinue(false)}
          >
            Continue without analytics
          </button>
        </div>
      </section>
    </div>
  );
}
