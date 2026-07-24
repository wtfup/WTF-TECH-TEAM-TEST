import { Link, useParams } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import {
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  ScorePill,
  SkillTag,
  Spinner,
  colors,
} from "../components/ui";

type Candidate = {
  id: number;
  name: string;
  email: string;
  skills: string[];
  years_of_experience: number | null;
  seniority: string;
  location: string;
  source_file?: string;
};
type Match = {
  positionId: string;
  positionTitle: string;
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  why: string[];
};

export default function CandidateDetailPage() {
  const { id } = useParams();
  const candidate = useApi<Candidate>(`/candidates/${id}`);
  const matches = useApi<Match[]>(`/candidates/${id}/matches`);

  if (candidate.loading) return <Spinner />;
  if (candidate.error)
    return <ErrorState message={candidate.error} onRetry={candidate.reload} />;
  if (!candidate.data) return <EmptyState title="Candidate not found" />;

  const c = candidate.data;

  return (
    <div>
      <Link to="/candidates" style={{ color: colors.muted, textDecoration: "none" }}>
        ← Back to candidates
      </Link>

      <PageHeader
        title={c.name}
        subtitle={[c.seniority, c.location].filter(Boolean).join(" · ") || undefined}
      />

      <Card style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
          <div>
            <div style={{ color: colors.muted, fontSize: 13 }}>Email</div>
            <div>{c.email}</div>
          </div>
          <div>
            <div style={{ color: colors.muted, fontSize: 13 }}>Experience</div>
            <div>{c.years_of_experience == null ? "—" : `${c.years_of_experience} years`}</div>
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ color: colors.muted, fontSize: 13, marginBottom: 4 }}>Skills</div>
            <div>{c.skills?.length ? c.skills.map((s) => <SkillTag key={s}>{s}</SkillTag>) : "—"}</div>
          </div>
        </div>
      </Card>

      <h2 style={{ fontSize: 20 }}>Position matches</h2>

      {matches.loading && <Spinner />}
      {!matches.loading && matches.error && (
        <ErrorState message={matches.error} onRetry={matches.reload} />
      )}
      {!matches.loading && !matches.error && matches.data && matches.data.length === 0 && (
        <EmptyState title="No positions to match against" hint="Seed positions first." />
      )}

      {!matches.loading &&
        !matches.error &&
        matches.data?.map((m) => (
          <Card key={m.positionId} style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Link to={`/positions/${m.positionId}`} style={{ textDecoration: "none", color: "inherit" }}>
                <h3 style={{ margin: 0 }}>{m.positionTitle}</h3>
              </Link>
              <ScorePill score={m.score} />
            </div>
            <div style={{ marginTop: 12 }}>
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
            <ul style={{ marginTop: 12, marginBottom: 0, color: colors.muted }}>
              {m.why.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </Card>
        ))}
    </div>
  );
}
