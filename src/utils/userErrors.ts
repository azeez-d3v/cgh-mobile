export type PortalErrorContext = 'login' | 'records';
export type UpdateErrorContext = 'check' | 'install' | 'restart';

type ErrorWithCode = {
  code?: unknown;
  message?: unknown;
};

export function portalUserMessage(
  error: unknown,
  context: PortalErrorContext,
  isOffline = false,
) {
  if (isOffline) {
    return context === 'login'
      ? 'You appear to be offline. Connect to the internet and try signing in again.'
      : 'You appear to be offline. Reconnect and try loading this record again.';
  }

  const code = readCode(error);
  if (code === 'PORTAL_AUTHENTICATION') {
    return 'The Student ID or password was not accepted. Check your details and try again.';
  }
  if (code === 'PORTAL_TIMEOUT') {
    return 'The CGH portal is taking too long to respond. Please try again shortly.';
  }
  if (code === 'PORTAL_NETWORK') {
    return 'We couldn’t connect to the CGH portal. Check your internet connection and try again.';
  }
  if (code === 'PORTAL_UNAVAILABLE') {
    return 'The CGH portal is temporarily unavailable. Please try again later.';
  }

  // Handle errors from older cached bundles or platform networking layers
  // without ever returning their raw, potentially technical message.
  const message = readMessage(error);
  if (
    /unknownhost|unable to resolve host|fetch failed|network request failed|failed to connect|connection (?:refused|reset)|enotfound|econn|socket|unable to reach/i.test(
      message,
    )
  ) {
    return 'We couldn’t connect to the CGH portal. Check your internet connection and try again.';
  }
  if (/timed out|timeout|aborted/i.test(message)) {
    return 'The CGH portal is taking too long to respond. Please try again shortly.';
  }
  if (/invalid|incorrect|not accepted|check the username|check your details|password/i.test(message)) {
    return 'The Student ID or password was not accepted. Check your details and try again.';
  }

  return context === 'login'
    ? 'Sign-in couldn’t be completed right now. Please try again.'
    : 'We couldn’t load this record right now. Please try again.';
}

export function updateUserMessage(_error: unknown, context: UpdateErrorContext) {
  switch (context) {
    case 'check':
      return 'We couldn’t check for updates right now. Please try again later.';
    case 'install':
      return 'The update couldn’t be downloaded or verified. Please try again.';
    case 'restart':
      return 'Please close and reopen the app to finish applying the update.';
  }
}

function readCode(error: unknown) {
  if (!error || typeof error !== 'object') return '';
  const code = (error as ErrorWithCode).code;
  return typeof code === 'string' ? code : '';
}

function readMessage(error: unknown) {
  if (!error || typeof error !== 'object') return '';
  const message = (error as ErrorWithCode).message;
  return typeof message === 'string' ? message : '';
}
