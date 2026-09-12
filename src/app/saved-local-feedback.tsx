type SavedLocalFeedbackProps = {
  message?: string;
  role?: "status" | "alert";
  show: boolean;
};

export function SavedLocalFeedback({
  message = "Saved Locally",
  role = "status",
  show,
}: SavedLocalFeedbackProps) {
  if (!show) {
    return null;
  }

  return (
    <span
      className="saved-feedback"
      role={role}
      aria-live={role === "alert" ? "assertive" : "polite"}
    >
      {message}
    </span>
  );
}
