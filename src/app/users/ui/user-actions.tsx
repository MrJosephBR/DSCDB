"use client";

import { useState } from "react";

const roles = ["viewer", "researcher", "analyst", "editor", "curator", "admin"];

export default function UserActions({ userId, currentRole }: { userId: string; currentRole: string }) {
  const [role, setRole] = useState(currentRole);
  const [message, setMessage] = useState<string | null>(null);

  async function updateRole() {
    const response = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role })
    });
    setMessage(response.ok ? "Saved" : "Admin required");
  }

  async function deleteUser() {
    const response = await fetch(`/api/users/${userId}`, {
      method: "DELETE"
    });
    if (response.ok) {
      window.location.reload();
      return;
    }
    setMessage("Could not delete");
  }

  return (
    <div className="inline-actions">
      <select value={role} onChange={(event) => setRole(event.target.value)}>
        {roles.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <button className="button compact" type="button" onClick={updateRole}>
        Save
      </button>
      <button className="button compact danger" type="button" onClick={deleteUser}>
        Delete
      </button>
      {message ? <span>{message}</span> : null}
    </div>
  );
}
