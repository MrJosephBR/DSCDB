import Badge from "./badge";
import JsonViewer from "./json-viewer";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "neutral";

export function EmptyValue() {
  return <span className="empty-value">—</span>;
}

export function FieldValue({
  children,
  kind = "text"
}: {
  children: React.ReactNode;
  kind?: "text" | "chemical" | "long";
}) {
  if (children === null || children === undefined || children === "") {
    return <EmptyValue />;
  }

  return <span className={`field-value field-value-${kind}`}>{children}</span>;
}

export function KeyValueList({ entries }: { entries: [string, React.ReactNode][] }) {
  return (
    <dl className="key-value">
      {entries.map(([label, value]) => (
        <div className="key-value-row" key={label}>
          <dt>{label}</dt>
          <dd>{value ?? <EmptyValue />}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ConfidenceBadge({ level }: { level?: string | null }) {
  if (!level) return <EmptyValue />;
  return <Badge variant={confidenceVariant(level)}>{labelize(level)} confidence</Badge>;
}

export function ArtifactBadge({ flag }: { flag?: string | null }) {
  if (!flag) return <EmptyValue />;
  return <Badge variant={artifactVariant(flag)}>{labelize(flag)}</Badge>;
}

export function RawJsonDisclosure({ value, label = "Raw source payload" }: { value: unknown; label?: string }) {
  return <JsonViewer value={value} label={label} />;
}

function labelize(value: string) {
  return value.replace(/_/g, " ");
}

function confidenceVariant(level: string): BadgeVariant {
  if (level === "high") return "success";
  if (level === "medium") return "info";
  if (level === "low") return "warning";
  return "neutral";
}

function artifactVariant(flag: string): BadgeVariant {
  if (flag === "likely_artifact") return "danger";
  if (flag === "possible_artifact") return "warning";
  if (flag === "unlikely_artifact") return "success";
  return "neutral";
}
