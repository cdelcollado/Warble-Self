CREATE TABLE "profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"callsign" text,
	"country" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "codefiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"brand" text NOT NULL,
	"model" text NOT NULL,
	"country" text NOT NULL,
	"region" text,
	"file_path" text NOT NULL,
	"file_format" text NOT NULL,
	"downloads" integer DEFAULT 0 NOT NULL,
	"avg_rating" double precision DEFAULT 0 NOT NULL,
	"rating_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "codefile_ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codefile_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"rating" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_rating_user_codefile" UNIQUE("codefile_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "codefile_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codefile_id" uuid NOT NULL,
	"author_id" text NOT NULL,
	"parent_id" uuid,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "codefile_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_id" text NOT NULL,
	"codefile_id" uuid,
	"comment_id" uuid,
	"reason" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "codefiles" ADD CONSTRAINT "codefiles_author_id_profiles_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "codefile_ratings" ADD CONSTRAINT "codefile_ratings_codefile_id_codefiles_id_fk" FOREIGN KEY ("codefile_id") REFERENCES "public"."codefiles"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "codefile_ratings" ADD CONSTRAINT "codefile_ratings_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "codefile_comments" ADD CONSTRAINT "codefile_comments_codefile_id_codefiles_id_fk" FOREIGN KEY ("codefile_id") REFERENCES "public"."codefiles"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "codefile_comments" ADD CONSTRAINT "codefile_comments_author_id_profiles_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "codefile_comments" ADD CONSTRAINT "codefile_comments_parent_id_codefile_comments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."codefile_comments"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "codefile_reports" ADD CONSTRAINT "codefile_reports_reporter_id_profiles_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "codefile_reports" ADD CONSTRAINT "codefile_reports_codefile_id_codefiles_id_fk" FOREIGN KEY ("codefile_id") REFERENCES "public"."codefiles"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "codefile_reports" ADD CONSTRAINT "codefile_reports_comment_id_codefile_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."codefile_comments"("id") ON DELETE cascade ON UPDATE no action;
