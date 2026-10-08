# CLAUDE.md

Cruxlog: climbing logbook and crag guide. Expo SDK 57, React Native, TypeScript, expo-router, expo-sqlite, Zustand, i18next.

- Expo APIs change between SDKs. Check https://docs.expo.dev/versions/v57.0.0/ before using one you are unsure of.
- Install Expo packages with versions from `node_modules/expo/bundledNativeModules.json` (the `expo install` command cannot reach the Expo API from the cloud sandbox).
- Checks: `npm run typecheck` and `npm test` must pass before committing.
- All user-visible strings go through i18n in `src/i18n/pl.json` and `en.json`. Keep both files in sync.
- Schema changes: append a new entry to `MIGRATIONS` in `src/db/migrate.ts`, never edit an old one. Bump `BACKUP_VERSION` if the backup format changes.
- Keep domain logic in `src/domain/` pure and covered by tests in `__tests__/`.
- No GPS tracks or routes. The map shows only a pin and the user's position, and location stays on the device.
