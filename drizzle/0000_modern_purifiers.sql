CREATE TABLE "milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"title" varchar(240) NOT NULL,
	"description" text,
	"progress" integer DEFAULT 0 NOT NULL,
	"status" varchar(24) DEFAULT 'pending' NOT NULL,
	"owner" varchar(160),
	"due_label" varchar(120),
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_updates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"update_date" date NOT NULL,
	"title" varchar(240) NOT NULL,
	"body" text NOT NULL,
	"type" varchar(24) DEFAULT 'progress' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(160) NOT NULL,
	"name" varchar(220) NOT NULL,
	"short_name" varchar(120) NOT NULL,
	"code" varchar(32) NOT NULL,
	"summary" text NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"progress_label" varchar(80) DEFAULT 'Manual' NOT NULL,
	"status" varchar(80) DEFAULT 'Planning' NOT NULL,
	"health" varchar(24) DEFAULT 'planning' NOT NULL,
	"priority" varchar(24) DEFAULT 'Medium' NOT NULL,
	"phase" varchar(120) DEFAULT 'Planning' NOT NULL,
	"owner" varchar(160) NOT NULL,
	"collaborators" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"target_date" date,
	"last_updated" date NOT NULL,
	"next_action" text NOT NULL,
	"blocker" text DEFAULT 'No active blocker' NOT NULL,
	"accent" varchar(16) DEFAULT '#e3262e' NOT NULL,
	"outcomes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "risks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"title" varchar(240) NOT NULL,
	"detail" text NOT NULL,
	"severity" varchar(16) DEFAULT 'medium' NOT NULL,
	"mitigation" text NOT NULL,
	"owner" varchar(160) NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_updates" ADD CONSTRAINT "project_updates_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risks" ADD CONSTRAINT "risks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "projects_slug_idx" ON "projects" USING btree ("slug");