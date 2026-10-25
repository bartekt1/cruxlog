# CLAUDE.md

Cruxlog: climbing logbook and crag guide. Expo SDK 57, React Native, TypeScript, expo-router, expo-sqlite, Zustand, i18next.

- Expo APIs change between SDKs. Check https://docs.expo.dev/versions/v57.0.0/ before using one you are unsure of.
- Install Expo packages with versions from `node_modules/expo/bundledNativeModules.json` (the `expo install` command cannot reach the Expo API from the cloud sandbox).
- Checks: `npm run typecheck` and `npm test` must pass before committing (`verify` skill). Tests include i18n key sync and DB tests on `node:sqlite`.
- All user-visible strings go through i18n in `src/i18n/pl.json` and `en.json`. Keep both files in sync.
- Schema changes: append a new entry to `MIGRATIONS` in `src/db/migrate.ts`, never edit an old one. Bump `BACKUP_VERSION` if the backup format changes.
- Keep domain logic in `src/domain/` pure and covered by tests in `__tests__/`.
- Queries live in `src/db/` by topic; screens import them from `src/db/repo.ts`. A save that writes several tables runs in one transaction (see `saveAscent`).
- Errors for the user: throw `AppError` (`src/domain/errors.ts`) with an i18n key; show failures with `runOrAlert`/`showError` (`src/ui/errors.ts`), never swallow them. Backup work goes through `withBackupLock` (`src/ui/autoBackup.ts`).
- Reuse `src/ui/kit.tsx`, `rows.tsx` (RouteCard, GroupedRow, SwitchRow, CtaButton) and `GradeFields.tsx` before writing a new row or field.
- Look ("przewodnik kredą"): colors only from `useTheme()` (`src/ui/theme.ts`, light and dark); import `Text` from `src/ui/Text`, not react-native, so the bundled Barlow fonts apply; headings, grades and numbers use `F.display`/`F.cond` from `src/ui/fonts.ts`.
- No GPS tracks or routes. The map shows only a pin and the user's position, and location stays on the device.
- Map: MapLibre (`@maplibre/maplibre-react-native`, native, needs a new APK). Base styles (OpenFreeMap, OpenTopoMap) are in `src/ui/mapStyles.ts`, location in `src/ui/useLocation.ts`, distance helpers in `src/domain/geo.ts`.
- Photos: files `photos/<id>.jpg` in the app's document folder (`src/ui/photos.ts`), rows in the `photo` table, at most 5 per ascent, shrunk to 1600 px on import. The backup folder gets a `zdjecia/` subfolder with each photo once (`src/ui/autoBackup.ts`). Unused files are removed at startup. Never read or write the gallery directly.
- Skills in `.claude/skills/`: `verify` (checks), `new-screen`, `db-migration`, `i18n-sync`, `ux-audit`. Use them for those tasks.
- Updates outside Google Play: the APK workflow sets version 1.0.<run> / versionCode <run>, and on main publishes a GitHub release `v1.0.<run>` with the APK. The app checks the latest release on start and in Settings (`src/domain/updates.ts`, `src/ui/updates.ts`) and opens Android's installer.
