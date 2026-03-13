// import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

// const KEY = "lcl_session_v1";
// const AuthCtx = createContext(null);

// const DEFAULT = {
//   role: null,
//   username: "",
//   influencerName: "",
// };

// const USERS = [
//   {
//     username: "Admin",
//     password: "Admin123",
//     role: "admin",
//     influencerName: "",
//   },
//   {
//     username: "User1",
//     password: "inf1",
//     role: "influencer",
//     influencerName: "User1",
//   },
//   {
//     username: "User2",
//     password: "inf2",
//     role: "influencer",
//     influencerName: "User2",
//   },
// ];

// export function AuthProvider({ children }) {
//   const [session, setSession] = useState(() => {
//     try {
//       const raw = localStorage.getItem(KEY);
//       return raw ? JSON.parse(raw) : DEFAULT;
//     } catch {
//       return DEFAULT;
//     }
//   });

//   useEffect(() => {
//     localStorage.setItem(KEY, JSON.stringify(session));
//   }, [session]);

//   const api = useMemo(() => {
//     return {
//       session,
//       isAuthed: !!session.role,
//       isAdmin: session.role === "admin",
//       isInfluencer: session.role === "influencer",

//       login(username, password) {
//         const found = USERS.find(
//           (u) => u.username === username && u.password === password
//         );

//         if (!found) {
//           return {
//             ok: false,
//             error: "Invalid ID or password.",
//           };
//         }

//         setSession({
//           role: found.role,
//           username: found.username,
//           influencerName: found.influencerName || "",
//         });

//         return {
//           ok: true,
//           role: found.role,
//         };
//       },

//       logout() {
//         setSession(DEFAULT);
//       },
//     };
//   }, [session]);

//   return <AuthCtx.Provider value={api}>{children}</AuthCtx.Provider>;
// }

// export function useAuth() {
//   const v = useContext(AuthCtx);
//   if (!v) throw new Error("useAuth must be used within AuthProvider");
//   return v;
// }

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const KEY = "lcl_session_v1";
const AuthCtx = createContext(null);

const DEFAULT = {
  role: null,
  influencerName: "",
  userId: "",
};

const ACCOUNTS = [
  {
    id: "Admin",
    password: "Admin123",
    role: "admin",
    influencerName: "",
  },
  {
    id: "User1",
    password: "inf1",
    role: "influencer",
    influencerName: "User1",
  },
  {
    id: "User2",
    password: "inf2",
    role: "influencer",
    influencerName: "User2",
  },
];

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : DEFAULT;
    } catch {
      return DEFAULT;
    }
  });

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(session));
  }, [session]);

  const api = useMemo(() => {
    return {
      session,
      isAuthed: !!session.role,
      isAdmin: session.role === "admin",
      isInfluencer: session.role === "influencer",

      login(id, password) {
        const match = ACCOUNTS.find(
          (acc) => acc.id === id && acc.password === password
        );

        if (!match) {
          return {
            ok: false,
            error: "Invalid ID or password.",
          };
        }

        const nextSession = {
          role: match.role,
          influencerName: match.influencerName || "",
          userId: match.id,
        };

        setSession(nextSession);

        return {
          ok: true,
          role: match.role,
          influencerName: match.influencerName || "",
          userId: match.id,
        };
      },

      loginAdmin() {
        setSession({
          role: "admin",
          influencerName: "",
          userId: "Admin",
        });
      },

      loginInfluencer(influencerName) {
        setSession({
          role: "influencer",
          influencerName: influencerName || "",
          userId: influencerName || "",
        });
      },

      logout() {
        setSession(DEFAULT);
      },
    };
  }, [session]);

  return <AuthCtx.Provider value={api}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const v = useContext(AuthCtx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}