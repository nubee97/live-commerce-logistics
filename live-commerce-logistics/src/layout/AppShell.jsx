import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider.jsx";
import "./AppShellPremium.css";

export default function AppShell({ pageTitle, pageSubtitle, children }) {
  const { session, logout } = useAuth();
  const nav = useNavigate();

  async function handleLogout() {
    await logout();
    nav("/", { replace: true });
  }

  const navItems =
    session?.role === "admin"
      ? [
          {
            to: "/dashboard",
            title: "Dashboard",
            subtitle: "메인 운영 현황",
          },
          {
            to: "/order-list",
            title: "Order List",
            subtitle: "주문통합검색 / 출고관리",
          },
          // {
          //   to: "/influencers",
          //   title: "Influencers",
          //   subtitle: "셀러 계정 및 관리",
          // },
        ]
      : [
          {
            to: "/orders",
            title: "Orders",
            subtitle: "주문 작성 / 진행 확인",
          },
        ];

  return (
    <div className="premiumShell">
      <aside className="premiumSidebar">
        <div className="premiumBrandCard">
          <div className="premiumBrandIcon">LC</div>
          <div>
            <div className="premiumBrandTitle">LCL Ops</div>
            <div className="premiumBrandSubtitle">Live Commerce Logistics</div>
          </div>
        </div>

        <div className="premiumSidebarLabel">Workspace</div>

        <nav className="premiumNav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `premiumNavItem ${isActive ? "active" : ""}`
              }
            >
              <div className="premiumNavTitle">{item.title}</div>
              <div className="premiumNavSubtitle">{item.subtitle}</div>
            </NavLink>
          ))}
        </nav>

        <div className="premiumSidebarSession">
          <div className="premiumSidebarSessionTitle">Current session</div>
          <div className="premiumSidebarSessionText">
            Signed in as <strong>{session?.userId || session?.influencerName || "User"}</strong>
          </div>
          <div className="premiumSidebarSessionSub">
            Role: {session?.role || "-"}
          </div>
        </div>
      </aside>

      <div className="premiumMainArea">
        <header className="premiumTopbar">
          <div>
            <div className="premiumEyebrow">Live Commerce Operations</div>
            <h1 className="premiumPageTitle">{pageTitle}</h1>
            <p className="premiumPageSubtitle">{pageSubtitle}</p>
          </div>

          <div className="premiumTopbarActions">
            <div className="premiumRolePill">
              {(session?.role || "user").toUpperCase()}
            </div>

            <div className="premiumUserMeta">
              {session?.userId || session?.influencerName || "User"}
            </div>

            <button
              type="button"
              className="premiumLogoutBtn"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </header>

        <main className="premiumContent">{children}</main>
      </div>
    </div>
  );
}