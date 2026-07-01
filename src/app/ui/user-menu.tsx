"use client";

import { useEffect, useState } from "react";

type Session = {
  email: string;
  role: string;
} | null;

export default function UserMenu() {
  const [session, setSession] = useState<Session>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => response.json())
      .then((body) => setSession(body.data))
      .catch(() => setSession(null))
      .finally(() => setLoaded(true));
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  if (!loaded) {
    return <div className="user-menu user-menu-loading">Checking session</div>;
  }

  if (!session) {
    return (
      <a className="button button-small" href="/login">
        Sign in
      </a>
    );
  }

  return (
    <details className="user-menu">
      <summary>
        <span>{session.email}</span>
        <small>{session.role}</small>
      </summary>
      <div className="user-menu-panel">
        <a href="/account">Account</a>
        <button type="button" onClick={logout}>
          Logout
        </button>
      </div>
    </details>
  );
}
