type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "neutral";

export default function Badge({
  variant = "default",
  children
}: {
  variant?: BadgeVariant;
  children: React.ReactNode;
}) {
  return <span className={`badge badge-${variant}`}>{children}</span>;
}
