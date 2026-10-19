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
5. New route: the type chips are only Sport and Multipitch (no Boulder); Settings has only route grades (KR, UIAA, FR).
6. Error checks: try to save with no route (message "Choose a route first"); new route without crag or name (message names the missing field, the field gets a red border); a grade that does not exist for the system, for example `9z`, or `VI.3` with system FR (message with an example grade); date `2026-02-30` or `10.10.2026` (date error); attempts `0` or `abc` (attempts error). Expected: nothing saved in each case.
7. Tap "Yesterday", save. Then tap the date field, pick a day 3 weeks ago in the calendar, save; repeat with a day in the previous year. Days in the future cannot be picked. Expected: headers "Yesterday", a localized day such as "Sat, 19 September", and for the previous year the year is included; newest first.

## 2a. Route search, suggestions, duplicates
1. New ascent with an empty route field. Expected: "Recently climbed" lists up to 5 routes you logged last, newest first (none on a fresh install).
2. Type "lysa", "ŁYSA" or "łysa" for a route or crag named "Łysa ...". Expected: it is found in every case; the list shrinks as you type and shows crag, sector and grade.
3. Create a new route. Expected: labelled fields in this order: Region, Area, Group (optional), Crag, Sector, Route name; chips below each area field show what exists one level up.
4. Tap a region chip and an area chip, then start typing in Crag. Expected: crag suggestions (crags of that area first) appear right under the field and the field scrolls up so the keyboard does not cover them.
5. Pick an existing crag with an area. Expected: "Where is this crag?" shows its path, e.g. "Czarnorzeki › Kamieniec › Krowia Turnia", and no area fields. Pick an existing crag without an area, choose region and area and save. Expected: the crag is now found under them in the Crags tab.
6. With an existing crag chosen, the Sector field shows chips of its sectors; tap one to fill it. For a new crag a hint says to type a sector or leave it empty.
5. Type the name of a route that already exists on that crag (any case). Expected: a box "This crag already has ..." with "Use this route"; tapping it selects the existing route.
6. Type "okiennik" when "Okiennik" exists and save. Expected: no second crag is created.
7. Partner field: suggestions of partners, the most frequent first; "anna" and "Anna" are the same partner.

## 2b. Ascent detail, edit, delete
1. Tap an entry in the Journal. Expected: a screen with route, crag, sector, grade, date, style, rating, partner, conditions and notes (empty fields are not shown).
2. Tap Edit, change the style to Flash and the date to another day, Save. Expected: back on the detail, then in the Journal the entry shows the new style under the new date; Progress numbers update.
3. Tap Delete. Expected: a question "Delete ascent?"; Cancel keeps it; Delete removes it from the Journal and from Progress.
4. Export a backup on phone A (or before deleting), delete an ascent, export again and import that backup on a phone that has the old data. Expected: the ascent disappears there too.

## 2c. Route history
1. Crags -> a crag -> tap a route. Expected: the route screen with crag/sector/type, a summary ("Sent <date> (RP). It took 3 days." or "Not sent yet. Days tried: 2."), totals, a green "Log an ascent" button and the list of your ascents (tap one to open it).
2. On an ascent's detail, tap the route name. Expected: the same route screen.
3. For your own routes the pencil at the top right opens route editing.

## 2d. Backup reminder
1. With at least one ascent and no backup made: the Journal shows a red-bordered box "You have never made a backup"; tapping it opens Settings, which shows "No backup yet."
2. Export a backup. Expected: the box disappears; Settings shows "Last backup: today."
3. Install the new APK over the old one (without uninstalling). Expected: the app updates and all data is still there.

## 3. Progress
0. Before adding any ascent (fresh install): Progress shows "No sends in <year> yet" with a hint, and "No sends this year." under each pyramid.
1. Open Progress. Expected: totals for the current year match what you entered (sends do not count attempts), "days out" counts distinct dates.
2. The hardest route tile shows the grade you entered; the previous-year entry is not counted.
3. The route pyramid shows bars for the grades you logged; the calendar shows coloured cells for your dates and a legend below it.
3a. Year switcher: with an entry in the previous year, tap ‹ next to the year. Expected: stats and pyramids for that year; the activity calendar is shown only for the current year; › goes back; the arrow is greyed out where there are no more years.
4. Change the grade system in Settings (for example KR -> FR). Expected: Journal and Progress show the same routes in the new system (VI.3 -> 6c).

