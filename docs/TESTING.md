# Manual test procedure

Build under test: APK from GitHub Actions (artifact `cruxlog-apk`). Test on a real Android phone.
Write down the result of every step (OK / problem). Report problems with: step number, what you did, what you expected, what happened, screenshot.

## 0. Preparation
1. Uninstall any older Cruxlog, install the new APK, open it. Expected: the Journal tab opens with the text "No ascents yet..." (or Polish equivalent).
2. Put a route list in the Cruxlog template on the phone (Downloads), e.g. `docs/cruxlog-wzor.csv` (§5).
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
1. Crags -> a crag -> tap a route. Expected: the route screen with crag/sector/type, a summary ("Sent <date> (RP). It took 3 days." or "Not sent yet. Days tried: 2."), totals, an orange "Log an ascent" button and the list of your ascents (tap one to open it).
2. On an ascent's detail, tap the route name. Expected: the same route screen.
3. For your own routes the pencil at the top right opens route editing.

## 2d. Backup reminder
1. With at least one ascent and no backup made: the Journal shows a red-bordered box "You have never made a backup"; tapping it opens Settings, which shows "No backup yet."
2. Make a backup ("Back up now" in Automatic backup, or the export under "Other ways to back up"). Expected: the box disappears; Settings shows "Last backup: today."
3. Install the new APK over the old one (without uninstalling). Expected: the app updates and all data is still there.

## 2e. Building a crag ("+" where the new thing goes)
1. Crags tab -> "Add a crag". Expected order: Region and Area (required), Group (optional), Crag name (required), Sectors (optional, "+ Another sector"), Description, Approach. Saving without a region or area shows an error under the field.
2. Fill region "Jura", area "Rzędkowice", name "Okiennik", sectors "Lewy" and "Prawy", save. Expected: the crag screen opens with sectors LEWY and PRAWY, each saying "No routes yet".
3. Crags tab -> Jura -> Rzędkowice -> "Add a crag" opens the form with Jura and Rzędkowice already filled in.
4. Crag screen -> "+ Add routes": pick sector "Prawy", name "Rysa", grade, then "Save and add another". Expected: "Added: Rysa (...)" and an empty name field with sector and type kept. Add a second route, then "Save and close". Both routes are listed under PRAWY.
5. The "+" next to a sector header opens "Add routes" with that sector selected. Typing a name that already exists on the crag shows a warning and does not save.
6. "+ Add sector" adds an empty sector; adding "lewy" when "Lewy" exists does not create a second one.
7. New ascent -> "Create a new route" with a new crag and no region or area: saving shows "A new crag needs a region and an area."
8. Search "Okiennik" in a new ascent before it has routes. Expected: it appears under "Crags"; tapping it opens the new-route form with crag and region filled in.

## 3. Progress
0. Before adding any ascent (fresh install): Progress shows "No sends in <year> yet" with a hint, and "No sends this year." under each pyramid.
1. Open Progress. Expected: totals for the current year match what you entered (sends do not count attempts), "days out" counts distinct dates.
2. The hardest route tile shows the grade you entered; the previous-year entry is not counted.
3. The route pyramid shows bars for the grades you logged; the calendar shows coloured cells for your dates and a legend below it.
3a. Year switcher: with an entry in the previous year, tap ‹ next to the year. Expected: stats, pyramids and the whole-year calendar for that year; › goes back; the arrow is greyed out where there are no more years.
4. Change the grade system in Settings (for example KR -> FR). Expected: Journal and Progress show the same routes in the new system (VI.3 -> 6c).

## 3a. Look and dark mode
1. Settings -> Appearance: "Like the phone", "Light", "Dark". Each changes the whole app at once, also the top and bottom bars; the choice stays after closing the app.
2. Light: paper background, dark text, grades in dark squares, rust "+" and main buttons. Dark: deep green background, grades in light squares, lighter rust. All text is easy to read in both, also in sunlight.
3. Headings, grades and numbers use the narrow font; works without internet.
4. Journal: three tiles on top (sends this year, days out, hardest); ascents of one day share a card, the header says how many. Route screen: big name and grade, history as a timeline (rust dots for sends, grey for attempts).

