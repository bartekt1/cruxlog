# UX audit

Date: 2026-10-10. Method: code review of every screen and `src/ui/kit.tsx` (the app cannot run in the cloud sandbox), plus WCAG contrast calculation for `src/ui/theme.ts`. Items marked "device" need a check on a phone (`docs/TESTING.md`). Re-run with the `ux-audit` skill.

Severity: **H** blocks a task or loses/corrupts data, **M** slows a task or confuses, **L** polish.

## Whole app

| # | Issue | Sev | Status |
|---|---|---|---|
| A1 | Language and grade systems reset on every app start | H | Fixed: saved in `expo-sqlite/kv-store`, validated by `parseSettings` |
| A2 | Input and chip borders and empty rating stars used `line` (contrast 1.2–1.5:1, needs 3:1) | M | Fixed: new `outline` token (≥ 3:1) |
| A3 | `warn` (error text) in light theme 4.27:1, below 4.5:1 | M | Fixed: `#b33a32` (5.0:1) |
| A4 | Chips 30 pt high and the gear icon ~16 pt: touch targets below 44 pt | M | Fixed: `minHeight` + `hitSlop` (`HIT`) |
| A5 | No `accessibilityRole` / `accessibilityState` on chips, buttons, stars; icon-only buttons (gear, `+`) had no label | M | Fixed in `kit.tsx` and screens |
| A6 | Buttons had no pressed or disabled state | L | Fixed |
| A7 | Field text 14 pt and fields ~36 pt high | L | Fixed: 16 pt, min 44 pt |

## Journal

| # | Issue | Sev | Status |
|---|---|---|---|
| J1 | Day headers were raw ISO dates (`2026-10-10`) | M | Fixed: "Today", "Yesterday", else localized day; year only when different (device: Hermes `Intl`) |
| J2 | The `+` button covered the last entry | M | Fixed: bottom padding |
| J3 | Plain one-line empty state | L | Fixed: `EmptyState` with hint |
| J4 | Partner not visible; attempts looked like sends | L | Fixed: partner shown, "Attempt" in muted color |
| J5 | Entries cannot be opened, edited or deleted | H | Fixed: tap an entry → detail with Edit and Delete (with confirmation; soft delete, carried by backups) |

## New ascent

| # | Issue | Sev | Status |
|---|---|---|---|
| N1 | Date was free text; invalid dates (`2026-02-30`, `10.10.2026`) were saved and broke grouping | H | Fixed: `validateAscentDraft`, Today/Yesterday chips |
| N2 | Double tap on Save created duplicate ascents | H | Fixed: Save disabled while saving |
| N3 | Database errors were unhandled (silent failure) | H | Fixed: error message shown |
| N4 | Every new-route error said "Choose a route first", even for a wrong grade | M | Fixed: specific message per field, invalid field highlighted, grade example shown |
| N5 | Search matched route names only; no "no results" message | M | Fixed: matches route, sector, crag; message; "Create route "<query>"" prefills the name |
| N6 | Selected route looked like plain text; tapping it cleared it unexpectedly | M | Fixed: card with a "Change" button |
| N7 | New-route grade system always started at KR, ignoring settings | L | Fixed: uses the preferred system |
| N8 | Attempts field shown for OS/Flash (always 1) | L | Fixed: hidden and set to 1 |
| N9 | Keyboard could cover lower fields (iOS) | L | Fixed: `automaticallyAdjustKeyboardInsets` (device) |
| N10 | Sector placeholder did not say it is optional | L | Fixed |

## Progress

| # | Issue | Sev | Status |
|---|---|---|---|
| P1 | With no data: zeros and empty headings, no guidance | M | Fixed: empty state; "No sends this year" under each pyramid |
| P2 | Calendar had no legend and relied on color only | M | Fixed: legend; light cells also get an outline |
| P3 | Tiles were read as two separate texts by screen readers | L | Fixed: one label "Sends: 12" |
| P4 | Only the current year; no way to look back | M | Fixed: ‹ year › switcher over years with ascents |

## Crags

| # | Issue | Sev | Status |
|---|---|---|---|
| C1 | "1 routes" in English | L | Fixed: "Routes: 1" (plural rules not verified on Hermes) |
| C2 | Crags cannot be opened | M | Fixed: crag screen with routes by sector and your sends; tap a route to log it |

## Goals

