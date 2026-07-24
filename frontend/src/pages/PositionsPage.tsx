import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import {
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  SkillTag,
  Spinner,
  colors,
} from "../components/ui";

type Position = {
  id: string;
  title: string;
  required_skills: string[];
  min_experience: number;
  location: string;
  remote: boolean;
};

export default function PositionsPage() {
  const { data, loading, error, reload } = useApi<Position[]>("/positions");

  return (
    <div>
      <PageHeader title="Open Positions" subtitle={data ? `${data.length} open` : undefined} />

      {loading && <Spinner />}
      {!loading && error && <ErrorState message={error} onRetry={reload} />}
      {!loading && !error && data && data.length === 0 && (
        <EmptyState title="No positions yet" hint="Run the seed script to load open positions." />
      )}

      {!loading && !error && data && data.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {data.map((p) => (
            <Link key={p.id} to={`/positions/${p.id}`} style={{ textDecoration: "none", color: "inherit" }}>
              <Card>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <h3 style={{ margin: 0 }}>{p.title}</h3>
                  {p.remote && (
                    <span style={{ fontSize: 12, color: colors.success, fontWeight: 700 }}>REMOTE</span>
                  )}
                </div>
                <p style={{ color: colors.muted, margin: "6px 0 12px" }}>
                  {p.location} · {p.min_experience}+ yrs
                </p>
                <div>
                  {p.required_skills?.map((s) => <SkillTag key={s}>{s}</SkillTag>)}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
