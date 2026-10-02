export default function TestimonialsSection() {
  const testimonials = [
    {
      quote: "SecureLite gave our agency a clearer way to explain security risk to clients without frightening them.",
      name: "Maya Shah",
      role: "Founder, Nova Growth Studio"
    },
    {
      quote: "The reports are professional enough to share with our developer and simple enough for our leadership team.",
      name: "Adrian Cole",
      role: "COO, Lumen Retail"
    },
    {
      quote: "We finally have a security dashboard that feels modern instead of intimidating.",
      name: "Ritika Menon",
      role: "Head of Ops, Atlas Learning"
    }
  ];

  return (
    <section className="marketing-section">
      <div className="section-heading">
        <span className="eyebrow">Testimonials</span>
        <h2>Trusted by teams that need confidence fast</h2>
      </div>
      <div className="testimonial-grid">
        {testimonials.map((item) => (
          <article key={item.name} className="panel testimonial-card">
            <p>"{item.quote}"</p>
            <strong>{item.name}</strong>
            <span>{item.role}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
