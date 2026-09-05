const sizeClasses = {
  sm: "h-[18px]",
  md: "h-[22px]",
  lg: "h-7",
  xl: "h-[36px]",
};

export default function TextLogo({
  size = "md",
  className = "",
  showDecoration = true,
}) {
  return (
    <span
      className={`inline-flex shrink-0 ${className}`}
      role="img"
      aria-label="Emotune"
    >
      <img
        src="/textLogo.png"
        alt="Emotune"
        className={`object-contain ${sizeClasses[size] || sizeClasses.md}`}
        data-logo-decoration={showDecoration ? "enabled" : "disabled"}
      />
    </span>
  );
}
