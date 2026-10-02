import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../api/client.js";
import Layout from "../components/Layout.jsx";
import LoadingAnimation from "../components/LoadingAnimation.jsx";
import ScanStepTracker from "../components/ScanStepTracker.jsx";
import { useAuth } from "../hooks/useAuth.js";

const orderedSteps = ["sql", "xss", "ssl", "ports", "config", "malware"];

export default function ScanSessionPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const targetUrl = query.get("targetUrl") || "";
  const scanType = query.get("scanType") || "full";
  const [activeStep, setActiveStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!targetUrl) {
      navigate("/dashboard");
      return undefined;
    }

    let cancelled = false;
    let intervalId;

    const endpoint = scanType === "full" ? "/scans" : `/scans/${scanType}`;

    const startScan = async () => {
      try {
        const response = await api.post(endpoint, { targetUrl });
        if (cancelled) {
          return;
        }
        setScanResult(response.data.data);
      } catch (apiError) {
        if (!cancelled) {
          setError(apiError.response?.data?.message || "We could not complete the scan.");
        }
      }
    };

    startScan();

    intervalId = window.setInterval(() => {
      setCompletedSteps((current) => {
        if (current.length >= orderedSteps.length) {
          window.clearInterval(intervalId);
          return current;
        }

        const nextStep = orderedSteps[current.length];
        return [...current, nextStep];
      });

      setActiveStep((current) => {
        if (current >= orderedSteps.length - 1) {
          return orderedSteps.length - 1;
        }
        return current + 1;
      });
    }, 1200);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [navigate, scanType, targetUrl]);

  useEffect(() => {
    if (scanResult && completedSteps.length >= orderedSteps.length) {
      const timer = window.setTimeout(() => {
        navigate(`/results/${scanResult._id}`);
      }, 1200);

      return () => window.clearTimeout(timer);
    }

    return undefined;
  }, [completedSteps.length, navigate, scanResult]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <Layout user={user} onLogout={handleLogout}>
      <motion.div className="content-stack results-shell" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="page-header results-header">
          <div>
            <span className="eyebrow">Live scan window</span>
            <h1>Scanning {targetUrl}</h1>
            <p>We are checking five important security areas. Completed steps turn green automatically.</p>
          </div>
        </div>

        {error ? <div className="banner-error">{error}</div> : null}

        {!error ? (
          <>
            <LoadingAnimation label="Your live website scan is running..." />
            <ScanStepTracker activeStep={activeStep} completedSteps={completedSteps} />
            <section className="panel scan-session-note">
              <div className="panel-header">
                <h3>What happens next</h3>
                <span>Automatic flow</span>
              </div>
              <p>
                After all 5 steps finish, this window will automatically open your full report with the score,
                download button, and fix guidance.
              </p>
            </section>
          </>
        ) : null}
      </motion.div>
    </Layout>
  );
}
