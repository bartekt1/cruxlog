# Next steps

Status (2026-10-20): the app runs on the owner's phone (APK from GitHub Actions). Done:
- journal, ascent form with own grade, route history;
- crags tree (region › area › group › crag › sector) with editing, and imports (theCrag, guidebook, one-file CSV, positions file);
- route finder with filters, and search on every level of the Crags tab;
- goals (count, grade, project, wishlist), added from a route or an attempt too;
- progress for any year;
- map with crag pins (exact and approximate), the user's position and nearby crags;
- JSON backup with a reminder, light and dark look, pl/en.

## Ideas under discussion (April list)

- **Sharing** (card + map link): done, see `docs/TESTING.md` §3g. A photo on the card comes with photos.
- **Export to theCrag**: no write API for individuals, so the plan is a CSV for theCrag's own logbook import (it matches by crag + route + country, no password in the app). Needs a sample export from the owner's theCrag logbook first, and a country for every crag.
- **Photos**: memory photos on ascents first (needs a backup that carries photos), then a photo of a wall, then drawing topo lines on it. Drawing is the biggest piece.

## To do, in the owner's order

1. **Offline maps.** "Download the map of this area" before a trip. Use MapLibre offline packs of the OpenFreeMap style. OpenTopoMap forbids bulk downloads, so the topo base stays online only. The user's position already works without internet.
2. **Multipitch in the ascent form.** Pitch list, who led each pitch (self, partner, swing), and the style per pitch. The data model already has `pitch` and `ascent_pitch`.
3. **Crags without a position.** 40 crags have none and 288 have an approximate one. These are improved on site with "Improve". The OSM matching scripts are kept outside the repo, so a new run can be repeated on request.
4. **Device checks.** TalkBack, the largest font size, dark mode on every screen, the calendar picker and the keyboard in forms (see `docs/TESTING.md` §8).
5. **Automatic backup**, e.g. to Google Drive. Today the backup is manual with a reminder, and the data lives only on the phone.

## Later, before a store release

- Final app name check in the store and the domain, a privacy policy, and the project license.
- Legal review of catalog data before shipping any to other users. A theCrag export the user imports for themselves is fine.
- iOS build, social features with moderation of proposed routes, topo images.
