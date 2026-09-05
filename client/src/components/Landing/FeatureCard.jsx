import { motion } from 'framer-motion';

export default function FeatureCard({ feature, index }) {
  const Icon = feature.icon;
  return (
    <motion.article
      initial={{ }}
      whileInView={{ }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, }}
      className="group relative p-6 rounded-2xl bg-surface dark:bg-surface-dark backdrop-blur-glass border border-border dark:border-border-dark hover:border-primary/30 dark:hover:border-primary-dark/30 transition-colors"
    >
      <div
        className="landing-feature-icon w-11 h-11 rounded-xl flex items-center justify-center mb-4"
        style={{ '--feature-color': feature.color }}
        aria-hidden="true"
      >
        <Icon size={20} />
      </div>
      <h3 className="text-[22px] font-semibold text-text-primary dark:text-text-primary-dark mb-2">{feature.title}</h3>
      <p className="text-[17px] text-text-secondary dark:text-text-secondary-dark leading-relaxed mb-4">{feature.desc}</p>
      <ul className="space-y-1.5">
        {feature.benefits.map((b) => (
          <li key={b} className="flex items-center gap-2 text-sm text-text-secondary dark:text-text-secondary-dark">
            <div className="w-1 h-1 rounded-full bg-primary dark:bg-primary-dark" />
            {b}
          </li>
        ))}
      </ul>
    </motion.article>
  );
}
