export default function PanelFooter({ children, className = '', ...props }) {
  return (
    <div className={`px-4 py-3 border-t border-border flex-shrink-0 ${className}`} {...props}>
      {children}
    </div>
  );
}
