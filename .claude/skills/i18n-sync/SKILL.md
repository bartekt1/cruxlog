---
name: i18n-sync
description: Add, rename or remove translated strings in Cruxlog and keep pl.json and en.json in sync. Use whenever user-visible text changes or the i18n test fails.
---

# i18n sync

1. Add every key to **both** `src/i18n/en.json` and `src/i18n/pl.json`, in the same section and order. Polish text uses proper diacritics.
2. Counts: write them as `"Routes: {{count}}"` / `"Drogi: {{count}}"`. Plural suffixes (`_one`, `_few`, `_many`, `_other`) need `Intl.PluralRules`, which is not verified on Hermes yet; use them only after checking on a device. Use a variable other than `count` (e.g. `n`) when the value is not a quantity, so i18next does not look for plural keys.
3. Use static keys (`t('ascent.save')`). Dynamic keys like ``t(`styles.${s}`)`` are allowed only for a closed set (styles, types, goal kinds) whose keys all exist.
4. Removing a feature: delete its keys from both files.
5. Check with `npx jest __tests__/i18n.test.ts`. It fails on missing or extra keys, on `t('...')` keys absent from `en.json`, and on literal text inside JSX. Language endonyms and symbols are allow-listed in that test; extend the list only for text that must not be translated.
