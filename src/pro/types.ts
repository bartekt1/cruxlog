import type { ComponentType } from 'react';
import type { CardStyle } from '../domain/settings';
import type { StatAscent } from '../domain/stats';
import type { CardProps } from '../ui/cardParts';

/**
 * The Pro socket (Pro is frozen for now: see `PRO_VISIBLE` in index.ts). This public build has no Pro features: `has` is always false and the slots are empty, so the app shows
 * a "Pro" teaser in their place. The store build replaces `index.ts` (and adds the Pro screens) from the owner's private repo.
 * Keep these types stable: the private module implements them. Only `index.ts` is replaced in the store build.
 */
export type ProFeature = 'pastYears' | 'moreStats' | 'trips' | 'topoMap' | 'cardStyles';

export type ProModule = {
  /** Whether this user has the feature (bought Pro, a promo code, or the DEV build). */
  has: (feature: ProFeature) => boolean;
  /** Pro sections of the Progress tab, under the free ones. */
  ProgressMore?: ComponentType<{ ascents: StatAscent[]; year: number }>;
  /** The Pro part of the Plans tab (trips), above the goals. */
  PlansMore?: ComponentType;
  /** Share card looks other than "guide". */
  cardStyles?: Partial<Record<Exclude<CardStyle, 'guide'>, ComponentType<CardProps>>>;
};
