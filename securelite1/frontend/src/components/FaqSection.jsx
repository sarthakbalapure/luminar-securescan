export default function FaqSection() {
  const faqs = [
    ["How fast is a scan?", "Most first-pass scans complete in under a minute, depending on the site and module selection."],
    ["Do I need technical knowledge?", "No. SecureLite is designed to explain vulnerabilities in plain language and provide action-focused next steps."],
    ["Can I share reports?", "Yes. Reports are downloadable and designed to be shared with developers, hosting providers, or internal stakeholders."],
    ["Does this replace a security team?", "It helps smaller teams monitor and understand risk, but deeper remediation may still require a developer or specialist."]
  ];

  return (
    <section className="marketing-section">
      <div className="section-heading">
        <span className="eyebrow">FAQ</span>
        <h2>Everything a buyer needs before starting</h2>
      </div>
      <div className="faq-grid">
        {faqs.map(([question, answer]) => (
          <article key={question} className="panel faq-card">
            <h3>{question}</h3>
            <p>{answer}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
