import React, { createContext, useContext, useMemo, useState, useEffect } from "react";
import { supabase } from "../lib/supabase.js";

const AuthCtx = createContext(null);

const DEFAULT = {
  role: null,
  influencerName: "",
  userId: "",
  accountId: "",
  sessionToken: "",
  expiresAt: "",
};

function normalizeRole(value) {
  const role = String(value || "").trim().toLowerCase();
  if (role === "admin") return "admin";
  if (role === "influencer") return "influencer";
  return null;
}

function buildSession(row) {
  return {
    role: normalizeRole(row?.role),
    influencerName: String(row?.influencer_name || "").trim(),
    userId: String(row?.login_id || "").trim(),
    accountId: String(row?.account_id || "").trim(),
    sessionToken: String(row?.session_token || "").trim(),
    expiresAt: String(row?.expires_at || "").trim(),
  };
}

function extractRpcRow(data) {
  if (Array.isArray(data)) return data[0] || null;
  if (data && typeof data === "object") return data;
  return null;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(DEFAULT);
  const [authLoading, setAuthLoading] = useState(false);

  // Restore session on refresh
  useEffect(() => {
    const saved = localStorage.getItem("app_session");

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSession(parsed);
      } catch (err) {
        console.error("Session restore failed:", err);
      }
    }
  }, []);

  const api = useMemo(() => {
    return {
      session,
      authLoading,
      isAuthed: !!session.role,
      isAdmin: session.role === "admin",
      isInfluencer: session.role === "influencer",

      async login(id, password) {
        try {
          if (!supabase) {
            throw new Error("Supabase is not configured.");
          }

          setAuthLoading(true);

          const loginId = String(id || "").trim();
          const pw = String(password || "");

          if (!loginId || !pw) {
            return {
              ok: false,
              error: "Please enter both ID and password.",
            };
          }

          const { data, error } = await supabase.rpc("app_login", {
            p_login_id: loginId,
            p_password: pw,
          });

          console.log("app_login result:", { loginId, data, error });

          if (error) {
            return {
              ok: false,
              error: error.message || "Login failed.",
            };
          }

          const row = extractRpcRow(data);

          if (!row) {
            return {
              ok: false,
              error: "Invalid login credentials.",
            };
          }

          const nextSession = buildSession(row);

          if (!nextSession.role) {
            return {
              ok: false,
              error: "This account does not have a valid role.",
            };
          }

          setSession(nextSession);
          localStorage.setItem("app_session", JSON.stringify(nextSession));

          return {
            ok: true,
            ...nextSession,
          };
        } catch (error) {
          console.error("Login failed:", error);
          return {
            ok: false,
            error: error?.message || "Login failed.",
          };
        } finally {
          setAuthLoading(false);
        }
      },

      async logout() {
        try {
          setAuthLoading(true);

          if (supabase && session.sessionToken) {
            await supabase.rpc("app_logout", {
              p_session_token: session.sessionToken,
            });
          }
        } catch (error) {
          console.error("Logout failed:", error);
        } finally {
          localStorage.removeItem("app_session");
          setSession(DEFAULT);
          setAuthLoading(false);
        }
      },
    };
  }, [session, authLoading]);

  return <AuthCtx.Provider value={api}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const v = useContext(AuthCtx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}