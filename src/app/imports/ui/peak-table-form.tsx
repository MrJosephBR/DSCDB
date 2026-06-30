"use client";

import { useState } from "react";

export default function PeakTableForm() {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [summary, setSummary] = useState<unknown>(null);
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
      {summary ? <pre>{JSON.stringify(summary, null, 2)}</pre> : null}
    </section>
  );
}
