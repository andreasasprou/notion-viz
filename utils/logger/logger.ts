import { isRunningOnServerSide } from '@/shared';

import { ILogger } from './logger.types';

export const Logger: ILogger = (() => {
  if (isRunningOnServerSide()) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('./logger.server').default;
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('./logger.browser').default;
})();
