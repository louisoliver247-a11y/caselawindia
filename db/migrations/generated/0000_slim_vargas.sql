CREATE TYPE "public"."content_status" AS ENUM('draft', 'needs_review', 'approved', 'published', 'rejected', 'archived');--> statement-breakpoint
CREATE TYPE "public"."content_type" AS ENUM('act', 'section', 'rule', 'notification', 'circular', 'order', 'instruction', 'amendment', 'form', 'case', 'article', 'faq', 'announcement', 'update');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('bare_act', 'rules', 'notification', 'circular', 'judgment', 'order', 'instruction', 'form', 'other');--> statement-breakpoint
CREATE TYPE "public"."ingestion_status" AS ENUM('discovered', 'fetched', 'downloaded', 'parsed', 'ai_processed', 'needs_review', 'approved', 'published', 'rejected', 'failed');--> statement-breakpoint
CREATE TABLE "act_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"act_id" uuid NOT NULL,
	"parent_id" uuid,
	"number" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "act_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"act_id" uuid NOT NULL,
	"label" text NOT NULL,
	"effective_from" date,
	"effective_to" date,
	"source_document_version_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "acts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"jurisdiction" text DEFAULT 'IN' NOT NULL,
	"tax_domain" text NOT NULL,
	"slug" text NOT NULL,
	"short_title" text NOT NULL,
	"long_title" text,
	"enactment_date" date,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_users" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"role" text DEFAULT 'editor' NOT NULL,
	"permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"last_login_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "ai_processing_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_type" text NOT NULL,
	"entity_type" "content_type",
	"entity_id" uuid,
	"status" text DEFAULT 'queued' NOT NULL,
	"input" jsonb NOT NULL,
	"structured_output" jsonb,
	"model" text,
	"prompt_version" text,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"author_id" uuid,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "articles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid,
	"before" jsonb,
	"after" jsonb,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "case_citations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"citation" text NOT NULL,
	"kind" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "case_judges" (
	"case_id" uuid NOT NULL,
	"judge_name" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "case_judges_case_id_judge_name_pk" PRIMARY KEY("case_id","judge_name")
);
--> statement-breakpoint
CREATE TABLE "cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"case_name" text NOT NULL,
	"court" text NOT NULL,
	"bench" text,
	"case_number" text,
	"neutral_citation" text,
	"decision_date" date,
	"appellant" text,
	"respondent" text,
	"facts" text,
	"legal_issues" jsonb,
	"decision" text,
	"ratio_decidendi" text,
	"ai_summary" text,
	"source_document_version_id" uuid NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cases_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "content_relationships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_type" "content_type" NOT NULL,
	"source_id" uuid NOT NULL,
	"target_type" "content_type" NOT NULL,
	"target_id" uuid NOT NULL,
	"relationship_type" text NOT NULL,
	"confidence" numeric(5, 4),
	"ai_suggested" boolean DEFAULT false NOT NULL,
	"manually_verified" boolean DEFAULT false NOT NULL,
	"verified_by" uuid,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "faqs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"is_ai_assisted" boolean DEFAULT false NOT NULL,
	"source_locator" jsonb,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingestion_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"source_url" text NOT NULL,
	"normalized_title" text,
	"document_number" text,
	"document_date" date,
	"content_hash" text,
	"status" "ingestion_status" DEFAULT 'discovered' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingestion_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"status" "ingestion_status" DEFAULT 'discovered' NOT NULL,
	"discovered_count" integer DEFAULT 0 NOT NULL,
	"processed_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "ingestion_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"domain" text NOT NULL,
	"source_type" text NOT NULL,
	"base_url" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"rate_limit_ms" integer DEFAULT 1000 NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "legal_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "content_type" NOT NULL,
	"domain" text NOT NULL,
	"slug" text NOT NULL,
	"document_number" text,
	"title" text NOT NULL,
	"subject" text,
	"authority" text,
	"issued_on" date,
	"effective_from" date,
	"official_text" text,
	"ai_summary" text,
	"source_document_version_id" uuid NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rule_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rule_id" uuid NOT NULL,
	"official_text" text NOT NULL,
	"ai_explanation" text,
	"effective_from" date,
	"effective_to" date,
	"source_document_version_id" uuid NOT NULL,
	"source_locator" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ruleset_id" uuid NOT NULL,
	"number" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rulesets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"act_id" uuid,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rulesets_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "section_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"section_id" uuid NOT NULL,
	"act_version_id" uuid,
	"official_text" text NOT NULL,
	"ai_summary" text,
	"ai_explanation" text,
	"ai_practical_notes" jsonb,
	"effective_from" date,
	"effective_to" date,
	"source_document_version_id" uuid NOT NULL,
	"source_locator" jsonb NOT NULL,
	"last_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seo_metadata" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"path" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"canonical_url" text,
	"no_index" boolean DEFAULT false NOT NULL,
	"open_graph" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"structured_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "seo_metadata_path_unique" UNIQUE("path")
);
--> statement-breakpoint
CREATE TABLE "source_document_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_document_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"file_hash" text NOT NULL,
	"content_hash" text,
	"storage_key" text NOT NULL,
	"parsed_text" text,
	"parser_version" text,
	"parsed_metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "document_type" NOT NULL,
	"title" text NOT NULL,
	"original_filename" text NOT NULL,
	"storage_key" text NOT NULL,
	"source_name" text NOT NULL,
	"source_url" text,
	"authority" text,
	"publication_date" date,
	"file_hash" text NOT NULL,
	"mime_type" text NOT NULL,
	"byte_size" integer NOT NULL,
	"processing_status" "ingestion_status" DEFAULT 'downloaded' NOT NULL,
	"first_fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"password_hash" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "act_sections" ADD CONSTRAINT "act_sections_act_id_acts_id_fk" FOREIGN KEY ("act_id") REFERENCES "public"."acts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "act_versions" ADD CONSTRAINT "act_versions_act_id_acts_id_fk" FOREIGN KEY ("act_id") REFERENCES "public"."acts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "act_versions" ADD CONSTRAINT "act_versions_source_document_version_id_source_document_versions_id_fk" FOREIGN KEY ("source_document_version_id") REFERENCES "public"."source_document_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_citations" ADD CONSTRAINT "case_citations_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_judges" ADD CONSTRAINT "case_judges_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_source_document_version_id_source_document_versions_id_fk" FOREIGN KEY ("source_document_version_id") REFERENCES "public"."source_document_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_relationships" ADD CONSTRAINT "content_relationships_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_items" ADD CONSTRAINT "ingestion_items_run_id_ingestion_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."ingestion_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_runs" ADD CONSTRAINT "ingestion_runs_source_id_ingestion_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."ingestion_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_documents" ADD CONSTRAINT "legal_documents_source_document_version_id_source_document_versions_id_fk" FOREIGN KEY ("source_document_version_id") REFERENCES "public"."source_document_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rule_versions" ADD CONSTRAINT "rule_versions_rule_id_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rule_versions" ADD CONSTRAINT "rule_versions_source_document_version_id_source_document_versions_id_fk" FOREIGN KEY ("source_document_version_id") REFERENCES "public"."source_document_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rules" ADD CONSTRAINT "rules_ruleset_id_rulesets_id_fk" FOREIGN KEY ("ruleset_id") REFERENCES "public"."rulesets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rulesets" ADD CONSTRAINT "rulesets_act_id_acts_id_fk" FOREIGN KEY ("act_id") REFERENCES "public"."acts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "section_versions" ADD CONSTRAINT "section_versions_section_id_act_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."act_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "section_versions" ADD CONSTRAINT "section_versions_act_version_id_act_versions_id_fk" FOREIGN KEY ("act_version_id") REFERENCES "public"."act_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "section_versions" ADD CONSTRAINT "section_versions_source_document_version_id_source_document_versions_id_fk" FOREIGN KEY ("source_document_version_id") REFERENCES "public"."source_document_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_document_versions" ADD CONSTRAINT "source_document_versions_source_document_id_source_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."source_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "act_sections_slug_uq" ON "act_sections" USING btree ("act_id","slug");--> statement-breakpoint
