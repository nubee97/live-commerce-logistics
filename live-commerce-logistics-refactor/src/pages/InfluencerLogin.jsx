import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth.js";

export default function InfluencerLogin() {
  const nav = useNavigate();
  const { login, authLoading } = useAuth();

  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");

  async function handleLogin() {
    setErr("");

    const result = await login(id.trim(), pw);

    if (!result?.ok) {
      setErr(result?.error || "Login failed.");
      return;
    }

    if (result.role !== "influencer") {
      setErr("This is not an influencer account.");
      return;
    }

    nav("/orders");
  }

  return (
    <div className="authShell">
      <div className="authBackdrop" />

      <div className="authCardPro">
        <div className="authBrandRow">
          <div className="brandBadge small">LC</div>
          <div>
            <div className="eyebrow">Influencer Portal</div>
            <h1 className="authTitle">Influencer / Seller Login</h1>
          </div>
        </div>

        <p className="authSubtitle">
          Login with your assigned seller account to access the order submission workspace.
        </p>

        <div className="authDivider" />

        <div className="formBlock">
          <label className="labelPro">User ID</label>
          <input
            className="inputPro"
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="Enter user ID"
            disabled={authLoading}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleLogin();
            }}
          />
        </div>

        <div className="formBlock">
          <label className="labelPro">Password</label>
          <input
            className="inputPro"
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="Enter password"
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
            {authLoading ? "Logging in..." : "Login to Influencer Workspace"}
          </button>
        </div>

        <div className="authFootnote">
          {/* Available influencer accounts: User1 / inf1, User2 / inf2 */}
        </div>
      </div>
    </div>
  );
}