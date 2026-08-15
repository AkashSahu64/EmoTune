import { motion } from 'framer-motion';
import { TESTIMONIALS } from './landingData';
import { FiStar } from 'react-icons/fi';

function Avatar({ name }) {
  const initials = name.split(' ').map(n => n[0]).join('');
  const colors = ['var(--theme-primary)', 'var(--theme-success)', 'var(--theme-warning)', 'var(--color-ai)', 'var(--color-ai)', 'var(--color-ghost)'];
  const colorIndex = name.length % colors.length;
  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
      style={{ backgroundColor: colors[colorIndex] }}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}

export default function Testimonials() {
  return (
    <section className="landing-light-surface relative z-10 py-24 bg-landing-light" aria-labelledby="testimonials-title">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-sm font-medium text-primary uppercase tracking-wider mb-3">Testimonials</p>
          <h2 id="testimonials-title" className="text-[36px] md:text-[42px] font-bold text-text-primary mb-4">
            Loved by Users
          </h2>
          <p className="text-[17px] text-text-secondary max-w-xl mx-auto">
            See what our users have to say about their experience.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ }}
              whileInView={{ }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ duration: 0.4, }}
              className="p-6 rounded-2xl bg-surface backdrop-blur-glass border border-border hover:border-primary/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-3">
                {Array.from({ length: 5 }).map((_, j) => (
                  <FiStar
                    key={j}
                    className={j < t.rating ? 'text-warning' : 'text-[var(--theme-border)]'}
                    size={14}
                    fill={j < t.rating ? 'var(--theme-warning)' : 'none'}
                  />
                ))}
              </div>
              <p className="text-[15px] text-text-secondary leading-relaxed mb-4">&ldquo;{t.review}&rdquo;</p>
              <div className="flex items-center gap-3">
                <Avatar name={t.name} />
                <div>
                  <p className="text-sm font-medium text-text-primary">{t.name}</p>
                  <p className="text-xs text-text-secondary">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
