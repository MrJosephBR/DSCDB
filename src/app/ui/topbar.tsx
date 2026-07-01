import UserMenu from "./user-menu";

export default function Topbar() {
  return (
    <header className="topbar">
      <div>
        <span className="topbar-kicker">Research Console</span>
        <strong>Compound curation workspace</strong>
      </div>
      <UserMenu />
    </header>
  );
}
