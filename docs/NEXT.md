# Next steps

Status (2026-10-21): the app runs on the owner's phone (APK from GitHub Actions). Code clean-up after an audit done the same day (see `docs/TESTING.md` §6e). Done:
- journal, ascent form with own grade, route history;
- crags tree (region › area › group › crag › sector) with editing, and one import format, the Cruxlog template (`docs/IMPORT.md`; the owner builds his own base, free of third-party data), and a positions file;
- route finder with filters, and search on every level of the Crags tab;
- goals (count, grade, project, wishlist), added from a route or an attempt too;
- progress for any year;
- map with crag pins (exact and approximate), the user's position and nearby crags;
- sharing a route, an ascent or a crag (picture card and text with a map link);
- photos of ascents (5), crags and walls (10 each), topo lines drawn on wall photos;
- automatic gzipped backup to a chosen folder (Google Drive or the phone) with photos, restore from a list;
- crag packs: Settings › Crag packs downloads groups of crags from the `bartekt1/cruxlog-paczki` repository (one pack per group, built from the owner's base by its "Zbuduj paczki" workflow); update and remove one by one;
- trips: a plan with days, crags and proposed routes, shared as an invitation card and afterwards as a summary of what was climbed;
- light and dark look, pl/en.

## Ideas under discussion (April list)

- **Sharing** (card + map link): done, see `docs/TESTING.md` §3g; photo and topo on the card §6b, §6d.
- **Photos and topo** (done, `docs/TESTING.md` §6b–6d): stage 1 (up to 5 photos per ascent, from the gallery, shrunk to 1600 px, no thumbnails; copied once each to `zdjecia/` in the backup folder). Stage 2 done too: photos of a crag and of a wall (sector), up to 10 each, 2000 px, delete in the full-screen view, optional on the share card of a crag or route. Stage 3, first delivery done: the topo editor (bolts mode, zoom by two fingers and buttons, drag/select/delete points, undo/redo) and lines with numbers on the full-screen photo. Second delivery done: drawing by finger ("free" mode), a "Topo" section on the route screen with the route highlighted, tapping a number opens the route, topo on the share card. Done in 2026-10: a magnifier when a finger is held or a point dragged, inserting a point after the selected one, photos from the camera, wall and crag photos at 3000 px.

## To do, in the owner's order

1. **Offline maps.** "Download the map of this area" before a trip. Use MapLibre offline packs of the OpenFreeMap style. OpenTopoMap forbids bulk downloads, so the topo base stays online only. The user's position already works without internet.
2. **Multipitch in the ascent form.** Pitch list, who led each pitch (self, partner, swing), and the style per pitch. The data model already has `pitch` and `ascent_pitch`.
3. **Crags without a position.** 40 crags have none and 288 have an approximate one. These are improved on site with "Improve". The OSM matching scripts are kept outside the repo, so a new run can be repeated on request.
4. **Device checks.** TalkBack, the largest font size, dark mode on every screen, the calendar picker and the keyboard in forms (see `docs/TESTING.md` §8).
5. ~~Automatic backup~~ Done (2026-10): a folder chosen once (Google Drive through the system folder picker, or a phone folder); a gzipped copy when the app opens and 7 days passed with changes, the 5 latest kept, restore from the list in Settings. A `zdjecia/` subfolder gets each photo once. The one-file manual export/import stays folded under "Other ways to back up".

## Later, before a store release

- Final app name check in the store and the domain, a privacy policy, and the project license.
- Legal review of catalog data before shipping any to other users. The owner is building his own base in the template, so it carries no third-party data.
- iOS build, social features with moderation of proposed routes.
