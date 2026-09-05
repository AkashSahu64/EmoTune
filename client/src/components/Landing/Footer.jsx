import { SOCIAL_LINKS, FOOTER_LINKS } from './landingData';
import { FiLinkedin, FiMail, FiHeart } from 'react-icons/fi';

export default function Footer() {
  return (
    <footer className="landing-footer-surface relative z-10 border-t border-border dark:border-border-dark bg-landing dark:bg-landing-dark-footer" role="contentinfo">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <img src="/logo.png" alt="Emotune" className="w-11 h-11 object-contain" />
              <TextLogo showDecoration={false} />
            </div>
            <p className="text-sm text-text-secondary dark:text-text-secondary-dark leading-relaxed max-w-[240px]">
              AI-powered messaging for the modern era. Smart, secure, and built for real connections.
            </p>
            <div className="flex items-center gap-3 mt-6">
              <a href={SOCIAL_LINKS.linkedin} aria-label="LinkedIn" className="w-9 h-9 rounded-lg bg-surface-elevated dark:bg-surface-elevated-dark backdrop-blur-glass border border-border dark:border-border-dark flex items-center justify-center text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark hover:border-primary/30 dark:hover:border-primary-dark/30 transition-colors">
                <FiLinkedin size={16} />
              </a>
              <a href={SOCIAL_LINKS.email} aria-label="Email" className="w-9 h-9 rounded-lg bg-surface-elevated dark:bg-surface-elevated-dark backdrop-blur-glass border border-border dark:border-border-dark flex items-center justify-center text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark hover:border-primary/30 dark:hover:border-primary-dark/30 transition-colors">
                <FiMail size={16} />
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark mb-4">Product</h4>
            <ul className="space-y-3">
              {FOOTER_LINKS.product.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-sm text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark transition-colors">{link.label}</a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark mb-4">Resources</h4>
            <ul className="space-y-3">
              {FOOTER_LINKS.resources.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-sm text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark transition-colors">{link.label}</a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark mb-4">Legal</h4>
            <ul className="space-y-3">
              {FOOTER_LINKS.legal.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-sm text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark transition-colors">{link.label}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-border dark:border-border-dark flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-text-secondary dark:text-text-secondary-dark">
          <p className="flex items-center gap-1">
            &copy; {new Date().getFullYear()} Emotume. Made with <FiHeart className="text-[#7C3AED]" size={12} /> for better conversations.
          </p>
          <nav aria-label="Footer bottom navigation" className="flex gap-6">
            <a href="#" className="hover:text-text-primary dark:hover:text-text-primary-dark transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-text-primary dark:hover:text-text-primary-dark transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-text-primary dark:hover:text-text-primary-dark transition-colors">Contact</a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
import TextLogo from '../common/TextLogo';
