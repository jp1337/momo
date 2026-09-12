# Verwaiste Message-Keys — Bestandsaufnahme

Erzeugt von `npm run check:i18n` (Kategorie `ORPHAN`) nach dem Einbau der
Gegenrichtung, abgearbeitet in Task 4 von
[`plan-2-browser-und-ratsche.md`](plan-2-browser-und-ratsche.md).

**Jede Zeile hat eine Antwort, bevor geloescht wird.** Eine Loeschung auf
Verdacht ist in diesem Task verboten; das Pinnen unter `PENDING_WIRING` ist der
Ausweg, der das Verbot bezahlbar macht.

| Antwort | Was sie bedeutet | Handlung |
| --- | --- | --- |
| **Familie** | Der Key wird per Template-Literal gebildet | Eintrag in `KEY_FAMILIES` |
| **fehlende Verdrahtung** | Die Uebersetzung existiert, der Code hartkodiert stattdessen | **nicht loeschen** — `PENDING_WIRING` mit faelligem Schnitt |
| **toter Text** | Keine Aufrufstelle, kein Template-Literal, kein hartkodiertes Gegenstueck | in allen sieben Locales loeschen |

## Ergebnis

| | |
| --- | --- |
| Verwaist beim ersten Lauf | **124** |
| davon Familie | **12** (`closure.quote_<n>`) |
| davon fehlende Verdrahtung, in diesem Task verdrahtet | **4** (`tasks.time_*`) |
| davon fehlende Verdrahtung, gepinnt bis Schnitt 3 | **3** |
| davon toter Text, geloescht | **105** + `closure.quote_count` (neu verwaist, siehe unten) |
| `check:i18n` danach | **Exit 0** |

## Die Liste

