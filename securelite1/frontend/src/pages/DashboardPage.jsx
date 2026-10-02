import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../api/client.js";
import Layout from "../components/Layout.jsx";
import ScanForm from "../components/ScanForm.jsx";
import ScoreCard from "../components/ScoreCard.jsx";
import IssueList from "../components/IssueList.jsx";
import ScanHistoryTable from "../components/ScanHistoryTable.jsx";
import InfrastructureCard from "../components/InfrastructureCard.jsx";
import PlanCard from "../components/PlanCard.jsx";
import AdminOverview from "../components/AdminOverview.jsx";
import ScanOverlay from "../components/ScanOverlay.jsx";
import DashboardInsights from "../components/DashboardInsights.jsx";
import ThreatActivityPanel from "../components/ThreatActivityPanel.jsx";
import { useAuth } from "../hooks/useAuth.js";

const orderedSteps = ["sql", "xss", "ssl", "ports", "config", "malware"];

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout, loading: authLoading } = useAuth();
  const [scans, setScans] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState("");
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [overlayTargetUrl, setOverlayTargetUrl] = useState("");
  const [activeStep, setActiveStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      if (user?.role === "owner") {
        const response = await api.get("/admin/overview");
        setOverview(response.data.data);
      } else {
        const response = await api.get("/scans");
        setScans(response.data.data);
      }
    } catch (apiError) {
      setError(apiError.response?.data?.message || "We could not load your dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchDashboardData();
    }
  }, [authLoading, user]);

  const handleScan = async (payload) => {
    try {
      setSubmitLoading(true);
      setError("");
      setOverlayVisible(true);
      setOverlayTargetUrl(payload.targetUrl);
      setActiveStep(0);
      setCompletedSteps([]);

      let progressIndex = 0;
      const intervalId = window.setInterval(() => {
        setCompletedSteps((current) => {
          if (current.length >= orderedSteps.length) {
            window.clearInterval(intervalId);
            return current;
          }

          const nextStep = orderedSteps[current.length];
          return [...current, nextStep];
        });

        progressIndex += 1;
        setActiveStep(Math.min(progressIndex, orderedSteps.length - 1));
      }, 1200);

      const endpoint = payload.scanType === "full" ? "/scans" : `/scans/${payload.scanType}`;
      const response = await api.post(endpoint, { targetUrl: payload.targetUrl });
      const newScan = response.data.data;
      setScans((current) => [newScan, ...current]);

      const finalize = () => {
        window.clearInterval(intervalId);
        setCompletedSteps(orderedSteps);
        setActiveStep(orderedSteps.length - 1);
        window.setTimeout(() => {
          setOverlayVisible(false);
          navigate(`/results/${newScan._id}`);
        }, 1000);
      };

      if (progressIndex >= orderedSteps.length) {
        finalize();
      } else {
        const waitTimer = window.setInterval(() => {
          if (progressIndex >= orderedSteps.length) {
            window.clearInterval(waitTimer);
            finalize();
          }
        }, 200);
      }
    } catch (apiError) {
      setError(apiError.response?.data?.message || "We could not run that scan.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleCloseOverlay = () => {
    setOverlayVisible(false);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const latestScan = scans[0];
  const isOwner = user?.role === "owner";

  return (
    <Layout user={user} onLogout={handleLogout}>
      <ScanOverlay
        visible={overlayVisible}
        targetUrl={overlayTargetUrl}
        activeStep={activeStep}
        completedSteps={completedSteps}
        error={error}
        onClose={handleCloseOverlay}
      />
      <motion.div className="page-header" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div>
          <span className="eyebrow">{isOwner ? "Owner dashboard" : "Dashboard"}</span>
          <h1>{isOwner ? "Monitor the SecureLite platform" : "Your website security, simplified"}</h1>
          <p>
            {isOwner
              ? "Review customer growth, recent activity, and overall product usage."
              : "Run scans, track past results, and understand exactly what to fix next."}
          </p>
        </div>
      </motion.div>

      {isOwner ? null : <ScanForm onSubmit={handleScan} loading={submitLoading} />}
      {error ? <div className="banner-error">{error}</div> : null}

      {isOwner ? null : (
        <>
          <DashboardInsights scans={scans} />
          <div className="dashboard-grid">
            <ScoreCard latestScan={latestScan} />
            <InfrastructureCard latestScan={latestScan} />
          </div>
          <ThreatActivityPanel scans={scans} />
        </>
      )}

      {loading ? (
        <div className="panel">Loading dashboard...</div>
      ) : (
        <>
          <PlanCard user={user} />
          {isOwner ? (
            <AdminOverview overview={overview} />
          ) : (
            <>
              <IssueList issues={latestScan?.issues || []} fixes={latestScan?.fixes || []} />
              <ScanHistoryTable scans={scans} />
            </>
          )}
        </>
      )}
    </Layout>
  );
}
