import Sidebar from "./sidebar";
import Topbar from "./topbar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Topbar />
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
