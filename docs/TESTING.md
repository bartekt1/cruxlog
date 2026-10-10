# Manual test procedure

Build under test: APK from GitHub Actions (artifact `cruxlog-apk`). Test on a real Android phone.
Write down the result of every step (OK / problem). Report problems with: step number, what you did, what you expected, what happened, screenshot.

## 0. Preparation
1. Uninstall any older Cruxlog, install the new APK, open it. Expected: the Journal tab opens with the text "No ascents yet..." (or Polish equivalent).
2. Copy the files from `samples/` (crags.csv, sectors.csv, routes.csv, pitches.csv) to the phone (Downloads).
3. Note the phone language (Polish or English). The app should start in that language (other languages fall back to English).

## 1. Navigation and language
1. Check the four tabs: Journal, Progress, Crags, Goals. Each opens without errors.
2. Tap the gear icon (top right). Settings opens. Go back.
3. In Settings, the language and grade chips are in rows (not one per line). Switch the language to the other one. Go through all tabs and the Settings screen. Expected: all texts change, none are missing or show raw keys such as `tabs.journal`.

## 2. Add a route and an ascent by hand
1. Journal -> `+`.
2. Tap "Create a new route". Enter crag "Test Crag", sector empty, name "Test Route 1", type Sport, system KR, grade `VI.3`. Date: "Today" is preselected. Style RP, attempts 2, rating 4 stars, partner "Anna", conditions "sunny 15C", a note. Save.
3. Expected: back in the Journal, the entry is under the header "Today" with the route name, "Test Crag", "2 tries", "Anna", "VI.3", "RP". Save can be tapped only once (no duplicate entry when tapping twice quickly).
4. Add a second ascent: search for "Test" in the route field, pick "Test Route 1", style Attempt. Expected: the chosen route shows as a card with a "Change" button; it is added; no duplicate route. Searching "crag" (the crag name) also finds the route.
4a. Search for "Nonexistent". Expected: "No routes match..." and a button "Create route "Nonexistent"" that opens the new-route form with that name filled in.
4b. Pick style OS or Flash. Expected: the Attempts field disappears (always 1).
5. Add a boulder: new route, type Boulder, system FONT, grade `6B`. Expected: saved, shown as 6B.
6. Error checks: try to save with no route (message "Choose a route first"); new route without crag or name (message names the missing field, the field gets a red border); a grade that does not exist for the system, for example `9z`, or `VI.3` with Boulder type (message with an example grade); date `2026-02-30` or `10.10.2026` (date error); attempts `0` or `abc` (attempts error). Expected: nothing saved in each case.
7. Tap "Yesterday", save. Then type a date 3 weeks ago and one in the previous year. Expected: headers "Yesterday", a localized day such as "Sat, 19 September", and for the previous year the year is included; newest first.

## 3. Progress
0. Before adding any ascent (fresh install): Progress shows "No sends in <year> yet" with a hint, and "No sends this year." under each pyramid.
1. Open Progress. Expected: totals for the current year match what you entered (sends do not count attempts), "days out" counts distinct dates.
2. Hardest route and hardest boulder show the grades you entered; the previous-year entry is not counted.
3. Route and boulder pyramids show bars for the grades you logged; the calendar shows coloured cells for your dates and a legend below it.
4. Change the grade system in Settings (for example KR -> FR). Expected: Journal and Progress show the same routes in the new system (VI.3 -> 6c).

## 4. Crags and goals
1. Crags tab. Expected: "Test Crag" with the number of routes.
2. Goals tab: with an empty title the Add button is disabled. Add a Count goal ("200 sends", target 200), a Project and a Wishlist item. Expected: they appear in the list after Add, the title field clears and the keyboard closes. Count goal with target `abc`: error message, nothing added.

## 5. CSV import
1. Settings -> Import crags from CSV. Select all four sample files at once. Expected: an alert with counts (1 crag, 1 sector, 3 routes, 3 pitches). Buttons are disabled with a spinner while it runs.
2. Crags tab shows "Example crag". In a new ascent, searching "Example" finds the sport route, the boulder and the multipitch route.
3. Import the same files again. Expected: same message, and no duplicates in the Crags list or in the search.
4. Error handling: edit a copy of routes.csv on the phone (or on a computer) so that one grade is wrong (for example `9z`) and one `sector_key` does not exist. Import. Expected: "problems found, nothing was imported" with file and line numbers, and no data changed.
5. Select only routes.csv and crags.csv without sectors.csv. Expected: errors about unknown `sector_key`, nothing imported.
5a. Select only sectors.csv. Expected: "crags.csv and routes.csv are required. Selected: sectors.csv".
6. File names must be exactly `crags.csv`, `sectors.csv`, `routes.csv`, `pitches.csv`. A different name is ignored (note what happens).

## 6. Backup
1. Settings -> Export backup. Expected: the system share sheet opens; save the JSON file (for example to Drive or send to yourself).
2. Add one more ascent, then import the backup file. Expected: confirmation message; the data is still there with no duplicates.
3. Clear the app data (Android settings -> Apps -> Cruxlog -> Storage -> Clear data), open the app (empty), import the backup. Expected: all ascents, routes, goals come back and the Progress numbers match what you had.
4. Try importing a file that is not a backup (for example routes.csv renamed to .json or a random JSON). Expected: "This file is not a Cruxlog backup.", no crash.

## 7. Robustness
1. Change the language and the route grade system, close the app completely (swipe away) and reopen it. Expected: all data is still there, and the language and grade system are the ones you chose.
2. Rotate the phone, switch to dark mode and back. Expected: readable text and no layout breaks.
3. Enter a very long route name and note. Expected: the list does not break the layout.
4. Airplane mode on: repeat steps 2 and 3. Expected: everything works offline.

## Known gaps (do not report as bugs)
- Language and grade system settings reset after restart.
- No crag/route detail screens, no edit/delete.
- No multipitch pitch form (data model only), no map, no nearby crags.
- Goals do not track progress yet.
- Grade conversions between systems are approximate.

## Report template
```
Step: 2.3
Did: ...
Expected: ...
Got: ...
Phone / Android version: ...
Screenshot: yes/no
```

## 8. Accessibility and layout
1. Turn on TalkBack. The gear icon reads "Settings", the `+` button reads "Log an ascent", rating stars read "1 of 5" ... "5 of 5", selected chips are announced as selected.
2. Set the largest system font size. Go through all screens: no text is cut off, buttons stay usable.
3. Switch the phone to dark mode: all text, field borders and empty stars are clearly visible.
