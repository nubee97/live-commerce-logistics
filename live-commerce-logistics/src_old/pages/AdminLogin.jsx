import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider.jsx";

export default function AdminLogin() {
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const nav = useNavigate();
  const { login, authLoading } = useAuth();

  async function handleLogin() {
    setErr("");

    const result = await login(id.trim(), pw);

    if (!result?.ok) {
      setErr(result?.error || "Login failed.");
      return;
    }

    if (result.role !== "admin") {
      setErr("This is not an admin account.");
      return;
    }

    nav("/dashboard");
  }

  return (
    <div className="authShell">
      <div className="authBackdrop" />

      <div className="authCardPro">
        <div className="authBrandRow">
          <div className="brandBadge small">LC</div>
          <div>
            <div className="eyebrow">Admin Portal</div>
            <h1 className="authTitle">Admin Login</h1>
          </div>
        </div>

        <p className="authSubtitle">
          Sign in to manage dashboard operations, inventory, order processing, packing, and influencers.
        </p>

        <div className="authDivider" />

        <div className="formBlock">
          <label className="labelPro">Admin ID</label>
          <input
            className="inputPro"
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="Enter admin ID"
            disabled={authLoading}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleLogin();
            }}
          />
        </div>

        <div className="formBlock">
          <label className="labelPro">Admin Password</label>
          <input
            className="inputPro"
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="Enter admin password"
            disabled={authLoading}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleLogin();
            }}
          />
        </div>

        {err && <div className="errorBanner">{err}</div>}

        <div className="authActionRow">
          <button
            className="btn ghostBtn"
            onClick={() => nav("/")}
            type="button"
            disabled={authLoading}
          >
            Back
          </button>

          <button
            className="btn primary authPrimaryBtn"
            onClick={handleLogin}
            type="button"
            disabled={authLoading}
          >
            {authLoading ? "Logging in..." : "Login to Admin Dashboard"}
          </button>
        </div>

        <div className="authFootnote">
          {/* Admin credentials: ID Admin / PW Admin123 */}
        </div>
      </div>
    </div>
  );
}