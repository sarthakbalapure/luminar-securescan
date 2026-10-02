import { Link } from "react-router-dom";

export default function ScanHistoryTable({ scans = [] }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h3>Scan history</h3>
        <span>{scans.length} total scans</span>
      </div>
      {scans.length === 0 ? (
        <p className="empty-state">Your completed scans will appear here.</p>
      ) : (
        <div className="history-table">
          <div className="history-row history-head">
            <span>Website</span>
            <span>Type</span>
            <span>Score</span>
            <span>Status</span>
            <span>Scanned</span>
          </div>
          {scans.map((scan) => (
            <div key={scan._id} className="history-row">
              <span>
                <Link to={`/results/${scan._id}`}>{scan.domain}</Link>
              </span>
              <span>{scan.scanType}</span>
              <span>{scan.securityScore}/100</span>
              <span className={`status-pill ${scan.status}`}>{scan.status}</span>
              <span>{new Date(scan.createdAt).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
