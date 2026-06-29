import Link from "next/link";
import { prisma } from "@/lib/prisma";
import DuplicateActions from "./ui/duplicate-actions";

export const dynamic = "force-dynamic";

export default async function DuplicatesPage() {
  const duplicates = await prisma.duplicateReview.findMany({
    include: { sourceCompound: true, targetCompound: true },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return (
    <main className="page">
      <section className="page-header">
        <div>
          <h1>Duplicate Reviews</h1>
          <p>Potential duplicate compounds are reviewed manually and never merged automatically.</p>
        </div>
        <Link className="button secondary" href="/">
          Dashboard
        </Link>
      </section>
      <table className="table">
        <thead>
          <tr>
            <th>Source</th>
            <th>Target</th>
            <th>Status</th>
            <th>Reason</th>
            <th>Review</th>
          </tr>
        </thead>
        <tbody>
          {duplicates.map((duplicate) => (
            <tr key={duplicate.duplicateReviewId}>
              <td>{duplicate.sourceCompound.commonName ?? `CID ${duplicate.sourceCompound.pubchemCid}`}</td>
              <td>{duplicate.targetCompound.commonName ?? `CID ${duplicate.targetCompound.pubchemCid}`}</td>
              <td>{duplicate.status}</td>
              <td>{duplicate.reason ?? "No reason recorded"}</td>
              <td>
                <DuplicateActions duplicateReviewId={duplicate.duplicateReviewId} currentStatus={duplicate.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
