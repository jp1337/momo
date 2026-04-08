CREATE TABLE "energy_checkins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"energy_level" "energy_level" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "topics" ADD COLUMN "default_energy_level" "energy_level";--> statement-breakpoint
ALTER TABLE "energy_checkins" ADD CONSTRAINT "energy_checkins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "energy_checkins_user_date_idx" ON "energy_checkins" USING btree ("user_id","date");