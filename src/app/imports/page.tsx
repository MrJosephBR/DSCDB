import ImportForm from "./ui/import-form";

export const dynamic = "force-dynamic";

export default function ImportsPage() {
  return (
    <main className="imports-page">
      <section className="imports-header">
        <div>
          <h1>JSON Imports</h1>
          <p>Upload curated compound JSON files and preserve every raw compound object for traceability.</p>
        </div>
        <a className="button secondary" href="/">
          Dashboard
        </a>
      </section>

      <ImportForm />
    </main>
  );
}
