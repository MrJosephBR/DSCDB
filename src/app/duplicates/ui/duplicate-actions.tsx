"use client";

import { useState } from "react";

export default function DuplicateActions({
  duplicateReviewId,
  currentStatus
}: {
  duplicateReviewId: string;
  currentStatus: string;
}) {
  const [status, setStatus] = useState(currentStatus);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    const response = await fetch(`/api/duplicates/${duplicateReviewId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    setMessage(response.ok ? "Saved" : "Sign in as curator/admin");
  }

  return (
    <div className="inline-actions">
      <select value={status} onChange={(event) => setStatus(event.target.value)}>
        <option value="open">Open</option>
        <option value="confirmed_duplicate">Confirmed</option>
        <option value="rejected">Rejected</option>
        <option value="merged_manually">Merged manually</option>
      </select>
      <button className="button compact" type="button" onClick={save}>
        Save
      </button>
      {message ? <span>{message}</span> : null}
    </div>
  );
}
