import type { ProModule } from './types';

export type { ProFeature, ProModule } from './types';

/** No Pro in this public build: every feature is off and the slots are empty (see `types.ts`). */
export const pro: ProModule = { has: () => false };
