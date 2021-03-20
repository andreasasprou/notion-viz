export class SkipSentryError extends Error {
  shouldSkipSentry = true;

  constructor(message: string) {
    super(message);
  }
}
