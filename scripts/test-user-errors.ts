import assert from 'node:assert/strict';
import { PortalRequestError } from '../src/services/cghPortal';
import {
  portalUserMessage,
  updateUserMessage,
} from '../src/utils/userErrors';
import {
  hasLoginFieldErrors,
  validateLoginInput,
} from '../src/utils/loginValidation';

const rawNetworkError = new Error(
  'fetch failed: java.net.UnknownHostException: Unable to resolve host "automate.cghc.edu.ph"',
);
const networkMessage = portalUserMessage(rawNetworkError, 'login');
assert.equal(
  networkMessage,
  'We couldn’t connect to the CGH portal. Check your internet connection and try again.',
);
assert.doesNotMatch(networkMessage, /java|unknownhost|hostname|automate|fetch/i);

assert.equal(
  portalUserMessage(
    new PortalRequestError('PORTAL_AUTHENTICATION', 'internal authentication detail'),
    'login',
  ),
  'The Student ID or password was not accepted. Check your details and try again.',
);
assert.equal(
  portalUserMessage(
    new PortalRequestError('PORTAL_STUDENT_ID', 'raw portal response'),
    'login',
  ),
  'That Student ID was not recognized. Check the number and try again.',
);
assert.equal(
  portalUserMessage(
    new PortalRequestError('PORTAL_PASSWORD', 'raw portal response'),
    'login',
  ),
  'The password was not accepted. Check it and try again.',
);
assert.equal(
  portalUserMessage(
    new PortalRequestError('PORTAL_TIMEOUT', 'internal timeout detail'),
    'records',
  ),
  'The CGH portal is taking too long to respond. Please try again shortly.',
);
assert.equal(
  portalUserMessage(new Error('sensitive implementation detail'), 'records'),
  'We couldn’t load this record right now. Please try again.',
);
assert.equal(
  portalUserMessage(rawNetworkError, 'login', true),
  'You appear to be offline. Connect to the internet and try signing in again.',
);

const updateMessage = updateUserMessage(
  new Error('HTTP 502 from private/internal/update/path'),
  'check',
);
assert.equal(
  updateMessage,
  'We couldn’t check for updates right now. Please try again later.',
);
assert.doesNotMatch(updateMessage, /502|private|internal|path/i);

assert.deepEqual(validateLoginInput('', ''), {
  studentId: 'Enter your Student ID.',
  password: 'Enter your password.',
});
assert.deepEqual(validateLoginInput('student-name', 'password'), {
  studentId: 'Use the 6–12 digit Student ID issued by your school.',
});
assert.deepEqual(validateLoginInput('12345', 'password'), {
  studentId: 'Use the 6–12 digit Student ID issued by your school.',
});
assert.deepEqual(validateLoginInput(' 123456789 ', 'password'), {});
assert.equal(hasLoginFieldErrors(validateLoginInput('', 'password')), true);
assert.equal(hasLoginFieldErrors(validateLoginInput('123456789', 'password')), false);

console.log('USER_ERROR_TESTS_OK');
