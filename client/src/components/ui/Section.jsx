const Section = ({ title, description, children, className = '', ...props }) => (
  <section className={`mb-6 ${className}`} {...props}>
    {(title || description) && (
      <div className="mb-3 px-1">
        {title && <h3 className="text-xs font-semibold text-text-secondary dark:text-text-secondary-dark uppercase tracking-wider">{title}</h3>}
        {description && <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-1">{description}</p>}
      </div>
    )}
    {children}
  </section>
);

export default Section;