CREATE INDEX "act_sections_number_idx" ON "act_sections" USING btree ("act_id","number");--> statement-breakpoint
CREATE UNIQUE INDEX "act_versions_label_uq" ON "act_versions" USING btree ("act_id","label");--> statement-breakpoint
CREATE UNIQUE INDEX "acts_slug_uq" ON "acts" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "content_relationships_uq" ON "content_relationships" USING btree ("source_type","source_id","target_type","target_id","relationship_type");--> statement-breakpoint
CREATE INDEX "relationships_source_idx" ON "content_relationships" USING btree ("source_type","source_id","manually_verified");--> statement-breakpoint
CREATE INDEX "relationships_target_idx" ON "content_relationships" USING btree ("target_type","target_id","manually_verified");--> statement-breakpoint
CREATE UNIQUE INDEX "ingestion_items_external_uq" ON "ingestion_items" USING btree ("run_id","external_id");--> statement-breakpoint
CREATE INDEX "ingestion_items_dedupe_idx" ON "ingestion_items" USING btree ("document_number","document_date","content_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "legal_documents_slug_uq" ON "legal_documents" USING btree ("type","slug");--> statement-breakpoint
CREATE INDEX "legal_documents_lookup_idx" ON "legal_documents" USING btree ("type","document_number","issued_on");--> statement-breakpoint
CREATE UNIQUE INDEX "rules_slug_uq" ON "rules" USING btree ("ruleset_id","slug");--> statement-breakpoint
CREATE INDEX "section_versions_date_idx" ON "section_versions" USING btree ("section_id","effective_from");--> statement-breakpoint
CREATE UNIQUE INDEX "source_document_versions_uq" ON "source_document_versions" USING btree ("source_document_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "source_documents_hash_uq" ON "source_documents" USING btree ("file_hash");--> statement-breakpoint
CREATE INDEX "source_documents_type_date_idx" ON "source_documents" USING btree ("type","publication_date");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uq" ON "users" USING btree ("email");