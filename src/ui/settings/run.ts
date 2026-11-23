/**
 * Runs a Settings action with the buttons off; the returned text (if any) is shown in an alert, an error too.
 * `status` shows the busy overlay at once; an action that first asks something calls `showBusy` itself after that.
 */
export type Run = (fn: () => Promise<string | void>, status?: string) => Promise<void>;
