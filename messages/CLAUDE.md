# messages/

## Purpose
next-intl translation files. One JSON file per supported locale.

## Contents
- `de.json` — German (default locale)
- `en.json` — English
- `fr.json` — French
- `es.json` — Spanish
- `nl.json` — Dutch
- `ru.json` — Russian
- `zh.json` — Chinese (Simplified)

## Patterns
- Keys are namespaced by feature: `tasks.*`, `settings.*`, `dashboard.*`, etc.
- All seven files must have identical key sets — missing keys fall back to the key name
- When adding a new UI string: add the key to **all seven** locale files simultaneously
- Never hardcode user-visible strings in components — always use `useTranslations()` / `getTranslations()`
- Russian uses 4-form plurals (one / few / many / other or =0); Chinese has no plural forms (always `other`)
- `npm run check:i18n` prueft **beide** Richtungen. Ein Key, den keine Zeile referenziert, ist genauso rot wie ein Key, der in einer Locale fehlt — dieses Verzeichnis waechst nicht mehr stillschweigend
- Keys, die per Template-Literal gebildet werden (``t(`catalog.${key}.title`)``) oder als Variable durchgereicht (`t(config.key)`), sieht der Literal-Scan nicht. Sie gehoeren als Familie in `scripts/i18n-key-families.mjs` — sonst meldet `check:i18n` sie als verwaist
- Ein verwaister Key wird **nicht auf Verdacht geloescht**. Er ist entweder toter Text oder eine Uebersetzung, deren Verdrahtung fehlt; im zweiten Fall gehoert er in `PENDING_WIRING` mit dem Schnitt, der ihn verdrahtet. Die Bestandsaufnahme des ersten Laufs steht in `docs-tech/i18n-versprechen/verwaiste-keys.md`
