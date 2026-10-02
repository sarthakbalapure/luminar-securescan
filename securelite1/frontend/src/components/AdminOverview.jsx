export default function AdminOverview({ overview }) {
  const metrics = overview?.metrics || {};

  return (
    <section className="panel">
      <div className="panel-header">
        <h3>Owner overview</h3>
        <span>Internal dashboard</span>
      </div>
      <div className="admin-metric-grid">
        <div className="mini-card">
          <span>Total users</span>
          <strong>{metrics.totalUsers || 0}</strong>
        </div>
        <div className="mini-card">
          <span>Public users</span>
          <strong>{metrics.publicUsers || 0}</strong>
        </div>
        <div className="mini-card">
          <span>Owner accounts</span>
          <strong>{metrics.ownerUsers || 0}</strong>
        </div>
        <div className="mini-card">
          <span>Total scans</span>
          <strong>{metrics.totalScans || 0}</strong>
        </div>
      </div>
      <div className="owner-columns">
        <div className="mini-card">
          <span>Plans</span>
          {(overview?.planBreakdown || []).length ? (
            overview.planBreakdown.map((item) => (
              <div className="owner-list-row" key={item.plan}>
                <strong>{item.plan}</strong>
                <span>{item.count} users</span>
              </div>
            ))
          ) : (
            <p>No customers yet.</p>
          )}
        </div>
        <div className="mini-card">
          <span>Recent customers</span>
          {(overview?.recentUsers || []).length ? (
            overview.recentUsers.map((item) => (
              <div className="owner-list-row" key={item._id}>
                <strong>{item.name}</strong>
                <span>{item.email}</span>
              </div>
            ))
          ) : (
            <p>No signups yet.</p>
          )}
        </div>
      </div>
    </section>
  );
}
