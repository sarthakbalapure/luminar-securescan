import { Link } from "react-router-dom";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-brand">
        <div className="brand-pill">SecureLite</div>
        <p>Modern website security monitoring for fast-moving businesses.</p>
      </div>
      <div className="footer-links">
        <Link to="/signup">Start free setup</Link>
        <Link to="/login">Customer login</Link>
        <Link to="/owner/login">Owner access</Link>
      </div>
    </footer>
  );
}