| Key | Deutscher Text | Antwort | Begruendung |
| --- | --- | --- | --- |
| `animations.achievement_title` | Achievement freigeschaltet! | fehlende Verdrahtung | PENDING_WIRING — siehe Kopf von scripts/i18n-key-families.mjs |
| `review.push_body` | Diese Woche: {completed} erledigt, {postponed} verschoben… | fehlende Verdrahtung | PENDING_WIRING — siehe Kopf von scripts/i18n-key-families.mjs |
| `review.push_title` | Dein Wochenrückblick | fehlende Verdrahtung | PENDING_WIRING — siehe Kopf von scripts/i18n-key-families.mjs |
| `tasks.time_15min` | 15 min | fehlende Verdrahtung (behoben) | components/tasks/task-form.tsx hartkodierte `5 min`…`60 min`; ru/zh uebersetzen sie. In diesem Task verdrahtet. |
| `tasks.time_30min` | 30 min | fehlende Verdrahtung (behoben) | components/tasks/task-form.tsx hartkodierte `5 min`…`60 min`; ru/zh uebersetzen sie. In diesem Task verdrahtet. |
| `tasks.time_5min` | 5 min | fehlende Verdrahtung (behoben) | components/tasks/task-form.tsx hartkodierte `5 min`…`60 min`; ru/zh uebersetzen sie. In diesem Task verdrahtet. |
| `tasks.time_60min` | 60 min | fehlende Verdrahtung (behoben) | components/tasks/task-form.tsx hartkodierte `5 min`…`60 min`; ru/zh uebersetzen sie. In diesem Task verdrahtet. |
| `closure.quote_0` | „Zeit ist Leben. Und das Leben wohnt im Herzen.“ — Michae… | Familie | per `t(`quote_${index}`)` gebildet, components/animations/emotional-closure.tsx:51 — Familie `closure.quote_<n>` |
| `closure.quote_1` | „Manchmal hat man eine sehr lange Straße vor sich. Und da… | Familie | per `t(`quote_${index}`)` gebildet, components/animations/emotional-closure.tsx:51 — Familie `closure.quote_<n>` |
| `closure.quote_10` | Kleine Schritte führen auch ans Ziel. | Familie | per `t(`quote_${index}`)` gebildet, components/animations/emotional-closure.tsx:51 — Familie `closure.quote_<n>` |
| `closure.quote_11` | Gut gemacht. Morgen kommt der nächste Schritt. | Familie | per `t(`quote_${index}`)` gebildet, components/animations/emotional-closure.tsx:51 — Familie `closure.quote_<n>` |
| `closure.quote_2` | „Momo konnte so zuhören, dass ratlose oder unentschlossen… | Familie | per `t(`quote_${index}`)` gebildet, components/animations/emotional-closure.tsx:51 — Familie `closure.quote_<n>` |
| `closure.quote_3` | „Es gibt ein großes und doch ganz alltägliches Geheimnis.… | Familie | per `t(`quote_${index}`)` gebildet, components/animations/emotional-closure.tsx:51 — Familie `closure.quote_<n>` |
| `closure.quote_4` | „Stunden-Blumen nennt man sie, weil sie mit jeder Stunde … | Familie | per `t(`quote_${index}`)` gebildet, components/animations/emotional-closure.tsx:51 — Familie `closure.quote_<n>` |
| `closure.quote_5` | „Denn in Wirklichkeit beginnt die Zeit immer genau jetzt.… | Familie | per `t(`quote_${index}`)` gebildet, components/animations/emotional-closure.tsx:51 — Familie `closure.quote_<n>` |
| `closure.quote_6` | Du hast dir heute Zeit genommen — das zählt. | Familie | per `t(`quote_${index}`)` gebildet, components/animations/emotional-closure.tsx:51 — Familie `closure.quote_<n>` |
| `closure.quote_7` | Ein Schritt nach dem anderen. Genau so geht es. | Familie | per `t(`quote_${index}`)` gebildet, components/animations/emotional-closure.tsx:51 — Familie `closure.quote_<n>` |
| `closure.quote_8` | Nicht die Größe der Aufgabe zählt, sondern dass du angefa… | Familie | per `t(`quote_${index}`)` gebildet, components/animations/emotional-closure.tsx:51 — Familie `closure.quote_<n>` |
| `closure.quote_9` | Du hast heute etwas geschafft, das gestern noch offen war. | Familie | per `t(`quote_${index}`)` gebildet, components/animations/emotional-closure.tsx:51 — Familie `closure.quote_<n>` |
| `achievements.earned_at` | Verdient am {date} | toter Text | `/stats` und `/achievements` sind seit v0.8.0 Tabs von `/progress`; die Tab-Komponenten tragen eigene Keys |
| `achievements.locked` | Gesperrt | toter Text | `/stats` und `/achievements` sind seit v0.8.0 Tabs von `/progress`; die Tab-Komponenten tragen eigene Keys |
| `achievements.no_achievements` | Noch keine Errungenschaften — erledige Aufgaben um sie fr… | toter Text | `/stats` und `/achievements` sind seit v0.8.0 Tabs von `/progress`; die Tab-Komponenten tragen eigene Keys |
| `achievements.page_subtitle` | {earned} von {total} freigeschaltet | toter Text | `/stats` und `/achievements` sind seit v0.8.0 Tabs von `/progress`; die Tab-Komponenten tragen eigene Keys |
| `achievements.page_title` | Errungenschaften | toter Text | `/stats` und `/achievements` sind seit v0.8.0 Tabs von `/progress`; die Tab-Komponenten tragen eigene Keys |
| `achievements.section_secret` | Geheimnis | toter Text | `/stats` und `/achievements` sind seit v0.8.0 Tabs von `/progress`; die Tab-Komponenten tragen eigene Keys |
| `api_keys.close` | Schließen | toter Text | keine Aufrufstelle, kein Template-Literal, kein hartkodiertes Gegenstueck |
| `api_keys.copy` | Key kopieren | toter Text | keine Aufrufstelle, kein Template-Literal, kein hartkodiertes Gegenstueck |
| `auth.app_name` | 🪶 Momo | toter Text | keine Aufrufstelle, kein Template-Literal, kein hartkodiertes Gegenstueck |
| `closure.quote_count` | 12 | toter Text | die Zahl steht jetzt als `CLOSURE_QUOTE_COUNT` im Code — eine Zaehlung in den Locale-Dateien kann pro Sprache abweichen |
| `common.create` | Erstellen | toter Text | keine Aufrufstelle, kein Template-Literal, kein hartkodiertes Gegenstueck |
| `common.delete` | Löschen | toter Text | keine Aufrufstelle, kein Template-Literal, kein hartkodiertes Gegenstueck |
| `common.edit` | Bearbeiten | toter Text | keine Aufrufstelle, kein Template-Literal, kein hartkodiertes Gegenstueck |
| `dashboard.energy_checkin_subtitle` | Momo passt deine Quest an dein Energielevel an. | toter Text | keine Aufrufstelle, kein Template-Literal, kein hartkodiertes Gegenstueck |
| `dashboard.quest_label_high` | Hoch | toter Text | Prioritaetslabels kommen aus der Familie `priority_<p>` |
| `dashboard.quest_label_normal` | Normal | toter Text | Prioritaetslabels kommen aus der Familie `priority_<p>` |
| `dashboard.quest_label_someday` | Irgendwann | toter Text | Prioritaetslabels kommen aus der Familie `priority_<p>` |
| `dashboard.quest_postpones_none` | Heute nicht mehr verschiebbar | toter Text | keine Aufrufstelle, kein Template-Literal, kein hartkodiertes Gegenstueck |
| `dashboard.quick_wins_empty` | Keine kurzen Aufgaben vorhanden — füge Zeitschätzungen zu… | toter Text | keine Aufrufstelle, kein Template-Literal, kein hartkodiertes Gegenstueck |
| `dashboard.streak_shield_available` | Cassiopeia verfügbar | toter Text | keine Aufrufstelle, kein Template-Literal, kein hartkodiertes Gegenstueck |
| `dashboard.streak_shield_used` | Cassiopeia verbraucht | toter Text | keine Aufrufstelle, kein Template-Literal, kein hartkodiertes Gegenstueck |
| `habits.page_title` | Gewohnheiten | toter Text | keine Aufrufstelle, kein Template-Literal, kein hartkodiertes Gegenstueck |
| `habits.stat_streak_empty` | Noch keiner | toter Text | der Kommentar in components/progress/tabs/habits-tab.tsx:183 behauptet, der Key bleibe fuer die Rand-Zeile — die Zeile ruft ihn nicht auf. Kommentar in diesem Task korrigiert. |
| `landing.hero_cta_dashboard` | Zum Dashboard → | toter Text | keine Aufrufstelle, kein Template-Literal, kein hartkodiertes Gegenstueck |
| `landing.meta_description` | Ein Aufgaben-Manager für Menschen, die zu Prokrastination… | toter Text | app/page.tsx:17 traegt eigene, deutsche SEO-Metadaten mit anderem Wortlaut. Dass diese Metadaten fuer alle sieben Locales deutsch sind, ist ein eigener Fund — siehe unten. |
| `landing.meta_title` | Momo — Steal your time back | toter Text | app/page.tsx:17 traegt eigene, deutsche SEO-Metadaten mit anderem Wortlaut. Dass diese Metadaten fuer alle sieben Locales deutsch sind, ist ein eigener Fund — siehe unten. |
| `nav.achievements` | Errungenschaften | toter Text | die Navigation fuehrt seit v0.8.0 auf `/progress?tab=…`; `components/layout` ruft diese drei nicht mehr auf |
| `nav.habits` | Gewohnheiten | toter Text | die Navigation fuehrt seit v0.8.0 auf `/progress?tab=…`; `components/layout` ruft diese drei nicht mehr auf |
| `nav.review` | Rückblick | toter Text | die Navigation fuehrt seit v0.8.0 auf `/progress?tab=…`; `components/layout` ruft diese drei nicht mehr auf |
| `onboarding.notifications_timezone_detected` | Erkannt: {timezone} | toter Text | keine Aufrufstelle, kein Template-Literal, kein hartkodiertes Gegenstueck |
| `onboarding.page_title` | Willkommen bei Momo | toter Text | keine Aufrufstelle, kein Template-Literal, kein hartkodiertes Gegenstueck |
| `onboarding.progress_step` | Schritt {current} von {total} | toter Text | keine Aufrufstelle, kein Template-Literal, kein hartkodiertes Gegenstueck |
| `onboarding.topic_created` | Thema erstellt! | toter Text | keine Aufrufstelle, kein Template-Literal, kein hartkodiertes Gegenstueck |
| `quick.confirm_delete` | Diese Aufgabe löschen? | toter Text | keine Aufrufstelle, kein Template-Literal, kein hartkodiertes Gegenstueck |
| `quick.empty_title` | Keine 5-Minuten-Aufgaben | toter Text | keine Aufrufstelle, kein Template-Literal, kein hartkodiertes Gegenstueck |
| `review.page_title` | Wochenrückblick | toter Text | keine Aufrufstelle, kein Template-Literal, kein hartkodiertes Gegenstueck |
| `review.section_summary` | Zusammenfassung | toter Text | keine Aufrufstelle, kein Template-Literal, kein hartkodiertes Gegenstueck |
| `review.streak` | Streak | toter Text | keine Aufrufstelle, kein Template-Literal, kein hartkodiertes Gegenstueck |
| `review.streak_max` | Bester Streak | toter Text | keine Aufrufstelle, kein Template-Literal, kein hartkodiertes Gegenstueck |
| `search.no_results_wishlist` | Keine Artikel gefunden. | toter Text | keine Aufrufstelle, kein Template-Literal, kein hartkodiertes Gegenstueck |
| `settings.channel_add` | Kanal hinzufügen | toter Text | keine Aufrufstelle, kein Template-Literal, kein hartkodiertes Gegenstueck |
| `settings.channel_email_unavailable` | E-Mail ist auf dieser Momo-Instanz nicht konfiguriert. | toter Text | keine Aufrufstelle, kein Template-Literal, kein hartkodiertes Gegenstueck |
| `settings.page_subtitle` | Verwalte deine Kontoeinstellungen und Benachrichtigungen. | toter Text | keine Aufrufstelle, kein Template-Literal, kein hartkodiertes Gegenstueck |
| `settings.page_title` | Einstellungen | toter Text | keine Aufrufstelle, kein Template-Literal, kein hartkodiertes Gegenstueck |
| `settings.profile_image_label` | Profilbild | toter Text | keine Aufrufstelle, kein Template-Literal, kein hartkodiertes Gegenstueck |
| `settings.session_revoking` | Wird widerrufen… | toter Text | keine Aufrufstelle, kein Template-Literal, kein hartkodiertes Gegenstueck |
| `stats.achievement_earned_at` | Verdient am {date} | toter Text | `/stats` und `/achievements` sind seit v0.8.0 Tabs von `/progress`; die Tab-Komponenten tragen eigene Keys |
| `stats.achievement_locked` | Gesperrt | toter Text | `/stats` und `/achievements` sind seit v0.8.0 Tabs von `/progress`; die Tab-Komponenten tragen eigene Keys |
| `stats.best_streak` | Bester Streak | toter Text | `/stats` und `/achievements` sind seit v0.8.0 Tabs von `/progress`; die Tab-Komponenten tragen eigene Keys |
| `stats.coins_goal` | Ziel: {count} Coins | toter Text | `/stats` und `/achievements` sind seit v0.8.0 Tabs von `/progress`; die Tab-Komponenten tragen eigene Keys |
| `stats.current_balance` | Aktuelles Guthaben | toter Text | `/stats` und `/achievements` sind seit v0.8.0 Tabs von `/progress`; die Tab-Komponenten tragen eigene Keys |
| `stats.current_streak` | Aktueller Streak | toter Text | `/stats` und `/achievements` sind seit v0.8.0 Tabs von `/progress`; die Tab-Komponenten tragen eigene Keys |
| `stats.level_next` | → {title} (Level {level}) | toter Text | `/stats` und `/achievements` sind seit v0.8.0 Tabs von `/progress`; die Tab-Komponenten tragen eigene Keys |
| `stats.no_achievements` | Keine Errungenschaften gefunden. | toter Text | `/stats` und `/achievements` sind seit v0.8.0 Tabs von `/progress`; die Tab-Komponenten tragen eigene Keys |
| `stats.page_subtitle` | Dein persönlicher Überblick über Fortschritt und Aktivität. | toter Text | `/stats` und `/achievements` sind seit v0.8.0 Tabs von `/progress`; die Tab-Komponenten tragen eigene Keys |
| `stats.page_title` | Statistiken | toter Text | `/stats` und `/achievements` sind seit v0.8.0 Tabs von `/progress`; die Tab-Komponenten tragen eigene Keys |
| `stats.section_achievements` | Errungenschaften ({earned}/{total}) | toter Text | `/stats` und `/achievements` sind seit v0.8.0 Tabs von `/progress`; die Tab-Komponenten tragen eigene Keys |
| `stats.section_activity` | Aktivität | toter Text | `/stats` und `/achievements` sind seit v0.8.0 Tabs von `/progress`; die Tab-Komponenten tragen eigene Keys |
| `stats.section_overview` | Übersicht | toter Text | `/stats` und `/achievements` sind seit v0.8.0 Tabs von `/progress`; die Tab-Komponenten tragen eigene Keys |
| `task_group.blocked_hint` | Wartet auf vorherige Aufgabe in dieser Gruppe | toter Text | keine Aufrufstelle, kein Template-Literal, kein hartkodiertes Gegenstueck |
| `tasks.bulk_recurring_skip` | Wiederkehrende Tasks werden beim Bulk-Erledigen übersprun… | toter Text | keine Aufrufstelle, kein Template-Literal, kein hartkodiertes Gegenstueck |
| `tasks.deleted_undo` | Aufgabe gelöscht. | toter Text | keine Aufrufstelle, kein Template-Literal, kein hartkodiertes Gegenstueck |
| `tasks.empty_afternoon` | Alles erledigt? | toter Text | die tageszeitabhaengigen Leerzustaende gibt es nicht mehr — kein `daypart`/`timeOfDay` im Quelltext |
| `tasks.empty_afternoon_sub` | Füge neue Aufgaben hinzu oder genieße die Ruhe. | toter Text | die tageszeitabhaengigen Leerzustaende gibt es nicht mehr — kein `daypart`/`timeOfDay` im Quelltext |
| `tasks.empty_evening` | Perfekt, nichts mehr für heute! | toter Text | die tageszeitabhaengigen Leerzustaende gibt es nicht mehr — kein `daypart`/`timeOfDay` im Quelltext |
| `tasks.empty_evening_sub` | Du hast alles geschafft. Gönn dir eine Pause. | toter Text | die tageszeitabhaengigen Leerzustaende gibt es nicht mehr — kein `daypart`/`timeOfDay` im Quelltext |
| `tasks.empty_kbd_hint` | Neue Aufgabe mit | toter Text | keine Aufrufstelle, kein Template-Literal, kein hartkodiertes Gegenstueck |
| `tasks.empty_latenight` | Für heute reicht's | toter Text | die tageszeitabhaengigen Leerzustaende gibt es nicht mehr — kein `daypart`/`timeOfDay` im Quelltext |
| `tasks.empty_latenight_sub` | Morgen geht's weiter — gute Nacht. | toter Text | die tageszeitabhaengigen Leerzustaende gibt es nicht mehr — kein `daypart`/`timeOfDay` im Quelltext |
| `tasks.empty_morning` | Guten Morgen! | toter Text | die tageszeitabhaengigen Leerzustaende gibt es nicht mehr — kein `daypart`/`timeOfDay` im Quelltext |
| `tasks.empty_morning_sub` | Starte den Tag mit deiner ersten Aufgabe. | toter Text | die tageszeitabhaengigen Leerzustaende gibt es nicht mehr — kein `daypart`/`timeOfDay` im Quelltext |
| `tasks.empty_night` | Noch keine Aufgaben | toter Text | die tageszeitabhaengigen Leerzustaende gibt es nicht mehr — kein `daypart`/`timeOfDay` im Quelltext |
| `tasks.empty_night_sub` | Leg morgen früh los — du hast noch Zeit. | toter Text | die tageszeitabhaengigen Leerzustaende gibt es nicht mehr — kein `daypart`/`timeOfDay` im Quelltext |
| `tasks.form_label_title` | Titel | toter Text | keine Aufrufstelle, kein Template-Literal, kein hartkodiertes Gegenstueck |
| `tasks.form_label_type` | Typ | toter Text | keine Aufrufstelle, kein Template-Literal, kein hartkodiertes Gegenstueck |
| `tasks.form_type_daily` | Tägliche Quest | toter Text | keine Aufrufstelle, kein Template-Literal, kein hartkodiertes Gegenstueck |
| `tasks.form_type_onetime` | Einmalig | toter Text | keine Aufrufstelle, kein Template-Literal, kein hartkodiertes Gegenstueck |
| `tasks.form_type_recurring` | Wiederkehrend | toter Text | keine Aufrufstelle, kein Template-Literal, kein hartkodiertes Gegenstueck |
| `tasks.inline_hint` | Doppelklick zum Bearbeiten | toter Text | keine Aufrufstelle, kein Template-Literal, kein hartkodiertes Gegenstueck |
| `tasks.page_subtitle` | {active} aktiv · {completed} erledigt | toter Text | keine Aufrufstelle, kein Template-Literal, kein hartkodiertes Gegenstueck |
| `tasks.page_subtitle_empty` | Noch keine Aufgaben — lass uns die erste hinzufügen. | toter Text | keine Aufrufstelle, kein Template-Literal, kein hartkodiertes Gegenstueck |
| `tasks.section_no_date` | Kein Fälligkeitsdatum | toter Text | components/tasks/task-list.tsx:6 — Datums-Sektionierung durch `groupByPriority` ersetzt |
| `tasks.section_someday` | Irgendwann | toter Text | components/tasks/task-list.tsx:6 — Datums-Sektionierung durch `groupByPriority` ersetzt |
| `tasks.section_today` | Heute & Überfällig | toter Text | components/tasks/task-list.tsx:6 — Datums-Sektionierung durch `groupByPriority` ersetzt |
| `tasks.section_upcoming` | Demnächst | toter Text | components/tasks/task-list.tsx:6 — Datums-Sektionierung durch `groupByPriority` ersetzt |
| `tasks.undo` | Rückgängig | toter Text | keine Aufrufstelle, kein Template-Literal, kein hartkodiertes Gegenstueck |
| `templates.picker_close` | Abbrechen | toter Text | keine Aufrufstelle, kein Template-Literal, kein hartkodiertes Gegenstueck |
| `topics.archive_btn` | Archivieren | toter Text | keine Aufrufstelle, kein Template-Literal, kein hartkodiertes Gegenstueck |
| `topics.archive_confirm` | Thema archivieren? | toter Text | keine Aufrufstelle, kein Template-Literal, kein hartkodiertes Gegenstueck |
| `topics.archived_empty` | Keine archivierten Themen. | toter Text | keine Aufrufstelle, kein Template-Literal, kein hartkodiertes Gegenstueck |
| `topics.detail_confirm_delete` | Diese Aufgabe löschen? | toter Text | keine Aufrufstelle, kein Template-Literal, kein hartkodiertes Gegenstueck |
| `topics.form_label_title` | Titel | toter Text | keine Aufrufstelle, kein Template-Literal, kein hartkodiertes Gegenstueck |
| `topics.form_pick_emoji` | Emoji auswählen | toter Text | keine Aufrufstelle, kein Template-Literal, kein hartkodiertes Gegenstueck |
| `topics.from_template` | 📋 Aus Vorlage | toter Text | keine Aufrufstelle, kein Template-Literal, kein hartkodiertes Gegenstueck |
| `topics.new_topic_or_template` | Neues Thema | toter Text | keine Aufrufstelle, kein Template-Literal, kein hartkodiertes Gegenstueck |
| `topics.picker_close` | Schließen | toter Text | keine Aufrufstelle, kein Template-Literal, kein hartkodiertes Gegenstueck |
| `topics.reorder_error` | Reihenfolge konnte nicht gespeichert werden | toter Text | keine Aufrufstelle, kein Template-Literal, kein hartkodiertes Gegenstueck |
| `topics.start_blank_hint` | Leeres Thema ohne Vorlage erstellen | toter Text | keine Aufrufstelle, kein Template-Literal, kein hartkodiertes Gegenstueck |
| `topics.template_picker_start_blank` | Leeres Thema | toter Text | keine Aufrufstelle, kein Template-Literal, kein hartkodiertes Gegenstueck |
| `wishlist.budget_no_budget` | Kein monatliches Budget festgelegt | toter Text | keine Aufrufstelle, kein Template-Literal, kein hartkodiertes Gegenstueck |
| `wishlist.card_no_price` | Kein Preis | toter Text | keine Aufrufstelle, kein Template-Literal, kein hartkodiertes Gegenstueck |
| `wishlist.card_unlockable` | 🪙 Freischaltbar | toter Text | keine Aufrufstelle, kein Template-Literal, kein hartkodiertes Gegenstueck |
| `wishlist.form_label_title` | Titel | toter Text | keine Aufrufstelle, kein Template-Literal, kein hartkodiertes Gegenstueck |
| `wishlist.view_discarded` | Abgelegt | toter Text | components/wishlist/wishlist-view.tsx:460 nennt den Key selbst „now-unused“ |
| `wishlist.view_empty` | Deine Wunschliste ist leer | toter Text | keine Aufrufstelle, kein Template-Literal, kein hartkodiertes Gegenstueck |
| `wishlist.view_history_count` | {count, plural, one {# Artikel} other {# Artikel}} | toter Text | keine Aufrufstelle, kein Template-Literal, kein hartkodiertes Gegenstueck |

## Zwei Funde, die neben der Liste liegen

**Die SEO-Metadaten sind fuer alle sieben Locales deutsch.** `app/page.tsx:17`
und `app/layout.tsx:62` tragen `title` und `description` als deutsche Literale.
Das ist kein verwaister Key — `landing.meta_title` und `landing.meta_description`
haben anderen Wortlaut und sind wirklich tot — aber eine franzoesische Nutzerin
bekommt einen deutschen `<title>`. Gehoert in einen eigenen Schnitt, nicht
hierher.

**Ein Kommentar behauptete eine Verwendung, die es nicht gibt.**
`components/progress/tabs/habits-tab.tsx:183` schrieb, `stat_streak_empty`
bleibe fuer die Rand-Zeile der Seite. Die Zeile ruft den Key nicht auf; nur der
Kommentar nennt ihn. Der Kommentar ist in diesem Task korrigiert — sonst haette
die naechste Wartende ihn als Beleg gelesen.

