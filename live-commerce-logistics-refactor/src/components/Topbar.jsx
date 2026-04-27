import { useAuth } from "../auth/useAuth.js";

export default function Topbar({ pageTitle = "", pageSubtitle = "" }) {
  const { session, logout, authLoading } = useAuth();

  return (
    <header className="topbarPro">
      <div>
        <div className="topbarEyebrow">Live Commerce Operations</div>
        <div className="topbarPageTitle">{pageTitle}</div>
        {pageSubtitle ? <div className="topbarPageSubtitle">{pageSubtitle}</div> : null}
      </div>

      <div className="topbarActions">
        {session.role && (
          <div className="topbarRoleWrap">
            <div className="topbarRole">{session.role === "admin" ? "ADMIN" : "INFLUENCER"}</div>
            {session.userId ? <div className="topbarUserId">{session.userId}</div> : null}
          </div>
        )}

        <button className="btn danger" onClick={() => logout()} type="button" disabled={authLoading}>
          {authLoading ? "Logging out..." : "Logout"}
        </button>
      </div>
    </header>
  );
}
