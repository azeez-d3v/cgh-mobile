import { CghPortalClient, MODULES } from '../src/services/cghPortal';
import type { PortalModuleData } from '../src/types';

const username = process.env.CGH_USERNAME;
const password = process.env.CGH_PASSWORD;

if (!username || !password) {
  console.error('Missing CGH_USERNAME or CGH_PASSWORD environment variables.');
  process.exit(1);
}

const client = new CghPortalClient({ useWebProxy: false });

async function main() {
  try {
    const student = await client.login(username, password);
    console.log('LOGIN_OK', {
      id: Boolean(student.id),
      name: Boolean(student.name),
      course: Boolean(student.course),
      yearLevel: Boolean(student.yearLevel),
      term: Boolean(student.term),
    });

    for (const module of MODULES) {
      const data = await client.loadModule(module.key);
      verifyModule(data);
      const rowCount = data.tables.reduce((total, table) => total + table.rows.length, 0);
      console.log('MODULE_OK', module.key, {
        title: data.title,
        summaryFields: Object.keys(data.summary).length,
        infoSections: data.infoSections?.length ?? 0,
        tables: data.tables.length,
        rows: rowCount,
      });
    }

    await client.logout();
    console.log('LOGOUT_OK');
  } catch (error) {
    console.error('PORTAL_TEST_FAILED', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();

function verifyModule(data: PortalModuleData) {
  if (Object.keys(data.summary).some((key) => /^SUBJECT CODE$/i.test(key))) {
    throw new Error(`${data.key}: a table header leaked into the summary.`);
  }

  for (const table of data.tables) {
    if (table.rows.some((row) => row.length !== table.headers.length)) {
      throw new Error(`${data.key}: table values are not aligned with their headers.`);
    }
  }

  if (data.key === 'personalInfo') {
    const personal = data.infoSections?.find((section) => section.id === 'personal');
    if (!personal?.fields['Last Name'] || !personal.fields['First Name']) {
      throw new Error('personalInfo: first and last name fields are not aligned.');
    }
    if ((data.infoSections?.length ?? 0) < 5) throw new Error('personalInfo: GSPIS sections were not created.');
  }

  if (data.key === 'checklist') {
    const first = data.tables[0]?.rows[0];
    if (!first?.[0] || !first?.[1]) throw new Error('checklist: term or subject code is missing.');
  }
}
