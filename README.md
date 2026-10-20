# Cruxlog

Climbing logbook and crag guide for Android (iOS later). React Native + Expo, local SQLite, no account and no backend.
UI languages: Polish and English. Design document: `docs/design.html`.

## Commands

```bash
npm install
npm run typecheck
npm test
npx expo start           # needs a development build: the map (MapLibre) is a native module, Expo Go is not enough
```

## Layout

- `app/` expo-router screens (tabs: Journal, Progress, Crags with a map, Goals; modal: new ascent; settings)
- `src/ui/` shared components, theme and fonts, the map (`CragMap.tsx`, `mapStyles.ts`) and location (`useLocation.ts`)
- `src/db/` SQLite schema and migrations (`PRAGMA user_version`), queries, JSON backup
- `src/domain/` pure logic with tests: grade ladder and conversions, CSV import validation, statistics, goals, distances
- `src/i18n/` `pl.json` and `en.json`
- `samples/` fictional CSV files showing the import format
- `docs/` next steps, manual test procedure, UX audit

The APK is built by GitHub Actions on every push (artifact `cruxlog-apk`).

## Data rules

- Every table has a text UUID id, `created_at`, `updated_at`, `deleted_at`. Never hard-delete, so sync can be added later.
- Grades are stored as `grade_index` on a shared ladder plus the original label and system. Conversions are approximate.
- User-created crags, sectors and routes are `source='user'`, `status='private'`. Proposing them to a shared catalog comes with the social features.
- CSV import ids are `imp:<kind>:<key>`, so importing again updates instead of duplicating.
- Bundled or imported guidebook data must not copy protected text or topo drawings. Keep to facts: name, grade, length, location.
- Crag positions record where they came from (`crag.pos_source`: user, file, approx). A file never overwrites a position the user set on the phone.
- Location stays on the device: no GPS tracks, nothing sent anywhere. Never commit user data (exports, backups) to this public repo.
