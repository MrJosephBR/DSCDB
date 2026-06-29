import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionFromCookieHeader } from "@/modules/auth/session";
import AccountForm from "./ui/account-form";

export default async function AccountPage() {
  const session = getSessionFromCookieHeader((await cookies()).toString());

  if (!session) {
    redirect("/login");
  }

  return (
    <main className="page">
      <section className="page-header">
        <div>
          <h1>Account</h1>
          <p>
            {session.email} ({session.role})
          </p>
        </div>
        <a className="button secondary" href="/">
          Dashboard
        </a>
      </section>
      <AccountForm />
    </main>
  );
}
