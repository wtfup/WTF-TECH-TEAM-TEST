import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { useApi } from "../hooks/useApi";
import { Button, colors } from "./ui";

type Me = { authenticated: boolean; user: { name: string; email: string; avatar_url: string } };

const navItems = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/upload", label: "Upload" },
  { to: "/candidates", label: "Candidates" },
  { to: "/positions", label: "Positions" },
];

export default function Layout() {
  const { data } = useApi<Me>("/auth/me");
  const user = data?.user;
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    try {
      await api.post("/auth/logout");
      window.location.href = "/login";
    } catch {
      setLoggingOut(false);
      navigate("/login");
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: colors.bg, fontFamily: "Arial, sans-serif" }}>
      <header
        style={{
          background: "#fff",
          borderBottom: `1px solid ${colors.border}`,
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          gap: 24,
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <span style={{ fontWeight: 800, fontSize: 18, color: colors.primary }}>TalentMatch</span>

        <nav style={{ display: "flex", gap: 6, flex: 1 }}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              style={({ isActive }) => ({
                padding: "16px 12px",
                textDecoration: "none",
                fontWeight: 600,
                color: isActive ? colors.primary : colors.muted,
                borderBottom: isActive ? `3px solid ${colors.primary}` : "3px solid transparent",
              })}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {user && (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {user.avatar_url && (
              <img
                src={user.avatar_url}
                alt=""
                width={36}
                height={36}
                style={{ borderRadius: "50%", objectFit: "cover" }}
              />
            )}
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{user.name}</div>
              <div style={{ fontSize: 12, color: colors.muted }}>{user.email}</div>
            </div>
            <Button variant="danger" onClick={logout} disabled={loggingOut}>
              {loggingOut ? "Signing out…" : "Logout"}
            </Button>
          </div>
        )}
      </header>

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 24px" }}>
        <Outlet />
      </main>
    </div>
  );
}
