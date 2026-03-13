// import React from "react";
// import { Navigate } from "react-router-dom";
// import { useAuth } from "./AuthProvider.jsx";

// export default function ProtectedRoute({ allow, children }) {
//   const { session } = useAuth();

//   if (!session.role) return <Navigate to="/" replace />;

//   if (allow === "admin" && session.role !== "admin") return <Navigate to="/orders" replace />;
//   if (allow === "influencer" && session.role !== "influencer") return <Navigate to="/" replace />;

//   return children;
// }

import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthProvider.jsx";

export default function ProtectedRoute({ allow, children }) {
  const { session } = useAuth();

  if (!session.role) return <Navigate to="/" replace />;

  const allowed = Array.isArray(allow) ? allow : [allow];
  if (!allowed.includes(session.role)) return <Navigate to="/" replace />;

  return children;
}