export default function SectionCard({
  id,
  title,
  description,
  actions,
  children
}: {
  id?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="section-card" id={id}>
      <div className="section-card-header">
        <div>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        {actions ? <div className="section-card-actions">{actions}</div> : null}
      </div>
      <div className="section-card-body">{children}</div>
    </section>
  );
}
