import React from "react";

// Small shared UI kit so every page reads as one author (README §3, §9).

export const colors = {
  primary: "#2563eb",
  danger: "#ef4444",
  success: "#16a34a",
  warn: "#f59e0b",
  bg: "#f5f7fb",
  card: "#ffffff",
  border: "#e5e7eb",
  text: "#111827",
  muted: "#6b7280",
};

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: colors.card,
        borderRadius: 12,
        boxShadow: "0 2px 8px rgba(0,0,0,.08)",
        padding: 20,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "danger" | "ghost";
};

export function Button({ variant = "primary", style, disabled, ...rest }: ButtonProps) {
  const palette: Record<string, React.CSSProperties> = {
    primary: { background: colors.primary, color: "#fff", border: "none" },
    danger: { background: colors.danger, color: "#fff", border: "none" },
    ghost: { background: "#f3f4f6", color: colors.text, border: `1px solid ${colors.border}` },
  };
  return (
    <button
      disabled={disabled}
      style={{
        padding: "9px 16px",
        borderRadius: 8,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        ...palette[variant],
        ...style,
      }}
      {...rest}
    />
  );
}

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, color: colors.muted, padding: 24 }}>
      <span
        aria-hidden
        style={{
          width: 18,
          height: 18,
          border: `3px solid ${colors.border}`,
          borderTopColor: colors.primary,
          borderRadius: "50%",
          display: "inline-block",
          animation: "tm-spin 0.8s linear infinite",
        }}
      />
      <span role="status">{label}</span>
      <style>{`@keyframes tm-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div style={{ textAlign: "center", padding: 40, color: colors.muted }}>
      <p style={{ fontSize: 18, fontWeight: 600, color: colors.text, margin: 0 }}>{title}</p>
      {hint && <p style={{ marginTop: 8 }}>{hint}</p>}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      style={{ padding: 20, background: "#fef2f2", borderRadius: 10, color: "#b91c1c" }}
    >
      <p style={{ margin: 0, fontWeight: 600 }}>Something went wrong</p>
      <p style={{ marginTop: 6, marginBottom: onRetry ? 14 : 0 }}>{message}</p>
      {onRetry && (
        <Button variant="danger" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}

export function SkillTag({
  children,
  tone = "blue",
}: {
  children: React.ReactNode;
  tone?: "blue" | "green" | "red";
}) {
  const tones = {
    blue: { background: "#e5f0ff", color: colors.primary },
    green: { background: "#dcfce7", color: "#166534" },
    red: { background: "#fee2e2", color: "#991b1b" },
  };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 10px",
        borderRadius: 20,
        margin: 3,
        fontSize: 13,
        ...tones[tone],
      }}
    >
      {children}
    </span>
  );
}

export function ScorePill({ score }: { score: number }) {
  const bg = score >= 80 ? colors.success : score >= 60 ? colors.warn : colors.danger;
  return (
    <span style={{ background: bg, color: "#fff", padding: "6px 12px", borderRadius: 20, fontWeight: 700 }}>
      {score}% Match
    </span>
  );
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h1 style={{ margin: 0, fontSize: 26 }}>{title}</h1>
      {subtitle && <p style={{ marginTop: 6, color: colors.muted }}>{subtitle}</p>}
    </div>
  );
}
