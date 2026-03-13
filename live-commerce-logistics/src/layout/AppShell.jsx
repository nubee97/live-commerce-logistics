import Sidebar from "../components/Sidebar.jsx";
import Topbar from "../components/Topbar.jsx";

export default function AppShell({ children, pageTitle = "Dashboard", pageSubtitle = "" }) {
  return (
    <div className="shell">
      <Sidebar />
      <div className="shellMain">
        <Topbar pageTitle={pageTitle} pageSubtitle={pageSubtitle} />
        <div className="shellContent">{children}</div>
      </div>
    </div>
  );
}