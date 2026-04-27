import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./useAuth.js";

export default function ProtectedRoute({ allow, children }) {
  const { session, authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="authShell">
        <div className="authBackdrop" />
        <div className="authCardPro">
          <h1 className="authTitle">Checking access...</h1>
          <p className="authSubtitle">Please wait.</p>
        </div>
      </div>
    );
  }

  if (!session?.role) {
    return <Navigate to="/" replace />;
  }

  const allowed = Array.isArray(allow) ? allow : [allow];

  if (!allowed.includes(session.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}