## 3b. Icons
1. The bottom bar shows an icon above each tab name (book, chart, mountains, flag); the selected tab's icon is filled. No empty squares.
2. Top right: a clear gear icon opens Settings. In the middle of the bottom bar a raised orange "+" opens a new ascent from any tab, in light and dark mode. The route screen's "Log an ascent" button is orange too.

## 3c. Own grade and route finder
1. New ascent on a VI.1 route: under Style a "Your grade" row of grades around VI.1, the route's own marked "(as the route)" and chosen by default. Pick VI.2 and save. Expected: Journal shows "… · felt VI.2" ("dla mnie VI.2"), the ascent screen has a "Your grade" line, the route's timeline shows it. Progress still counts the route as VI.1.
2. Edit the ascent and tap the route's own grade again: the "felt" text disappears.
3. Crags tab -> "Find routes". Filters: name, grade from and to (any), where (tap region, then area or group chips; "One level up", "Everywhere"), your ascents (all, not climbed yet, tried but not sent, sent) and type. Expected: the count updates at once, results easiest first with the grade square, path and your status; tapping one opens the route.
4. Example: from VI to VI.2, Skałki Czarnorzeckie, "Not climbed yet". Log an ascent on one result, go back: it disappears from that list.

## 3d. Goals and progress
1. Goals tab -> "+ Add a goal". Kinds: Count, Grade, Project, Wishlist, each with a one-line explanation.
2. Grade: pick "VI.3+" and 3. Leave the name empty: it becomes "3 × VI.3 or harder in <year>". The bar counts different routes of VI.3 or harder led this year (OS, flash, RP, PP; top-rope does not count) and lists them.
3. Project: type a route name, pick it from the list; the name fills in. The card shows grade, path and "tries: N · days: M". The route screen shows a "Your project" badge.
4. Log a top-rope ascent of the project: it stays open. Log an RP: it is ticked off and moves down the list.
5. Tap a goal: edit name, number, grade or route; "Mark done"/"Reopen"; "Delete" asks first.
6. Progress: pick a past year with the arrows. Expected: the calendar shows the whole year by month; hardest send per month and per year, styles, most visited crags and partners for that year.

## 3e. Map and nearby crags
1. Crags › Map. With no saved positions: a card says so and how to set one. The map shows Poland. Expected: no crash without internet beyond empty tiles.
2. Open a crag › "Set crag position". Move the map under the pin › "Save pin position". Back on the crag: "Position saved". Expected: the crag is a dot on Crags › Map, its name shows when zoomed in, and tapping it opens a card with "Open crag".
3. On site: "Save crag position here". The first time the phone asks for location permission. Expected: the position is saved; "Remove position" clears it.
4. Map: tap the top-right button to switch Map / Topo. Expected: the tourist map (OpenTopoMap) with trails; the choice is kept after a restart.
5. Map: "Show me". Expected: a blue dot at your position and the map flies to it. Deny permission: a short note how to allow it.
6. With permission and a crag within 50 km: Crags list shows "Nearby" with distances. Within 3 km: the ascent form shows the crag as a chip, tapping it lists its routes.
7. Settings › CSV import with a file `Skała;lat;lng`. Expected: a question with the count, then "Crag positions saved" and the names not found.
8. Re-import the route list. Expected: saved positions stay.
9. Import a positions file with a column `przybliżone` (`tak` on some rows). Expected: the message counts the approximate ones; on the map they are hollow dots; the crag screen says "Approximate position (area of the group)", distances read "about 2 km", and "Improve" opens the position screen zoomed out a little.
10. Set one crag's position on the phone, then import the positions file again. Expected: "Unchanged because you set them on the phone: 1", and that crag keeps your position.

