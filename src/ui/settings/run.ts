/** Runs a Settings action with the spinner on; the returned text (if any) is shown in an alert, an error too. */
export type Run = (fn: () => Promise<string | void>) => Promise<void>;
