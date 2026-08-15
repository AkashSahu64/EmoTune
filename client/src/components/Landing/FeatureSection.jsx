import { FEATURES } from './landingData';
import FeatureCard from './FeatureCard';

export default function FeatureSection() {
  return (
    <section id="features" className="landing-light-surface relative z-10 py-24 bg-landing-features" aria-labelledby="features-title">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-sm font-medium text-primary uppercase tracking-wider mb-3">Features</p>
          <h2 id="features-title" className="text-[36px] md:text-[42px] font-bold text-text-primary mb-4">
            Everything You Need in One Place
          </h2>
          <p className="text-[17px] text-text-secondary max-w-2xl mx-auto">
            From instant messaging to AI-powered intelligence — Emotume brings together all the tools for modern communication.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((feature, index) => (
            <FeatureCard key={feature.title} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
