import { cn } from "../../theme/utilities";

const colors = {
  online: "bg-online",
  away: "bg-warning",
  busy: "bg-danger",
  offline: "bg-offline",
  typing: "bg-primary animate-typing",
  ai: "bg-ai",
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