## 3f. Goals from a route, search on every level
1. Open a route that is not a goal › "Add to goals" › Wishlist. Expected: the badge "On your wishlist" replaces the button; the crag's route list shows a small "wishlist" label on that route; Goals lists it.
2. Log an ascent with style "Attempt" on a route that is not a project: switch "Add this route as a project" on, save. Expected: the route is a project (badge on the route, "project" label in the crag list). With the switch off nothing is added.
3. Open a saved attempt › "Add as a project". Expected: the button changes to "This route is your project."
4. Send the project with a lead (RP). Expected: the goal ticks off and the labels disappear.
5. Crags tab: type part of a route name. Expected: "Crags" and "Routes" sections; tapping a route opens it.
6. Open a region, then an area and a group: each has "Search in: <name>". Expected: only crags and routes inside that place; "Find routes with filters" opens the finder already limited to it.
7. Crag screen: "Search routes on this crag". Expected: the list narrows while typing, empty sectors hide, Polish letters optional ("lysa" finds "Łysa").

## 3g. Sharing a route, an ascent or a crag
1. Ascent screen › "Show it off" (Pochwal się). Expected: a screen with a paper card: tag "Ascent", the route name, grade square, style (RP…) and stars, crag › sector, area path, date, the crag's coordinates at the bottom and "Cruxlog". The card is light also when the phone is in dark mode.
2. Type a message (up to 90 characters). Expected: it shows on the card at once.
3. Switch "Include the crag's position" off. Expected: coordinates disappear from the card. On a crag with only an approximate position the card says "approximate position".
4. "Send picture": the phone's share sheet opens; pick WhatsApp (or save to Files). Expected: a sharp portrait image (not blurry, fonts as in the app, nothing cut off).
5. "Send text with a map link": share sheet with a short text and a Google Maps link. Expected: tapping the link in WhatsApp opens the map at the crag; for an approximate position the text says so.
6. Route screen and crag screen: the share icon next to the pencil (top right). Expected: cards "Join me on this route" (with length and bolts) and "Join me at this crag" (with the route count).
7. A crag without a position: no switch, a note that there is no map to include, and no coordinates on the card or in the text.
8. Your own position is never in the card or the text.

## 4. Crags and goals
1. Crags tab. Expected: "Test Crag" with the number of routes. Tap it. Expected: the crag screen with routes grouped by sector; "Test Route 1" shows "✓ sends: 1" (rust) or "tried: N". Tap the route. Expected: the route screen (§2c).
1a. Editing (your own and imported crags, sectors, routes and regions; re-importing a file undoes changes to imported ones, see §5b):
   - Crags tab: a search field, then "Regions" (each with its number of crags) and "No region" for crags without one. Typing "krowia" lists matching crags with their path and matching routes (§3f).
   - Tap a region: its areas (rejony); tap an area: its groups and crags; tap a group: its crags. Each level has "+ Add area/group" and "Add a crag"; "+ Add region" is on the Crags tab.
   - Pencil at the top right of a region, area or group: rename it; delete it. Expected: its crags and sub-areas move one level up (deleting group "Krowia Turnia" puts crag Krowia directly in Kamieniec).
   - On a crag screen: pencil at the top right edits name, region, description, approach; "Delete crag" asks first and lists how many sectors, routes and your ascents go with it.
   - Pencil next to a sector header: rename or delete (lists routes and ascents that go with it).
   - Pencil next to a route: change name, sector (moves the route), type, grade; "Delete route" lists your ascents of it. After deleting, those ascents are gone from the Journal and Progress.
2. Goals: see §3d and §3f.

