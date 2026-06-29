import Link from "next/link";
import NewCompoundForm from "./ui/new-compound-form";

export default function NewCompoundPage() {
  return (
    <main className="page">
      <section className="page-header">
        <div>
          <h1>New Compound</h1>
          <p>PubChem CID is required and remains the primary scientific identifier.</p>
        </div>
        <Link className="button secondary" href="/compounds">
          Compounds
        </Link>
      </section>

      <NewCompoundForm />
    </main>
  );
}
