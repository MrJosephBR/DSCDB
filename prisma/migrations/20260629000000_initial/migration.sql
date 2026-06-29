CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "UserRole" AS ENUM ('admin','curator','editor','researcher','viewer','analyst');
CREATE TYPE "NameType" AS ENUM ('common','synonym','iupac','trade','other');
CREATE TYPE "ExternalDatabase" AS ENUM ('PubChem','HMDB','KEGG','CAS','ChEBI','InChIKey','Other');
CREATE TYPE "SourceKind" AS ENUM ('database','publication','dataset','manual_curation','instrument','other');
CREATE TYPE "DatasetVisibility" AS ENUM ('public','anonymized','restricted');
CREATE TYPE "PresenceEvidenceLevel" AS ENUM ('detected','reported','curated','uncertain');
CREATE TYPE "RelationAssertion" AS ENUM ('associated','reported','curated','uncertain');
CREATE TYPE "RelatedDiseaseSourceRole" AS ENUM ('original','secondary');
CREATE TYPE "ReferenceType" AS ENUM ('article','database_entry','dataset','report','other');
CREATE TYPE "AnnotationConfidenceLevel" AS ENUM ('high','medium','low','unknown');
CREATE TYPE "ArtifactFlag" AS ENUM ('likely_artifact','possible_artifact','unlikely_artifact','unknown');
CREATE TYPE "DuplicateReviewStatus" AS ENUM ('open','confirmed_duplicate','rejected','merged_manually');
CREATE TYPE "ImportJobStatus" AS ENUM ('pending','running','completed','failed');
CREATE TYPE "AuditAction" AS ENUM ('create','update','soft_delete','restore','import','export');
CREATE TYPE "FileKind" AS ENUM ('json','csv','tsv','raw','cdf','mzml','other');
CREATE TYPE "PathwayType" AS ENUM ('metabolic','signaling','disease','exposure','other');
CREATE TYPE "TargetDirectness" AS ENUM ('direct','indirect','predicted','unknown');

