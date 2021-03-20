import { IErrorObject, IErrorObjectStringifiable, ILogObject, Logger as TSLogger } from 'tslog';

import { ClientConstants } from '@/constants/client';

import { SentryService } from './sentry';
import { getSentryUrlForEventId } from './sentry.utils';

function persistLogsImpl(logObject: ILogObject) {
  const filePathWithoutDistPath = logObject.filePath?.split(':') ?? [];

  const payload: Partial<ILogObject> & {
    level: ILogObject['logLevel'];
    error?: Error;
    errorInfo?: IErrorObject;
    message?: string;
    arguments: ILogObject['argumentsArray'];
    errorId?: string;
  } = {
    level: logObject.logLevel,
    hostname: logObject.hostname,
    functionName: logObject.functionName,
    typeName: logObject.typeName,
    instanceName: logObject.instanceName,
    filePath: filePathWithoutDistPath.length >= 1 ? filePathWithoutDistPath[1] : logObject.filePath,
    arguments: logObject.argumentsArray
  };

  const firstArg = payload.arguments.shift();

  if (logObject.logLevel === 'error') {
    if (typeof firstArg === 'string') {
      payload.error = new Error(firstArg);
    } else {
      payload.error = (firstArg as IErrorObjectStringifiable)?.nativeError;
    }

    const errorId = payload.error ? SentryService.captureException(payload.error) : undefined;

    if (ClientConstants.isProd && payload.error?.stack) {
      payload.error.stack = undefined;
    }

    if (errorId) {
      payload.errorId = getSentryUrlForEventId(errorId);
    }

    payload.message = payload.error?.message ?? 'undefined-error';
  } else {
    payload.message = firstArg as any;
  }

  if (typeof payload.message !== 'string') {
    payload.message = JSON.stringify(payload.message);
  }

  try {
    const { message: msg, ...rest } = payload;

    // logzIOLogger.log({
    //   message: msg ?? 'empty',
    //   ...rest
    // });
  } catch (error) {
    console.error(error);
  }
}

const persistLogs = (logObject: ILogObject) => {
  if (logObject.logLevel === 'debug') {
    return;
  }

  try {
    // Prevent from throwing an error. We don't want logs to crash the app.
    persistLogsImpl(logObject);
  } catch (error) {
    console.log('LOG ERROR');
    console.error(error);
    SentryService.captureException(error);
  }
};

const baseLogger = () => {
  const tsLogger = new TSLogger({
    dateTimePattern:
      process.env.NODE_ENV === 'production'
        ? 'year-month-day hour:minute:second.millisecond'
        : 'hour:minute:second.millisecond',
    displayFunctionName: false,
    displayFilePath: 'hidden',
    displayRequestId: false,
    dateTimeTimezone:
      process.env.NODE_ENV === 'production'
        ? 'utc'
        : Intl.DateTimeFormat().resolvedOptions().timeZone,
    prettyInspectHighlightStyles: {
      name: 'yellow',
      number: 'blue',
      bigint: 'blue',
      boolean: 'blue'
    },
    exposeErrorCodeFrame: ClientConstants.isDev,
    /**
     * @see https://tslog.js.org/#/README?id=log-level
     */
    minLevel:
      process.env.TEST === 'true'
        ? 'info'
        : process.env.NODE_ENV === 'development'
        ? 'silly'
        : // production
          'info'
  });

  tsLogger.attachTransport(
    {
      silly: persistLogs,
      debug: persistLogs,
      trace: persistLogs,
      info: persistLogs,
      warn: persistLogs,
      error: persistLogs,
      fatal: persistLogs
    },
    'debug'
  );

  return tsLogger;
};

const logger = baseLogger();

export default logger;
