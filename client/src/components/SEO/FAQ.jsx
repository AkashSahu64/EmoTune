import { Helmet } from 'react-helmet-async';
import { FAQPageSchema } from '../../utils/schema';

export default function FAQ({ questions, title = 'Frequently Asked Questions' }) {
  const schema = FAQPageSchema({ questions });

  return (
    <>
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>
      <section aria-label="Frequently Asked Questions" className="space-y-4">
        <h2 className="text-2xl font-bold text-text-primary dark:text-text-primary-dark">{title}</h2>
        <div className="space-y-3">
          {questions.map((faq, i) => (
            <details
              key={i}
              className="bg-surface dark:bg-surface-dark backdrop-blur-glass border border-border dark:border-border-dark p-4 rounded-xl group"
              itemScope
              itemProp="mainEntity"
              itemType="https://schema.org/Question"
            >
              <summary
                className="cursor-pointer text-text-primary dark:text-text-primary-dark font-medium flex items-center justify-between gap-2"
                aria-expanded="false"
              >
                <span itemProp="name">{faq.question}</span>
                <svg
                  className="w-4 h-4 text-text-secondary dark:text-text-secondary-dark transition-transform group-open:rotate-180 flex-shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </summary>
              <div
                className="mt-3 text-sm text-text-secondary dark:text-text-secondary-dark leading-relaxed"
                itemScope
                itemProp="acceptedAnswer"
                itemType="https://schema.org/Answer"
              >
                <div itemProp="text">{faq.answer}</div>
              </div>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
