import { NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider.jsx";

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
        {session.role === "admin" && (
          <>
            <NavLink to="/dashboard" className={({ isActive }) => `sidebarLink ${isActive ? "active" : ""}`}>
              Dashboard
            </NavLink>
            <NavLink to="/order-list" className={({ isActive }) => `sidebarLink ${isActive ? "active" : ""}`}>
              Order List
            </NavLink>
            <NavLink to="/influencers" className={({ isActive }) => `sidebarLink ${isActive ? "active" : ""}`}>
              Influencers
            </NavLink>
          </>
        )}

        {session.role === "influencer" && (
          <NavLink to="/orders" className={({ isActive }) => `sidebarLink ${isActive ? "active" : ""}`}>
            Influencer / Seller
          </NavLink>
        )}
      </nav>
    </aside>
  );
}