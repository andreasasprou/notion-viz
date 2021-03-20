import * as FullStory from '@fullstory/browser';

import { ClientConstants } from '@/constants/client';
import { isRunningOnServerSide } from '@/shared';

let hasInitialised = false;

if (!hasInitialised && !ClientConstants.isTest && !isRunningOnServerSide()) {
  FullStory.init({
    orgId: 'TX4WX',
    devMode: ClientConstants.isDev
  });
  hasInitialised = true;
}

export { FullStory };
