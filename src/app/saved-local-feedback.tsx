type SavedLocalFeedbackProps = {
  message?: string;
  show: boolean;
};

export function SavedLocalFeedback({
  message = "Saved Locally",
  show,
}: SavedLocalFeedbackProps) {
  if (!show) {
    return null;
  }

  return (
    <span className="saved-feedback" role="status" aria-live="polite">
      {message}
    </span>
  );
}
