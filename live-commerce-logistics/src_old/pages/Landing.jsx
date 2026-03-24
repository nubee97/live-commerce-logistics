// import React from "react";
// import { useNavigate } from "react-router-dom";
// import { useAuth } from "../auth/AuthProvider.jsx";

// export default function Landing() {
//   const nav = useNavigate();
//   const { session, logout } = useAuth();

//   return (
//     <div className="card">
//       <h1 className="h1">Live Commerce Logistics</h1>
//       <p className="p">Choose how you want to log in.</p>

//       <div className="hr" />

//       {!session.role ? (
//         <div className="row">
//           <div className="card" style={{ background: "rgba(255,255,255,0.03)" }}>
//             <h2 className="h1" style={{ fontSize: 18 }}>Admin</h2>
//             <p className="p">Full access: Dashboard, Orders, Order List, Packing, Influencers.</p>
//             <div className="toolbar">
//               <button className="btn primary" onClick={() => nav("/login/admin")} type="button">
//                 Login as Admin
//               </button>
//             </div>
//           </div>

//           <div className="card" style={{ background: "rgba(255,255,255,0.03)" }}>
//             <h2 className="h1" style={{ fontSize: 18 }}>Influencer / Seller</h2>
//             <p className="p">Access only to the Influencer/Seller order entry page.</p>
//             <div className="toolbar">
//               <button className="btn primary" onClick={() => nav("/login/influencer")} type="button">
//                 Login as Influencer
//               </button>
//             </div>
//           </div>
//         </div>
//       ) : (
//         <>
//           <div className="chip">Logged in as: {session.role}</div>
//           <div className="toolbar">
//             {session.role === "admin" ? (
//               <>
//                 <button className="btn primary" onClick={() => nav("/dashboard")} type="button">Go to Dashboard</button>
//                 <button className="btn" onClick={() => nav("/influencers")} type="button">Influencers</button>
//                 <button className="btn" onClick={() => nav("/order-list")} type="button">Order List</button>
//                 <button className="btn" onClick={() => nav("/orders")} type="button">Influencer/Seller</button>
//               </>
//             ) : (
//               <button className="btn primary" onClick={() => nav("/orders")} type="button">
//                 Go to Influencer/Seller
//               </button>
//             )}
//             <button className="btn danger" onClick={logout} type="button">Logout</button>
//           </div>
//         </>
//       )}
//     </div>
//   );
// }

import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider.jsx";

export default function Landing() {
  const nav = useNavigate();
  const { session, logout } = useAuth();

  return (
    <div className="authShell">
      <div className="authBackdrop" />

      <div className="landingWrap">
        <div className="landingHero">
          <div className="brandBadge">LC</div>

          <div className="brandText">
            <div className="eyebrow">LCL Ops</div>
            <h1 className="landingTitle">Live Commerce Logistics</h1>
            <p className="landingSubtitle">
              Orders, packing, influencer operations, and inventory management in one clean logistics workspace.
            </p>
          </div>
        </div>

        {!session.role ? (
          <div className="loginChoiceGrid">
            <div className="loginChoiceCard">
              <div className="choiceTop">
                <div className="choiceIcon">A</div>
                <div>
                  <h2 className="choiceTitle">Admin Portal</h2>
                  <p className="choiceText">
                    Full operational access to dashboard, orders, packing, order list, and influencer management.
                  </p>
                </div>
              </div>

              <div className="choiceFeatures">
                <span className="miniChip">Dashboard</span>
                <span className="miniChip">Orders</span>
                <span className="miniChip">Packing</span>
                <span className="miniChip">Influencers</span>
              </div>

              <button
                className="btn primary wideBtn"
                onClick={() => nav("/login/admin")}
                type="button"
              >
                Login as Admin
              </button>
            </div>

            <div className="loginChoiceCard">
              <div className="choiceTop">
                <div className="choiceIcon seller">I</div>
                <div>
                  <h2 className="choiceTitle">Influencer / Seller Portal</h2>
                  <p className="choiceText">
                    Fast access to create and manage order submissions without exposing admin operations.
                  </p>
                </div>
              </div>

              <div className="choiceFeatures">
                <span className="miniChip">New Order</span>
                <span className="miniChip">Order Entry</span>
                <span className="miniChip">Simple Access</span>
              </div>

              <button
                className="btn secondary wideBtn"
                onClick={() => nav("/login/influencer")}
                type="button"
              >
                Login as Influencer
              </button>
            </div>
          </div>
        ) : (
          <div className="sessionCard">
            <div className="sessionHeader">
              <div>
                <div className="eyebrow">Current Session</div>
                <h2 className="sessionTitle">
                  Logged in as {session.role === "admin" ? "Admin" : "Influencer / Seller"}
                </h2>
                <p className="sessionText">
                  Continue to your workspace or sign out to switch accounts.
                </p>
              </div>

              <div className="rolePill">
                {session.role === "admin" ? "ADMIN" : "INFLUENCER"}
              </div>
            </div>

            <div className="sessionActions">
              {session.role === "admin" ? (
                <>
                  <button className="btn primary" onClick={() => nav("/dashboard")} type="button">
                    Open Dashboard
                  </button>
                  <button className="btn" onClick={() => nav("/influencers")} type="button">
                    Influencers
                  </button>
                  <button className="btn" onClick={() => nav("/order-list")} type="button">
                    Order List
                  </button>
                  <button className="btn" onClick={() => nav("/orders")} type="button">
                    Orders
                  </button>
                </>
              ) : (
                <button className="btn primary" onClick={() => nav("/orders")} type="button">
                  Go to Influencer / Seller Page
                </button>
              )}

              <button className="btn danger" onClick={logout} type="button">
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}