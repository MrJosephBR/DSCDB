"use client";

import { useState } from "react";

export default function LoginForm() {
  const [email, setEmail] = useState("admin@example.local");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const body = await response.json();
    setIsSubmitting(false);

    if (!response.ok) {
      setError(body.message ?? "Could not sign in.");
      return;
    }

    window.location.href = "/";
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <label>
        Email
        <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
      </label>
      <label>
        Password
        <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" />
      </label>
      {error ? <div className="import-alert">{error}</div> : null}
      <button className="button" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
