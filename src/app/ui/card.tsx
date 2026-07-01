export default function Card({
  className,
  children
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <section className={["card", className].filter(Boolean).join(" ")}>{children}</section>;
}
