import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthShell from "../components/AuthShell.jsx";
import AuthForm from "../components/AuthForm.jsx";
import { useAuth } from "../hooks/useAuth.js";

export default function LoginPage({ ownerMode = false }) {
  const navigate = useNavigate();
  const { login, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (payload) => {
    setLoading(true);
    setError("");

    try {
      const authData = await login(payload);

      if (ownerMode && authData.user.role !== "owner") {
        logout();
        setError("This login page is only for the SecureLite owner account.");
        return;
      }

      navigate("/dashboard");
    } catch (apiError) {
      setError(apiError.response?.data?.message || "We could not log you in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title={ownerMode ? "Owner login" : "Welcome back"}
      subtitle={
        ownerMode
          ? "Sign in as the SecureLite owner to manage customers and platform activity."
          : "Scan your website and understand your security in plain English."
      }
      footerText={ownerMode ? "Need the public user area?" : "New to SecureLite?"}
      footerLink={ownerMode ? "/login" : "/signup"}
      footerLinkText={ownerMode ? "Go to customer login" : "Create an account"}
      helperLink="/"
      helperLabel="Back to home"
    >
      <AuthForm mode="login" onSubmit={handleSubmit} loading={loading} error={error} ownerMode={ownerMode} />
    </AuthShell>
  );
}
