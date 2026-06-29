ALTER TYPE "ExternalDatabase" ADD VALUE IF NOT EXISTS 'InChI';
ALTER TYPE "ExternalDatabase" ADD VALUE IF NOT EXISTS 'SMILES';
ALTER TYPE "ExternalDatabase" ADD VALUE IF NOT EXISTS 'PDB';
ALTER TYPE "ExternalDatabase" ADD VALUE IF NOT EXISTS 'PathBank';
ALTER TYPE "ExternalDatabase" ADD VALUE IF NOT EXISTS 'BioCyc';
ALTER TYPE "ExternalDatabase" ADD VALUE IF NOT EXISTS 'PlantCyc';
ALTER TYPE "ExternalDatabase" ADD VALUE IF NOT EXISTS 'DrugBank';
ALTER TYPE "ExternalDatabase" ADD VALUE IF NOT EXISTS 'UniProt';

ALTER TABLE "compounds" ADD COLUMN IF NOT EXISTS "preferred_name" TEXT;
ALTER TABLE "compounds" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "compounds" ADD COLUMN IF NOT EXISTS "source" TEXT;
ALTER TABLE "compounds" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'active';

ALTER TABLE "compound_identity" ADD COLUMN IF NOT EXISTS "formula" TEXT;
ALTER TABLE "compound_identity" ADD COLUMN IF NOT EXISTS "exact_mass" DECIMAL(14,6);
ALTER TABLE "compound_identity" ADD COLUMN IF NOT EXISTS "molecular_weight" DECIMAL(14,6);
ALTER TABLE "compound_identity" ADD COLUMN IF NOT EXISTS "isomeric_smiles" TEXT;

ALTER TABLE "external_identifiers" ADD COLUMN IF NOT EXISTS "notes" TEXT;

ALTER TABLE "datasets" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE "datasets" ADD COLUMN IF NOT EXISTS "doi" TEXT;
ALTER TABLE "datasets" ADD COLUMN IF NOT EXISTS "url" TEXT;
ALTER TABLE "datasets" ADD COLUMN IF NOT EXISTS "dataset_type" TEXT;
ALTER TABLE "datasets" ADD COLUMN IF NOT EXISTS "technology" TEXT;
ALTER TABLE "datasets" ADD COLUMN IF NOT EXISTS "sample_matrix" TEXT;
ALTER TABLE "datasets" ADD COLUMN IF NOT EXISTS "organism" TEXT;
ALTER TABLE "datasets" ADD COLUMN IF NOT EXISTS "is_public" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "datasets" ADD COLUMN IF NOT EXISTS "is_anonymized" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "datasets" ADD COLUMN IF NOT EXISTS "license" TEXT;
ALTER TABLE "datasets" ADD COLUMN IF NOT EXISTS "notes" TEXT;

ALTER TABLE "dataset_files" ADD COLUMN IF NOT EXISTS "disease_id" UUID;
ALTER TABLE "dataset_files" ADD COLUMN IF NOT EXISTS "file_role" TEXT;
ALTER TABLE "dataset_files" ADD COLUMN IF NOT EXISTS "file_type" TEXT;
ALTER TABLE "dataset_files" ADD COLUMN IF NOT EXISTS "url" TEXT;
ALTER TABLE "dataset_files" ADD COLUMN IF NOT EXISTS "row_count" INTEGER;
ALTER TABLE "dataset_files" ADD COLUMN IF NOT EXISTS "column_count" INTEGER;
ALTER TABLE "dataset_files" ADD COLUMN IF NOT EXISTS "uploaded_by" UUID;

ALTER TABLE "diseases" ADD COLUMN IF NOT EXISTS "normalized_name" TEXT;

ALTER TABLE "compound_disease_presence" ADD COLUMN IF NOT EXISTS "source_file_id" UUID;
ALTER TABLE "compound_disease_presence" ADD COLUMN IF NOT EXISTS "observed" BOOLEAN;
ALTER TABLE "compound_disease_presence" ADD COLUMN IF NOT EXISTS "observed_count" INTEGER;
ALTER TABLE "compound_disease_presence" ADD COLUMN IF NOT EXISTS "total_samples" INTEGER;
ALTER TABLE "compound_disease_presence" ADD COLUMN IF NOT EXISTS "presence_value_raw" TEXT;

ALTER TABLE "references" ADD COLUMN IF NOT EXISTS "authors" TEXT;
ALTER TABLE "references" ADD COLUMN IF NOT EXISTS "journal" TEXT;
ALTER TABLE "references" ADD COLUMN IF NOT EXISTS "citation_text" TEXT;
ALTER TABLE "references" ADD COLUMN IF NOT EXISTS "source" TEXT;

