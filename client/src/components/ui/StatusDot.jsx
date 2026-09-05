import { cn } from "../../theme/utilities";

const colors = {
  online: "bg-online dark:bg-online-dark",
  away: "bg-warning dark:bg-warning-dark",
  busy: "bg-danger dark:bg-danger-dark",
  offline: "bg-offline dark:bg-offline-dark",
  typing: "bg-primary dark:bg-primary-dark animate-typing",
  ai: "bg-ai dark:bg-ai-dark",
};
const sizes = { sm: "size-1.5", md: "size-2.5", lg: "size-3.5" };

export default function StatusDot({
  status = "offline",
  size = "md",
  className = "",
  ...props
}) {
  return (
    <span
      className={cn(
        "inline-block rounded-full",
        colors[status] || colors.offline,
        sizes[size] || sizes.md,
        className,
      )}
      aria-label={status}
      {...props}
    />
  );
}
