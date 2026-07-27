import assert from 'node:assert/strict';
import {
  CghPortalClient,
  PortalRequestError,
} from '../src/services/cghPortal';

const username = process.env.CGH_USERNAME?.trim();
const password = process.env.CGH_PASSWORD;

if (!username || !password) {
  console.error('Missing CGH_USERNAME or CGH_PASSWORD environment variables.');
  process.exit(1);
}

async function expectLoginCode(
  scenario: string,
  candidateUsername: string,
  candidatePassword: string,
  expectedCode: PortalRequestError['code'],
) {
  const client = new CghPortalClient({ useWebProxy: false });
  try {
    await client.login(candidateUsername, candidatePassword);
    await client.logout();
    throw new Error(`${scenario}: credentials were unexpectedly accepted.`);
  } catch (error) {
    assert.ok(error instanceof PortalRequestError, `${scenario}: expected a typed portal error.`);
    assert.equal(error.code, expectedCode, `${scenario}: received ${error.code}.`);
    console.log('LOGIN_SCENARIO_OK', scenario, expectedCode);
  }
}

async function main() {
  await expectLoginCode(
    'unknown-student-id',
    '999999999999',
    password,
    'PORTAL_AUTHENTICATION',
  );
  await expectLoginCode(
    'wrong-password',
    username,
    `${password}-not-valid`,
    'PORTAL_AUTHENTICATION',
  );

  const client = new CghPortalClient({ useWebProxy: false });
  const student = await client.login(username, password);
  assert.ok(student.id || student.name, 'valid-login: student summary was empty.');
  console.log('LOGIN_SCENARIO_OK', 'valid-credentials');
  await client.logout();
  console.log('LOGIN_SCENARIO_OK', 'logout');
}

main().catch((error) => {
  console.error(
    'LOGIN_SCENARIO_FAILED',
    error instanceof Error ? error.message : 'Unknown failure.',
  );
  process.exit(1);
});
