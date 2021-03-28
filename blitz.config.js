const { sessionMiddleware, simpleRolesIsAuthorized } = require("blitz");

const sentryConfig = require("./sentry.config");

module.exports = {
  productionBrowserSourceMaps: true,
  middleware: [
    sessionMiddleware({
      isAuthorized: simpleRolesIsAuthorized,
    }),
  ],
  webpack: (config, options) => {
    const { buildId, dev, isServer, defaultLoaders, webpack } = options;

    config.node = {
      ...config.node,
      child_process: "empty",
      fs: "empty",
      net: "empty",
      tls: "empty",
      dns: "empty",
      dgram: "empty",
      module: "empty",
    };

    return sentryConfig(config, options);
  },
};
