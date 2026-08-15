const sizeClasses = {
  sm: 'text-lg', md: 'text-2xl', lg: 'text-3xl', xl: 'text-5xl',
};

const decorationSizes = {
  sm: { line: 'w-14', heart: 'text-xs', gap: 'gap-1' },
  md: { line: 'w-24', heart: 'text-sm', gap: 'gap-1.5' },
  lg: { line: 'w-[74px]', heart: 'text-lg', gap: 'gap-2' },
  xl: { line: 'w-32', heart: 'text-2xl', gap: 'gap-2' },
};

export default function TextLogo({ size = 'md', className = '', showDecoration = true }) {
  const decoration = decorationSizes.sm;
  return (
    <span className={`inline-flex flex-col items-start ${className}`} role="img" aria-label="Emotune">
      <span className={`font-extrabold leading-none tracking-tight ${sizeClasses[size] || sizeClasses.md}`}>
        <span className="text-primary">E</span><span className="text-text-primary">motune</span>
      </span>
      {showDecoration && (
        <span className={`mt-1 flex items-center ${decoration.gap}`} aria-hidden="true">
          <span className={`h-px bg-primary/55 ${decoration.line}`} />
          <span className={`text-ai ${decoration.heart}`}>{'\u2665'}</span>
          <span className={`h-px bg-ai/55 ${decoration.line}`} />
        </span>
      )}
    </span>
  );
}
