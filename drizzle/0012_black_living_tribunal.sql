ALTER TABLE "tasks" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;

-- Backfill: assign sequential sort_order per topic, ordered by creation date
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY topic_id ORDER BY created_at ASC) - 1 AS rn
  FROM tasks
  WHERE topic_id IS NOT NULL
)
UPDATE tasks SET sort_order = ranked.rn FROM ranked WHERE tasks.id = ranked.id;