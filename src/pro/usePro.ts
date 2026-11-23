import { useEffect, useReducer } from 'react';
import { pro } from './index';
import type { ProModule } from './types';

/**
 * The Pro module, for screens: re-renders when Pro is bought or restored (`subscribe`), so `has` answers anew without a restart.
 * Part of the socket: not replaced in Pro builds.
 */
export function usePro(): ProModule {
  const [, changed] = useReducer((n: number) => n + 1, 0);
  useEffect(() => pro.subscribe?.(changed), []);
  return pro;
}
