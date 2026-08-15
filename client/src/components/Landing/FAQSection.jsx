import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FAQ_DATA } from './landingData';
import { FiChevronDown } from 'react-icons/fi';

function AccordionItem({ faq, isOpen, onToggle }) {
  return (
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 py-5 text-left text-text-primary font-medium text-base hover:text-primary transition-colors"
        aria-expanded={isOpen}
        type="button"
      >
        <span>{faq.question}</span>
        <motion.div
          animate={{}}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0 text-text-secondary"
        >
          <FiChevronDown size={18} />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="content"
            initial={{ height: 0, }}
            animate={{ height: 'auto', }}
            exit={{ height: 0, }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-sm text-text-secondary leading-relaxed">{faq.answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <section id="faq" className="landing-light-surface relative z-10 py-24 bg-landing-features" aria-labelledby="faq-title">
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-12">
          <p className="text-sm font-medium text-primary uppercase tracking-wider mb-3">FAQ</p>
          <h2 id="faq-title" className="text-[36px] md:text-[42px] font-bold text-text-primary mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-[17px] text-text-secondary">
            Everything you need to know about Emotume.
          </p>
        </div>

        <div className="rounded-2xl bg-surface backdrop-blur-glass border border-border px-6">
          {FAQ_DATA.map((faq, i) => (
            <AccordionItem
              key={i}
              faq={faq}
              isOpen={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? null : i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
