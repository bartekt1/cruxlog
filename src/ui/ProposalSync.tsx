import { useSQLiteContext } from 'expo-sqlite';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { sendProposals } from './proposals';

const EVERY_MS = 2 * 60 * 1000;

/** Renders nothing. Sends the waiting changes to crags and routes soon after the app opens, when it comes back, and every 2 minutes while open. */
export function ProposalSync() {
  const db = useSQLiteContext();
  useEffect(() => {
    const run = () => { sendProposals(db).catch(() => { /* tried again later */ }); };
    const first = setTimeout(run, 8000);
    const every = setInterval(() => { if (AppState.currentState === 'active') run(); }, EVERY_MS);
    const sub = AppState.addEventListener('change', (state) => { if (state === 'active') run(); });
    return () => { clearTimeout(first); clearInterval(every); sub.remove(); };
  }, [db]);
  return null;
}
