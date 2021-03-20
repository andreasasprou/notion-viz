import { envConstants } from '@/constants/utils';

const { nodeEnv, isDev, isPreview, isProd, isTest, vercelEnv } = envConstants;

export const ClientConstants = {
  nodeEnv,
  isDev,
  isPreview,
  isProd,
  isTest,
  vercelEnv
};