## 5. Import of crags and routes (the Cruxlog template, `docs/IMPORT.md`)
1. Settings -> Import crags from a CSV file -> pick `docs/cruxlog-wzor.csv` (or your own file in that template). Expected: "Import?" with the numbers of crags and routes; after Import the crags are under region › area › group, with positions, descriptions, approach, length, bolts, first ascent (author, year).
2. Change the order of the columns in the file, add a column of your own, import again. Expected: the same result, no duplicates.
3. Remove the column "Wycena" (or "Rejon"). Expected: "File … lacks the columns: Wycena", nothing imported.
4. Put a wrong grade (e.g. `9z`) in one row. Expected: "<file>, line N: …", nothing imported.
5. Taking over: on a crag you already have (with your ascents and a wall photo) make a file with the same crag and route names (other letter case is fine) and your own ID_skały / ID_drogi. Import. Expected: the message says how many routes were taken over; the crag is not doubled; your ascents, photos and topo lines are still on the routes; a position you set on the phone is kept. Routes of that crag that are not in the file and have no ascents are gone.
6. Rename that route in the file (keep its ID_drogi) and import again. Expected: the route is renamed, not doubled, and "taken over" is not mentioned again.
7. Positions only: a file with Skała;Lat;Lng;Przybliżone sets the map pins (approximate ones say "about").
8. Settings -> "Remove imported crags and routes": the question names the numbers; afterwards imported crags are gone except those with your ascents; routes you added yourself stay.
9. A file with other headers (not the template) is not recognised: "File … was not recognised".

## 6. Backup (one file, by hand)
Since the automatic backup (§6a) these buttons are under Settings › "Other ways to back up (one file, no photos)".
1. Settings -> Export backup. Expected: the system share sheet opens; save the JSON file (for example to Drive or send to yourself).
2. Add one more ascent, then import the backup file. Expected: confirmation message; the data is still there with no duplicates.
3. Clear the app data (Android settings -> Apps -> Cruxlog -> Storage -> Clear data), open the app (empty), import the backup. Expected: all ascents, routes, goals come back and the Progress numbers match what you had.
4. Try importing a file that is not a backup (for example routes.csv renamed to .json or a random JSON). Expected: "This file is not a Cruxlog backup.", no crash.

## 6a. Automatic backup to a folder (Google Drive)
1. Settings › Automatic backup › "Choose folder", pick a folder on Google Drive. Expected: after a moment "Writing to the folder … works"; the label says "Folder: on Google Drive". Nothing is left in the folder (the test file is removed at once).
2. Close the app completely and open it again. Expected: Settings still shows the folder.
3. "Back up now". Expected: a message with the file name (`cruxlog-YYYY-MM-DD-HHMM.json.gz`), its size (a few hundred KB) and the number of copies; the file is in the Drive folder (give Drive a moment to show it). The status line shows the time.
4. "Restore from a copy in the folder…". Expected: the list of copies, each row with its date, size and a "Restore" button; Restore asks first, then "Imported records: N" (and the photos restored); nothing is deleted. "Import backup" also accepts an automatic copy (`.json.gz`) picked anywhere, e.g. on Drive.
4a. A folder on the phone instead of Drive (e.g. Documents/Cruxlog; Android does not allow the top of the storage or the Download folder itself): everything works the same, the label says "(phone storage)". Such a copy survives clearing the app's data or reinstalling it, but not a lost or broken phone.
5. Make 7 copies (change something small between them, tap "Back up now" each time). Expected: only the 5 newest files remain in the folder.
6. Automatic: after 7 days and with something changed since the last copy, open the app. Expected: within a few seconds the status line shows a new "Last automatic copy"; with nothing changed no copy is made. (To try sooner: change the phone date a week ahead, then back.)
7. Remove the folder on Drive (or its access), tap "Back up now". Expected: a clear error; the status line is red and says the last try failed; the Journal reminder appears as before. Choosing a folder again fixes it. "Turn off automatic backup" forgets the folder.
8. The manual "Export backup" and "Import backup" are folded under "Other ways to back up (one file, no photos)" at the bottom of Settings; tapping it shows them with a short explanation. They work as before.

