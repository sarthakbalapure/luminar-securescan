import { useState } from "react";
import LoadingAnimation from "./LoadingAnimation.jsx";

const scanOptions = [
  { value: "full", label: "Full website scan" },
  { value: "sql", label: "SQL injection" },
  { value: "xss", label: "XSS / CSRF" },
  { value: "ssl", label: "SSL / HTTPS" },
  { value: "ports", label: "Open ports" },
  { value: "config", label: "Config / headers" },
  { value: "malware", label: "Malware / reputation" }
];

export default function ScanForm({ onSubmit, loading }) {
  const [targetUrl, setTargetUrl] = useState("https://example.com");
  const [scanType, setScanType] = useState("full");

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({ targetUrl, scanType });
  };

  return (
    <form className="scan-form" onSubmit={handleSubmit}>
      <div>
        <h3>Run a website scan</h3>
        <p>
          Paste your website address below. A live scan overlay will appear here, show each scan step in order, and
          turn completed steps green automatically.
        </p>
      </div>
      <div className="scan-mode-row">
        {scanOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`scan-mode-pill ${scanType === option.value ? "active" : ""}`}
            onClick={() => setScanType(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="scan-form-row">
        <input
          type="url"
          value={targetUrl}
          onChange={(event) => setTargetUrl(event.target.value)}
          placeholder="https://yourwebsite.com"
          required
        />
        <button className="primary-button" type="submit" disabled={loading}>
          {loading ? "Scanning..." : "Start scan"}
        </button>
      </div>
      {loading ? <LoadingAnimation /> : null}
    </form>
  );
}
