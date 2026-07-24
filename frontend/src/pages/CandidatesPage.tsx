import { useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
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
};
type Paged = { items: Candidate[]; total: number; page: number; pageSize: number };

type SortKey = "name" | "experience" | "created";

function SortHeader({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Sort by ${label}${active ? (dir === "asc" ? ", ascending" : ", descending") : ""}`}
      style={{
        background: "none",
        border: "none",
        padding: 0,
        font: "inherit",
        fontWeight: 700,
        cursor: "pointer",
        color: active ? "#111827" : "inherit",
      }}
    >
      {label}
      {active ? (dir === "asc" ? " ↑" : " ↓") : ""}
    </button>
  );
}

export default function CandidatesPage() {
  const [page, setPage] = useState(1);
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [skill, setSkill] = useState("");
  const [sort, setSort] = useState<SortKey>("created");
  const [dir, setDir] = useState<"asc" | "desc">("desc");

  const params = new URLSearchParams({ page: String(page), pageSize: "25" });
  if (query) params.set("q", query);
  if (skill) params.set("skill", skill);
  params.set("sort", sort);
  params.set("dir", dir);
  const url = `/candidates?${params.toString()}`;
  const { data, loading, error, reload } = useApi<Paged>(url);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const thStyle: React.CSSProperties = {
    padding: 12,
    borderBottom: `1px solid ${colors.border}`,
  };

  function applyFilter(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setQuery(queryInput.trim());
    setSkill(skillInput.trim().toLowerCase());
  }

  function clearFilters() {
    setQueryInput("");
    setQuery("");
    setSkillInput("");
    setSkill("");
    setPage(1);
  }

  function toggleSort(key: SortKey) {
    if (sort === key) {
      setDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSort(key);
      setDir(key === "name" ? "asc" : "desc");
    }
    setPage(1);
  }

  return (
    <div>
      <PageHeader title="Candidates" subtitle={data ? `${data.total} total` : undefined} />

      <form onSubmit={applyFilter} style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        <label htmlFor="candidate-search" style={{ position: "absolute", left: -9999 }}>
          Search by name or email
        </label>
        <input
          id="candidate-search"
          value={queryInput}
          onChange={(e) => setQueryInput(e.target.value)}
          placeholder="Search name or email"
          style={{
            flex: 2,
            minWidth: 180,
            padding: "10px 12px",
            borderRadius: 8,
            border: `1px solid ${colors.border}`,
            fontSize: 14,
          }}
        />
        <label htmlFor="skill-filter" style={{ position: "absolute", left: -9999 }}>
          Filter by skill
        </label>
        <input
          id="skill-filter"
          value={skillInput}
          onChange={(e) => setSkillInput(e.target.value)}
          placeholder="Filter by skill (e.g. react)"
          style={{
            flex: 1,
            minWidth: 140,
            padding: "10px 12px",
            borderRadius: 8,
            border: `1px solid ${colors.border}`,
            fontSize: 14,
          }}
        />
        <Button type="submit">Search</Button>
        {(query || skill) && (
          <Button type="button" variant="ghost" onClick={clearFilters}>
            Clear
          </Button>
        )}
      </form>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        {loading && <Spinner />}

        {!loading && error && (
          <div style={{ padding: 20 }}>
            <ErrorState message={error} onRetry={reload} />
          </div>
        )}

        {!loading && !error && data && data.items.length === 0 && (
          <EmptyState
            title={query || skill ? "No candidates match your filters" : "No candidates yet"}
            hint={
              query || skill
                ? "Try different terms or clear the filters."
                : "Upload a spreadsheet to import candidates."
            }
            action={
              !query && !skill ? (
                <Link to="/upload">
                  <Button>Go to Upload</Button>
                </Link>
              ) : undefined
            }
          />
        )}

        {!loading && !error && data && data.items.length > 0 && (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "#f9fafb", textAlign: "left" }}>
              <tr>
                <th style={thStyle}>
                  <SortHeader label="Name" active={sort === "name"} dir={dir} onClick={() => toggleSort("name")} />
                </th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Skills</th>
                <th style={thStyle}>
                  <SortHeader
                    label="Experience"
                    active={sort === "experience"}
                    dir={dir}
                    onClick={() => toggleSort("experience")}
                  />
                </th>
                <th style={thStyle}>Location</th>
                <th style={thStyle} />
              </tr>
            </thead>
            <tbody>
              {data.items.map((c) => (
                <tr key={c.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                  <td style={{ padding: 12, fontWeight: 600 }}>{c.name}</td>
                  <td style={{ padding: 12, color: colors.muted }}>{c.email}</td>
                  <td style={{ padding: 12 }}>
                    {c.skills?.map((s) => <SkillTag key={s}>{s}</SkillTag>)}
                  </td>
                  <td style={{ padding: 12 }}>
                    {c.years_of_experience == null ? "—" : `${c.years_of_experience} yrs`}
                  </td>
                  <td style={{ padding: 12 }}>{c.location}</td>
                  <td style={{ padding: 12 }}>
                    <Link to={`/candidates/${c.id}`}>
                      <Button variant="ghost">View</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {!loading && !error && data && data.total > data.pageSize && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginTop: 18 }}>
          <Button variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span style={{ color: colors.muted }}>
            Page {page} of {totalPages}
          </span>
          <Button variant="ghost" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
