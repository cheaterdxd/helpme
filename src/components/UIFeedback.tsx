import { Loader2, AlertTriangle, Inbox } from "lucide-react";
import type { ReactNode } from "react";

type LoadingStateProps = {
  kicker?: string;
  title?: string;
  body?: string;
};

export function LoadingState({
  kicker = "Loading",
  title = "Preparing your context...",
  body = "HelpMe is reading database records and aligning with your AI assistant."
}: LoadingStateProps) {
  return (
    <section className="route-panel" data-active="true">
      <p className="block-label">{kicker}</p>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "12px", marginBottom: "8px" }}>
        <Loader2 className="animate-spin" style={{ color: "var(--accent)" }} size={24} />
        <h1 style={{ margin: 0 }}>{title}</h1>
      </div>
      <p style={{ color: "var(--muted)" }}>{body}</p>
    </section>
  );
}

type ErrorStateProps = {
  kicker?: string;
  title?: string;
  error?: string;
  onRetry?: () => void;
};

export function ErrorState({
  kicker = "Error",
  title = "Unable to load data.",
  error = "An unexpected error occurred while processing the request.",
  onRetry
}: ErrorStateProps) {
  return (
    <section className="route-panel" data-active="true">
      <p className="block-label">{kicker}</p>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "12px", marginBottom: "8px" }}>
        <AlertTriangle style={{ color: "var(--warning)" }} size={24} />
        <h1 style={{ margin: 0 }}>{title}</h1>
      </div>
      <p style={{ color: "var(--muted)", marginBottom: onRetry ? "16px" : 0 }}>{error}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          style={{
            minHeight: "36px",
            padding: "0 16px",
            borderRadius: "var(--radius)",
            background: "var(--accent)",
            color: "#ffffff",
            border: "none",
            fontWeight: 600,
            cursor: "pointer"
          }}
        >
          Retry request
        </button>
      )}
    </section>
  );
}

type EmptyStateProps = {
  title?: string;
  message?: string;
  icon?: ReactNode;
};

export function EmptyState({
  title = "No entries found.",
  message = "There are no items to display in this list.",
  icon = <Inbox size={32} style={{ color: "var(--soft)" }} />
}: EmptyStateProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
        textAlign: "center",
        border: "1px dashed var(--line)",
        borderRadius: "var(--radius)",
        background: "rgba(255, 253, 248, 0.4)",
        width: "100%"
      }}
    >
      <div style={{ marginBottom: "12px" }}>{icon}</div>
      <strong style={{ display: "block", color: "var(--ink)", fontSize: "15px", marginBottom: "4px" }}>
        {title}
      </strong>
      <span style={{ color: "var(--muted)", fontSize: "13px" }}>{message}</span>
    </div>
  );
}
