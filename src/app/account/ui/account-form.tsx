"use client";

import { useState } from "react";

export default function AccountForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: formData.get("currentPassword"),
        newPassword: formData.get("newPassword")
      })
    });
    setIsSubmitting(false);
    setMessage(response.ok ? "Password updated." : "Could not update password.");
    if (response.ok) event.currentTarget.reset();
  }

  return (
    <form className="edit-form" onSubmit={submit}>
      <label>
        Current password
        <input name="currentPassword" type="password" required />
      </label>
      <label>
        New password
        <input name="newPassword" type="password" minLength={8} required />
      </label>
      {message ? <div className="form-message">{message}</div> : null}
      <button className="button" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Updating..." : "Change password"}
      </button>
    </form>
  );
}