| # | Issue | Sev | Status |
|---|---|---|---|
| G1 | Non-numeric target (`abc`) was stored as NaN | H | Fixed: `validateGoalDraft` |
| G2 | Empty title: Add did nothing, no feedback | M | Fixed: button disabled, message |
| G3 | Keyboard stayed open after Add; no "done" key | L | Fixed |
| G4 | Goals cannot be completed, edited or deleted; no progress | H | Fixed: progress bar for count goals (sends this year), mark done / reopen, delete; editing came in round 11 |

## Settings

| # | Issue | Sev | Status |
|---|---|---|---|
| S1 | Chips were stacked full width, one per line | M | Fixed: `ChipRow` |
| S2 | Result message appeared at the bottom, often off screen | M | Fixed: alert |
| S3 | Buttons could be pressed again during import | M | Fixed: disabled + spinner |
| S4 | A wrong file gave a raw JSON parse error | M | Fixed: "This file is not a Cruxlog backup." |
| S5 | Missing crags.csv or routes.csv gave confusing parser errors | M | Fixed: names the required files and what was selected |
| S6 | Import behavior (merge, newer wins) was not explained | L | Fixed: help text |

| N11 | Dates other than today or yesterday had to be typed as YYYY-MM-DD | M | Fixed: system calendar (`@react-native-community/datetimepicker`), future days blocked |

## Round 3 (user feedback)

| # | Issue | Sev | Status |
|---|---|---|---|
| R1 | Own crags, sectors, routes and regions could not be edited or deleted | H | Fixed: pencil buttons on own items, delete with a count of what goes with it; imported items show a note |
| R2 | Bottom tab bar showed empty placeholder squares instead of icons | H | Fixed: Ionicons / MaterialCommunityIcons (`@expo/vector-icons`) |
| R3 | The `+` button was hard to see | M | Fixed: larger "Add" button with icon and label, stronger shadow |
| R4 | Settings "⚙" glyph too small and unclear | M | Fixed: 28 pt gear icon, 44 pt touch target |
| R5 | No way to add a crag without logging an ascent | L | Fixed: "Add a crag" on the Crags tab |

## Round 4 (user feedback and review)

| # | Issue | Sev | Status |
|---|---|---|---|
| F1 | Route search missed Polish letters and case ("łysa" did not find "Łysa"; SQLite LIKE is ASCII-only) | H | Fixed: matching in `src/domain/text.ts` |
| F2 | "okiennik" and "Okiennik" became two crags; same for sectors, regions, partners | H | Fixed: names matched ignoring case and Polish letters |
| F3 | Empty route search showed 6 arbitrary routes | M | Fixed: "Recently climbed"; list narrows while typing |
| F4 | New-route form had no region and no crag/sector suggestions | M | Fixed: crag and sector suggestions; region field (with suggestions) for a new crag |
| F5 | Same route could be created twice on a crag | M | Fixed: warning with "Use this route" |
| F6 | No history per route | M | Fixed: route screen with summary, ascents and "Log an ascent" |
| F7 | Partner typed every time | L | Fixed: partner suggestions, most frequent first |
| F8 | No reminder to back up; data lives only on the phone | H | Fixed: Journal reminder after 30 days or when never backed up; last backup shown in Settings |
| F9 | Year arrows could break after deleting all ascents of the shown year | L | Fixed |

## Round 5 (crag building, after comparing theCrag, Mountain Project, KAYA)

| # | Issue | Sev | Status |
|---|---|---|---|
| B1 | Routes and sectors could only be created while logging an ascent | H | Fixed: "+ Add routes" (several in a row) and "+ Add sector" on the crag screen, "+" per sector |
| B2 | New crag form had no sectors; region optional | M | Fixed: region required, optional sectors in the form |
| B3 | Crags without routes not found when logging | M | Fixed: search lists matching crags; tap opens the new-route form on that crag |
| B4 | Empty sectors were invisible on the crag screen | M | Fixed: all sectors shown, empty ones with a hint |
| B5 | "Add" button hard to see, especially in dark mode | H | Fixed: raised orange "+" in the middle of the tab bar, the only orange in the UI |

## Round 6 (guidebook data)

