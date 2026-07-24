import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../services/api";
import { useApi } from "../hooks/useApi";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  ScorePill,
  SkillTag,
  Spinner,
  colors,
} from "../components/ui";
import ConfirmDialog from "../components/ConfirmDialog";

type Position = {
  id: string;
  title: string;
  required_skills: string[];
  min_experience: number;
  location: string;
  remote: boolean;
};
type Match = {
  candidateId: number;
  name: string;
  email: string;
  seniority: string;
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  why: string[];
};
type Payload = { position: Position; matches: Match[] };
type SendResult = { sent: number; skipped: number; failed: number };

export default function PositionDetailPage() {
  const { id } = useParams();
  const { data, loading, error, reload } = useApi<Payload>(`/positions/${id}/matches`);

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  function toggle(candidateId: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(candidateId) ? next.delete(candidateId) : next.add(candidateId);
      return next;
    });
  }

  function toggleAll(matches: Match[]) {
    setSelected((prev) =>
      prev.size === matches.length ? new Set() : new Set(matches.map((m) => m.candidateId))
    );
  }

  async function doSend() {
    if (sending) return; // guard against double-submit
    setSending(true);
    setSendError(null);
    try {
      const res = await api.post<SendResult>("/emails/send", {
        candidateIds: Array.from(selected),
        positionId: id,
      });
      setResult(res.data);
      setSelected(new Set());
      setConfirmOpen(false);
    } catch (err: any) {
      setSendError(err?.response?.data?.error ?? "Failed to send emails.");
      setConfirmOpen(false);
    } finally {
      setSending(false);
    }
  }

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <EmptyState title="Position not found" />;

  const { position, matches } = data;

  return (
    <div>
      <Link to="/positions" style={{ color: colors.muted, textDecoration: "none" }}>
        ← Back to positions
      </Link>

      <PageHeader
        title={position.title}
        subtitle={`${position.location}${position.remote ? " · Remote" : ""} · ${position.min_experience}+ yrs`}
      />

      <Card style={{ marginBottom: 20 }}>
        <div style={{ color: colors.muted, fontSize: 13, marginBottom: 6 }}>Required skills</div>
        <div>{position.required_skills?.map((s) => <SkillTag key={s}>{s}</SkillTag>)}</div>
      </Card>

      {result && (
        <div
          role="status"
          style={{ padding: 14, borderRadius: 10, background: "#f0fdf4", color: "#166534", marginBottom: 16 }}
        >
          <strong>Emails processed.</strong> {result.sent} sent · {result.failed} failed ·{" "}
          {result.skipped} skipped (already sent).
        </div>
      )}
      {sendError && (
        <div style={{ marginBottom: 16 }}>
          <ErrorState message={sendError} />
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <h2 style={{ fontSize: 20, margin: 0 }}>Ranked candidates ({matches.length})</h2>
        <div style={{ display: "flex", gap: 10 }}>
          <Button variant="ghost" onClick={() => toggleAll(matches)} disabled={matches.length === 0}>
            {selected.size === matches.length && matches.length > 0 ? "Clear all" : "Select all"}
          </Button>
          <Button onClick={() => setConfirmOpen(true)} disabled={selected.size === 0 || sending}>
            Email selected ({selected.size})
          </Button>
        </div>
      </div>

      {matches.length === 0 && (
        <EmptyState title="No candidates yet" hint="Upload candidates to rank them for this role." />
      )}

      {matches.map((m) => (
        <Card key={m.candidateId} style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <input
              type="checkbox"
              aria-label={`Select ${m.name}`}
              checked={selected.has(m.candidateId)}
              onChange={() => toggle(m.candidateId)}
              style={{ width: 18, height: 18 }}
            />
            <div style={{ flex: 1 }}>
              <Link to={`/candidates/${m.candidateId}`} style={{ textDecoration: "none", color: "inherit" }}>
                <strong>{m.name}</strong>
              </Link>
              <span style={{ color: colors.muted }}> · {m.seniority} · {m.email}</span>
              <div style={{ marginTop: 6 }}>
                {m.matchedSkills.map((s) => (
                  <SkillTag key={s} tone="green">
                    {s}
                  </SkillTag>
                ))}
                {m.missingSkills.map((s) => (
                  <SkillTag key={s} tone="red">
                    {s}
                  </SkillTag>
                ))}
              </div>
            </div>
            <ScorePill score={m.score} />
          </div>
        </Card>
      ))}

      <ConfirmDialog
        open={confirmOpen}
        title="Send emails?"
        body={
          <>
            You're about to email <strong>{selected.size}</strong>{" "}
            candidate{selected.size === 1 ? "" : "s"} about <strong>{position.title}</strong>.
            Already-emailed candidates are skipped automatically.
          </>
        }
        confirmLabel={`Send ${selected.size} email${selected.size === 1 ? "" : "s"}`}
        busy={sending}
        onConfirm={doSend}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
