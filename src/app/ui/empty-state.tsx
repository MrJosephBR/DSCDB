export default function EmptyState({
  title = "No records available for this section.",
  description
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      {description ? <p>{description}</p> : null}
    </div>
  );
}