## 6b. Photos on an ascent
1. New ascent › the "Photos" section › "Add photos". Expected: the system gallery picker opens without any permission question; you can tick several photos at once, at most 5 in all ("Photos: 3 of 5"). A short "Preparing the photos…" while they are shrunk. Each shows as a tile with a cross.
2. Cross on a tile removes it. Leave the form without saving. Expected: nothing is kept.
3. Save the ascent. Expected: in the Journal the row has a small camera with the number (no picture); the route's history shows the same.
4. Open the ascent. Expected: a "Photos" strip; tapping one opens it full screen, swipe sideways ("Photo 2 of 3"), the right way up (a portrait photo must be portrait).
5. Edit the ascent: remove one photo, add another (up to 5 in all), save. Expected: the strip and the number follow.
6. Check the size: the photo is much smaller than the original (a few hundred KB; Settings shows "Photos: N (x MB)" once a backup folder is set). Check in your gallery's file details that the saved copy carries no location (there is no copy in the gallery; the original stays untouched).
7. Delete the ascent. Expected: its photos go too. Restart the app: the space is freed (Settings › photo size drops).
8. Share: ascent screen › "Show it off". Expected: with an ascent that has photos a switch "Include a photo", off by default, and a hint about other people. Turn it on: the photo fills the free space on the card between the text and the coordinates; with several photos chips 1…n choose which. "Send picture" waits until the photo has loaded; the picture shows it sharp.
9. Backup: with a backup folder chosen, add a photo and open the app again (or tap "Back up now"). Expected: in the Drive folder a subfolder `zdjecia` with `<id>.jpg` files; each photo is copied once, a second backup copies none, and no second `zdjecia` folder appears. (Drive shows files by name; the app itself remembers their addresses and recognises its photos by the id written inside, so a renamed file is still recognised.)
9a. The list of copies (Settings › "Show copies in the folder") shows the copies made by this app, newest first, and only the 5 newest stay in the folder. On a new phone (or after clearing the app data): choose the same folder; the list then finds the earlier copies by their content.
10. Restore: on a phone (or after clearing the app data) choose the folder, "Show copies", "Restore the copy from…". Expected: the ascents come back and the message says how many photos were restored; the strips show the pictures. Restoring from a plain backup file (no folder) brings back the ascents with "Photo not available" tiles.

## 6c. Photos of a crag and of a wall
1. Crag screen › "Photos of the crag" › "Add photos". Expected: the gallery picker (up to 10 photos in all); the tiles show at once under the heading; tap one for the full-screen swipe view.
2. In the full-screen view the bin at the top right: "Delete this photo?" with the note that the Drive copy stays. After deleting the last photo the view closes.
3. Next to a sector's name (the wall) a camera icon: add photos to that sector (up to 10); they show as a strip under the sector name. On a crag with one unnamed sector the "sector" is named like the crag; photos go there all the same.
4. Photos here are shrunk to 2000 px (a bit larger than on ascents), a few hundred KB each.
5. Share: crag screen › share icon › "Include a photo" (off by default) offers the crag's photos; a route's share card offers the photos of its wall, then of its crag.
6. Backup: open the app after adding (or "Back up now"): the photos of crags and walls are copied into the folder's photo subfolder like the others, once each, and the subfolder is the same one every time (no new folder per backup, no repeated copies). Restore brings them back.
7. Delete a sector or the crag: its photos are gone after the next start of the app.

