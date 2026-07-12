import Navbar from "@/components/site/Navbar";
import Hero from "@/components/site/Hero";
import Services from "@/components/site/Services";
import WhyUs from "@/components/site/WhyUs";
import Portfolio from "@/components/site/Portfolio";
import Process from "@/components/site/Process";
import Pricing from "@/components/site/Pricing";
import BookingSection from "@/components/site/BookingSection";
import Testimonials from "@/components/site/Testimonials";
import CtaBanner from "@/components/site/CtaBanner";
import ContactSection from "@/components/site/ContactSection";
import Footer from "@/components/site/Footer";
import PageViewTracker from "@/components/site/PageViewTracker";
import {
  getPublishedServices,
  getPublishedPortfolio,
  getPricing,
  getPublishedTestimonials,
  getSettings,
} from "@/lib/db";

// Content is managed from the admin panel — render fresh from the DB on
// every request so changes go live immediately.
export const dynamic = "force-dynamic";

export default function HomePage() {
  const services = getPublishedServices();
  const portfolio = getPublishedPortfolio();
  const pricing = getPricing();
  const testimonials = getPublishedTestimonials();
  const settings = getSettings();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: settings.site_name || "DigitalOrbit",
    description:
      "Web design, branding, SEO, digital marketing, and app development for small and medium businesses.",
    email: settings.contact_email,
    telephone: settings.phone,
    slogan: settings.tagline,
    makesOffer: services.map((s) => ({
      "@type": "Offer",
      itemOffered: { "@type": "Service", name: s.title, description: s.description },
    })),
  };

  return (
    <>
      <PageViewTracker />
      <Navbar />
      <main>
        <Hero />
        <Services services={services} />
        <WhyUs />
        <Portfolio items={portfolio} />
        <Process />
        <Pricing tiers={pricing} />
        <BookingSection serviceOptions={services.map((s) => s.title)} />
        <Testimonials testimonials={testimonials} />
        <CtaBanner />
        <ContactSection serviceOptions={services.map((s) => s.title)} settings={settings} />
      </main>
      <Footer settings={settings} services={services} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}
