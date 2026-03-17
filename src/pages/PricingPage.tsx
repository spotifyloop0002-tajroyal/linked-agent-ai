import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import Pricing from "@/components/landing/Pricing";
import SEOHead from "@/components/SEOHead";

const PricingPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Pricing – Affordable LinkedIn Automation Plans"
        description="Choose the right LinkedBot plan for your LinkedIn growth. Free trial available. Automate posts, schedule content, and track analytics starting at affordable prices."
        canonical="https://linkedbot.online/pricing"
      />
      <Navbar />
      <main className="pt-24">
        <Pricing />
      </main>
      <Footer />
    </div>
  );
};

export default PricingPage;
