export type PortalModuleKey =
  | 'personalInfo'
  | 'subjects'
  | 'schedule'
  | 'ledger'
  | 'dues'
  | 'checklist';

export type StudentSummary = {
  id?: string;
  name?: string;
  term?: string;
  yearLevel?: string;
  course?: string;
  avatarUrl?: string;
};

export type TableData = {
  title: string;
  headers: string[];
  rows: string[][];
};

export type PortalInfoSection = {
  id: string;
  title: string;
  fields: Record<string, string>;
  tables?: TableData[];
};

export type PortalModuleData = {
  key: PortalModuleKey;
  title: string;
  subtitle?: string;
  summary: Record<string, string>;
  infoSections?: PortalInfoSection[];
  tables: TableData[];
  rawText: string;
  fetchedAt: string;
  fromCache?: boolean;
  cacheReason?: string;
};

export type PortalModuleConfig = {
  key: PortalModuleKey;
  label: string;
  description: string;
  path: string;
};
