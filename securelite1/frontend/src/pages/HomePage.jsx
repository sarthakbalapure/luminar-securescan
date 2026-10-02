import { Link } from "react-router-dom";
import HeroSection from "../components/HeroSection.jsx";
import TrustedBySection from "../components/TrustedBySection.jsx";
import SecurityScannerSection from "../components/SecurityScannerSection.jsx";
import FeatureGrid from "../components/FeatureGrid.jsx";
import DashboardPreviewSection from "../components/DashboardPreviewSection.jsx";
import TestimonialsSection from "../components/TestimonialsSection.jsx";
import PricingSection from "../components/PricingSection.jsx";
import FaqSection from "../components/FaqSection.jsx";
import SiteFooter from "../components/SiteFooter.jsx";

export default function HomePage() {
  return (
    <div className="marketing-page">
      <header className="marketing-header">
        <div className="marketing-brand">
          <div className="brand-pill">SecureLite</div>
          <span className="marketing-tag">Cybersecurity platform for modern small teams</span>
        </div>
        <nav className="marketing-nav">
          <a href="#scanner">Scanner</a>
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <Link to="/login">Customer login</Link>
          <Link to="/owner/login">Owner login</Link>
          <Link className="primary-button" to="/signup">
            Start free setup
          </Link>
        </nav>
      </header>
      <HeroSection />
      <TrustedBySection />
      <div id="scanner">
        <SecurityScannerSection />
      </div>
      <div id="features">
        <FeatureGrid />
      </div>
      <DashboardPreviewSection />
      <TestimonialsSection />
      <div id="pricing">
        <PricingSection />
      </div>
      <FaqSection />
      <SiteFooter />
    </div>
  );
}
