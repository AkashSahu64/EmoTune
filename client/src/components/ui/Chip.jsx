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
      ? "border-transparent text-text-secondary dark:text-text-secondary-dark hover:bg-hover/[0.07] dark:hover:bg-hover-dark/[0.07] hover:text-text-primary dark:hover:text-text-primary-dark"
      : variant === "outline"
        ? "border-border/30 dark:border-border-dark/30 text-text-secondary dark:text-text-secondary-dark hover:border-primary/50 dark:hover:border-primary-dark/50"
        : "glass-surface text-text-secondary dark:text-text-secondary-dark hover:bg-surface-elevated/70 dark:hover:bg-surface-elevated-dark/70 hover:text-text-primary dark:hover:text-text-primary-dark";
  const activeStyle =
    variant === "default"
      ? "border-primary dark:border-primary-dark bg-primary dark:bg-primary-dark text-on-primary dark:text-on-primary-dark"
      : "border-primary/30 dark:border-primary-dark/30 bg-selection/15 dark:bg-selection-dark/15 text-primary dark:text-primary-dark";
  const Component = onClick ? "button" : "span";

  return (
    <Component
      onClick={onClick}
      type={onClick ? "button" : undefined}
      className={cn(
        "interactive inline-flex items-center whitespace-nowrap border font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50 dark:focus-visible:ring-focus-dark/50",
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
            active ? "text-current opacity-80" : "text-text-muted dark:text-text-muted-dark",
          )}
        >
          {count}
        </span>
      )}
    </Component>
  );
}
