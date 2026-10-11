---
name: new-screen
description: Add or extend a screen in Cruxlog (expo-router route, list, form, detail view). Use whenever creating a new file in app/ or adding a form or list to an existing screen.
---

# New screen

Follow the existing screens (`app/(tabs)/goals.tsx` for list + form, `app/ascent/new.tsx` for a modal form). Checklist:

1. **Route**: file in `app/` (tab: `app/(tabs)/`, stacked or modal: register it in `app/_layout.tsx` with a translated `title`). Navigate with `Link` / `useRouter` from `expo-router`.
2. **Data**: SQL lives in `src/db/repo.ts`, never in the screen. Load with `useFocusEffect(useCallback(() => { ... }, [db]))` so the list refreshes after a modal closes. Filter `deleted_at IS NULL`. New table or column → use the `db-migration` skill.
3. **Logic**: validation, parsing, calculations go to `src/domain/` as pure functions with a test in `__tests__/`. Validators return an i18n key (see `src/domain/forms.ts`), the screen translates it.
4. **UI**: use `src/ui/kit.tsx` (`Screen`, `Label`, `Field` with `invalid`, `Chip`, `ChipRow`, `Button` with `disabled`, `LinkButton`, `EmptyState`, `ErrorText`, `GradeBadge`, `HIT` for hitSlop) and colors from `useTheme()`. No hex colors in screens; `outline` for control borders, `line` only for dividers. Lists: `FlatList`/`SectionList`, never `ScrollView` + `map` for unbounded data.
5. **Text**: every visible string via `t('section.key')`, added to both `src/i18n/pl.json` and `en.json` (use the `i18n-sync` skill). Counts as `"Label: {{count}}"` (see the skill for why).
6. **UX minimum** (details in the `ux-audit` skill): empty state, error message instead of a silent no-op, `Button` disabled while saving (no double submit), `accessibilityLabel` on icon-only buttons, touch targets at least 44 pt.
7. Run the `verify` skill. Add the screen to `docs/TESTING.md` if it adds a user flow.
