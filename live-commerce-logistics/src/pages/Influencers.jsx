import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../data/StoreProvider.jsx";
import { useAuth } from "../auth/AuthProvider.jsx";

export default function InfluencerLogin() {
  const { state } = useStore();
  const { loginInfluencer } = useAuth();
  const nav = useNavigate();

  const [selectedId, setSelectedId] = useState("");
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");

  const options = useMemo(() => state.influencers || [], [state.influencers]);

  return (
    <div className="card" style={{ maxWidth: 620, margin: "0 auto" }}>
      <h1 className="h1">Influencer / Seller Login</h1>
      <p className="p">Select your name. (Optional PIN if admin set one.)</p>

      <div className="hr" />

      <div className="row">
        <div>
          <div className="label">Influencer</div>
          <select className="select" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
            <option value="">Select…</option>
            {options.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name || "(No name)"} {i.instagram ? `(${i.instagram})` : ""}
              </option>
            ))}
          </select>
          <div className="small" style={{ marginTop: 6 }}>
            If you don’t see your name, ask admin to add you in the Influencers page.
          </div>
        </div>

        <div>
          <div className="label">PIN (optional)</div>
          <input className="input" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="If required" />
        </div>
      </div>

      {err && <div className="chip" style={{ marginTop: 10, background: "rgba(255,92,122,0.10)" }}>{err}</div>}

      <div className="toolbar">
        <button className="btn" onClick={() => nav("/")} type="button">Back</button>
        <button
          className="btn primary"
          onClick={() => {
            setErr("");
            const inf = (state.influencers || []).find((x) => x.id === selectedId);
            if (!inf) return setErr("Select an influencer.");

            if (inf.pin && String(inf.pin) !== String(pin)) return setErr("Wrong PIN.");

            loginInfluencer(inf.id);
            nav("/orders");
          }}
          type="button"
        >
          Login
        </button>
      </div>
    </div>
  );
}