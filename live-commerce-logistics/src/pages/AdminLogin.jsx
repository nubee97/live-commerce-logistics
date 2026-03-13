// import React, { useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { useAuth } from "../auth/AuthProvider.jsx";

// const ADMIN_PASSWORD = "admin123";

// export default function AdminLogin() {
//   const [pw, setPw] = useState("");
//   const [err, setErr] = useState("");
//   const nav = useNavigate();
//   const { loginAdmin } = useAuth();

//   return (
//     <div className="authShell">
//       <div className="authBackdrop" />

//       <div className="authCardPro">
//         <div className="authBrandRow">
//           <div className="brandBadge small">LC</div>
//           <div>
//             <div className="eyebrow">Admin Portal</div>
//             <h1 className="authTitle">Admin Login</h1>
//           </div>
//         </div>

//         <p className="authSubtitle">
//           Sign in to manage dashboard operations, order processing, packing, and influencer performance.
//         </p>

//         <div className="authDivider" />

//         <div className="formBlock">
//           <label className="labelPro">Admin Password</label>
//           <input
//             className="inputPro"
//             type="password"
//             value={pw}
//             onChange={(e) => setPw(e.target.value)}
//             placeholder="Enter admin password"
//           />
//         </div>

//         {err && <div className="errorBanner">{err}</div>}

//         <div className="authActionRow">
//           <button className="btn ghostBtn" onClick={() => nav("/")} type="button">
//             Back
//           </button>

//           <button
//             className="btn primary authPrimaryBtn"
//             onClick={() => {
//               setErr("");
//               if (pw !== ADMIN_PASSWORD) return setErr("Wrong password.");
//               loginAdmin();
//               nav("/dashboard");
//             }}
//             type="button"
//           >
//             Login to Admin Dashboard
//           </button>
//         </div>

//         <div className="authFootnote">
//           Admin access includes dashboard, orders, packing, inventory, and influencer management.
//         </div>
//       </div>
//     </div>
//   );
// }

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider.jsx";

export default function AdminLogin() {
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const nav = useNavigate();
  const { login } = useAuth();

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
          />
        </div>

        {err && <div className="errorBanner">{err}</div>}

        <div className="authActionRow">
          <button className="btn ghostBtn" onClick={() => nav("/")} type="button">
            Back
          </button>

          <button
            className="btn primary authPrimaryBtn"
            onClick={() => {
              setErr("");
              const result = login(id.trim(), pw);
              if (!result.ok) return setErr(result.error);
              if (result.role !== "admin") return setErr("This is not an admin account.");
              nav("/dashboard");
            }}
            type="button"
          >
            Login to Admin Dashboard
          </button>
        </div>

        <div className="authFootnote">
          {/* Admin credentials: ID <strong>Admin</strong> / PW <strong>Admin123</strong> */}
        </div>
      </div>
    </div>
  );
}