## 6d. Drawing topo lines
1. Crag screen › a photo of a wall (or of the crag) › full screen › the brush icon "Draw topo". Expected: a list of the routes of that wall ("already has a line" on those drawn); a crag photo lists all routes of the crag.
2. Pick a route. Expected: the photo fills the screen; a hint says what to tap.
3. Tap the start at the bottom, then 3–4 bolts going up, then the anchor. Expected: a red line with a white edge appears after the second point and goes as a smooth curve exactly through every point; the start shows a red disc with the route number, bolts small rings, the anchor a double ring.
4. Zoom: two fingers apart and together (the point between the fingers stays put), two fingers move the photo; the − / whole photo / + buttons do the same; one finger on an empty spot moves a zoomed photo. Expected: the line stays exactly on the rock at every zoom; markers keep their size. At the largest zoom (8×) more + taps or a wider pinch do nothing (and never close the app).
5. Drag a point: it follows the finger. Tap a point: a dashed ring marks it; "Delete the selected point" removes it.
6. Undo / Redo step through every action (point added, moved, deleted, clear). "Clear the line" empties it (undo brings it back).
7. Save with one point: "A line needs at least two points". Save with more: back on the full-screen photo the line shows with its number.
8. Draw a second route on the same photo. Expected: while drawing, the other lines are dimmed; numbers go 1, 2… from left to right by where the lines start.
9. Open a drawn route again: its line is loaded for editing; the bin at the top right deletes it (asks first).
10. Leave the editor with unsaved changes (back button or "Change route"): "Discard changes?"; Cancel keeps you there.
11. Backup and restore: lines come back with the photos. Deleting a photo removes its lines.
12. "By hand": in the editor switch the chips from "Bolts" to "By hand" and draw the line with one finger. Expected: the line follows the finger and is smoothed when you lift it; a second piece continues the line; undo removes the last piece; two fingers still zoom (a second finger cancels the piece being drawn). No bolt rings on a hand-drawn line, only the start number and the anchor. The mode is saved with the line.
13. Full-screen wall photo: tap a route's number disc. Expected: the route screen opens.
14. Route screen: a "Topo" section with the wall photo, this route in full and the others dimmed; tap it to open the photo full screen at that photo. A route without a line on a wall that has photos shows "Draw this route on the wall photo", which opens the editor with the route already chosen.
15. Share a route: "Include a photo" offers the photo with its line first; "Show the topo line on the photo" (on by default) draws its line on the card, placed right on the cropped picture. Sharing a crag draws all lines of the photo with their numbers.

## 6e. After the clean-up (2026-10-21): things that changed inside
1. New ascent with a new route and 2 photos, Save. Expected: one ascent, one new route, both photos. If an error message ever appears after Save, tapping Save again must not make a second ascent or route.
2. Topo editor: tap "Save the line" twice quickly. Expected: one save, back on the photo once (not two screens back).
3. Delete a photo, a goal, a sector, a crag: if anything fails, a "Problem" message now says so (before it failed silently). Normally everything works as before.
4. Rename a sector to the name of another sector of the same crag (or an area to its neighbour's name). Expected: "The name … is already used here", nothing changed.
5. Settings › "Back up now" right after opening the app (while the automatic copy may be running). Expected: one new copy, no error; the folder keeps 5 copies and one `zdjecia` folder.
6. Errors about the backup folder are now in the app's language (e.g. remove the folder on Drive, "Back up now").
7. Route finder with a name typed, on a big import (thousands of routes): results appear without delay; the counts match the filters.
8. Look of lists: section headings, route cards, the switches on the share screen and the "Log another ascent" / "Save the line" buttons look as before (spacing may differ by a few points).

## 7. Robustness
1. Change the language and the route grade system, close the app completely (swipe away) and reopen it. Expected: all data is still there, and the language and grade system are the ones you chose.
2. Rotate the phone, switch to dark mode and back. Expected: readable text and no layout breaks.
3. Enter a very long route name and note. Expected: the list does not break the layout.
4. Airplane mode on: repeat steps 2 and 3. Expected: everything works offline, except the map tiles (the map stays empty or shows what it already loaded; your position still shows).

## 8. Accessibility and layout
1. Turn on TalkBack. The gear icon reads "Settings", the `+` button reads "Log an ascent", rating stars read "1 of 5" ... "5 of 5", selected chips are announced as selected.
2. Set the largest system font size. Go through all screens: no text is cut off, buttons stay usable.
3. Switch the phone to dark mode: all text, field borders and empty stars are clearly visible.

## Known gaps (do not report as bugs)
- The map needs internet for its tiles; no offline download yet.
- No multipitch pitch form (data model only).
- Some crags have no position or only an approximate one until you set it (no GPS tracks are ever recorded).
- The automatic backup runs only when the app is opened (Android does not let it run in the background without extra services).
- Old duplicate `zdjecia` folders made by earlier test builds on Drive are not removed by the app; delete them by hand.
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
