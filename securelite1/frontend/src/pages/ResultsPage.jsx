import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../api/client.js";
import Layout from "../components/Layout.jsx";
import ResultsSummary from "../components/ResultsSummary.jsx";
import IssueList from "../components/IssueList.jsx";
import LoadingAnimation from "../components/LoadingAnimation.jsx";
import InfrastructureCard from "../components/InfrastructureCard.jsx";
import MalwareCard from "../components/MalwareCard.jsx";
import PlanCard from "../components/PlanCard.jsx";
import SubscriptionPrompt from "../components/SubscriptionPrompt.jsx";
import ReportUsageGuide from "../components/ReportUsageGuide.jsx";
import { useAuth } from "../hooks/useAuth.js";

export default function ResultsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [scan, setScan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchScan = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/scans/${id}`);
        setScan(response.data.data);
      } catch (apiError) {
        setError(apiError.response?.data?.message || "We could not load this report.");
      } finally {
        setLoading(false);
      }
    };

    fetchScan();
  }, [id]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleDownloadReport = async () => {
    if (!scan) {
      return;
    }

    try {
      const response = await api.get(`/scans/${scan._id}/report.pdf`, {
        responseType: "blob"
      });

      const blob = new Blob([response.data], { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `securelite-report-${scan.domain}.pdf`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (apiError) {
      setError(apiError.response?.data?.message || "We could not download the PDF report.");
    }
  };

  return (
    <Layout user={user} onLogout={handleLogout}>
      <motion.div className="content-stack results-shell" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="page-header results-header">
          <div>
            <span className="eyebrow">Results page</span>
            <h1>Security report in plain English</h1>
            <p>See what was found, why it matters, and what to fix next.</p>
          </div>
          {scan ? (
            <div className="results-actions">
              <button className="secondary-button" type="button" onClick={() => navigate("/dashboard")}>
                Back to dashboard
              </button>
              <button className="primary-button" type="button" onClick={handleDownloadReport}>
                Download report
              </button>
            </div>
          ) : null}
        </div>

        {loading ? <LoadingAnimation label="Loading your report..." /> : null}
        {error ? <div className="banner-error">{error}</div> : null}

        {scan ? (
          <>
            <ResultsSummary scan={scan} />
            <SubscriptionPrompt scan={scan} />
            <PlanCard user={user} />
            <InfrastructureCard latestScan={scan} />
            <MalwareCard latestScan={scan} />
            <IssueList issues={scan.issues || []} fixes={scan.fixes || []} />
            <ReportUsageGuide scan={scan} />
          </>
        ) : null}
      </motion.div>
    </Layout>
  );
}
