"use client";

import { useEffect, useState } from "react";

type Session = {
  email: string;
  role: string;
} | null;

export default function AuthStatus() {
  const [session, setSession] = useState<Session>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => response.json())
      .then((body) => setSession(body.data))
      .catch(() => setSession(null));
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  if (!session) {
    return (
      <a className="session-link" href="/login">
        Sign in
      </a>
    );
  }

  return (
    <div className="session-box">
      <span>{session.email}</span>
      <small>{session.role}</small>
      <button type="button" onClick={logout}>
        Logout
      </button>
    </div>
  );
}
