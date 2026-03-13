// import React, { useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { useAuth } from "../auth/AuthProvider.jsx";

// const INFLUENCER_PASSWORD = "inf123";

// export default function InfluencerLogin() {
//   const nav = useNavigate();
//   const { loginInfluencer } = useAuth();

//   const [name, setName] = useState("");
//   const [pw, setPw] = useState("");
//   const [err, setErr] = useState("");

//   return (
//     <div className="authShell">
//       <div className="authBackdrop" />

//       <div className="authCardPro">
//         <div className="authBrandRow">
//           <div className="brandBadge small">LC</div>
//           <div>
//             <div className="eyebrow">Influencer Portal</div>
//             <h1 className="authTitle">Influencer / Seller Login</h1>
//           </div>
//         </div>

//         <p className="authSubtitle">
//           Access the order submission workspace used by influencers and sellers working with your company.
//         </p>

//         <div className="authDivider" />

//         <div className="formBlock">
//           <label className="labelPro">Influencer / Seller Name</label>
//           <input
//             className="inputPro"
//             value={name}
//             onChange={(e) => setName(e.target.value)}
//             placeholder="Enter your name"
//           />
//         </div>

//         <div className="formBlock">
//           <label className="labelPro">Password</label>
//           <input
//             className="inputPro"
//             type="password"
//             value={pw}
//             onChange={(e) => setPw(e.target.value)}
//             placeholder="Enter password"
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
//               if (!name.trim()) return setErr("Please enter your name.");
//               if (pw !== INFLUENCER_PASSWORD) return setErr("Wrong password.");
//               loginInfluencer(name.trim());
//               nav("/orders");
//             }}
//             type="button"
//           >
//             Login to Influencer Workspace
//           </button>
//         </div>

//         <div className="authFootnote">
//           This login gives access only to the Influencer / Seller order page.
//         </div>
//       </div>
//     </div>
//   );
// }
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider.jsx";

export default function InfluencerLogin() {
  const nav = useNavigate();
  const { login } = useAuth();

  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");

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
              if (result.role !== "influencer") {
                return setErr("This is not an influencer account.");
              }
              nav("/orders");
            }}
            type="button"
          >
            Login to Influencer Workspace
          </button>
        </div>

        <div className="authFootnote">
          {/* Available influencer accounts: <strong>User1 / inf1</strong>, <strong>User2 / inf2</strong> */}
        </div>
      </div>
    </div>
  );
}