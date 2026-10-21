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
- **Export to theCrag** (plan approved in principle 2026-10-20, postponed; Cruxlog is the main logbook, theCrag gets a copy, one way only):
  - Why a file: no write API for individuals (the full API is closed to non-commercial use, the personal key is read-only), and no password in the app. theCrag has its own logbook import from CSV (matches crag + route + country, the user confirms the matches there).
  - Screen "Export to theCrag" (Settings and Journal): list of ascents with check boxes. Default: only sends (OS, flash, RP, PP) not yet exported. Attempts, top-rope and projects are unchecked but can be checked. Ascents on the user's own routes are unchecked (they do not exist on theCrag). Year filter, "check all new", a counter.
  - Country: theCrag needs it. Ask once per region of the checked ascents, default "Polska", remember the answer in settings.
  - File: UTF-8 CSV, columns Country, Crag, Route, Date, Grade, Style, Notes, Partner, Stars; shared with the Android share sheet. Notes behind a switch, off by default; partner on by default.
  - Styles (a guess, to verify): OS Onsight, Flash Flash, RP Redpoint, PP Pinkpoint, TR Top rope, Attempt Attempt. First build a 3-row test file for the owner to try in theCrag's import and fix names, date format and columns from the result.
  - Remember what was sent: after the export ask "Did you upload the file?" and only then mark the ascents (new column on `ascent`, migration, bump `BACKUP_VERSION`, old backups still import). A small label "sent to theCrag <date>" on the ascent, undoable.
  - Not planned: password login, direct upload, importing from theCrag back.
  - Sources: help pages on theCrag (API, "import logbook", "export logbook"), read through search summaries only because thecrag.com was not reachable from the sandbox; verify on the real site.
- **Photos**: memory photos on ascents first (needs a backup that carries photos), then a photo of a wall, then drawing topo lines on it. Drawing is the biggest piece.

## To do, in the owner's order

1. **Offline maps.** "Download the map of this area" before a trip. Use MapLibre offline packs of the OpenFreeMap style. OpenTopoMap forbids bulk downloads, so the topo base stays online only. The user's position already works without internet.
2. **Multipitch in the ascent form.** Pitch list, who led each pitch (self, partner, swing), and the style per pitch. The data model already has `pitch` and `ascent_pitch`.
3. **Crags without a position.** 40 crags have none and 288 have an approximate one. These are improved on site with "Improve". The OSM matching scripts are kept outside the repo, so a new run can be repeated on request.
4. **Device checks.** TalkBack, the largest font size, dark mode on every screen, the calendar picker and the keyboard in forms (see `docs/TESTING.md` §8).
5. ~~Automatic backup~~ Done (2026-10): a folder chosen once (Google Drive through the system folder picker); a gzipped copy when the app opens and 7 days passed with changes, the 5 latest kept, restore from the list in Settings. Photos will add a `zdjecia/` subfolder with only the missing files (each photo is sent once).

## Later, before a store release

- Final app name check in the store and the domain, a privacy policy, and the project license.
- Legal review of catalog data before shipping any to other users. A theCrag export the user imports for themselves is fine.
- iOS build, social features with moderation of proposed routes, topo images.
