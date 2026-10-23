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

- `app/` expo-router screens: tabs (Journal, Progress, Crags with a list and a map, Goals with trips), new ascent, settings, the share card (`share.tsx`), trips (`trip/`: edit, detail, share card), the full-screen photo (`photo.tsx`) and the topo editor (`topo.tsx`)
- `src/ui/` shared components (`kit.tsx`, `rows.tsx`, `GradeFields.tsx`), error alerts (`errors.ts`), parts of big screens (`ascent/`, `settings/`, `useTopoGestures.ts`), theme and fonts, the map (`CragMap.tsx`, `mapStyles.ts`), location (`useLocation.ts`), photo files (`photos.ts`, `PhotoViews.tsx`), topo drawing (`TopoLines.tsx`), the share card (`ShareCard.tsx`), the automatic backup (`autoBackup.ts`, `AutoBackup.tsx`, `backupFolder.ts`)
- `src/db/` SQLite schema and migrations (`PRAGMA user_version`), queries by topic (`routes.ts`, `ascents.ts`, `crags.ts`, `areas.ts`, `goals.ts`, `imports.ts`, `photos.ts`, `topo.ts`; screens import them through `repo.ts`), JSON backup (`backup.ts`)
- `src/domain/` pure logic with tests: grade ladder and conversions, CSV imports, statistics, goals, distances, backup rotation and index, photo sizes, topo geometry (smoothing, zoom, undo), share text
- `src/i18n/` `pl.json` and `en.json`
- `docs/` next steps (`NEXT.md`), manual test procedure (`TESTING.md`), UX audit (`UX_AUDIT.md`), design document (`design.html`, Polish)

Main libraries: expo-router, expo-sqlite, Zustand, i18next, MapLibre, react-native-svg, expo-image-picker and expo-image-manipulator (photos), react-native-view-shot and expo-sharing (share card), fflate (gzipped backups).

The APK is built by GitHub Actions on every push (artifact `cruxlog-apk`).

## Data rules

- Every table has a text UUID id, `created_at`, `updated_at`, `deleted_at`. Never hard-delete, so sync can be added later.
- Grades are stored as `grade_index` on a shared ladder plus the original label and system. Conversions are approximate.
- User-created crags, sectors and routes are `source='user'`, `status='private'`. Proposing them to a shared catalog comes with the social features.
- Crag packs: `src/domain/packs.ts` reads `index.json` of the `bartekt1/cruxlog-paczki` repository; each pack is a template CSV of one group of crags, installed with `installPack` (crags remember their `pack_id`), removed with `removePack`.
- One import format: the Cruxlog CSV template (`docs/IMPORT.md`, `docs/cruxlog-wzor.csv`), columns found by name in any order. Import ids are `imp:<kind>:<key>`, and rows taken over by name remember the file's key (`import_key`), so importing again updates instead of duplicating.
- Bundled or imported guidebook data must not copy protected text or topo drawings. Keep to facts: name, grade, length, location.
- Crag positions record where they came from (`crag.pos_source`: user, file, approx). A file never overwrites a position the user set on the phone.
- Photos are files `photos/<id>.jpg` in the app's folder plus a `photo` row (ascent, crag or sector). The app never reads or writes the gallery; picked photos are shrunk and stripped of location. Topo lines (`topo_line`) store points normalised to the photo (0..1).
- Backup: a folder chosen once (Google Drive or the phone) gets a gzipped JSON copy every 7 days with changes, the 5 newest kept, and a `zdjecia/` subfolder with each photo once. Restore from the list in Settings.
- Location stays on the device: no GPS tracks, nothing sent anywhere. Never commit user data (exports, backups) to this public repo.
