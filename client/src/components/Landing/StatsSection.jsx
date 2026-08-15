import { motion } from 'framer-motion';
import { HERO_STATS } from './landingData';

export default function StatsSection() {
  return (
    <section className="landing-light-surface relative z-10 py-16 bg-landing-features" aria-label="Platform Statistics">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-10">
          <p className="text-sm font-medium text-primary uppercase tracking-wider">Trusted by users worldwide</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {HERO_STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ }}
              whileInView={{ }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ duration: 0.4, }}
              className="text-center p-6 rounded-2xl bg-surface backdrop-blur-glass border border-border"
            >
              <p className="text-3xl md:text-4xl font-bold text-text-primary mb-1">{stat.value}</p>
              <p className="text-sm text-text-secondary">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
