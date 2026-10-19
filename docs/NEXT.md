# Next steps

Status: scaffold done (journal, progress, crags list, goals, CSV import, JSON backup, pl/en). Not yet run on a device.

## Planned (agreed with the owner, not started)

**Save a route as a goal where you are** (plan approved 2026-10-19, postponed):
1. Route screen: "Add to goals" button under the name and grade; choose Project or Wishlist, the goal takes the route's name. If the route already is a goal, the existing badge ("Your project" / "On your wishlist") shows instead.
2. Ascent form: with style "Attempt", a switch "Add this route as a project" (off by default); saving the attempt then creates the project. Hidden when the route already is a project ("This route is your project").
3. Ascent screen: "Add as a project" button for attempts.
Projects still tick themselves off on a led send (OS, flash, RP, PP).

1. Run on a phone or emulator (`npx expo start`), fix whatever the first real run shows.
2. ~~Persist settings (language, grade systems).~~ Done (`expo-sqlite/kv-store`).
3. Crag screen and ascent edit/delete are done. Still to do: edit and delete of own routes, route detail with history.
4. Multipitch in the ascent form: pitch list, who led each pitch (self, partner, swing), style per pitch.
5. Goals: yearly count progress, done and delete are done. Still to do: grade target, project linked to a route, editing goals.
6. Map: MapLibre pin plus the user's position, offline regions (needs a dev build and a tile source other than tile.openstreetmap.org).
7. Nearby crags suggestion from the device location (location stays on device).
8. Open UX items from `docs/UX_AUDIT.md`.
9. Later: iOS build, store listing and privacy policy, social features, moderation of proposed routes, topo images.

Open decisions: final app name check in the stores and domain, legal review of catalog data before store release, moderation rules, project license.
