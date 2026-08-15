import { motion } from 'framer-motion';
import { WHY_CHOOSE_US } from './landingData';

export default function WhyChooseUs() {
  return (
    <section className="landing-light-surface relative z-10 py-24 bg-landing-light" aria-labelledby="why-title">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-sm font-medium text-primary uppercase tracking-wider mb-3">Why Choose Us</p>
          <h2 id="why-title" className="text-[36px] md:text-[42px] font-bold text-text-primary mb-4">
            Built Different
          </h2>
          <p className="text-[17px] text-text-secondary max-w-2xl mx-auto">
            We combine cutting-edge AI with a focus on privacy, performance, and user experience.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {WHY_CHOOSE_US.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                initial={{ }}
                whileInView={{ }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ duration: 0.4, }}
                className="p-6 rounded-2xl bg-surface backdrop-blur-glass border border-border hover:border-primary/30 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4" aria-hidden="true">
                  <Icon size={18} />
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">{item.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{item.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
