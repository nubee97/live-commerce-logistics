import { useAuth } from "../auth/AuthProvider.jsx";

export default function Topbar({ pageTitle = "", pageSubtitle = "" }) {
  const { session, logout } = useAuth();

  return (
    <header className="topbarPro">
      <div>
        <div className="topbarPageTitle">{pageTitle}</div>
        {pageSubtitle ? <div className="topbarPageSubtitle">{pageSubtitle}</div> : null}
      </div>

      <div className="topbarActions">
        {session.role && (
          <div className="topbarRole">
            {session.role === "admin" ? "ADMIN" : "INFLUENCER"}
          </div>
        )}

        <button className="btn danger" onClick={logout} type="button">
          Logout
        </button>
      </div>
    </header>
  );
}