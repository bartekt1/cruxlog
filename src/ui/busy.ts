import { create } from 'zustand';

/**
 * What a long Settings action is doing, for the overlay in the middle of the screen (`BusyOverlay`).
 * Empty text means no overlay: an action that first asks something (a question, a file picker) shows it only after that.
 */
type Busy = { text: string; done: number; total: number };

export const useBusy = create<Busy>(() => ({ text: '', done: 0, total: 0 }));

/** Shows the overlay with this text (no progress bar). */
export function showBusy(text: string): void {
  useBusy.setState({ text, done: 0, total: 0 });
}

/** Shows how far it got, under the text. */
export function busyProgress(done: number, total: number): void {
  useBusy.setState({ done, total });
}

export function hideBusy(): void {
  useBusy.setState({ text: '', done: 0, total: 0 });
}
