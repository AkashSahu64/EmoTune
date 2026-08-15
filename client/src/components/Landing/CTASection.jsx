import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowRight, FiShield, FiZap, FiClock } from 'react-icons/fi';

export default function CTASection() {
  return (
    <section className="landing-light-surface relative z-10 py-24 bg-landing-cta" aria-labelledby="cta-title">
      <div className="max-w-4xl mx-auto px-6">
        <motion.div
          initial={{ }}
          whileInView={{ }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.5 }}
          className="relative p-8 md:p-12 rounded-3xl bg-surface backdrop-blur-glass border border-border text-center overflow-hidden"
        >
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-primary opacity-[0.04] rounded-full blur-[80px]" />
            <div className="absolute bottom-0 left-0 w-[250px] h-[250px] bg-[var(--color-ai)] opacity-[0.03] rounded-full blur-[80px]" />
          </div>

          <div className="relative z-10">
            <h2 id="cta-title" className="text-[36px] md:text-[42px] font-bold text-text-primary mb-4">
              Ready to Transform Your Conversations?
            </h2>
            <p className="text-[17px] text-text-secondary mb-8 max-w-xl mx-auto">
              Join thousands of users already experiencing the future of AI-powered messaging. No credit card required.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
              <Link to="/signup">
                <button
                  className="inline-flex items-center gap-2 px-8 py-4 text-base font-medium text-white bg-primary hover:bg-primary rounded-xl transition-colors shadow-lg shadow-[var(--theme-primary)]/25"
                  type="button"
                >
                  Get Started Free
                  <FiArrowRight size={18} />
                </button>
              </Link>
              <Link to="/login">
                <button
                  className="px-8 py-4 text-base font-medium text-text-primary bg-surface-elevated backdrop-blur-glass border border-border hover:bg-surface-elevated backdrop-blur-glass rounded-xl transition-colors"
                  type="button"
                >
                  Sign In
                </button>
              </Link>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-text-secondary">
              <span className="flex items-center gap-1.5">
                <FiShield size={14} className="text-success" />
                End-to-end encrypted
              </span>
              <span className="flex items-center gap-1.5">
                <FiZap size={14} className="text-warning" />
                No credit card required
              </span>
              <span className="flex items-center gap-1.5">
                <FiClock size={14} className="text-primary" />
                Free forever tier
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
