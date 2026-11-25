import type { ProModule } from './types';

/**
 * Pro is frozen: the app shows no Pro at all (no badges, teasers or Pro screen). The former Pro features are free and
 * built into the app. Turning this on again brings back the teasers and the Pro screen for future Pro features.
 */
export const PRO_VISIBLE = false;

export type { ProFeature, ProModule } from './types';

/** No Pro in this public build: every feature is off and the slots are empty (see `types.ts`). */
export const pro: ProModule = { has: () => false };
