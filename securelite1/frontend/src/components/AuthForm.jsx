import { useState } from "react";

const initialForm = {
  name: "",
  email: "",
  password: "",
  companyName: ""
};

export default function AuthForm({ mode, onSubmit, loading, error, ownerMode = false }) {
  const [form, setForm] = useState(initialForm);

  const handleChange = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const payload =
      mode === "signup"
        ? form
        : {
            email: form.email,
            password: form.password
          };

    onSubmit(payload);
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      {mode === "signup" && (
        <>
          <label>
            Full name
            <input name="name" value={form.name} onChange={handleChange} placeholder="Jane Owner" required />
          </label>
          <label>
            Company name
            <input
              name="companyName"
              value={form.companyName}
              onChange={handleChange}
              placeholder="Bright Bakery"
            />
          </label>
        </>
      )}
      {ownerMode ? <div className="form-note">Owner access is reserved for internal SecureLite administrators.</div> : null}
      <label>
        Email address
        <input
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          placeholder="you@example.com"
          required
        />
      </label>
      <label>
        Password
        <input
          name="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          placeholder="Minimum 8 characters"
          required
        />
      </label>
      {error ? <div className="form-error">{error}</div> : null}
      <button className="primary-button" type="submit" disabled={loading}>
        {loading ? "Please wait..." : mode === "signup" ? "Create account" : "Log in"}
      </button>
    </form>
  );
}
