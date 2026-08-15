import { Helmet } from 'react-helmet-async';
import SEO from '../components/SEO/SEO';
import {
  WebPageSchema,
  BreadcrumbSchema,
  FAQPageSchema,
  ServiceSchema,
  HowToSchema,
} from '../utils/schema';
import { FAQ_DATA, FEATURES } from '../components/Landing/landingData';
import Hero from '../components/Landing/Hero';
import StatsSection from '../components/Landing/StatsSection';
import FeatureSection from '../components/Landing/FeatureSection';
import ProductShowcase from '../components/Landing/ProductShowcase';
import HowItWorks from '../components/Landing/HowItWorks';
import WhyChooseUs from '../components/Landing/WhyChooseUs';
import Testimonials from '../components/Landing/Testimonials';
import FAQSection from '../components/Landing/FAQSection';
import CTASection from '../components/Landing/CTASection';
import Footer from '../components/Landing/Footer';

const howToSteps = [
  { number: '01', name: 'Create Account', text: 'Sign up in seconds with email or Google.' },
  { number: '02', name: 'Connect & Chat', text: 'Start conversations with friends or groups in real-time.' },
  { number: '03', name: 'Unlock AI Features', text: 'Experience emotion analysis, smart replies, and AI-powered tools.' },
  { number: '04', name: 'Stay Connected', text: 'Sync across all devices with instant notifications.' },
];

export default function LandingPage() {
  const webPageSchema = WebPageSchema({
    title: 'Emotume - AI-Powered Emotional Chat Experience',
    description: 'The world\'s first AI-powered emotional chat platform with real-time emotion analysis, AI song suggestions, shayari generation, and intelligent conversations.',
    url: 'https://emotune.app',
    datePublished: '2024-01-01',
    dateModified: new Date().toISOString(),
  });

  const breadcrumbSchema = BreadcrumbSchema({
    items: [{ name: 'Home', path: '/' }],
  });

  const faqSchema = FAQPageSchema({ questions: FAQ_DATA });

  const serviceSchemas = FEATURES.map((f) =>
    ServiceSchema({ name: f.title, description: f.desc })
  );

  const howToSchema = HowToSchema({
    name: 'How to use Emotume',
    description: 'Get started with Emotune in four simple steps.',
    steps: howToSteps,
  });

  return (
    <>
      <SEO
        title="Feel the Connection"
        description="The world's first AI-powered emotional chat platform. Real-time emotion analysis, AI song suggestions, shayari, memory mesh, and intelligent conversations."
        keywords="AI chat, emotional chat, emotion analysis, AI messaging, real-time chat, shayari, song suggestions, memory mesh, intent streams, Emotume"
        canonical="https://emotune.app"
        image="https://emotune.app/og-image.png"
        imageAlt="Emotume - AI-Powered Emotional Chat Experience"
      />

      <Helmet>
        <script type="application/ld+json">{JSON.stringify(webPageSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(howToSchema)}</script>
        {serviceSchemas.map((schema, i) => (
          <script key={`service-${i}`} type="application/ld+json">{JSON.stringify(schema)}</script>
        ))}
      </Helmet>

    <div className="landing-page-shell bg-landing-page min-h-screen">
      <Hero />
      <StatsSection />
      <FeatureSection />
      <ProductShowcase />
      <HowItWorks />
      <WhyChooseUs />
      <Testimonials />
      <FAQSection />
      <CTASection />
      <Footer />
    </div>
    </>
  );
}
