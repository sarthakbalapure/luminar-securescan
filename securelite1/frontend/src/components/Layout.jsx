const navItems = [
  ["Dashboard", true],
  ["Scans", false],
  ["Reports", false],
  ["Monitoring", false],
  ["Threat Intelligence", false],
  ["Settings", false]
];

export default function Layout({ user, onLogout, children }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand-pill">SecureLite</div>
          <h2>Security operations for modern websites</h2>
          <p>Enterprise-grade scanning, trust-building reports, and clear next steps in one focused workspace.</p>
        </div>

        <nav className="sidebar-nav" aria-label="Primary">
          {navItems.map(([label, active]) => (
            <button key={label} type="button" className={`sidebar-link ${active ? "active" : ""}`}>
              <span className="sidebar-link-dot" />
              {label}
              {!active ? <small>Soon</small> : null}
            </button>
          ))}
        </nav>

        <div className="sidebar-card">
          <span>Platform status</span>
          <strong>All core scanners operational</strong>
          <p>Live monitoring, report exports, and reputation intelligence are ready for review.</p>
        </div>

        <div className="sidebar-user">
          <div>
            <strong>{user?.name}</strong>
            <span>{user?.companyName || user?.email}</span>
          </div>
          <button className="secondary-button" onClick={onLogout}>
            Log out
          </button>
        </div>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}