ALTER TABLE "evidence_records" ADD COLUMN IF NOT EXISTS "biological_context" TEXT;
ALTER TABLE "evidence_records" ADD COLUMN IF NOT EXISTS "species" TEXT;
ALTER TABLE "evidence_records" ADD COLUMN IF NOT EXISTS "evidence_level" TEXT;
ALTER TABLE "evidence_records" ADD COLUMN IF NOT EXISTS "source" TEXT;
ALTER TABLE "evidence_records" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "evidence_records" ADD COLUMN IF NOT EXISTS "raw_json" JSONB;

ALTER TABLE "annotation_confidence" ADD COLUMN IF NOT EXISTS "score" DECIMAL(8,5);
ALTER TABLE "annotation_confidence" ADD COLUMN IF NOT EXISTS "source" TEXT;
ALTER TABLE "annotation_confidence" ADD COLUMN IF NOT EXISTS "notes" TEXT;

ALTER TABLE "artifact_assessments" ADD COLUMN IF NOT EXISTS "artifact_type" TEXT;
ALTER TABLE "artifact_assessments" ADD COLUMN IF NOT EXISTS "confidence" TEXT;
ALTER TABLE "artifact_assessments" ADD COLUMN IF NOT EXISTS "source" TEXT;
ALTER TABLE "artifact_assessments" ADD COLUMN IF NOT EXISTS "notes" TEXT;

ALTER TABLE "pathways" ADD COLUMN IF NOT EXISTS "database" TEXT;
ALTER TABLE "pathways" ADD COLUMN IF NOT EXISTS "pathway_external_id" TEXT;
ALTER TABLE "pathways" ADD COLUMN IF NOT EXISTS "url" TEXT;
ALTER TABLE "pathways" ADD COLUMN IF NOT EXISTS "organism" TEXT;
ALTER TABLE "pathways" ADD COLUMN IF NOT EXISTS "taxon_id" TEXT;
ALTER TABLE "pathways" ADD COLUMN IF NOT EXISTS "biological_context" TEXT;

ALTER TABLE "compound_pathways" ADD COLUMN IF NOT EXISTS "role" TEXT;
ALTER TABLE "compound_pathways" ADD COLUMN IF NOT EXISTS "source" TEXT;
ALTER TABLE "compound_pathways" ADD COLUMN IF NOT EXISTS "evidence_level" TEXT;
ALTER TABLE "compound_pathways" ADD COLUMN IF NOT EXISTS "reference_id" UUID;
ALTER TABLE "compound_pathways" ADD COLUMN IF NOT EXISTS "notes" TEXT;

ALTER TABLE "targets" ADD COLUMN IF NOT EXISTS "gene_symbol" TEXT;
ALTER TABLE "targets" ADD COLUMN IF NOT EXISTS "uniprot_id" TEXT;
ALTER TABLE "targets" ADD COLUMN IF NOT EXISTS "taxon_id" TEXT;
ALTER TABLE "targets" ADD COLUMN IF NOT EXISTS "is_human" BOOLEAN;
ALTER TABLE "targets" ADD COLUMN IF NOT EXISTS "target_type" TEXT;
ALTER TABLE "targets" ADD COLUMN IF NOT EXISTS "description" TEXT;

ALTER TABLE "compound_targets" ADD COLUMN IF NOT EXISTS "interaction_type" TEXT;
ALTER TABLE "compound_targets" ADD COLUMN IF NOT EXISTS "evidence_level" TEXT;
ALTER TABLE "compound_targets" ADD COLUMN IF NOT EXISTS "source" TEXT;
ALTER TABLE "compound_targets" ADD COLUMN IF NOT EXISTS "reference_id" UUID;
ALTER TABLE "compound_targets" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "compound_targets" ADD COLUMN IF NOT EXISTS "raw_json" JSONB;

ALTER TABLE "compound_notes" ADD COLUMN IF NOT EXISTS "note_type" TEXT DEFAULT 'curation_notes';

ALTER TABLE "source_payloads" ADD COLUMN IF NOT EXISTS "source_name" TEXT;
ALTER TABLE "source_payloads" ADD COLUMN IF NOT EXISTS "payload_type" TEXT;

ALTER TABLE "duplicate_reviews" ADD COLUMN IF NOT EXISTS "reviewed_by" UUID;
ALTER TABLE "duplicate_reviews" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "duplicate_reviews" ADD COLUMN IF NOT EXISTS "reviewed_at" TIMESTAMP(3);

