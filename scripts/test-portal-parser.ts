import assert from 'node:assert/strict';
import { parseModuleHtml } from '../src/utils/portalParser';

const subjects = parseModuleHtml(
  'subjects',
  table(`
    <tr><td>ENROLLED SY-TERM: 2025-2026-SUMMER</td></tr>
    <tr><td>MAXIMUM UNITS FOR THIS SEMESTER : 9.0</td><td>TOTAL UNITS LOAD TAKEN : 2.0</td></tr>
    <tr><td>SUBJECT CODE</td><td>SUBJECT TITLE</td><td>LEC/LAB UNITS</td><td>TOTAL UNITS</td><td>FACULTY ASSIGNED</td></tr>
    <tr><td>PT-101</td><td>PHYSICAL THERAPY</td><td>2.0/0.0</td><td>2.0</td><td>Faculty</td></tr>
  `),
);
assert.equal(subjects.summary['ENROLLED SY-TERM'], '2025-2026-SUMMER');
assert.equal(subjects.summary['SUBJECT CODE'], undefined);
assert.deepEqual(subjects.tables[0].rows[0], ['PT-101', 'PHYSICAL THERAPY', '2.0/0.0', '2.0', 'Faculty']);

const schedule = parseModuleHtml(
  'schedule',
  table(`
    <tr><td>SUBJECT CODE</td><td>SUBJECT NAME</td><td>SCHEDULE</td><td>SECTION &amp; ROOM #</td><td>LEC/LAB. UNITS</td><td>TOTAL UNITS</td><td>FACULTY ASSIGNED</td></tr>
    <tr><td>PT-101</td><td>PHYSICAL THERAPY</td><td>MF 9:00AM</td><td>2A/TBA</td><td>2.0/0.0</td><td>2.0</td><td>Faculty</td></tr>
    <tr><td colspan="7">TOTAL LOAD UNITS : 2.0</td></tr>
  `),
);
assert.equal(schedule.summary['SUBJECT CODE'], undefined);
assert.equal(schedule.summary['TOTAL LOAD UNITS'], '2.0');
assert.equal(schedule.tables[0].rows[0][0], 'PT-101');
assert.equal(schedule.tables[0].rows[0][1], 'PHYSICAL THERAPY');

const ledger = parseModuleHtml(
  'ledger',
  table(`
    <tr><td>Student ID : 000000001</td><td>Course/Major : BSPT</td></tr>
    <tr><td>DATE</td><td>PARTICULARS</td><td>COLLECTED BY (ID)</td><td>DEBIT</td><td>CREDIT</td><td>BALANCE</td></tr>
    <tr><td></td><td colspan="4">OLD ACCOUNTS</td><td>1,000.00</td></tr>
    <tr><td>01/01/2026</td><td>Tuition Fee</td><td></td><td>500.00</td><td></td><td>1,500.00</td></tr>
  `),
);
assert.deepEqual(ledger.tables[0].rows[0], ['', 'OLD ACCOUNTS', '', '', '', '1,000.00']);
assert.deepEqual(ledger.tables[0].rows[1], ['01/01/2026', 'Tuition Fee', '', '500.00', '', '1,500.00']);

const checklist = parseModuleHtml(
  'checklist',
  `<table><tr><td><table>
    <tr><td></td><td>Student name</td><td>Preview Person</td><td>Year</td><td>2nd Year</td></tr>
    <tr><td></td><td>SUBJECT CODE</td><td>SUBJECT DESC</td><td>TOTAL UNIT</td><td>CREDIT EARNED</td><td>REMARK</td></tr>
    <tr><td></td><td colspan="5">1st Year, 1st Sem</td></tr>
    <tr><td></td><td>PT-101</td><td>PHYSICAL THERAPY</td><td>2.0(Unit)</td><td>2</td><td>Passed</td></tr>
  </table></td></tr></table>`,
);
assert.equal(checklist.summary['Student name'], 'Preview Person');
assert.deepEqual(checklist.tables[0].rows[0], ['1st Year, 1st Sem', 'PT-101', 'PHYSICAL THERAPY', '2.0(Unit)', '2', 'Passed']);

const genericFallback = parseModuleHtml(
  'ledger',
  table(`
    <tr><td>Name</td><td>Address</td><td>Telephone</td></tr>
    <tr><td>Preview Contact</td><td>Preview City</td><td>0000000</td></tr>
  `),
);
assert.equal(genericFallback.tables[0].title, 'Contact Records');
assert.doesNotMatch(genericFallback.tables[0].title, /^Table \d+$/i);

const personal = parseModuleHtml(
  'personalInfo',
  table(`
    <tr><td>COURSE</td><td>Physical Therapy</td></tr>
    <tr><td>I A – PERSONAL DATA</td></tr>
    <tr><td>Last Name</td><td>First Name</td><td>Middle Name</td></tr>
    <tr><td>STUDENT</td><td>PREVIEW</td><td></td></tr>
    <tr><td>Gender</td><td>Religion</td><td>Nationality</td></tr>
    <tr><td>Female</td><td>Christian</td><td>Filipino</td></tr>
    <tr><td>I B – ALIEN STATUS DATA</td></tr>
    <tr><td>Not applicable</td></tr>
    <tr><td>II – RESIDENCE DATA</td></tr>
    <tr><td>Home Address:</td></tr>
    <tr><td>City/Municipality</td><td>Province/State</td></tr>
    <tr><td>Preview City</td><td>Preview Province</td></tr>
    <tr><td>Current Contact Address:</td></tr>
    <tr><td>Contact Person/Guardian Name</td><td>Relation</td></tr>
    <tr><td>Preview Guardian</td><td>Parent</td></tr>
    <tr><td>Emergency Contact Address:</td></tr>
    <tr><td>Contact Person Name</td><td>Relation</td></tr>
    <tr><td>Emergency Person</td><td>Parent</td></tr>
    <tr><td>III – PHYSICAL DESCRIPTION</td></tr>
    <tr><td>Height(cms)</td><td>Weight(lbs)</td></tr>
    <tr><td>160</td><td>110</td></tr>
    <tr><td>IV– FAMILY DATA</td></tr>
    <tr><td>Father’s Name</td><td>Occupation</td></tr>
    <tr><td>Preview Father</td><td>Teacher</td></tr>
    <tr><td>V– EDUCATIONAL BACKGROUND</td></tr>
    <tr><td></td><td>NAME</td><td>COURSE/YEAR GRADUATED</td><td>HONORS/AWARDS</td></tr>
    <tr><td>High School</td><td>Preview School</td><td>2025</td><td>Honors</td></tr>
    <tr><td>VI– GENERAL QUALIFICATION</td></tr>
    <tr><td>Languages:</td><td>English</td></tr>
    <tr><td>VII– REFERENCES</td></tr>
    <tr><td>NAME</td><td>ADDRESS/TEL. NOS.</td></tr>
    <tr><td>Preview Reference</td><td>00000000000</td></tr>
  `),
);
const personalData = personal.infoSections?.find((section) => section.id === 'personal');
assert.equal(personalData?.fields['Last Name'], 'STUDENT');
assert.equal(personalData?.fields['First Name'], 'PREVIEW');
assert.equal(personal.summary.MAJOR, undefined);
assert.ok((personal.infoSections?.length ?? 0) >= 6);

console.log('PARSER_TESTS_OK');

function table(rows: string) {
  return `<html><head><title>Fixture</title></head><body><table>${rows}</table></body></html>`;
}
