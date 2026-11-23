import type { ComponentType } from 'react';
import type { CardStyle } from '../domain/settings';
import type { StatAscent } from '../domain/stats';
import type { CardProps } from '../ui/cardParts';
import type { Aspect } from '../domain/aspect';

/**
 * The Pro socket. This public build has no Pro features: `has` is always false and the slots are empty, so the app shows
 * a "Pro" teaser in their place. The store build replaces `index.ts` (and adds the Pro screens) from the owner's private repo.
 * Keep these types stable: the private module implements them. Only `index.ts` is replaced in the store build.
 */
export type ProFeature = 'pastYears' | 'moreStats' | 'trips' | 'topoMap' | 'cardStyles' | 'cragMore';

export type ProModule = {
  /** Whether this user has the feature (bought Pro, a promo code, or the DEV build). */
  has: (feature: ProFeature) => boolean;
  /** Pro sections of the Progress tab, under the free ones. */
  ProgressMore?: ComponentType<{ ascents: StatAscent[]; year: number }>;
  /** The Pro part of the Plans tab (trips), above the goals. */
  PlansMore?: ComponentType;
  /** Share card looks other than "guide". */
  cardStyles?: Partial<Record<Exclude<CardStyle, 'guide'>, ComponentType<CardProps>>>;
  /** A Pro part of the crag screen, under its description: the crag's position and its walls with their aspects. */
  CragMore?: ComponentType<{ crag: { id: string; name: string; lat: number | null; lng: number | null }; walls: { name: string; aspect: Aspect | null }[] }>;
  /** On the Pro screen: how to get Pro (buy, restore). Without it the screen says Pro is coming. */
  Purchase?: ComponentType;
  /** Calls back when what `has` answers may have changed (Pro bought or restored); returns the unsubscribe. See `usePro`. */
  subscribe?: (onChange: () => void) => () => void;
};
