-- Achievements: Anzeigetext lebt in messages/*.json, nicht in der Datenbank.
--
-- title und description wurden von seedAchievements() aus ACHIEVEMENT_DEFINITIONS
-- gespiegelt und waren damit in jeder Instanz deutsch — auch fuer Nutzerinnen
-- mit locale = "fr". Die Spalten sind abgeleitete Daten ohne eigene Wahrheit;
-- ihr Verlust ist kein Datenverlust.
--
-- Der key bleibt die stabile Identitaet und ist bereits UNIQUE.
ALTER TABLE "achievements" DROP COLUMN IF EXISTS "title";
ALTER TABLE "achievements" DROP COLUMN IF EXISTS "description";
