import * as Sentry from '@sentry/node';

/**
 * Split the URL into different parts
 * taken from https://stackoverflow.com/questions/736513/how-do-i-parse-a-url-into-hostname-and-path-in-javascript
 * @param {string} url
 */
const splitUrlIntoParts = (url: string) => {
  const reURLInformation = new RegExp(
    [
      '^(https?:)//', // protocol
      '(([^:/?#]*)(?::([0-9]+))?)', // host (hostname and port)
      '(/{0,1}[^?#]*)', // pathname
      '(\\?[^#]*|)', // search
      '(#.*|)$' // hash
    ].join('')
  );
  return url.match(reURLInformation);
};

/**
 * Get the project ID from a Sentry DSN
 * @param {string} dsn
 */
const getProjectIdFromSentryDsn = (dsn: string) => {
  const parts = splitUrlIntoParts(dsn);
  if (!parts) {
    throw new Error('Cannot parse DSN');
  }
  return parts[5].replace('/', '');
};

export const getSentryUrlForEventId = (eventId: string) => {
  try {
    //No docs on this but the SDK team assures me it works unless you bind another Sentry client
    const { dsn } = Sentry.getCurrentHub().getClient()?.getOptions() || {};
    if (!dsn) {
      console.error('No sn');
      return 'Could not retrieve url';
    }

    const projectId = getProjectIdFromSentryDsn(dsn);

    return `https://sentry.io/organizations/notion-viz/issues/?project=${projectId}&query=${eventId}`;
  } catch (err) {
    console.error('Error retrieving project ID from DSN', err);
    //TODO: Could put link to a help here
    return 'Could not retrieve url';
  }
};
