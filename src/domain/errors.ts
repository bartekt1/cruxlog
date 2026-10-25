/** An error meant for the user: `key` is an i18n key (with `params`), translated where it is shown (src/ui/errors.ts). */
export class AppError extends Error {
  constructor(readonly key: string, readonly params: Record<string, string | number> = {}) {
    super(key);
  }
}
