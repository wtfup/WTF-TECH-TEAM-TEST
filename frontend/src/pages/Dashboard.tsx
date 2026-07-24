import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { Card, PageHeader, Spinner, colors } from "../components/ui";

type Paged = { total: number };
type Position = { id: string };

function StatCard({ label, value, to }: { label: string; value: React.ReactNode; to: string }) {
  return (
    <Link to={to} style={{ textDecoration: "none", color: "inherit", flex: 1, minWidth: 180 }}>
      <Card style={{ transition: "transform .1s" }}>
        <div style={{ fontSize: 34, fontWeight: 800, color: colors.primary }}>{value}</div>
        <div style={{ color: colors.muted, marginTop: 4 }}>{label}</div>
      </Card>
    </Link>
  );
}

export default function Dashboard() {
  const candidates = useApi<Paged>("/candidates?pageSize=1");
  const positions = useApi<Position[]>("/positions");

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Import candidates, review matches, and reach out — all from here."
      />

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        <StatCard
          label="Candidates"
          to="/candidates"
          value={candidates.loading ? <Spinner label="" /> : candidates.data?.total ?? "—"}
        />
        <StatCard
          label="Open positions"
          to="/positions"
          value={positions.loading ? <Spinner label="" /> : positions.data?.length ?? "—"}
        />
      </div>

      <Card>
        <h3 style={{ marginTop: 0 }}>Get started</h3>
        <ol style={{ color: colors.muted, lineHeight: 1.9, marginBottom: 0 }}>
          <li>
            <Link to="/upload">Upload a candidate spreadsheet</Link> — it ingests in the
            background and reports inserted / merged / failed.
          </li>
          <li>
            Browse <Link to="/candidates">candidates</Link> and open one to see position matches.
          </li>
          <li>
            Open a <Link to="/positions">position</Link> to rank candidates and email a shortlist.
          </li>
        </ol>
      </Card>
    </div>
  );
}
