---
name: ux-audit
description: Audit and improve the UX of Cruxlog screens (mobile usability, accessibility, empty/error states, forms). Use when asked to review UX, polish a screen, or before a release.
---

# UX audit

Audit screen by screen (`app/**/*.tsx`), then shared components (`src/ui/kit.tsx`). Context: climbers log ascents outdoors, often with one hand, cold fingers, sun glare, no signal.

## Checklist per screen

**Flow**
- The main task needs the fewest taps possible. Sensible defaults (today's date, last-used style or crag).
- Every action gives feedback: success (screen closes or message), failure (visible message, not a silent return).
- No double submit: buttons disabled while saving.
- Destructive or irreversible actions (delete, import) ask for confirmation.

**States**
- Empty state explains what to do next (and how).
- Loading state when data may take time; error state when it can fail (files, import).
- Lists with no search results say so.

**Forms**
- Each field has a visible label (not only a placeholder).
- Right keyboard (`keyboardType`), `returnKeyType`, `autoCapitalize` where it matters.
- Validation errors name the field and how to fix it. Invalid data never reaches the database (dates, numbers, grades).
- Keyboard does not cover the focused field (`automaticallyAdjustKeyboardInsets`, `keyboardShouldPersistTaps="handled"`).

**Accessibility**
- Touch targets ≥ 44×44 pt (use `hitSlop` for small chips and icons).
- Icon-only controls have `accessibilityLabel` and `accessibilityRole`. Toggles report `accessibilityState={{ selected }}`.
- Text contrast ≥ 4.5:1 in light and dark theme (`src/ui/theme.ts`). Do not convey meaning with color only.
- Layout survives large system font size (no fixed heights on text containers).

**Consistency**
- Components from `src/ui/kit.tsx`, colors from `useTheme()`, spacing multiples of 4.
- Same wording for the same thing across screens; all text via i18n.
- Dates shown in the user's locale (`formatDay` in `src/domain/dates.ts`), stored as ISO `YYYY-MM-DD`.

## Output

1. Write or update `docs/UX_AUDIT.md`: table per screen with issue, severity (high / medium / low), and status (fixed / open).
2. Fix high and medium issues that are local to screens or `kit.tsx`. Move logic you add to `src/domain/` with tests.
3. List larger redesigns as open items for the user instead of doing them.
4. Run the `verify` skill. Add new flows or changed expectations to `docs/TESTING.md`.

The app cannot run in the cloud sandbox, so the audit is code-based. Mark anything that needs a check on a real phone as "verify on device".