## 2e. Building a crag ("+" where the new thing goes)
1. Crags tab -> "Add a crag". Expected order: Region and Area (required), Group (optional), Crag name (required), Sectors (optional, "+ Another sector"), Description, Approach. Saving without a region or area shows an error under the field.
2. Fill region "Jura", area "Rzędkowice", name "Okiennik", sectors "Lewy" and "Prawy", save. Expected: the crag screen opens with sectors LEWY and PRAWY, each saying "No routes yet".
3. Crags tab -> Jura -> Rzędkowice -> "Add a crag" opens the form with Jura and Rzędkowice already filled in.
4. Crag screen -> "+ Add routes": pick sector "Prawy", name "Rysa", grade, then "Save and add another". Expected: "Added: Rysa (...)" and an empty name field with sector and type kept. Add a second route, then "Save and close". Both routes are listed under PRAWY.
5. The "+" next to a sector header opens "Add routes" with that sector selected. Typing a name that already exists on the crag shows a warning and does not save.
6. "+ Add sector" adds an empty sector; adding "lewy" when "Lewy" exists does not create a second one.
7. New ascent -> "Create a new route" with a new crag and no region or area: saving shows "A new crag needs a region and an area."
8. Search "Okiennik" in a new ascent before it has routes. Expected: it appears under "Crags"; tapping it opens the new-route form with crag and region filled in.

## 3a. Look and dark mode
1. Settings -> Appearance: "Like the phone", "Light", "Dark". Each changes the whole app at once, also the top and bottom bars; the choice stays after closing the app.
2. Light: paper background, dark text, grades in dark squares, rust "+" and main buttons. Dark: deep green background, grades in light squares, lighter rust. All text is easy to read in both, also in sunlight.
3. Headings, grades and numbers use the narrow font; works without internet.
4. Journal: three tiles on top (sends this year, days out, hardest); ascents of one day share a card, the header says how many. Route screen: big name and grade, history as a timeline (rust dots for sends, grey for attempts).

## 3c. Own grade and route finder
1. New ascent on a VI.1 route: under Style a "Your grade" row of grades around VI.1, the route's own marked "(as the route)" and chosen by default. Pick VI.2 and save. Expected: Journal shows "… · felt VI.2" ("dla mnie VI.2"), the ascent screen has a "Your grade" line, the route's timeline shows it. Progress still counts the route as VI.1.
2. Edit the ascent and tap the route's own grade again: the "felt" text disappears.
3. Crags tab -> "Find routes". Filters: name, grade from and to (any), where (tap region, then area or group chips; "One level up", "Everywhere"), your ascents (all, not climbed yet, tried but not sent, sent) and type. Expected: the count updates at once, results easiest first with the grade square, path and your status; tapping one opens the route.
4. Example: from VI to VI.2, Skałki Czarnorzeckie, "Not climbed yet". Log an ascent on one result, go back: it disappears from that list.

## 3b. Icons
1. The bottom bar shows an icon above each tab name (book, chart, mountains, flag); the selected tab's icon is filled. No empty squares.
2. Top right: a clear gear icon opens Settings. In the middle of the bottom bar a raised orange "+" opens a new ascent from any tab, in light and dark mode. The route screen's "Log an ascent" button is orange too.

## 4. Crags and goals
1. Crags tab. Expected: "Test Crag" with the number of routes. Tap it. Expected: the crag screen with routes grouped by sector; "Test Route 1" shows "✓ sends: 1" (green) or "tried: N". Tap the route. Expected: a new ascent form with this route already chosen.
1a. Editing own data (only for crags, sectors, routes and regions you created; imported ones show a note and no pencils):
   - Crags tab: a search field, then "Regions" (each with its number of crags) and "No region" for crags without one. Typing "krowia" lists matching crags with their path.
   - Tap a region: its areas (rejony); tap an area: its groups and crags; tap a group: its crags. Each level has "+ Add area/group" and "Add a crag"; "+ Add region" is on the Crags tab.
   - Pencil at the top right of a region, area or group: rename it; delete it. Expected: its crags and sub-areas move one level up (deleting group "Krowia Turnia" puts crag Krowia directly in Kamieniec).
   - On a crag screen: pencil at the top right edits name, region, description, approach; "Delete crag" asks first and lists how many sectors, routes and your ascents go with it.
   - Pencil next to a sector header: rename or delete (lists routes and ascents that go with it).
   - Pencil next to a route: change name, sector (moves the route), type, grade; "Delete route" lists your ascents of it. After deleting, those ascents are gone from the Journal and Progress.
2. Goals tab: with an empty title the Add button is disabled. Add a Count goal ("200 sends", target 200), a Project and a Wishlist item. Expected: they appear in the list after Add, the title field clears and the keyboard closes. Count goal with target `abc`: error message, nothing added.
3. The count goal shows a bar and "N / 200 sends in <year>" matching the Sends tile on Progress.
4. Tap "Mark done" on the Project. Expected: crossed out with ✓, moved to the bottom; "Reopen" brings it back. Tap Delete: confirmation, then it disappears.

