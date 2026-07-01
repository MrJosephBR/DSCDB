"use client";

import { useState } from "react";

type PeakSummary = {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  sampleCount: number;
  createdCompounds: number;
  createdSamples: number;
  createdMeasurements: number;
  dryRun: boolean;
  validationErrors: string[];
};

export default function PeakTableForm() {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [summary, setSummary] = useState<PeakSummary | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function runImport(dryRun: boolean) {
    if (!file) {
      setMessage("Select a .csv or .xlsx peak table first.");
      return;
    }

    setIsUploading(true);
    setMessage(null);
    setSummary(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("dryRun", dryRun ? "true" : "false");
    formData.append("datasetTitle", (document.getElementById("peakDatasetTitle") as HTMLInputElement)?.value || "A Clinical Breathomics Dataset");
    formData.append("diseaseName", (document.getElementById("peakDiseaseName") as HTMLInputElement)?.value || "unknown");

    const response = await fetch(`/api/import/peak-table${dryRun ? "?dryRun=1" : ""}`, {
      method: "POST",
      body: formData
    });
    const body = await response.json();
    setIsUploading(false);

    if (!response.ok) {
      setMessage(body.message ?? "Peak table import failed.");
      return;
    }

    setSummary(body.data);
  }

  return (
    <section className="upload-panel">
      <h2>Peak Table CSV/XLSX</h2>
      <input id="peakDatasetTitle" defaultValue="A Clinical Breathomics Dataset" placeholder="Dataset title" />
      <input id="peakDiseaseName" placeholder="Disease name, e.g. asthma" />
      <label className="file-picker">
        <input
          accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          type="file"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
        <span>{file ? file.name : "Choose CSV or XLSX peak table"}</span>
      </label>
      <div className="button-row">
        <button className="button secondary" disabled={isUploading} type="button" onClick={() => runImport(true)}>
          Dry run
        </button>
        <button className="button" disabled={isUploading} type="button" onClick={() => runImport(false)}>
          Import
        </button>
      </div>
      {message ? <div className="import-alert">{message}</div> : null}
      {summary ? (
        <section className="summary-grid" aria-label="Peak table import summary">
          <div className="metric">Rows<strong>{summary.totalRows}</strong></div>
          <div className="metric">Valid<strong>{summary.validRows}</strong></div>
          <div className="metric">Invalid<strong>{summary.invalidRows}</strong></div>
          <div className="metric">Samples<strong>{summary.sampleCount}</strong></div>
          <div className="metric">Compounds<strong>{summary.createdCompounds}</strong></div>
          <div className="metric">Measurements<strong>{summary.createdMeasurements}</strong></div>
          <div className="metric">Mode<strong>{summary.dryRun ? "Dry" : "Saved"}</strong></div>
          {summary.validationErrors.length > 0 ? (
            <div className="validation-list">
              <strong>Validation warnings</strong>
              <ul>
                {summary.validationErrors.map((validationError) => (
                  <li key={validationError}>{validationError}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}
    </section>
  );
}
