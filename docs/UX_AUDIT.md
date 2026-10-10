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
| J5 | Entries cannot be opened, edited or deleted | H | Open: needs an ascent detail screen (NEXT.md #3) |

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
| P4 | Only the current year; no way to look back | M | Open: year switcher |

## Crags

| # | Issue | Sev | Status |
|---|---|---|---|
| C1 | "1 routes" in English | L | Fixed: "Routes: 1" (plural rules not verified on Hermes) |
| C2 | Crags cannot be opened | M | Open: crag and sector detail (NEXT.md #3) |

## Goals

| # | Issue | Sev | Status |
|---|---|---|---|
| G1 | Non-numeric target (`abc`) was stored as NaN | H | Fixed: `validateGoalDraft` |
| G2 | Empty title: Add did nothing, no feedback | M | Fixed: button disabled, message |
| G3 | Keyboard stayed open after Add; no "done" key | L | Fixed |
| G4 | Goals cannot be completed, edited or deleted; no progress | H | Open: NEXT.md #5 |

## Settings

| # | Issue | Sev | Status |
|---|---|---|---|
| S1 | Chips were stacked full width, one per line | M | Fixed: `ChipRow` |
| S2 | Result message appeared at the bottom, often off screen | M | Fixed: alert |
| S3 | Buttons could be pressed again during import | M | Fixed: disabled + spinner |
| S4 | A wrong file gave a raw JSON parse error | M | Fixed: "This file is not a Cruxlog backup." |
| S5 | Missing crags.csv or routes.csv gave confusing parser errors | M | Fixed: names the required files and what was selected |
| S6 | Import behavior (merge, newer wins) was not explained | L | Fixed: help text |

## Open, larger items (not done here)

1. Ascent detail with edit and soft delete (J5), then crag/route detail (C2).
2. Goals: complete, delete, progress from stats (G4).
3. Year switcher on Progress (P4).
4. A native date picker instead of the text field (needs `@react-native-community/datetimepicker` and a new build).
5. Device checks: localized dates on Hermes, keyboard behavior, large font sizes, TalkBack labels.
