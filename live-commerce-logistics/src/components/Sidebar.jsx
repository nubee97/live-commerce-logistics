import { NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider.jsx";

const adminLinks = [
  {
    to: "/dashboard",
    label: "Dashboard",
    meta: "메인 운영 현황",
  },
  {
    to: "/order-list",
    label: "Order List",
    meta: "주문통합검색 / 출고관리",
  },
  {
    to: "/influencers",
    label: "Influencers",
    meta: "셀러 계정 및 관리",
  },
];

export default function Sidebar() {
  const { session } = useAuth();

  return (
    <aside className="sidebarPro">
      <div className="sidebarBrand">
        <div className="sidebarLogo">LC</div>
        <div>
          <div className="sidebarTitle">LCL Ops</div>
          <div className="sidebarSubtitle">Live Commerce Logistics</div>
        </div>
      </div>

      <div className="sidebarSectionLabel">Workspace</div>

      <nav className="sidebarNav">
        {session.role === "admin" &&
          adminLinks.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `sidebarLink ${isActive ? "active" : ""}`}
            >
              <span className="sidebarLinkTitle">{item.label}</span>
              <span className="sidebarLinkMeta">{item.meta}</span>
            </NavLink>
          ))}

        {session.role === "influencer" && (
          <NavLink
            to="/orders"
            className={({ isActive }) => `sidebarLink ${isActive ? "active" : ""}`}
          >
            <span className="sidebarLinkTitle">Orders</span>
            <span className="sidebarLinkMeta">셀러 주문 등록 / 관리</span>
          </NavLink>
        )}
      </nav>

      <div className="sidebarFooter">
        <div className="sidebarFootCard">
          <div className="sidebarFootTitle">Current session</div>
          <div className="sidebarFootText">
            {session.userId ? (
              <>
                Signed in as <strong>{session.userId}</strong>
                <br />
                Role: {session.role === "admin" ? "Admin" : "Influencer"}
              </>
            ) : (
              "No active session"
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
