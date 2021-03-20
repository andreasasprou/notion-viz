import logger, { TRACE } from 'universal-logger';
import { styleable } from 'universal-logger-browser';

import { ClientConstants } from '@/constants/client';

const log = logger().use(
  styleable({
    showTimestamp: true
  })
);

if (ClientConstants.isDev || ClientConstants.isTest || ClientConstants.isPreview) {
  log.enableStackTrace();
}

log.setLevel(TRACE);

export default log;
