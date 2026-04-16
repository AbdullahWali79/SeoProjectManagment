import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="shell">
      <div className="topbar">
        <div className="brand">
          <p className="eyebrow">Operations cockpit</p>
          <h1 className="display">Bring structure and accountability to your SEO team.</h1>
        </div>
      </div>

      <section className="hero">
        <div className="panel panel-dark hero-copy">
          <p className="eyebrow" style={{ color: "rgba(255,255,255,0.7)" }}>
            What this app solves
          </p>
          <p style={{ fontSize: "1.1rem", lineHeight: 1.8, color: "rgba(255,255,255,0.82)" }}>
            The admin can capture client projects, define strategies, assign SEO tasks to interns or employees, and review
            task status, effort hours, and daily progress in one clean dashboard before client meetings. The current
            deployment path now targets Supabase Postgres with the same admin and employee workflow.
          </p>
          <div className="login-help">
            <div className="panel" style={{ padding: 16, background: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.1)" }}>
              <p className="mini" style={{ margin: 0, color: "rgba(255,255,255,0.8)" }}>
                Demo admin
              </p>
              <p style={{ margin: "8px 0 0", color: "white" }}>
                <code>admin@agency.local</code> / <code>Passw0rd!</code>
              </p>
            </div>
            <div className="panel" style={{ padding: 16, background: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.1)" }}>
              <p className="mini" style={{ margin: 0, color: "rgba(255,255,255,0.8)" }}>
                Demo employee
              </p>
              <p style={{ margin: "8px 0 0", color: "white" }}>
                <code>ali@agency.local</code> / <code>Passw0rd!</code>
              </p>
            </div>
          </div>
        </div>

        <div className="panel hero-login">
          <p className="eyebrow">Secure local sign-in</p>
          <h2 style={{ marginTop: 0, fontFamily: "var(--font-display)", fontSize: "2.1rem", lineHeight: 1 }}>
            Start with admin or employee view
          </h2>
          <p className="subtle">
            Sign in with the seeded admin or employee account once your Supabase database and environment variables are
            connected.
          </p>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
