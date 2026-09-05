CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS "archive_judgments" (
  "source_key" text PRIMARY KEY,
  "cnr" text,
  "case_id" text,
  "title" text NOT NULL,
  "court_code" text NOT NULL,
  "court_name" text NOT NULL,
  "bench" text,
  "judges" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "author_judge" text,
  "decision_date" date,
  "registration_date" date,
  "year" integer,
  "petitioner" text,
  "respondent" text,
  "citation" text,
  "disposal_nature" text,
  "description" text,
  "pdf_path" text,
  "pdf_exists" boolean,
  "available_languages" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "source_name" text DEFAULT 'bharat-courts-archive' NOT NULL,
  "source_license" text DEFAULT 'CC-BY-4.0' NOT NULL,
  "connector_version" text NOT NULL,
  "raw_metadata" jsonb NOT NULL,
  "status" "content_status" DEFAULT 'needs_review' NOT NULL,
  "first_fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_verified_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "archive_judgments_cnr_uq" ON "archive_judgments" ("cnr") WHERE "cnr" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "archive_judgments_court_year_idx" ON "archive_judgments" ("court_code", "year", "decision_date");
CREATE INDEX IF NOT EXISTS "archive_judgments_title_trgm_idx" ON "archive_judgments" USING gin ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "archive_judgments_case_id_idx" ON "archive_judgments" ("case_id");

CREATE TABLE IF NOT EXISTS "archive_ingestion_partitions" (
  "court_code" text NOT NULL,
  "year" integer NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "imported_count" integer DEFAULT 0 NOT NULL,
  "started_at" timestamp with time zone,
  "finished_at" timestamp with time zone,
  "error" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY ("court_code", "year")
);
