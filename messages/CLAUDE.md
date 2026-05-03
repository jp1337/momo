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
