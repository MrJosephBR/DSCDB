export default function JsonViewer({
  value,
  label = "Raw JSON"
}: {
  value: unknown;
  label?: string;
}) {
  return (
    <details className="json-viewer">
      <summary>{label}</summary>
      <pre>{JSON.stringify(value ?? {}, null, 2)}</pre>
    </details>
  );
}
