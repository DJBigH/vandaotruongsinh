-- Run after `prisma db push`. Existing learned skills keep the first four
-- combat positions; later learned skills stay in the book for manual swapping.
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "characterId" ORDER BY "skillId") AS slot
  FROM "character_skills" WHERE "isEquipped" = true
)
UPDATE "character_skills" AS s SET "equipSlot" = ordered.slot
FROM ordered WHERE s.id = ordered.id AND ordered.slot <= 4;
UPDATE "character_skills" SET "isEquipped" = false WHERE "isEquipped" = true AND "equipSlot" IS NULL;
