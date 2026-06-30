"use client";

import { useState } from "react";

type Action = {
  label: string;
  section: string;
  method?: "DELETE" | "PATCH" | "POST";
  placeholder: string;
};

const actions: Action[] = [
  { label: "Edit core", section: "core", method: "PATCH", placeholder: '{ "commonName": "Guaiacol", "annotationSummary": "..." }' },
  { label: "Edit identity", section: "identity", placeholder: '{ "smiles": "COC1=CC=CC=C1O", "inchiKey": "..." }' },
  { label: "Add name", section: "names", placeholder: '{ "name": "2-methoxyphenol", "nameType": "synonym" }' },
  { label: "Add external identifier", section: "external-identifiers", placeholder: '{ "database": "HMDB", "identifier": "HMDB0000001" }' },
  { label: "Add disease presence", section: "disease-presence", placeholder: '{ "datasetTitle": "Asthma peak table", "diseaseName": "Asthma", "observedCount": 3, "totalSamples": 20 }' },
  { label: "Add related disease", section: "related-diseases", placeholder: '{ "diseaseName": "Asthma", "assertion": "reported", "sources": [{ "name": "manual", "role": "secondary" }] }' },
  { label: "Add evidence", section: "evidence", placeholder: '{ "evidenceType": "literature", "humanEvidence": true, "summary": "..." }' },
  { label: "Add pathway", section: "pathways", placeholder: '{ "name": "Phenol metabolism", "database": "KEGG", "biologicalContext": "human" }' },
  { label: "Add target", section: "targets", placeholder: '{ "name": "CYP2E1", "geneSymbol": "CYP2E1", "organism": "Homo sapiens", "directness": "predicted" }' },
  { label: "Add PDB", section: "pdb-structures", placeholder: '{ "pdbId": "1ABC", "ligandId": "GUA", "method": "X-ray" }' },
  { label: "Add reference", section: "references", placeholder: '{ "doi": "10.1000/example", "citationText": "..." }' },
  { label: "Add artifact assessment", section: "artifact-assessments", placeholder: '{ "flag": "possible_artifact", "artifactType": "contaminant", "rationale": "..." }' },
  { label: "Add note", section: "notes", placeholder: '{ "noteType": "curation_notes", "note": "..." }' },
  {
    label: "Edit section record",
    section: "_record",
    method: "PATCH",
    placeholder: '{ "section": "targets", "entityId": "compoundTargetId", "data": { "directness": "direct", "notes": "Reviewed" } }'
  },
  {
    label: "Delete section record",
    section: "_record",
    method: "DELETE",
    placeholder: '{ "section": "targets", "entityId": "compoundTargetId" }'
  }
];

export default function CompoundSectionActions({
  compoundId,
  rawPayloads
}: {
  compoundId: string;
  rawPayloads: unknown[];
}) {
  const [active, setActive] = useState<Action | null>(null);
  const [payload, setPayload] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  async function submit() {
    if (!active) return;
    setMessage(null);

    try {
      const body = JSON.parse(payload);
      const recordBody = active.section === "_record" ? body : null;
      const url =
        active.section === "core"
          ? `/api/compounds/${compoundId}`
          : active.section === "_record"
            ? `/api/compounds/${compoundId}/${recordBody.section}/${recordBody.entityId}`
            : `/api/compounds/${compoundId}/${active.section}`;
      const response = await fetch(url, {
        method: active.method ?? "POST",
        headers: { "Content-Type": "application/json" },
        body: active.method === "DELETE" ? undefined : JSON.stringify(active.section === "_record" ? recordBody.data : body)
      });
      const responseBody = await response.json();

      if (!response.ok) {
        setMessage(responseBody.message ?? "Could not save section.");
        return;
      }

      setMessage("Saved. Reloading detail...");
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Invalid JSON payload.");
    }
  }

  return (
    <section className="detail-block">
      <h2>Curate Compound</h2>
      <div className="section-actions">
        {actions.map((action) => (
          <button
            className="button compact secondary"
            key={action.label}
            type="button"
            onClick={() => {
              setActive(action);
              setPayload(action.placeholder);
              setShowRaw(false);
              setMessage(null);
            }}
          >
            {action.label}
          </button>
        ))}
        <button
          className="button compact secondary"
          type="button"
          onClick={() => {
            setActive(null);
            setShowRaw((value) => !value);
            setMessage(null);
          }}
        >
          View raw payload
        </button>
      </div>

      {active ? (
        <div className="inline-editor">
          <strong>{active.label}</strong>
          <textarea value={payload} onChange={(event) => setPayload(event.target.value)} />
          {message ? <div className="form-message">{message}</div> : null}
          <div className="button-row">
            <button className="button compact" type="button" onClick={submit}>
              Save
            </button>
            <button className="button compact secondary" type="button" onClick={() => setActive(null)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {showRaw ? <pre>{JSON.stringify(rawPayloads, null, 2)}</pre> : null}
    </section>
  );
}
