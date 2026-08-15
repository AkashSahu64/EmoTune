import { cn } from "../../theme/utilities";

const sizes = {
  xs: "h-7 px-2 text-meta rounded-md gap-1",
  sm: "h-[26px] px-2.5 text-label rounded-lg gap-1 pt-0.5",
  md: "h-10 px-4 text-body rounded-lg gap-2",
};

export default function Chip({
  children,
  active,
  onClick,
  icon: Icon,
  size = "sm",
  variant = "default",
  className = "",
  count,
}) {
  const inactive =
    variant === "ghost"
      ? "border-transparent text-text-secondary hover:bg-hover/[0.07] hover:text-text-primary"
      : variant === "outline"
        ? "border-border/30 text-text-secondary hover:border-primary/50"
        : "glass-surface text-text-secondary hover:bg-surface-elevated/70 hover:text-text-primary";
  const activeStyle =
    variant === "default"
      ? "border-primary bg-primary text-on-primary"
      : "border-primary/30 bg-selection/15 text-primary";
  const Component = onClick ? "button" : "span";

  return (
    <Component
      onClick={onClick}
      type={onClick ? "button" : undefined}
      className={cn(
        "interactive inline-flex items-center whitespace-nowrap border font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50",
        active ? activeStyle : inactive,
        sizes[size] || sizes.sm,
        className,
      )}
    >
      {Icon && (
        <Icon
          size={size === "xs" ? 10 : size === "sm" ? 12 : 14}
          aria-hidden="true"
        />
      )}
      {children}
      {count != null && (
        <span
          className={cn(
            "text-meta font-semibold",
            active ? "text-current opacity-80" : "text-text-muted",
          )}
        >
          {count}
        </span>
      )}
    </Component>
  );
}
