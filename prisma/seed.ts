import { PrismaClient, SourceKind } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.sourceOrigin.upsert({
    where: { name_kind: { name: "PubChem", kind: SourceKind.database } },
    update: {},
    create: {
      name: "PubChem",
      kind: SourceKind.database,
      url: "https://pubchem.ncbi.nlm.nih.gov",
      description: "Primary required compound identifier source"
    }
  });

  await prisma.sourceOrigin.upsert({
    where: { name_kind: { name: "HMDB", kind: SourceKind.database } },
    update: {},
    create: {
      name: "HMDB",
      kind: SourceKind.database,
      url: "https://hmdb.ca",
      description: "Optional secondary metabolomics identifier source"
    }
  });

  await prisma.sourceOrigin.upsert({
    where: { name_kind: { name: "KEGG", kind: SourceKind.database } },
    update: {},
    create: {
      name: "KEGG",
      kind: SourceKind.database,
      url: "https://www.kegg.jp",
      description: "Optional pathway and compound source"
    }
  });

  await prisma.sourceOrigin.upsert({
    where: { name_kind: { name: "Manual curation", kind: SourceKind.manual_curation } },
    update: {},
    create: {
      name: "Manual curation",
      kind: SourceKind.manual_curation,
      description: "Curator-entered scientific review"
    }
  });

  const compoundTypes = [
    ["endogenous", "Produced or expected from human metabolism"],
    ["exogenous", "Likely environmental, dietary, exposure, or contaminant origin"],
    ["microbial", "Potentially produced by microbiome activity"],
    ["unknown", "Origin not yet classified"]
  ] as const;

  for (const [name, description] of compoundTypes) {
    await prisma.compoundType.upsert({
      where: { name },
      update: { description },
      create: { name, description }
    });
  }

  const classifications = [
    ["alcohols", "Chemical class"],
    ["aldehydes", "Chemical class"],
    ["ketones", "Chemical class"],
    ["alkanes", "Chemical class"],
    ["aromatic compounds", "Chemical class"],
    ["sulfur compounds", "Chemical class"]
  ] as const;

  for (const [name, vocabulary] of classifications) {
    await prisma.chemicalClassification.upsert({
      where: { name },
      update: { vocabulary },
      create: { name, vocabulary }
    });
  }

  await prisma.user.upsert({
    where: { email: "admin@example.local" },
    update: {},
    create: {
      email: "admin@example.local",
      name: "VOCS Admin",
      role: "admin",
      passwordHash: await bcrypt.hash("change-me", 10)
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
