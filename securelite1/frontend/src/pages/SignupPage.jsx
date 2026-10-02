import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthShell from "../components/AuthShell.jsx";
import AuthForm from "../components/AuthForm.jsx";
import { useAuth } from "../hooks/useAuth.js";

export default function SignupPage() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (payload) => {
    setLoading(true);
    setError("");

    try {
      await signup(payload);
      navigate("/dashboard");
    } catch (apiError) {
      setError(apiError.response?.data?.message || "We could not create your account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Start protecting your website"
      subtitle="Create a public customer account on the Starter plan for Rs 50/month."
      footerText="Already have an account?"
      footerLink="/login"
      footerLinkText="Log in"
      helperLink="/"
      helperLabel="Back to home"
    >
      <AuthForm mode="signup" onSubmit={handleSubmit} loading={loading} error={error} />
    </AuthShell>
  );
}
