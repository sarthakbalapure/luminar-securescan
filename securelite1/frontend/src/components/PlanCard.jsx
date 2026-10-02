export default function PlanCard({ user }) {
  const plan = user?.plan;
  const remaining = Math.max((plan?.scanLimitMonthly || 0) - (plan?.scansUsedThisMonth || 0), 0);

  return (
    <section className="panel">
      <div className="panel-header">
        <h3>Your plan</h3>
        <span>{user?.role === "owner" ? "Internal access" : "Customer billing"}</span>
      </div>
      <div className="infrastructure-grid">
        <div className="mini-card">
          <span>Plan name</span>
          <strong>{plan?.name || "Starter"}</strong>
          <p>
            {user?.role === "owner"
              ? "Owner account with unrestricted internal access."
              : `Rs ${plan?.priceInr || 50} billed ${plan?.billingCycle || "monthly"}.`}
          </p>
        </div>
        <div className="mini-card">
          <span>Usage</span>
          <strong>
            {user?.role === "owner" ? "Unlimited owner scans" : `${remaining} scans left this month`}
          </strong>
          <p>
            {user?.role === "owner"
              ? "Use this account to monitor customers and product activity."
              : `${plan?.scansUsedThisMonth || 0} of ${plan?.scanLimitMonthly || 10} scans used.`}
          </p>
        </div>
      </div>
    </section>
  );
}
