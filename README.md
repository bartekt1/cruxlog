# Cruxlog

Climbing logbook and crag guide for Android (iOS later). React Native + Expo, local SQLite, no account and no backend.
UI languages: Polish and English. Design document: `docs/design.html`.

## Commands

```bash
npm install
npm run typecheck
npm test
npx expo start           # needs a development build for native modules, Expo Go is not enough later (maps)
```

## Layout

- `app/` expo-router screens (tabs: Journal, Progress, Crags, Goals; modal: new ascent; settings)
- `src/db/` SQLite schema and migrations (`PRAGMA user_version`), queries, JSON backup
- `src/domain/` pure logic with tests: grade ladder and conversions, CSV import validation, statistics
- `src/i18n/` `pl.json` and `en.json`
- `samples/` fictional CSV files showing the import format

## Data rules

- Every table has a text UUID id, `created_at`, `updated_at`, `deleted_at`. Never hard-delete, so sync can be added later.
- Grades are stored as `grade_index` on a shared ladder plus the original label and system. Conversions are approximate.
- User-created crags, sectors and routes are `source='user'`, `status='private'`. Proposing them to a shared catalog comes with the social features.
- CSV import ids are `imp:<kind>:<key>`, so importing again updates instead of duplicating.
- Bundled or imported guidebook data must not copy protected text or topo drawings. Keep to facts: name, grade, length, location.