## 5. CSV import
1. Settings -> Import crags from CSV. Select all four sample files at once. Expected: an alert with counts (1 crag, 1 sector, 2 routes, 3 pitches). Buttons are disabled with a spinner while it runs.
2. Crags tab shows "Example crag". In a new ascent, searching "Example" finds the sport route and the multipitch route.
3. Import the same files again. Expected: same message, and no duplicates in the Crags list or in the search.
4. Error handling: edit a copy of routes.csv on the phone (or on a computer) so that one grade is wrong (for example `9z`) and one `sector_key` does not exist. Import. Expected: "problems found, nothing was imported" with file and line numbers, and no data changed.
5. Select only routes.csv and crags.csv without sectors.csv. Expected: errors about unknown `sector_key`, nothing imported.
5a. Select only sectors.csv. Expected: "crags.csv and routes.csv are required. Selected: sectors.csv".
6. File names must be exactly `crags.csv`, `sectors.csv`, `routes.csv`, `pitches.csv`. A different name is ignored (note what happens).

## 5a. One-file import
1. Settings -> Import crags from a CSV file. Pick one file with the headers `Region;Rejon;Grupa;Skała;Sektor;Nazwa;Typ;Wycena` (English headers and commas work too). Expected: the question "Import?", then the crags appear under region › area › group.
2. A row without region or area, or with a wrong grade, shows "<file>, line N: …" and nothing is imported.
3. A file with other headers shows "File … was not recognised".

## 5c. theCrag export (big file)
1. Settings -> Import crags from a CSV file -> pick a theCrag export (headers `Region;Sektor;Nazwa;Trudność;…;Długość (m);Przeloty;…;Link`). Expected: the question shows the numbers of crags and routes and "Rows left out: N (boulders, ice, …)". The import may take some seconds.
2. Crags tab: regions from the file (e.g. Jura, Pogórze Dynowskie, Slovenský raj). Tap down through every level, e.g. Jura -> Jura Południowa -> Garb Tenczyński -> Dolina Sanki -> Zimny Dół -> Grupa Labiryntu -> a crag. Each level shows how many crags are below it.
3. Search "zimny" or a crag name in the Crags tab, and a route name in a new ascent. Expected: results appear without a noticeable delay after the first letter.
4. Open a route with length and bolts: under the crag line it says e.g. "18 m · bolts: 6". Edit the route: Length and Bolts fields; letters there show an error.
5. Slovak routes show their grade converted (e.g. "7-" as VII- in UIAA, VI.2 in KR). Grades above VI.7 (VI.7+, VI.8, VI.8+) are accepted.
6. Settings -> "Remove imported crags and routes": the question names the numbers; after it, imported crags are gone except those with your ascents; routes you added yourself stay.
7. Add a crag from a deep group ("Add a crag" on its screen): the form shows Region, Area and the Group field with all lower levels, e.g. "Garb Tenczyński › Dolina Sanki › Zimny Dół". Group chips go one level deeper after each pick.

## 5b. Guidebook import and editing imported data
1. Import the guidebook export itself (one file, e.g. `drogi_i_bouldery_Kamieniec.csv`). Expected: Czarnorzeki › Kamieniec with groups Grupa Słonecznej Turni, Kursowe Skałki, Krowia Turnia; Strzelnica, Sokoli Grzbiet, Przełom Marcinka and Smoczy Grzbiet as areas without groups; crag Krowia with sector "Ściana zachodnia". If the older three files were imported before, the ascents stay and no old crags are left over. Expected: a question "Import?" with the numbers of crags and routes and a warning that re-importing overwrites changes; Cancel imports nothing.
2. After Import: the Crags tab shows the regions; drilling down reaches the crags. Boulders, routes named "(bez nazwy)" and routes marked "zakaz wspinania" are not imported (Leśna Turnia is missing); routes and crags have no notes, styles, guidebook numbers or wall heights.
2a. Re-import a file with one route removed: the route disappears unless you logged an ascent on it; routes you added yourself stay.
3. Grades from the guidebook are shown as written (VI+, VI.4/4+, VI.5?) when the display system is KR; in FR they show the nearest grade. They count in Progress as the nearest lower step.
4. Imported crags, sectors, routes and regions have pencils like your own: rename a crag, move a route to a new sector, delete a route. Import the same files again: the changes are undone and deleted routes come back; ascents stay.

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
