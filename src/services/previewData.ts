import type { PortalModuleData, PortalModuleKey, StudentSummary } from '../types';

export const previewStudent: StudentSummary = {
  id: 'CGH-000000',
  name: 'CGH Student Preview',
  term: 'Summer, 2025-26',
  yearLevel: '2nd Year',
  course: 'BSPT',
};

export function previewModule(key: PortalModuleKey): PortalModuleData {
  const base = {
    key,
    fetchedAt: new Date().toISOString(),
    rawText: 'Preview data for visual design only.',
  };

  switch (key) {
    case 'personalInfo':
      return {
        ...base,
        title: 'General Student Personal Information Sheet',
        subtitle: 'Modern mobile view for legacy CGH portal information.',
        summary: {
          Course: 'Bachelor of Science in Physical Therapy',
          'Year Level/Term': '2nd / Summer',
          'School Year': '2025 to 2026',
          Gender: 'Female',
          Nationality: 'Filipino',
          'Mobile Number': '09•• ••• ••••',
          'Email Address': 'student@example.com',
          'Emergency Contact': 'Parent / Guardian',
        },
        infoSections: [
          {
            id: 'academic',
            title: 'Academic Profile',
            fields: {
              Course: 'Bachelor of Science in Physical Therapy',
              'Curriculum Year': '2024 to 2025',
              'Year Level / Term': '2nd / Summer',
              'School Year': '2025 to 2026',
            },
          },
          {
            id: 'personal',
            title: 'Personal Data',
            fields: {
              'Last Name': 'Student',
              'First Name': 'Preview',
              Gender: '—',
              Nationality: 'Filipino',
              'Mobile Number': '09•• ••• ••••',
              'Email Address': 'student@example.com',
            },
          },
          {
            id: 'contact',
            title: 'Contact Details',
            fields: {
              Address: 'Saved portal address',
              'Emergency Contact': 'Parent / Guardian',
              Relation: 'Guardian',
            },
          },
          {
            id: 'education',
            title: 'Education',
            fields: {},
            tables: [
              {
                title: 'Educational Background',
                headers: ['Level', 'School', 'Year'],
                rows: [['High School', 'CGH Preview School', '2024']],
              },
            ],
          },
        ],
        tables: [],
      };
    case 'subjects':
      return {
        ...base,
        title: 'Subjects Enrolled',
        subtitle: 'Enrolled SY-Term: 2025-2026-Summer',
        summary: { 'Total Units Load Taken': '2.0', 'Maximum Units': '9.0' },
        tables: [
          {
            title: 'Current Subjects',
            headers: ['Subject Code', 'Subject Title', 'Lec/Lab Units', 'Total Units', 'Faculty Assigned'],
            rows: [['PT-TECH LEC', 'Assistive Technology in PT LEC', '2.0 / 0.0', '2.0', 'Faculty Name']],
          },
        ],
      };
    case 'schedule':
      return {
        ...base,
        title: 'Enrolled Load Schedule',
        subtitle: 'Student load & schedule for Summer, SY 2025-2026',
        summary: { 'Total Load Units': '2.0' },
        tables: [
          {
            title: 'Class Schedule',
            headers: ['Subject Code', 'Subject Name', 'Schedule', 'Section & Room #', 'Units', 'Faculty'],
            rows: [['PT-TECH LEC', 'Assistive Technology in PT LEC', 'MF 9:00AM-12:00PM', '2A-BSPT / TBA', '2.0', 'Faculty Name']],
          },
        ],
      };
    case 'ledger':
      return {
        ...base,
        title: 'Student Ledger',
        subtitle: 'Statement of account preview',
        summary: { 'Student ID': 'CGH-000000', Balance: '0.00' },
        tables: [
          {
            title: 'Ledger Entries',
            headers: ['Date', 'Particulars', 'Collected By', 'Debit', 'Credit', 'Balance'],
            rows: [
              ['06/05/2026', 'Tuition Fee', '—', '916.00', '—', '916.00'],
              ['06/05/2026', 'Payment - Bank', 'Cashier', '—', '916.00', '0.00'],
            ],
          },
        ],
      };
    case 'dues':
      return {
        ...base,
        title: 'Periodic Dues',
        subtitle: 'Status: Enrolled',
        summary: { 'Last Enrolled SY-Term': 'Summer, 2025 - 26', Status: 'Enrolled' },
        tables: [{ title: 'Payment Schedule', headers: ['Payment Schedule', 'Required Amount', 'Cumulative Balance'], rows: [['Midterm', '0.00', '0.00'], ['Final', '0.00', '0.00']] }],
      };
    case 'checklist':
      return {
        ...base,
        title: 'Student Residency Evaluation',
        subtitle: 'Curriculum checklist preview',
        summary: { 'Total Units Required': '186.0', 'Total Units Taken': '99.0', Status: 'Regular' },
        tables: [
          {
            title: 'Residency Evaluation',
            headers: ['Term', 'Subject Code', 'Subject Desc', 'Total Unit', 'Credit Earned', 'Remark'],
            rows: [
              ['1st Year, 1st Sem', 'ANAPHY 101 LAB', 'Anatomy & Physiology Lab', '2.0', '2.0', 'Passed'],
              ['2nd Year, Summer', 'PT-TECH LEC', 'Assistive Technology in PT LEC', '2.0', '2.0', 'Currently Enrolled'],
            ],
          },
        ],
      };
  }
}
