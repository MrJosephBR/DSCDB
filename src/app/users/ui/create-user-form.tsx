"use client";

import { useState } from "react";

const roles = ["viewer", "researcher", "analyst", "editor", "curator", "admin"];

export default function CreateUserForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: formData.get("email"),
        name: formData.get("name") || undefined,
        role: formData.get("role"),
        password: formData.get("password") || undefined
      })
    });

    setIsSubmitting(false);
    if (!response.ok) {
      const body = await response.json();
      setMessage(body.message ?? "Sign in as admin to manage users.");
      return;
    }

    setMessage("User created.");
    event.currentTarget.reset();
    window.location.reload();
  }

  return (
    <form className="filters user-form" onSubmit={submit}>
      <input name="email" placeholder="email@example.com" type="email" required />
      <input name="name" placeholder="Name" />
      <select name="role" defaultValue="viewer">
        {roles.map((role) => (
          <option key={role} value={role}>
            {role}
          </option>
        ))}
      </select>
      <input name="password" placeholder="Temporary password" type="password" minLength={8} />
      <button className="button" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creating..." : "Create user"}
      </button>
      {message ? <div className="form-message">{message}</div> : null}
    </form>
  );
}
