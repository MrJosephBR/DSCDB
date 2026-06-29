import LoginForm from "./ui/login-form";

export default function LoginPage() {
  return (
    <main className="auth-page">
      <section className="auth-panel">
        <h1>Sign in</h1>
        <p>Use a curator, editor, or admin account to import and edit curated VOC records.</p>
        <LoginForm />
      </section>
    </main>
  );
}
