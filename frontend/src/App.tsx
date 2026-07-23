import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

/**
 * Scaffold landing shell. It proves the stack is wired by calling the backend
 * /health endpoint. Replace this entirely with the real app (README §3):
 * Google sign-in, upload + live progress, candidates table (paginated/
 * virtualized), positions + ranked matches, bulk-email actions.
 */
export function App() {
  const [health, setHealth] = useState<"loading" | "ok" | "error">("loading");
  const [dbOk, setDbOk] = useState<boolean | null>(null);

  useEffect(() => {
    fetch(`${API}/health`)
      .then((r) => r.json())
      .then((d) => {
        setHealth("ok");
        setDbOk(Boolean(d.db));
      })
      .catch(() => setHealth("error"));
  }, []);

  return (
    <main
      style={{
        fontFamily: "system-ui, sans-serif",
        maxWidth: 720,
        margin: "64px auto",
        padding: "0 20px",
        lineHeight: 1.6,
      }}
    >
      <h1 style={{ marginBottom: 4 }}>TalentMatch</h1>
      <p style={{ color: "#666", marginTop: 0 }}>WTF Tech Team — take-home scaffold</p>

      <section
        style={{
          border: "1px solid #e2e2e2",
          borderRadius: 12,
          padding: 20,
          marginTop: 24,
        }}
      >
        <strong>Stack status</strong>
        <ul style={{ marginTop: 12 }}>
          <li>Frontend (React + Vite): <b style={{ color: "green" }}>running</b></li>
          <li>
            Backend (/health):{" "}
            {health === "loading" && <span>checking…</span>}
            {health === "ok" && <b style={{ color: "green" }}>reachable</b>}
            {health === "error" && (
              <b style={{ color: "crimson" }}>unreachable — is the backend up?</b>
            )}
          </li>
          <li>
            Postgres:{" "}
            {dbOk === null && <span>—</span>}
            {dbOk === true && <b style={{ color: "green" }}>connected</b>}
            {dbOk === false && <b style={{ color: "crimson" }}>not connected</b>}
          </li>
        </ul>
      </section>

      <section style={{ marginTop: 24 }}>
        <button
          disabled
          title="TODO (candidate): implement Google OAuth (README §2.1)"
          style={{
            padding: "10px 16px",
            borderRadius: 8,
            border: "1px solid #ccc",
            background: "#fafafa",
            cursor: "not-allowed",
          }}
        >
          Sign in with Google — TODO (README §2.1)
        </button>
        <p style={{ color: "#888", fontSize: 14 }}>
          Everything from here is yours to build. Start with the root{" "}
          <code>README.md</code> and <code>STARTER.md</code>.
        </p>
      </section>
    </main>
  );
}
