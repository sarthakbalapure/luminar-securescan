import { Link } from "react-router-dom";

export default function AuthShell({
  title,
  subtitle,
  children,
  footerText,
  footerLink,
  footerLinkText,
  helperLink,
  helperLabel
}) {
  return (
    <div className="auth-layout">
      <div className="auth-card">
        <div className="brand-pill">SecureLite</div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
        {helperLink ? (
          <div className="auth-helper-link">
            <Link to={helperLink}>{helperLabel}</Link>
          </div>
        ) : null}
        {children}
        <div className="auth-footer">
          <span>{footerText}</span>
          <Link to={footerLink}>{footerLinkText}</Link>
        </div>
      </div>
    </div>
  );
}
