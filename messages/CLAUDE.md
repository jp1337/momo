# messages/

## Purpose
next-intl translation files. One JSON file per supported locale.

## Contents
- `de.json` — German (default locale)
- `en.json` — English
- `fr.json` — French
- `es.json` — Spanish
- `nl.json` — Dutch

## Patterns
- Keys are namespaced by feature: `tasks.*`, `settings.*`, `dashboard.*`, etc.
- All five files must have identical key sets — missing keys fall back to the key name
- When adding a new UI string: add the key to **all five** locale files simultaneously
- Never hardcode user-visible strings in components — always use `useTranslations()` / `getTranslations()`
