export type LegalDocumentKey = 'terms' | 'privacy';

export type LegalSection = {
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

export type LegalDocument = {
  title: string;
  shortTitle: string;
  effectiveDate: string;
  introduction: string;
  sections: LegalSection[];
};

export const legalDocuments: Record<LegalDocumentKey, LegalDocument> = {
  terms: {
    title: 'Terms of Use',
    shortTitle: 'Terms',
    effectiveDate: '27 July 2026',
    introduction:
      'These Terms govern your use of CGH Mobile, an unofficial, independently developed, read-only companion for viewing information available through the CGH SchoolAutomate student portal.',
    sections: [
      {
        title: '1. Unofficial application',
        paragraphs: [
          'CGH Mobile is not an official application of CGH, SchoolAutomate, or their service providers. The project is not sponsored, endorsed, operated, or guaranteed by those organizations.',
          'Names, portal content, student records, and related marks remain the property of their respective owners. The official SchoolAutomate portal remains the authoritative service.',
        ],
      },
      {
        title: '2. Read-only and limited functionality',
        paragraphs: [
          'The app is intentionally limited to presenting selected records in a mobile-friendly format. It does not replace the official portal and must not be treated as an official enrollment, accounting, or academic document.',
        ],
        bullets: [
          'Personal information summary',
          'Subjects enrolled and enrolled load schedule',
          'Ledger and periodic dues',
          'Curriculum checklist and progress summary',
          'On-device offline copies of previously retrieved records',
        ],
      },
      {
        title: '3. Actions the app does not perform',
        paragraphs: [
          'CGH Mobile does not enroll or drop subjects, submit forms, change personal information, post payments, issue receipts, modify grades, certify records, or perform other write operations against the portal.',
          'For corrections, payments, enrollment changes, official copies, or time-sensitive transactions, use the official portal or contact the appropriate school office.',
        ],
      },
      {
        title: '4. Account authorization',
        paragraphs: [
          'You may sign in only with an account that belongs to you or that you are expressly authorized to access. You are responsible for maintaining the confidentiality of your student ID, password, device, and active session.',
          'You must not use the app to access another person’s records, bypass portal restrictions, overload the service, automate abusive requests, or violate applicable school policies.',
        ],
      },
      {
        title: '5. Portal availability and changes',
        paragraphs: [
          'The app depends on pages and responses provided by the official SchoolAutomate portal. Portal maintenance, layout changes, authentication changes, outages, network restrictions, or policy changes may cause some or all features to stop working without notice.',
          'The maintainer is not responsible for maintaining compatibility with every future portal change and may limit, modify, suspend, or remove functionality at any time.',
          'Installed Android builds may check GitHub-hosted, cryptographically signed software updates. JavaScript updates are verified before installation, while native changes require a newly signed APK.',
        ],
      },
      {
        title: '6. Accuracy and stale information',
        paragraphs: [
          'The app reformats data received from the portal. Parsing errors, delayed updates, incomplete pages, cached records, or network failures may produce missing, outdated, or incorrectly grouped information.',
          'Always confirm important schedules, balances, dues, enrollment details, and academic requirements through the official portal or school office. Offline records are clearly secondary copies and may not reflect recent changes.',
        ],
      },
      {
        title: '7. No warranties',
        paragraphs: [
          'The app is provided “as is” and “as available,” without warranties of availability, accuracy, fitness for a particular purpose, non-infringement, uninterrupted operation, or compatibility with the official portal.',
          'No statement in the app guarantees that a displayed balance, course status, checklist result, or personal record is complete or official.',
        ],
      },
      {
        title: '8. Limitation of liability',
        paragraphs: [
          'To the extent permitted by applicable law, the project maintainer is not liable for portal changes, service interruptions, incorrect or stale records, missed schedules or deadlines, account access problems, device loss, local cache exposure, or decisions made using information displayed by the app.',
          'You remain responsible for verifying important information and protecting your account and device. Nothing in these Terms excludes liability that cannot legally be excluded.',
        ],
      },
      {
        title: '9. Changes to these Terms',
        paragraphs: [
          'These Terms may be updated when features, data handling, or portal integration changes. The effective date shown at the top identifies the current version. Continued use after an update means you accept the revised Terms.',
        ],
      },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    shortTitle: 'Privacy',
    effectiveDate: '27 July 2026',
    introduction:
      'This Privacy Policy summarizes the limited information needed to provide CGH Mobile’s read-only student portal features.',
    sections: [
      {
        title: '1. Privacy summary',
        paragraphs: [
          'CGH Mobile does not use advertising, behavioral analytics, or a maintainer-operated student database. The maintainer does not sell your information.',
          'Your password is used only to sign in and is not intentionally saved by the app. Previously retrieved records may be kept on your device for offline access.',
        ],
      },
      {
        title: '2. Information used',
        paragraphs: ['The app uses only the information needed to sign in and display the records you request, which may include:'],
        bullets: [
          'Student ID and password during sign-in',
          'Profile and personal information shown by the portal',
          'Subjects, schedules, units, and curriculum checklist records',
          'Ledger balances, payment records, and periodic dues',
        ],
      },
      {
        title: '3. Sign-in information',
        paragraphs: [
          'Your Student ID and password are used to authenticate with the official student portal. The app does not intentionally retain your password after authentication.',
        ],
      },
      {
        title: '4. Offline records',
        paragraphs: [
          'The app may save previously retrieved records on your device so they remain available when the network or portal is unavailable. These records may include profile, academic, checklist, and financial information.',
          'You can remove locally saved records by clearing the app’s storage or uninstalling the app.',
        ],
      },
      {
        title: '5. Sharing',
        paragraphs: [
          'The app communicates with the official student portal to authenticate your account and retrieve the records you request. It does not intentionally sell your information or share it with advertisers.',
          'The Android app may use encrypted DNS to resolve portal or update service domains when a network provider’s DNS is unavailable or returns an unusable result. DNS requests contain the domain being resolved, not your portal password or retrieved student records.',
          'The app may contact public GitHub-hosted files to check for and download signed software updates. Student credentials and retrieved school records are not included in those update requests.',
        ],
      },
      {
        title: '6. Your choices',
        paragraphs: [
          'You may choose not to sign in and may sign out at any time. For changes to official school records, contact the appropriate school office or official portal administrator.',
        ],
      },
      {
        title: '7. Policy updates',
        paragraphs: [
          'This Policy may be updated when the app’s features or data handling change. The effective date identifies the current version.',
        ],
      },
    ],
  },
};
