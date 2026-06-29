"use client";

import { useMemo, useState } from "react";

type ImportSummary = {
  total: number;
  valid: number;
  invalid: number;
  created: number;
  updated: number;
  skipped: number;
  dryRun: boolean;
  totalCompounds: number;
  createdCompounds: number;
  updatedCompounds: number;
  skippedCompounds: number;
  validationErrors: Array<{ index: number; pubchemCid?: number; message: string }>;
};

export default function ImportForm() {
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const fileLabel = useMemo(() => {
    if (!file) {
      return "Choose JSON file";
    }

    return `${file.name} (${Math.ceil(file.size / 1024)} KB)`;
  }, [file]);

  async function submitImport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runImport(false);
  }

  async function runImport(dryRun: boolean) {
    if (!file) {
      setError("Select a .json file first.");
      return;
    }

    setIsUploading(true);
    setError(null);
    setSummary(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("dryRun", dryRun ? "true" : "false");

    const response = await fetch(`/api/import/compounds-json${dryRun ? "?dryRun=1" : ""}`, {
      method: "POST",
      body: formData
    });

    const body = await response.json();
    setIsUploading(false);

    if (!response.ok) {
      setError(body.message ?? "Import failed.");
      return;
    }

    setSummary(body.data);
  }

  return (
    <section className="import-workspace">
      <form className="upload-panel" onSubmit={submitImport}>
        <label className="file-picker">
          <input
            accept="application/json,.json"
            type="file"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          <span>{fileLabel}</span>
        </label>

        <div className="button-row">
          <button className="button secondary" type="button" disabled={isUploading} onClick={() => runImport(true)}>
            Dry run
          </button>
          <button className="button" type="submit" disabled={isUploading}>
            {isUploading ? "Importing..." : "Import compounds"}
          </button>
        </div>

        <p>
          The importer upserts basic identity fields, stores raw JSON in source payloads, and treats peaktable presence
          as dataset observations only.
        </p>
      </form>

      {error ? <div className="import-alert">{error}</div> : null}

      {summary ? (
        <section className="summary-grid" aria-label="Import summary">
          <div className="metric">
            Total
            <strong>{summary.total}</strong>
          </div>
          <div className="metric">
            Valid
            <strong>{summary.valid}</strong>
          </div>
          <div className="metric">
            Invalid
            <strong>{summary.invalid}</strong>
          </div>
          <div className="metric">
            Created
            <strong>{summary.created}</strong>
          </div>
          <div className="metric">
            Updated
            <strong>{summary.updated}</strong>
          </div>
          <div className="metric">
            Skipped
            <strong>{summary.skipped}</strong>
          </div>
          <div className="metric">
            Mode
            <strong>{summary.dryRun ? "Dry" : "Saved"}</strong>
          </div>
          {summary.validationErrors.length > 0 ? (
            <div className="validation-list">
              <strong>Validation errors</strong>
              <ul>
                {summary.validationErrors.map((validationError) => (
                  <li key={`${validationError.index}-${validationError.message}`}>
                    compounds[{validationError.index}]
                    {validationError.pubchemCid ? ` CID ${validationError.pubchemCid}` : ""}: {validationError.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}
    </section>
  );
}
