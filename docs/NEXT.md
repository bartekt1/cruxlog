# Next steps

Status: scaffold done (journal, progress, crags list, goals, CSV import, JSON backup, pl/en). Not yet run on a device.

1. Run on a phone or emulator (`npx expo start`), fix whatever the first real run shows.
2. ~~Persist settings (language, grade systems).~~ Done (`expo-sqlite/kv-store`).
3. Crag, sector and route detail screens; edit and delete (soft delete) of own routes.
4. Multipitch in the ascent form: pitch list, who led each pitch (self, partner, swing), style per pitch.
5. Goals linked to stats (yearly count, grade target, project attempts).
6. Map: MapLibre pin plus the user's position, offline regions (needs a dev build and a tile source other than tile.openstreetmap.org).
7. Nearby crags suggestion from the device location (location stays on device).
8. Open UX items from `docs/UX_AUDIT.md` (ascent edit/delete, goal progress, year switcher, native date picker).
9. Later: iOS build, store listing and privacy policy, social features, moderation of proposed routes, topo images.

Open decisions: final app name check in the stores and domain, legal review of catalog data before store release, moderation rules, project license.