CREATE TABLE "users" (
  "user_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "email" TEXT NOT NULL,
  "name" TEXT,
  "password_hash" TEXT,
  "role" "UserRole" NOT NULL DEFAULT 'viewer',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

CREATE TABLE "compounds" (
  "compound_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "pubchem_cid" INTEGER NOT NULL,
  "common_name" TEXT,
  "iupac_name" TEXT,
  "molecular_formula" TEXT,
  "molecular_weight" DECIMAL(14,6),
  "annotation_summary" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "compounds_pkey" PRIMARY KEY ("compound_id")
);

CREATE TABLE "compound_identity" (
  "identity_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "compound_id" UUID NOT NULL,
  "inchi" TEXT,
  "inchi_key" TEXT,
  "smiles" TEXT,
  "canonical_smiles" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "compound_identity_pkey" PRIMARY KEY ("identity_id")
);

CREATE TABLE "source_origins" (
  "source_origin_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "kind" "SourceKind" NOT NULL,
  "url" TEXT,
  "description" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "source_origins_pkey" PRIMARY KEY ("source_origin_id")
);

CREATE TABLE "compound_names" (
  "compound_name_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "compound_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "name_type" "NameType" NOT NULL DEFAULT 'synonym',
  "language" TEXT,
  "source_origin_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "compound_names_pkey" PRIMARY KEY ("compound_name_id")
);

CREATE TABLE "external_identifiers" (
  "external_identifier_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "compound_id" UUID NOT NULL,
  "database" "ExternalDatabase" NOT NULL,
  "identifier" TEXT NOT NULL,
  "url" TEXT,
  "source_origin_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "external_identifiers_pkey" PRIMARY KEY ("external_identifier_id")
);

CREATE TABLE "chemical_classifications" (
  "chemical_classification_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "vocabulary" TEXT,
  "description" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "chemical_classifications_pkey" PRIMARY KEY ("chemical_classification_id")
);

CREATE TABLE "compound_classification_links" (
  "compound_classification_link_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "compound_id" UUID NOT NULL,
  "chemical_classification_id" UUID NOT NULL,
  "source_origin_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "compound_classification_links_pkey" PRIMARY KEY ("compound_classification_link_id")
);

CREATE TABLE "compound_types" (
  "compound_type_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "description" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "compound_types_pkey" PRIMARY KEY ("compound_type_id")
);

CREATE TABLE "compound_type_links" (
  "compound_type_link_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "compound_id" UUID NOT NULL,
  "compound_type_id" UUID NOT NULL,
  "source_origin_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "compound_type_links_pkey" PRIMARY KEY ("compound_type_link_id")
);

CREATE TABLE "compound_source_links" (
  "compound_source_link_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "compound_id" UUID NOT NULL,
  "source_origin_id" UUID NOT NULL,
  "source_record_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "compound_source_links_pkey" PRIMARY KEY ("compound_source_link_id")
);

CREATE TABLE "datasets" (
  "dataset_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "title" TEXT NOT NULL,
  "description" TEXT,
  "analytical_platform" TEXT,
  "visibility" "DatasetVisibility" NOT NULL DEFAULT 'public',
  "ethical_metadata" JSONB,
  "source_origin_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "datasets_pkey" PRIMARY KEY ("dataset_id")
);

CREATE TABLE "dataset_files" (
  "dataset_file_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "dataset_id" UUID NOT NULL,
  "file_name" TEXT NOT NULL,
  "file_kind" "FileKind" NOT NULL DEFAULT 'json',
  "storage_path" TEXT,
  "checksum_sha256" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "dataset_files_pkey" PRIMARY KEY ("dataset_file_id")
);

CREATE TABLE "diseases" (
  "disease_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "ontology_id" TEXT,
  "description" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "diseases_pkey" PRIMARY KEY ("disease_id")
);

CREATE TABLE "disease_names" (
  "disease_name_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "disease_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "name_type" "NameType" NOT NULL DEFAULT 'synonym',
  "source" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "disease_names_pkey" PRIMARY KEY ("disease_name_id")
);

CREATE TABLE "dataset_diseases" (
  "dataset_disease_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "dataset_id" UUID NOT NULL,
  "disease_id" UUID NOT NULL,
  "cohort_label" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "dataset_diseases_pkey" PRIMARY KEY ("dataset_disease_id")
);

CREATE TABLE "compound_disease_presence" (
  "compound_disease_presence_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "compound_id" UUID NOT NULL,
  "dataset_id" UUID NOT NULL,
  "disease_id" UUID NOT NULL,
  "evidence_level" "PresenceEvidenceLevel" NOT NULL DEFAULT 'reported',
  "frequency" DECIMAL(8,5),
  "presence_percent" DECIMAL(8,5),
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "compound_disease_presence_pkey" PRIMARY KEY ("compound_disease_presence_id")
);

CREATE TABLE "references" (
  "reference_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "reference_type" "ReferenceType" NOT NULL DEFAULT 'article',
  "title" TEXT,
  "doi" TEXT,
  "pmid" TEXT,
  "url" TEXT,
  "citation" TEXT,
  "year" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "references_pkey" PRIMARY KEY ("reference_id")
);

CREATE TABLE "compound_references" (
  "compound_reference_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "compound_id" UUID NOT NULL,
  "reference_id" UUID NOT NULL,
  "context" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "compound_references_pkey" PRIMARY KEY ("compound_reference_id")
);

CREATE TABLE "compound_related_diseases" (
  "compound_related_disease_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "compound_id" UUID NOT NULL,
  "disease_id" UUID NOT NULL,
  "assertion" "RelationAssertion" NOT NULL DEFAULT 'reported',
  "original_reference_id" UUID,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "compound_related_diseases_pkey" PRIMARY KEY ("compound_related_disease_id")
);

CREATE TABLE "related_disease_sources" (
  "related_disease_source_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "compound_related_disease_id" UUID NOT NULL,
  "source_origin_id" UUID NOT NULL,
  "role" "RelatedDiseaseSourceRole" NOT NULL,
  "source_record_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "related_disease_sources_pkey" PRIMARY KEY ("related_disease_source_id")
);

CREATE TABLE "evidence_records" (
  "evidence_record_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "compound_id" UUID NOT NULL,
  "source_origin_id" UUID,
  "reference_id" UUID,
  "evidence_type" TEXT NOT NULL,
  "human_evidence" BOOLEAN NOT NULL DEFAULT false,
  "summary" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "evidence_records_pkey" PRIMARY KEY ("evidence_record_id")
);

CREATE TABLE "annotation_confidence" (
  "annotation_confidence_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "compound_id" UUID NOT NULL,
  "level" "AnnotationConfidenceLevel" NOT NULL DEFAULT 'unknown',
  "method" TEXT,
  "rationale" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "annotation_confidence_pkey" PRIMARY KEY ("annotation_confidence_id")
);

CREATE TABLE "artifact_assessments" (
  "artifact_assessment_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "compound_id" UUID NOT NULL,
  "flag" "ArtifactFlag" NOT NULL DEFAULT 'unknown',
  "rationale" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "artifact_assessments_pkey" PRIMARY KEY ("artifact_assessment_id")
);

CREATE TABLE "pathways" (
  "pathway_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "pathway_type" "PathwayType" NOT NULL DEFAULT 'other',
  "external_id" TEXT,
  "source" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pathways_pkey" PRIMARY KEY ("pathway_id")
);

CREATE TABLE "compound_pathways" (
  "compound_pathway_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "compound_id" UUID NOT NULL,
  "pathway_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "compound_pathways_pkey" PRIMARY KEY ("compound_pathway_id")
);

CREATE TABLE "targets" (
  "target_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "organism" TEXT,
  "external_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "targets_pkey" PRIMARY KEY ("target_id")
);

CREATE TABLE "compound_targets" (
  "compound_target_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "compound_id" UUID NOT NULL,
  "target_id" UUID NOT NULL,
  "directness" "TargetDirectness" NOT NULL DEFAULT 'unknown',
  "source_origin_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "compound_targets_pkey" PRIMARY KEY ("compound_target_id")
);

CREATE TABLE "compound_notes" (
  "compound_note_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "compound_id" UUID NOT NULL,
  "note" TEXT NOT NULL,
  "created_by" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "compound_notes_pkey" PRIMARY KEY ("compound_note_id")
);

CREATE TABLE "import_jobs" (
  "import_job_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID,
  "status" "ImportJobStatus" NOT NULL DEFAULT 'pending',
  "file_name" TEXT,
  "summary" JSONB,
  "error_message" TEXT,
  "started_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "import_jobs_pkey" PRIMARY KEY ("import_job_id")
);

CREATE TABLE "source_payloads" (
  "source_payload_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "compound_id" UUID,
  "source_origin_id" UUID,
  "import_job_id" UUID,
  "payload" JSONB NOT NULL,
  "payload_hash" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "source_payloads_pkey" PRIMARY KEY ("source_payload_id")
);

CREATE TABLE "duplicate_reviews" (
  "duplicate_review_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "source_compound_id" UUID NOT NULL,
  "target_compound_id" UUID NOT NULL,
  "reason" TEXT,
  "status" "DuplicateReviewStatus" NOT NULL DEFAULT 'open',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolved_at" TIMESTAMP(3),
  CONSTRAINT "duplicate_reviews_pkey" PRIMARY KEY ("duplicate_review_id")
);

CREATE TABLE "audit_logs" (
  "audit_log_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID,
  "compound_id" UUID,
  "entity_name" TEXT NOT NULL,
  "entity_id" TEXT NOT NULL,
  "action" "AuditAction" NOT NULL,
  "before" JSONB,
  "after" JSONB,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("audit_log_id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "compounds_pubchem_cid_key" ON "compounds"("pubchem_cid");
CREATE INDEX "compounds_common_name_idx" ON "compounds"("common_name");
CREATE UNIQUE INDEX "compound_identity_compound_id_key" ON "compound_identity"("compound_id");
CREATE UNIQUE INDEX "source_origins_name_kind_key" ON "source_origins"("name","kind");
CREATE UNIQUE INDEX "compound_names_compound_id_name_name_type_key" ON "compound_names"("compound_id","name","name_type");
CREATE INDEX "compound_names_name_idx" ON "compound_names"("name");
CREATE UNIQUE INDEX "external_identifiers_database_identifier_key" ON "external_identifiers"("database","identifier");
CREATE INDEX "external_identifiers_compound_id_idx" ON "external_identifiers"("compound_id");
CREATE UNIQUE INDEX "chemical_classifications_name_key" ON "chemical_classifications"("name");
CREATE UNIQUE INDEX "compound_classification_links_compound_id_chemical_classification_id_key" ON "compound_classification_links"("compound_id","chemical_classification_id");
CREATE UNIQUE INDEX "compound_types_name_key" ON "compound_types"("name");
CREATE UNIQUE INDEX "compound_type_links_compound_id_compound_type_id_key" ON "compound_type_links"("compound_id","compound_type_id");
CREATE UNIQUE INDEX "compound_source_links_compound_id_source_origin_id_source_record_id_key" ON "compound_source_links"("compound_id","source_origin_id","source_record_id");
CREATE INDEX "datasets_analytical_platform_idx" ON "datasets"("analytical_platform");
CREATE UNIQUE INDEX "diseases_name_key" ON "diseases"("name");
CREATE INDEX "diseases_ontology_id_idx" ON "diseases"("ontology_id");
CREATE UNIQUE INDEX "disease_names_disease_id_name_name_type_key" ON "disease_names"("disease_id","name","name_type");
CREATE INDEX "disease_names_name_idx" ON "disease_names"("name");
CREATE UNIQUE INDEX "dataset_diseases_dataset_id_disease_id_cohort_label_key" ON "dataset_diseases"("dataset_id","disease_id","cohort_label");
CREATE UNIQUE INDEX "compound_disease_presence_compound_id_dataset_id_disease_id_key" ON "compound_disease_presence"("compound_id","dataset_id","disease_id");
CREATE INDEX "compound_disease_presence_disease_id_idx" ON "compound_disease_presence"("disease_id");
CREATE INDEX "compound_disease_presence_dataset_id_idx" ON "compound_disease_presence"("dataset_id");
CREATE UNIQUE INDEX "references_doi_key" ON "references"("doi");
CREATE INDEX "references_pmid_idx" ON "references"("pmid");
CREATE UNIQUE INDEX "compound_references_compound_id_reference_id_context_key" ON "compound_references"("compound_id","reference_id","context");
CREATE UNIQUE INDEX "compound_related_diseases_compound_id_disease_id_assertion_key" ON "compound_related_diseases"("compound_id","disease_id","assertion");
CREATE INDEX "compound_related_diseases_disease_id_idx" ON "compound_related_diseases"("disease_id");
CREATE UNIQUE INDEX "related_disease_sources_compound_related_disease_id_source_origin_id_role_key" ON "related_disease_sources"("compound_related_disease_id","source_origin_id","role");
CREATE INDEX "evidence_records_human_evidence_idx" ON "evidence_records"("human_evidence");
CREATE UNIQUE INDEX "annotation_confidence_compound_id_key" ON "annotation_confidence"("compound_id");
CREATE UNIQUE INDEX "pathways_name_pathway_type_source_key" ON "pathways"("name","pathway_type","source");
CREATE UNIQUE INDEX "compound_pathways_compound_id_pathway_id_key" ON "compound_pathways"("compound_id","pathway_id");
CREATE UNIQUE INDEX "targets_name_organism_key" ON "targets"("name","organism");
CREATE UNIQUE INDEX "compound_targets_compound_id_target_id_directness_key" ON "compound_targets"("compound_id","target_id","directness");
CREATE INDEX "source_payloads_payload_hash_idx" ON "source_payloads"("payload_hash");
CREATE UNIQUE INDEX "duplicate_reviews_source_compound_id_target_compound_id_key" ON "duplicate_reviews"("source_compound_id","target_compound_id");
CREATE INDEX "audit_logs_entity_name_entity_id_idx" ON "audit_logs"("entity_name","entity_id");
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

ALTER TABLE "compound_identity" ADD CONSTRAINT "compound_identity_compound_id_fkey" FOREIGN KEY ("compound_id") REFERENCES "compounds"("compound_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "compound_names" ADD CONSTRAINT "compound_names_compound_id_fkey" FOREIGN KEY ("compound_id") REFERENCES "compounds"("compound_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "compound_names" ADD CONSTRAINT "compound_names_source_origin_id_fkey" FOREIGN KEY ("source_origin_id") REFERENCES "source_origins"("source_origin_id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "external_identifiers" ADD CONSTRAINT "external_identifiers_compound_id_fkey" FOREIGN KEY ("compound_id") REFERENCES "compounds"("compound_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "external_identifiers" ADD CONSTRAINT "external_identifiers_source_origin_id_fkey" FOREIGN KEY ("source_origin_id") REFERENCES "source_origins"("source_origin_id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "compound_classification_links" ADD CONSTRAINT "compound_classification_links_compound_id_fkey" FOREIGN KEY ("compound_id") REFERENCES "compounds"("compound_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "compound_classification_links" ADD CONSTRAINT "compound_classification_links_chemical_classification_id_fkey" FOREIGN KEY ("chemical_classification_id") REFERENCES "chemical_classifications"("chemical_classification_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "compound_classification_links" ADD CONSTRAINT "compound_classification_links_source_origin_id_fkey" FOREIGN KEY ("source_origin_id") REFERENCES "source_origins"("source_origin_id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "compound_type_links" ADD CONSTRAINT "compound_type_links_compound_id_fkey" FOREIGN KEY ("compound_id") REFERENCES "compounds"("compound_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "compound_type_links" ADD CONSTRAINT "compound_type_links_compound_type_id_fkey" FOREIGN KEY ("compound_type_id") REFERENCES "compound_types"("compound_type_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "compound_type_links" ADD CONSTRAINT "compound_type_links_source_origin_id_fkey" FOREIGN KEY ("source_origin_id") REFERENCES "source_origins"("source_origin_id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "compound_source_links" ADD CONSTRAINT "compound_source_links_compound_id_fkey" FOREIGN KEY ("compound_id") REFERENCES "compounds"("compound_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "compound_source_links" ADD CONSTRAINT "compound_source_links_source_origin_id_fkey" FOREIGN KEY ("source_origin_id") REFERENCES "source_origins"("source_origin_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "datasets" ADD CONSTRAINT "datasets_source_origin_id_fkey" FOREIGN KEY ("source_origin_id") REFERENCES "source_origins"("source_origin_id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "dataset_files" ADD CONSTRAINT "dataset_files_dataset_id_fkey" FOREIGN KEY ("dataset_id") REFERENCES "datasets"("dataset_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "disease_names" ADD CONSTRAINT "disease_names_disease_id_fkey" FOREIGN KEY ("disease_id") REFERENCES "diseases"("disease_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dataset_diseases" ADD CONSTRAINT "dataset_diseases_dataset_id_fkey" FOREIGN KEY ("dataset_id") REFERENCES "datasets"("dataset_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dataset_diseases" ADD CONSTRAINT "dataset_diseases_disease_id_fkey" FOREIGN KEY ("disease_id") REFERENCES "diseases"("disease_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "compound_disease_presence" ADD CONSTRAINT "compound_disease_presence_compound_id_fkey" FOREIGN KEY ("compound_id") REFERENCES "compounds"("compound_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "compound_disease_presence" ADD CONSTRAINT "compound_disease_presence_dataset_id_fkey" FOREIGN KEY ("dataset_id") REFERENCES "datasets"("dataset_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "compound_disease_presence" ADD CONSTRAINT "compound_disease_presence_disease_id_fkey" FOREIGN KEY ("disease_id") REFERENCES "diseases"("disease_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "compound_references" ADD CONSTRAINT "compound_references_compound_id_fkey" FOREIGN KEY ("compound_id") REFERENCES "compounds"("compound_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "compound_references" ADD CONSTRAINT "compound_references_reference_id_fkey" FOREIGN KEY ("reference_id") REFERENCES "references"("reference_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "compound_related_diseases" ADD CONSTRAINT "compound_related_diseases_compound_id_fkey" FOREIGN KEY ("compound_id") REFERENCES "compounds"("compound_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "compound_related_diseases" ADD CONSTRAINT "compound_related_diseases_disease_id_fkey" FOREIGN KEY ("disease_id") REFERENCES "diseases"("disease_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "compound_related_diseases" ADD CONSTRAINT "compound_related_diseases_original_reference_id_fkey" FOREIGN KEY ("original_reference_id") REFERENCES "references"("reference_id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "related_disease_sources" ADD CONSTRAINT "related_disease_sources_compound_related_disease_id_fkey" FOREIGN KEY ("compound_related_disease_id") REFERENCES "compound_related_diseases"("compound_related_disease_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "related_disease_sources" ADD CONSTRAINT "related_disease_sources_source_origin_id_fkey" FOREIGN KEY ("source_origin_id") REFERENCES "source_origins"("source_origin_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evidence_records" ADD CONSTRAINT "evidence_records_compound_id_fkey" FOREIGN KEY ("compound_id") REFERENCES "compounds"("compound_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evidence_records" ADD CONSTRAINT "evidence_records_source_origin_id_fkey" FOREIGN KEY ("source_origin_id") REFERENCES "source_origins"("source_origin_id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "evidence_records" ADD CONSTRAINT "evidence_records_reference_id_fkey" FOREIGN KEY ("reference_id") REFERENCES "references"("reference_id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "annotation_confidence" ADD CONSTRAINT "annotation_confidence_compound_id_fkey" FOREIGN KEY ("compound_id") REFERENCES "compounds"("compound_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "artifact_assessments" ADD CONSTRAINT "artifact_assessments_compound_id_fkey" FOREIGN KEY ("compound_id") REFERENCES "compounds"("compound_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "compound_pathways" ADD CONSTRAINT "compound_pathways_compound_id_fkey" FOREIGN KEY ("compound_id") REFERENCES "compounds"("compound_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "compound_pathways" ADD CONSTRAINT "compound_pathways_pathway_id_fkey" FOREIGN KEY ("pathway_id") REFERENCES "pathways"("pathway_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "compound_targets" ADD CONSTRAINT "compound_targets_compound_id_fkey" FOREIGN KEY ("compound_id") REFERENCES "compounds"("compound_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "compound_targets" ADD CONSTRAINT "compound_targets_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "targets"("target_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "compound_notes" ADD CONSTRAINT "compound_notes_compound_id_fkey" FOREIGN KEY ("compound_id") REFERENCES "compounds"("compound_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "source_payloads" ADD CONSTRAINT "source_payloads_compound_id_fkey" FOREIGN KEY ("compound_id") REFERENCES "compounds"("compound_id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "source_payloads" ADD CONSTRAINT "source_payloads_source_origin_id_fkey" FOREIGN KEY ("source_origin_id") REFERENCES "source_origins"("source_origin_id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "source_payloads" ADD CONSTRAINT "source_payloads_import_job_id_fkey" FOREIGN KEY ("import_job_id") REFERENCES "import_jobs"("import_job_id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "duplicate_reviews" ADD CONSTRAINT "duplicate_reviews_source_compound_id_fkey" FOREIGN KEY ("source_compound_id") REFERENCES "compounds"("compound_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "duplicate_reviews" ADD CONSTRAINT "duplicate_reviews_target_compound_id_fkey" FOREIGN KEY ("target_compound_id") REFERENCES "compounds"("compound_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_compound_id_fkey" FOREIGN KEY ("compound_id") REFERENCES "compounds"("compound_id") ON DELETE SET NULL ON UPDATE CASCADE;