ALTER TABLE "import_jobs" ADD COLUMN IF NOT EXISTS "file_type" TEXT;
ALTER TABLE "import_jobs" ADD COLUMN IF NOT EXISTS "dry_run" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "import_jobs" ADD COLUMN IF NOT EXISTS "errors" JSONB;

CREATE TABLE IF NOT EXISTS "samples" (
  "sample_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "dataset_id" UUID NOT NULL,
  "disease_id" UUID,
  "sample_code" TEXT NOT NULL,
  "cohort_label" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "samples_pkey" PRIMARY KEY ("sample_id")
);

CREATE TABLE IF NOT EXISTS "compound_measurements" (
  "compound_measurement_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "sample_id" UUID NOT NULL,
  "compound_id" UUID NOT NULL,
  "source_file_id" UUID,
  "raw_intensity" DECIMAL(20,8),
  "normalized_intensity" DECIMAL(20,8),
  "scaled_intensity" DECIMAL(20,8),
  "is_detected" BOOLEAN NOT NULL DEFAULT false,
  "missing_reason" TEXT,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "compound_measurements_pkey" PRIMARY KEY ("compound_measurement_id")
);

CREATE TABLE IF NOT EXISTS "pdb_structures" (
  "pdb_structure_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "pdb_id" TEXT NOT NULL,
  "title" TEXT,
  "method" TEXT,
  "resolution" DECIMAL(8,3),
  "organism" TEXT,
  "url" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pdb_structures_pkey" PRIMARY KEY ("pdb_structure_id")
);

CREATE TABLE IF NOT EXISTS "compound_pdb_structures" (
  "compound_pdb_structure_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "compound_id" UUID NOT NULL,
  "pdb_structure_id" UUID NOT NULL,
  "ligand_id" TEXT,
  "chain" TEXT,
  "source" TEXT,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "compound_pdb_structures_pkey" PRIMARY KEY ("compound_pdb_structure_id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "samples_dataset_id_sample_code_key" ON "samples"("dataset_id","sample_code");
CREATE UNIQUE INDEX IF NOT EXISTS "compound_measurements_sample_id_compound_id_source_file_id_key" ON "compound_measurements"("sample_id","compound_id","source_file_id");
CREATE UNIQUE INDEX IF NOT EXISTS "pdb_structures_pdb_id_key" ON "pdb_structures"("pdb_id");
CREATE UNIQUE INDEX IF NOT EXISTS "compound_pdb_structures_compound_id_pdb_structure_id_ligand_id_chain_key" ON "compound_pdb_structures"("compound_id","pdb_structure_id","ligand_id","chain");

ALTER TABLE "dataset_files" ADD CONSTRAINT "dataset_files_disease_id_fkey" FOREIGN KEY ("disease_id") REFERENCES "diseases"("disease_id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "compound_disease_presence" ADD CONSTRAINT "compound_disease_presence_source_file_id_fkey" FOREIGN KEY ("source_file_id") REFERENCES "dataset_files"("dataset_file_id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "compound_pathways" ADD CONSTRAINT "compound_pathways_reference_id_fkey" FOREIGN KEY ("reference_id") REFERENCES "references"("reference_id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "compound_targets" ADD CONSTRAINT "compound_targets_reference_id_fkey" FOREIGN KEY ("reference_id") REFERENCES "references"("reference_id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "samples" ADD CONSTRAINT "samples_dataset_id_fkey" FOREIGN KEY ("dataset_id") REFERENCES "datasets"("dataset_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "samples" ADD CONSTRAINT "samples_disease_id_fkey" FOREIGN KEY ("disease_id") REFERENCES "diseases"("disease_id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "compound_measurements" ADD CONSTRAINT "compound_measurements_sample_id_fkey" FOREIGN KEY ("sample_id") REFERENCES "samples"("sample_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "compound_measurements" ADD CONSTRAINT "compound_measurements_compound_id_fkey" FOREIGN KEY ("compound_id") REFERENCES "compounds"("compound_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "compound_measurements" ADD CONSTRAINT "compound_measurements_source_file_id_fkey" FOREIGN KEY ("source_file_id") REFERENCES "dataset_files"("dataset_file_id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "compound_pdb_structures" ADD CONSTRAINT "compound_pdb_structures_compound_id_fkey" FOREIGN KEY ("compound_id") REFERENCES "compounds"("compound_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "compound_pdb_structures" ADD CONSTRAINT "compound_pdb_structures_pdb_structure_id_fkey" FOREIGN KEY ("pdb_structure_id") REFERENCES "pdb_structures"("pdb_structure_id") ON DELETE RESTRICT ON UPDATE CASCADE;
