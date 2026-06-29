"use client";

import { useState } from "react";

export default function NewCompoundForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const pubchemCid = Number(formData.get("pubchemCid"));

    if (!Number.isInteger(pubchemCid) || pubchemCid <= 0) {
      setIsSubmitting(false);
      setMessage("PubChem CID must be a positive integer.");
      return;
    }

    const response = await fetch("/api/compounds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pubchemCid,
        commonName: formData.get("commonName") || undefined,
        iupacName: formData.get("iupacName") || undefined,
        molecularFormula: formData.get("molecularFormula") || undefined,
        molecularWeight: formData.get("molecularWeight") || undefined,
        names: []
      })
    });

    const body = await response.json();
    setIsSubmitting(false);

    if (!response.ok) {
      setMessage(body.message ?? "Could not create compound. Sign in as editor, curator, or admin.");
      return;
    }

    window.location.href = `/compounds/${body.data.compoundId}`;
  }

  return (
    <form className="edit-form" onSubmit={submit}>
      <label>
        PubChem CID
        <input name="pubchemCid" inputMode="numeric" required />
      </label>
      <label>
        Common name
        <input name="commonName" />
      </label>
      <label>
        IUPAC name
        <input name="iupacName" />
      </label>
      <label>
        Formula
        <input name="molecularFormula" />
      </label>
      <label>
        Molecular weight
        <input name="molecularWeight" inputMode="decimal" />
      </label>
      {message ? <div className="import-alert">{message}</div> : null}
      <button className="button" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creating..." : "Create compound"}
      </button>
    </form>
  );
}
