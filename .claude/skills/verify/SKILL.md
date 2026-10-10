---
name: verify
description: Run Cruxlog's checks (typecheck, tests incl. i18n and DB tests) and report only the failures. Use before every commit, after any code change, or when asked to "check", "verify" or "make sure it works".
---

# Verify

1. If `node_modules/` is missing, run `npm ci --no-audit --no-fund` first.
2. Run both checks in one command so a single call reports everything:

   ```bash
   npm run typecheck 2>&1 | tail -30; npm test --silent 2>&1 | tail -60
   ```

3. Report concisely: "typecheck OK / N errors", "tests X passed / Y failed". For failures, quote only the error lines with `file:line`, not the full log.
4. If the change touches `app/`, `src/ui/` or imports a new module, also check that Metro can bundle the app (catches bad imports that tsc misses; about 1 min):

   ```bash
   CI=1 EXPO_OFFLINE=1 npx expo export --platform android --output-dir "$(mktemp -d)" 2>&1 | tail -5
   ```

5. Fix failures caused by the current change, then re-run. Never skip, delete or weaken a test to get green.

What the tests already cover, so you do not need to check it by hand:
- `__tests__/i18n.test.ts`: `pl.json` and `en.json` have the same keys, every `t('...')` key used in `app/` and `src/` exists, no hard-coded user-visible text in JSX.
- `__tests__/db.test.ts`: migrations, repo queries and backup round-trip on a real SQLite (`node:sqlite`).
- Domain tests: grades, stats, CSV import, form validation.

There is no ESLint config yet, so `npm run lint` is not part of the checks.

The app itself cannot be launched in the cloud sandbox (no device, no react-native-web). For behaviour on a phone, point to `docs/TESTING.md`.
