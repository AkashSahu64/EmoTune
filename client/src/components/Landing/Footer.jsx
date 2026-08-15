import { SOCIAL_LINKS, FOOTER_LINKS } from './landingData';
import { FiLinkedin, FiMail, FiHeart } from 'react-icons/fi';
import TextLogo from '../common/TextLogo';

export default function Footer() {
  return (
    <footer className="landing-footer-surface relative z-10 border-t border-border bg-landing-footer" role="contentinfo">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <img src="/logo.png" alt="Emotume brand icon" className="w-11 h-11" />
              <TextLogo showDecoration={false} />
            </div>
            <p className="text-sm text-text-secondary leading-relaxed max-w-[240px]">
              AI-powered messaging for the modern era. Smart, secure, and built for real connections.
            </p>
            <div className="flex items-center gap-3 mt-6">
              <a href={SOCIAL_LINKS.linkedin} aria-label="LinkedIn" className="w-9 h-9 rounded-lg bg-surface-elevated backdrop-blur-glass border border-border flex items-center justify-center text-text-secondary hover:text-text-primary hover:border-primary/30 transition-colors">
                <FiLinkedin size={16} />
              </a>
              <a href={SOCIAL_LINKS.email} aria-label="Email" className="w-9 h-9 rounded-lg bg-surface-elevated backdrop-blur-glass border border-border flex items-center justify-center text-text-secondary hover:text-text-primary hover:border-primary/30 transition-colors">
                <FiMail size={16} />
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-text-primary mb-4">Product</h4>
            <ul className="space-y-3">
              {FOOTER_LINKS.product.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-sm text-text-secondary hover:text-text-primary transition-colors">{link.label}</a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-text-primary mb-4">Resources</h4>
            <ul className="space-y-3">
              {FOOTER_LINKS.resources.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-sm text-text-secondary hover:text-text-primary transition-colors">{link.label}</a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-text-primary mb-4">Legal</h4>
            <ul className="space-y-3">
              {FOOTER_LINKS.legal.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-sm text-text-secondary hover:text-text-primary transition-colors">{link.label}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-text-secondary">
          <p className="flex items-center gap-1">
            &copy; {new Date().getFullYear()} Emotume. Made with <FiHeart className="text-[var(--color-ai)]" size={12} /> for better conversations.
          </p>
          <nav aria-label="Footer bottom navigation" className="flex gap-6">
            <a href="#" className="hover:text-text-primary transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-text-primary transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-text-primary transition-colors">Contact</a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