| # | Issue | Sev | Status |
|---|---|---|---|
| G1 | Guidebook grades VI+, VI-, V-, IV+, IV-, II, ranges (VI.4/4+), "?" and Font 4+, 8A+ were rejected by the importer | H | Fixed: mapped to the nearest lower ladder step, original label kept and shown |
| G2 | Imported data was read-only, so routes could not be moved to sectors or corrected | M | Fixed: everything editable; the import asks first and warns that re-importing overwrites changes |
| G3 | Guidebook export not in the app's CSV format | M | Converter `src/domain/guidebookCsv.ts` (region = group, Kamieniec groups merged; crag = rock; walls in the crag description) |

## Round 7 (crag hierarchy)

| # | Issue | Sev | Status |
|---|---|---|---|
| H1 | One flat "region" level could not express region › rejon › group, so 70 crags sat in one long list | H | Fixed: areas nest (region, rejon, optional group); Crags tab drills down with counts and search |
| H2 | Guidebook needed converting to three CSV files on a computer | M | Fixed: the guidebook export or a simple one-row-per-route file imports directly; three-file import kept |
| H3 | Rock names like "Krowia (ściana zachodnia)" became separate crags | M | Fixed: the bracketed wall becomes a sector of the crag |

## Round 8 (scope: roped climbing only)

| # | Issue | Sev | Status |
|---|---|---|---|
| S1 | Boulders not used by the owner; extra type, grade systems, setting, tile and pyramid added noise | M | Removed: types Sport and Multipitch only, grades KR/UIAA/FR; old boulder data hidden (migration 4) and skipped on import |
| S2 | Re-import left routes that were deleted from the file | M | Fixed: the file decides the imported routes of its crags; routes with ascents and your own routes stay |
| S3 | Renaming a crag in the file made a second crag | L | Fixed: optional crag key column (`key_skaly` / `crag_key`) |

## Round 9 (big theCrag import)

| # | Issue | Sev | Status |
|---|---|---|---|
| T1 | Three area levels could not hold theCrag paths (up to 7 levels) | H | Fixed: groups nest at any depth; the group field takes several levels ("A › B") |
| T2 | 15 000 routes: route search loaded and folded every route on each keystroke; path labels and crag counts recomputed per row | H | Fixed: search index kept in memory until the next write; labels and counts computed once per list |
| T3 | Length and bolts imported but never shown | M | Fixed: shown on the route screen and editable |
| T4 | Replacing one imported file with another left the old crags | M | Fixed: "Remove imported crags and routes" in Settings (keeps routes with ascents and own data) |

## Round 10 (visual refresh: "przewodnik kredą")

| # | Issue | Sev | Status |
|---|---|---|---|
| V1 | The look felt plain (system font, flat green lists) | M | New look chosen by the owner from 4 concepts: paper and ink with one rust accent, Barlow and Barlow Condensed bundled, grades in ink squares, day and sector cards, faint contour lines in headers |
| V2 | Dark mode followed the phone only | L | Settings › Appearance: like the phone, light or dark; the dark theme is deep green, not black |
| V3 | Journal had no summary | L | Three season tiles (sends, days out, hardest) on top of the journal |

## Round 11 (goals and progress)

| # | Issue | Sev | Status |
|---|---|---|---|
| P1 | Goals could not be edited | M | Fixed: tap a goal to edit it, mark it done or reopen it, delete it |
| P2 | No goal for a grade; projects were plain text | M | Grade goal (distinct led routes at or above a grade this year); project and wishlist linked to a route, with tries and days, ticked off by a led send |
| P3 | Activity only for the current year, few stats | L | Whole-year calendar for any year; hardest per month and per year, styles, top crags, partners |

## Round 12 (map and nearby crags)

| # | Issue | Sev | Status |
|---|---|---|---|
| M1 | No way to see crags on a map | M | Crags › List/Map: crag pins on OpenFreeMap, switch to the tourist map (OpenTopoMap), "Show me" |
| M2 | Imported crags have no coordinates | M | Crag screen › "Set crag position": a pin under a moving map, or "here" from the phone's GPS; positions file import; re-imports keep positions |
| M3 | Logging at the crag meant searching by name | L | Nearby crags (3 km) as chips in the ascent form; "Nearby" list with distances in Crags |
| M5 | Many crags have no position in OSM | L | Approximate positions from the crag's group, marked as such (hollow dot, "approximate", "about" distances); a position set on the phone is never overwritten by a file |
| M4 | Location privacy | L | Permission asked only on a tap; the position is never stored or sent, only shown on the map and used for distances |

## Round 13 (goals where you are, search everywhere)

