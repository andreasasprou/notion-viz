// Ensure Fullstory is initialized before sentry
// eslint-disable-next-line simple-import-sort/sort
import './fullstory';

import SentryFullStory from '@sentry/fullstory';
import { RewriteFrames } from '@sentry/integrations';
// NOTE: This require will be replaced with `@sentry/react`
//       client side thanks to the webpack config in blitz.config.js
import * as Sentry from '@sentry/node';
import { Integrations } from '@sentry/tracing';
import { Breadcrumb, CaptureContext, Options, Scope } from '@sentry/types';

import { SkipSentryError } from './errors';
import { ClientConstants } from '@/constants/client';

const skipMessages: string[] = [];

const shouldSkipError = (error: Error | SkipSentryError | undefined) => {
  if (!error) {
    return false;
  }

  for (const message of skipMessages) {
    if (error?.message?.toLowerCase()?.includes(message?.toLowerCase())) {
      return true;
    }
  }

  return false;
};

export class SentryService {
  static isDev = process.env.NODE_ENV === 'development';
  static instance: SentryService;

  static async init() {
    const integrations: any[] = [];
    const options: Options = {
      dsn: 'https://df8cca2e1d0f4ed2b5677fd2fc1cff19@o396806.ingest.sentry.io/5625932',
      integrations,
      release: process.env.COMMIT_SHA,
      attachStacktrace: true,
      environment: ClientConstants.nodeEnv
    };

    // When we're developing locally
    if (!ClientConstants.isProd) {
      // Don't actually send the errors to Sentry
      options.beforeSend = () => null;
    }

    if (process.env.NEXT_IS_SERVER === 'true' && process.env.NEXT_PUBLIC_SENTRY_SERVER_ROOT_DIR) {
      // For Node.js, rewrite Error.stack to use relative paths, so that source
      // maps starting with ~/_next map to files in Error.stack with path
      // app:///_next
      integrations.push(
        new RewriteFrames({
          iteratee: (frame) => {
            frame.filename = frame.filename?.replace(
              process.env.NEXT_PUBLIC_SENTRY_SERVER_ROOT_DIR as string,
              'app:///'
            );
            frame.filename = frame.filename?.replace('.next', '_next');
            return frame;
          }
        })
      );
    } else {
      if (ClientConstants.isProd) {
        integrations.push(new SentryFullStory('notion-viz'));
      }

      integrations.push(new Integrations.BrowserTracing());
      options.tracesSampleRate = 1;
    }

    try {
      Sentry.init(options);
    } catch (error) {
      console.error(error);
    }
  }

  // Returns the event id
  static captureException(
    error: Error,
    {
      skipSentry,
      ...ctx
    }: CaptureContext & {
      skipSentry?: boolean;
    } = {}
  ) {
    if (skipSentry || (error as SkipSentryError)?.shouldSkipSentry || shouldSkipError(error)) {
      return null;
    }

    return Sentry.captureException(error, ctx);
  }

  static captureMessage(message: string, ctx?: CaptureContext) {
    Sentry.captureMessage(message, ctx);
  }

  static addBreadcrumb(breadcrumb: Breadcrumb) {
    Sentry.addBreadcrumb(breadcrumb);
  }

  static withScope(callback: (scope: Scope) => void) {
    Sentry.withScope(callback);
  }

  static setUser(id: string, email: string) {
    Sentry.setUser({
      id,
      email
    });
  }
}

const SentryLogSeverity = Sentry.Severity;

export { SentryLogSeverity };
