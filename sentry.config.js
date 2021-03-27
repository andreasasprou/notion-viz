const SentryWebpackPlugin = require('@sentry/webpack-plugin');

const {
    NODE_ENV,
    COMMIT_SHA,
} = process.env;

const isProductionBuild = NODE_ENV === 'production' && COMMIT_SHA;

module.exports = (config, { isServer, webpack } = {}) => {
    // When all the Sentry configuration env variables are available/configured
    // The Sentry webpack plugin gets pushed to the webpack plugins to build
    // and upload the source maps to sentry.
    // This is an alternative to manually uploading the source maps
    // Note: This is disabled in development mode.

    if (COMMIT_SHA && isProductionBuild) {
        config.devtool = 'cheap-source-map';

        for (const plugin of config.plugins) {
            if (plugin.constructor.name === 'UglifyJsPlugin') {
                plugin.options.sourceMap = true;
                break;
            }
        }

        if (config.optimization && config.optimization.minimizer) {
            for (const plugin of config.optimization.minimizer) {
                if (plugin.constructor.name === 'TerserPlugin') {
                    plugin.options.sourceMap = true;
                    break;
                }
            }
        }

        config.plugins.push(
            new SentryWebpackPlugin({
                include: '.next',
                ignore: ['node_modules'],
                stripPrefix: ['webpack://_N_E/'],
                urlPrefix: `~/_next`,
                release: COMMIT_SHA,
                org: 'notion-viz',
                project: 'web',
            }),
        );
    }

    // https://github.com/vercel/next.js/blob/canary/examples/with-sentry/next.config.js
    // Replace @sentry/node imports with @sentry/react when
    // building the browser's bundle
    if (!isServer) {
        config.resolve.alias['@sentry/node'] = '@sentry/react';
    }

    if (webpack) {
        // Define an environment variable so source code can check whether or not
        // it's running on the server so we can correctly initialize Sentry
        config.plugins.push(
            new webpack.DefinePlugin({
                'process.env.NEXT_IS_SERVER': JSON.stringify(isServer.toString()),
            }),
        );
    }

    return config;
};