| # | Issue | Sev | Status |
|---|---|---|---|
| G1 | A route could only become a goal from the Goals tab | M | "Add to goals" on the route screen (project or wishlist), a project switch for attempts in the ascent form, "Add as a project" on a saved attempt; labels in the crag's route list |
| S1 | The search disappeared below the top level of the Crags tab | M | "Search in: <place>" on every region, area and group (crags and routes inside it), a route search on the crag screen, and the Crags tab search also finds routes; the filtered finder opens limited to the place |
| S2 | Tapping a crag dot on the map did nothing | H | The dot press also reached the map, which closed the card at once; fixed |

## Round 14 (sharing)

| # | Issue | Sev | Status |
|---|---|---|---|
| H1 | No way to show an ascent or invite a friend | M | Share screen: a card in the guidebook look and a text with a map link, from the ascent, route and crag screens. The crag's position is on by default (a switch turns it off); an approximate one is labelled; the user's own position is never sent |

## Round 15 (automatic backup)

| # | Issue | Sev | Status |
|---|---|---|---|
| B1 | The backup was manual; the data lives only on the phone | H | A folder is chosen once (Google Drive). A gzipped copy (a few hundred KB) is written when the app opens, 7 days after the last one and only if something changed; the 5 newest stay; a status line, "Back up now", a list with restore; a failure shows in red and the old reminder stays |

## Round 16 (photos on an ascent)

| # | Issue | Sev | Status |
|---|---|---|---|
| F1 | No way to keep a picture of a climb | M | Up to 5 photos per ascent from the gallery (the system picker, no permission), shrunk to 1600 px; strip and full-screen view on the ascent; a small camera with the count in the Journal and the route history (no thumbnails); optional photo on the share card, off by default; copied once each into the backup folder and restored with it |

## Round 17 (photos of crags and walls; sharing with a photo)

| # | Issue | Sev | Status |
|---|---|---|---|
| F2 | No place for photos of a crag or a wall | M | Crag screen: "Photos of the crag" (up to 10, 2000 px) and a camera icon on each sector with a strip of its photos; full-screen view with delete; photos copied and restored with the backup |
| F3 | The photo on the share card was a thin strip | M | With a photo the card puts it first: it fills the upper half, the grade and style sit on it like a label, the text is below |
| F4 | Backups on Google Drive: a new photo folder and all photos again on every copy; old copies never removed | H | Drive gives no readable file names, so the app now remembers the addresses of what it wrote, recognises its own files by their content (backups) and by an id written in the photo (photos), and removes old copies by address |

## Round 18 (topo lines, first delivery)

| # | Issue | Sev | Status |
|---|---|---|---|
| T1 | No way to show where a route goes | M | Topo editor on a wall or crag photo: tap the start, the bolts and the anchor, the app draws a smooth curve through them; zoom with two fingers or buttons; drag, select and delete points; undo/redo; one line per route and photo; lines with numbers (left to right) on the full-screen photo |

## Round 19 (topo lines, second delivery)

| # | Issue | Sev | Status |
|---|---|---|---|
| T2 | Routes without bolts, or with a winding line, could not be drawn | M | "By hand" mode: draw with a finger, in pieces, smoothed; undo per piece |
| T3 | A drawn line was only visible on the photo | M | Route screen "Topo" section (this route in full, the others dimmed), route numbers on the photo open the route, "Draw this route" from the route screen, the line on the share card |

## Round 20 (owner's test of topo and backup)

| # | Issue | Sev | Status |
|---|---|---|---|
| T4 | The app closed when zooming the topo editor to the maximum | H | On Android the line drawing keeps its whole surface as one picture in memory; at 8× that was hundreds of MB. The lines are now drawn on the visible canvas only |
| L1 | "Save line" (and the buttons at the bottom of the crag position screen) sat under Android's navigation bar | H | Every stacked screen keeps the strip of the navigation bar free (safe-area inset); the photo viewer sizes its photos by its own area |
| B2 | Restoring an automatic copy was hard to find | M | "Restore from a copy in the folder…" with a Restore button on each row; "Import backup" also reads the automatic `.json.gz` copies; help text says what to do on a new phone |

## Open items

1. Device checks: localized dates on Hermes, calendar picker, keyboard behavior, large font sizes, TalkBack labels.
2. The map needs internet; offline download of an area is planned (`docs/NEXT.md`).
3. Multipitch ascents cannot record pitches yet.
