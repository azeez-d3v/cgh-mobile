import { HTMLElement, parse } from 'node-html-parser';
import type { PortalInfoSection, PortalModuleData, PortalModuleKey, StudentSummary, TableData } from '../types';

const nbsp = /\u00a0|&nbsp;/g;

export function cleanText(value?: string | null) {
  return (value ?? '')
    .replace(nbsp, ' ')
    .replace(/\r/g, '\n')
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function stripNoise(html: string) {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '');
}

function cellText(cell: HTMLElement) {
  return cleanText(cell.text).replace(/\s*\n\s*/g, ' ');
}

function directCells(row: HTMLElement) {
  const cells = row.childNodes
    .filter((node): node is HTMLElement => {
      const tag = (node as HTMLElement).rawTagName?.toLowerCase();
      return tag === 'td' || tag === 'th';
    });

  // Wrapper rows in this legacy portal frequently contain an entire nested table.
  // Reading their text duplicates every child row and can make a wrapper look like
  // the real table header.
  if (cells.some((cell) => cell.querySelector('table'))) return [];

  return cells.flatMap((cell) => {
    const value = cellText(cell).replace(/\s*\|\s*/g, ' ').trim();
    const colspan = Math.max(1, Number.parseInt(cell.getAttribute('colspan') ?? '1', 10) || 1);
    return [value, ...Array<string>(colspan - 1).fill('')];
  });
}

function extractRows(scope: HTMLElement, ownedByScope = false) {
  return scope
    .querySelectorAll('tr')
    .filter((row) => !ownedByScope || row.closest('table') === scope)
    .map(directCells)
    .map((row) => row.map((cell) => (/^\(?mm\/dd\/yyyy\)?$/i.test(cell) ? '' : cleanText(cell).replace(/\s*\n\s*/g, ' '))))
    .filter((row) => row.some(Boolean));
}

function includesCell(row: string[], label: string) {
  const needle = label.toUpperCase();
  return row.some((cell) => cell.toUpperCase().includes(needle));
}

function rowSignature(row: string[]) {
  return row.join('¦').toUpperCase();
}

function normalizeRowToHeaders(row: string[], headers: string[]) {
  const normalized = [...row];
  while (normalized.length < headers.length) normalized.push('');
  return normalized.slice(0, headers.length);
}

function findTable(root: HTMLElement, requiredHeaders: string[], title: string, options?: { stopAtTotal?: boolean }) {
  const scopes = [...root.querySelectorAll('table'), root];
  const seen = new Set<string>();

  for (const scope of scopes) {
    const rows = extractRows(scope, scope !== root);
    const signature = rows.map(rowSignature).join('\n');
    if (seen.has(signature)) continue;
    seen.add(signature);

    const headerIndex = rows.findIndex((row) => requiredHeaders.every((header) => includesCell(row, header)));
    if (headerIndex < 0) continue;

    const headerRow = rows[headerIndex];
    const firstColumn = headerRow.findIndex(Boolean);
    const lastColumn = headerRow.reduce((last, value, index) => (value ? index : last), -1);
    if (firstColumn < 0 || lastColumn < firstColumn) continue;
    const headers = headerRow.slice(firstColumn, lastColumn + 1);
    const dataRows: string[][] = [];
    for (const row of rows.slice(headerIndex + 1)) {
      const text = row.join(' ').toUpperCase();
      if (requiredHeaders.every((header) => text.includes(header))) continue;
      if (options?.stopAtTotal && text.startsWith('TOTAL ')) break;
      if (/^(PRINT|PAGE IS LOADING|SHOW LEDGER|VIEW INSTALLMENT)/i.test(text)) continue;
      if (row.length <= 1 && !/OLD ACCOUNTS|TOTAL/i.test(text)) continue;
      const aligned = row.slice(firstColumn, lastColumn + 1);
      if (aligned.some(Boolean)) dataRows.push(normalizeRowToHeaders(aligned, headers));
    }

    if (dataRows.length > 0) return { title, headers, rows: dataRows } satisfies TableData;
  }

  return null;
}

function extractTitle(root: HTMLElement, fallback: string) {
  const text = cleanText(root.text);
  const framed = text.match(/::::\s*([^:]{4,120}?)\s*::::/);
  if (framed?.[1]) return cleanText(framed[1]);
  const title = root.querySelector('title')?.text;
  return cleanText(title) || fallback;
}

function extractRawText(root: HTMLElement) {
  return cleanText(root.text)
    .split('\n')
    .map((line) => cleanText(line))
    .filter(Boolean)
    .join('\n');
}

function extractKeyValues(root: HTMLElement) {
  const pairs: Record<string, string> = {};
  const rows = extractRows(root);

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex].filter(Boolean);
    const inlinePairs = row.map(splitInlinePair).filter((pair): pair is [string, string] => Boolean(pair));
    if (inlinePairs.length >= 2 && inlinePairs.length === row.length) {
      inlinePairs.forEach(([key, value]) => addPair(pairs, key, value));
      continue;
    }

    const nextRow = rows[rowIndex + 1]?.filter(Boolean);

    if (isLabelRow(row) && nextRow && nextRow.length >= Math.min(row.length, 2) && !isLabelRow(nextRow)) {
      const count = Math.min(row.length, nextRow.length);
      for (let index = 0; index < count; index += 1) {
        addPair(pairs, row[index], nextRow[index]);
      }
      rowIndex += 1;
      continue;
    }

    if (row.length === 2) {
      const [key, value] = row;
      addPair(pairs, key, value);
      continue;
    }

    for (let index = 0; index < row.length - 1; index += 2) {
      addPair(pairs, row[index], row[index + 1]);
    }
  }

  return pairs;
}

function isLabelRow(row: string[]) {
  if (row.length < 2) return false;
  return row.every((cell) => isLikelyLabel(cell));
}

function isLikelyLabel(value: string) {
  const text = cleanText(value).replace(/:$/, '');
  if (!text || text.length > 54) return false;
  if (/^[\d.,/ -]+$/.test(text)) return false;
  if (/^(NA|N\/A|NONE|SINGLE|FEMALE|MALE|FILIPINO|CHRISTIAN)$/i.test(text)) return false;
  return /\b(name|course|major|year|term|level|gender|religion|nationality|birth|place|status|spouse|children|email|mobile|order|address|city|province|country|zipcode|telephone|contact|relation|height|weight|built|color|complexion|features|handicap|occupation|company|school|honors|awards|language|languages|hobbies|skills|talents|sports|reference|guardian|activities)\b/i.test(text);
}

function splitInlinePair(value: string): [string, string] | undefined {
  const match = cleanText(value).match(/^(.{2,48}?)\s*:\s*(.{1,120})$/);
  if (!match) return undefined;
  const key = normalizeKey(match[1]);
  const inlineValue = cleanText(match[2]);
  if (!key || !inlineValue || /^\([^)]*\)$/.test(inlineValue) || isLikelyLabel(inlineValue)) return undefined;
  return [key, inlineValue];
}

function normalizeKey(value?: string | null) {
  return cleanText(value)
    .replace(/\(?mm\/dd\/yyyy\)?/gi, '')
    .replace(/\s*:\s*\([^)]*\)\s*$/g, '')
    .replace(/\s+/g, ' ')
    .replace(/:$/, '')
    .trim();
}

function addPair(target: Record<string, string>, rawKey?: string, rawValue?: string) {
  const key = normalizeKey(rawKey);
  const value = cleanText(rawValue);
  if (!key || !value) return;
  if (key.length > 48 || value.length > 160) return;
  if (/^(SY-TERM|DATE|SUBJECT|PAYMENT|REQUIRED|CUMULATIVE|DEBIT|CREDIT|BALANCE)$/i.test(key)) return;
  if (/^[\d., -]+$/.test(key)) return;
  if (!target[key]) target[key] = value;
}

function isTableHeaderCell(value: string) {
  return /^(SUBJECT CODE|SUBJECT TITLE|SUBJECT NAME|SUBJECT DESC|SCHEDULE|SECTION & ROOM #|LEC\/LAB\.? UNITS|TOTAL UNITS?|FACULTY ASSIGNED|DATE|PARTICULARS|COLLECTED BY \(ID\)|DEBIT|CREDIT|BALANCE|PAYMENT SCHEDULE|REQUIRED AMOUNT|CUMULATIVE BALANCE|CREDIT EARNED|REMARK)$/i.test(
    cleanText(value),
  );
}

function isMetadataLabel(value: string) {
  return /student|course|major|year|term|status|total|maximum|date officially|enrolled|gwa|balance/i.test(normalizeKey(value));
}

function extractModuleSummary(root: HTMLElement, key: Exclude<PortalModuleKey, 'personalInfo'>) {
  const summary: Record<string, string> = {};
  const allRows = extractRows(root);
  const headerIndex = allRows.findIndex((row) => row.filter(Boolean).filter(isTableHeaderCell).length >= 2);
  const rows =
    key === 'schedule'
      ? allRows
      : headerIndex >= 0
        ? allRows.slice(0, headerIndex)
        : allRows;

  for (const row of rows) {
    const cells = row.filter(Boolean);
    if (cells.filter(isTableHeaderCell).length >= 2) continue;

    for (const cell of cells) {
      const pair = splitInlinePair(cell);
      if (pair && isMetadataLabel(pair[0])) addPair(summary, pair[0], pair[1]);
    }

    for (let index = 0; index < cells.length - 1; index += 1) {
      const label = cells[index];
      const value = cells[index + 1];
      const followedByAnotherPair = index + 2 >= cells.length || isMetadataLabel(cells[index + 2]);
      if (isMetadataLabel(label) && followedByAnotherPair && !isTableHeaderCell(value)) {
        addPair(summary, label, value);
        index += 1;
      }
    }
  }

  if (key === 'dues') {
    const termRow = allRows.map((row) => row.filter(Boolean)).find((row) => row.some((cell) => /Summer|Semester|Sem/i.test(cell)) && row.some((cell) => /^Status:/i.test(cell)));
    const term = termRow?.find((cell) => !/^Status:/i.test(cell));
    if (term) summary.Term = term;
  }

  return summary;
}

function findRowIndex(rows: string[][], pattern: RegExp, from = 0) {
  return rows.findIndex((row, index) => index >= from && pattern.test(row.filter(Boolean).join(' ')));
}

function extractFieldsFromRange(
  rows: string[][],
  start: number,
  end: number,
  transformLabel?: (label: string, rowIndex: number) => string,
) {
  const fields: Record<string, string> = {};

  for (let rowIndex = Math.max(0, start); rowIndex < Math.min(end, rows.length); rowIndex += 1) {
    const alignedCells = trimEmptyEdges(rows[rowIndex]);
    const cells = alignedCells.filter(Boolean);
    if (cells.length === 0) continue;
    if (cells.filter(isTableHeaderCell).length >= 2) continue;
    if (cells.length === 1 && (/^[IVX]+\s*[A-Z]?\s*[–-]/i.test(cells[0]) || /^(Parents|Brother\(s\)\/Sister\(s\)):/i.test(cells[0]))) continue;

    const inlinePairs = cells.map(splitInlinePair).filter((pair): pair is [string, string] => Boolean(pair));
    for (const [rawLabel, value] of inlinePairs) {
      const label = transformLabel?.(rawLabel, rowIndex) ?? rawLabel;
      addPair(fields, label, value);
    }

    const unpairedCells = cells.filter((cell) => !splitInlinePair(cell));
    if (unpairedCells.length === 2 && isLikelyLabel(unpairedCells[0]) && !isLikelyLabel(unpairedCells[1])) {
      const label = transformLabel?.(unpairedCells[0], rowIndex) ?? unpairedCells[0];
      addPair(fields, label, unpairedCells[1]);
      continue;
    }

    const nextColumnCells = trimLeadingEmpty(rows[rowIndex + 1] ?? []);
    const alignedLabelRow =
      alignedCells.length > 0 &&
      alignedCells.length === nextColumnCells.length &&
      alignedCells.every((cell) => !cell || isLikelyLabel(cell)) &&
      alignedCells.some(Boolean) &&
      alignedCells.every((label, index) => !label || (!isSectionHeading(nextColumnCells[index] ?? '') && !isLikelyLabel(nextColumnCells[index] ?? '')));

    if (alignedLabelRow) {
      alignedCells.forEach((rawLabel, index) => {
        if (!rawLabel) return;
        const label = transformLabel?.(rawLabel, rowIndex) ?? rawLabel;
        addPair(fields, label, nextColumnCells[index]);
      });
      rowIndex += 1;
      continue;
    }

    const nextCells = trimEmptyEdges(nextColumnCells).filter(Boolean);
    const labelsArePlausible =
      unpairedCells.length > 0 &&
      unpairedCells.every(isLikelyLabel) &&
      nextCells.length === unpairedCells.length &&
      !nextCells.some(isSectionHeading) &&
      !nextCells.every(isLikelyLabel);

    if (labelsArePlausible) {
      const count = Math.min(unpairedCells.length, nextCells.length);
      for (let index = 0; index < count; index += 1) {
        const label = transformLabel?.(unpairedCells[index], rowIndex) ?? unpairedCells[index];
        addPair(fields, label, nextCells[index]);
      }
      rowIndex += 1;
    }
  }

  return fields;
}

function trimEmptyEdges(row: string[]) {
  let start = 0;
  let end = row.length;
  while (start < end && !row[start]) start += 1;
  while (end > start && !row[end - 1]) end -= 1;
  return row.slice(start, end);
}

function trimLeadingEmpty(row: string[]) {
  const first = row.findIndex(Boolean);
  return first < 0 ? [] : row.slice(first);
}

function tableFromRows(title: string, headers: string[], rows: string[][]) {
  const normalizedRows = rows
    .map((row) => row.filter(Boolean))
    .filter((row) => row.length >= 2)
    .map((row) => normalizeRowToHeaders(row, headers));
  return normalizedRows.length > 0 ? ({ title, headers, rows: normalizedRows } satisfies TableData) : undefined;
}

function isSectionHeading(value: string) {
  return /^[IVX]+\s*[A-Z]?\s*[–-]/i.test(cleanText(value));
}

function parsePersonalInfo(root: HTMLElement) {
  const rows = extractRows(root);
  const personalStart = findRowIndex(rows, /^I\s*A\s*[–-]\s*PERSONAL DATA/i);
  const alienStart = findRowIndex(rows, /^I\s*B\s*[–-]\s*ALIEN STATUS/i, personalStart + 1);
  const residenceStart = findRowIndex(rows, /^II\s*[–-]\s*RESIDENCE DATA/i);
  const physicalStart = findRowIndex(rows, /^III\s*[–-]\s*PHYSICAL DESCRIPTION/i);
  const familyStart = findRowIndex(rows, /^IV\s*[–-]\s*FAMILY DATA/i);
  const educationStart = findRowIndex(rows, /^V\s*[–-]\s*EDUCATIONAL BACKGROUND/i);
  const qualificationsStart = findRowIndex(rows, /^VI\s*[–-]\s*GENERAL QUALIFICATION/i);
  const referencesStart = findRowIndex(rows, /^VII\s*[–-]\s*REFERENCES/i);

  const academic = extractFieldsFromRange(rows, 1, personalStart > 0 ? personalStart : rows.length);
  const personal = extractFieldsFromRange(rows, personalStart + 1, alienStart > 0 ? alienStart : residenceStart);

  const homeStart = findRowIndex(rows, /^Home Address:/i, residenceStart);
  const currentStart = findRowIndex(rows, /^Current Contact Address:/i, homeStart + 1);
  const emergencyStart = findRowIndex(rows, /^Emergency Contact Address:/i, currentStart + 1);
  const home = extractFieldsFromRange(rows, homeStart + 1, currentStart);
  const current = extractFieldsFromRange(rows, currentStart + 1, emergencyStart);
  const emergency = extractFieldsFromRange(rows, emergencyStart + 1, physicalStart);
  const physical = extractFieldsFromRange(rows, physicalStart + 1, familyStart);

  const siblingHeader = findRowIndex(rows, /NAME.*DATE OF BIRTH.*COURSE\/OCCUPATION.*SCHOOL\/COMPANY/i, familyStart);
  let familyContext = 'Father';
  const family = extractFieldsFromRange(rows, familyStart + 1, siblingHeader >= 0 ? siblingHeader : educationStart, (label) => {
    if (/Mother/i.test(label)) familyContext = 'Mother';
    if (/Father/i.test(label)) familyContext = 'Father';
    if (/^(Occupation|Company Name|Company Address|Telephone Nos\.)$/i.test(label)) return `${familyContext} ${label}`;
    return label;
  });

  const siblingRows =
    siblingHeader >= 0
      ? rows.slice(siblingHeader + 1, educationStart).filter((row) => {
          const cells = row.filter(Boolean);
          return cells.length >= 4 && !/^[IVX]+\s*[–-]/i.test(cells.join(' '));
        })
      : [];
  const siblings = tableFromRows('Siblings', ['Name', 'Date of Birth', 'Course / Occupation', 'School / Company'], siblingRows);

  const educationHeader = findRowIndex(rows, /NAME.*COURSE\/YEAR GRADUATED.*HONORS\/AWARDS/i, educationStart);
  const educationRows =
    educationHeader >= 0
      ? rows.slice(educationHeader + 1, qualificationsStart).filter((row) => /^(Elementary|High School|College|Post Graduate|Vocational)\b/i.test(row.filter(Boolean)[0] ?? ''))
      : [];
  const education = tableFromRows('Educational Background', ['Level', 'School Name', 'Course / Year Graduated', 'Honors / Awards'], educationRows);

  const qualifications = extractFieldsFromRange(rows, qualificationsStart + 1, referencesStart);
  const referencesHeader = findRowIndex(rows, /NAME.*ADDRESS\/TEL\. NOS\./i, referencesStart);
  const referenceRows = referencesHeader >= 0 ? rows.slice(referencesHeader + 1).filter((row) => row.filter(Boolean).length >= 2) : [];
  const references = tableFromRows('References', ['Name', 'Address / Telephone'], referenceRows);

  const sections: PortalInfoSection[] = [
    { id: 'academic', title: 'Academic Profile', fields: academic },
    { id: 'personal', title: 'Personal Data', fields: personal },
    { id: 'home', title: 'Home Address', fields: home },
    { id: 'current-contact', title: 'Current Contact', fields: current },
    { id: 'emergency', title: 'Emergency Contact', fields: emergency },
    { id: 'physical', title: 'Physical Description', fields: physical },
    { id: 'family', title: 'Family', fields: family, tables: siblings ? [siblings] : undefined },
    { id: 'education', title: 'Education', fields: {}, tables: education ? [education] : undefined },
    { id: 'qualifications', title: 'Qualifications', fields: qualifications },
    { id: 'references', title: 'References', fields: {}, tables: references ? [references] : undefined },
  ].filter((section) => Object.keys(section.fields).length > 0 || (section.tables?.length ?? 0) > 0);

  return { summary: academic, infoSections: sections };
}

function extractGenericTables(root: HTMLElement, key: Exclude<PortalModuleKey, 'personalInfo'>, maxTables = 3) {
  const tables: TableData[] = [];
  const seen = new Set<string>();

  for (const table of root.querySelectorAll('table')) {
    const rows = extractRows(table).filter((row) => row.length >= 2);
    if (rows.length < 2) continue;
    const signature = rows.map(rowSignature).join('\n');
    if (seen.has(signature)) continue;
    seen.add(signature);

    const headers = rows[0].map((cell, index) => cell || `Column ${index + 1}`);
    const dataRows = rows.slice(1).map((row) => normalizeRowToHeaders(row, headers));
    if (headers.join(' ').length < 3 || dataRows.length === 0) continue;
    tables.push({ title: inferGenericTableTitle(headers, key), headers, rows: dataRows });
    if (tables.length >= maxTables) break;
  }

  return tables;
}

function inferGenericTableTitle(headers: string[], key: Exclude<PortalModuleKey, 'personalInfo'>) {
  const text = headers.join(' ').toLowerCase();
  if (/subject/.test(text) && /schedule|room/.test(text)) return 'Class Schedule';
  if (/subject/.test(text)) return key === 'checklist' ? 'Curriculum Courses' : 'Course Records';
  if (/payment|required amount|cumulative/.test(text)) return 'Payment Schedule';
  if (/date/.test(text) && /debit|credit|balance/.test(text)) return 'Account Activity';
  if (/name/.test(text) && /address|telephone/.test(text)) return 'Contact Records';
  return `${moduleFallbackTitle(key)} Details`;
}

function parseChecklist(root: HTMLElement) {
  const scopes = [...root.querySelectorAll('table'), root];
  const requiredHeaders = ['SUBJECT CODE', 'SUBJECT DESC', 'TOTAL UNIT', 'CREDIT EARNED', 'REMARK'];

  for (const scope of scopes) {
    const rows = extractRows(scope, scope !== root);
    const headerIndex = rows.findIndex((row) => requiredHeaders.every((header) => includesCell(row, header)));
    if (headerIndex < 0) continue;

    const headerRow = rows[headerIndex];
    const firstColumn = headerRow.findIndex((cell) => /SUBJECT CODE/i.test(cell));
    const lastColumn = headerRow.findIndex((cell) => /REMARK/i.test(cell));
    if (firstColumn < 0 || lastColumn < firstColumn) continue;

    const baseHeaders = headerRow.slice(firstColumn, lastColumn + 1);
    const headers = ['Term', ...baseHeaders];
    const dataRows: string[][] = [];
    let term = '';

    for (const row of rows.slice(headerIndex + 1)) {
      const aligned = row.slice(firstColumn, lastColumn + 1);
      const populated = aligned.filter(Boolean);
      const text = populated.join(' ');
      const upper = text.toUpperCase();

      if (populated.length === 1 && /^(?:\d+(?:ST|ND|RD|TH) YEAR|SUMMER)\b/i.test(text)) {
        term = text;
        continue;
      }
      if (upper.includes('TOTAL REQUIRED UNITS')) continue;
      if (upper.includes('SUBJECT CODE') && upper.includes('SUBJECT DESC')) continue;
      if (aligned[0]) dataRows.push(normalizeRowToHeaders([term, ...aligned], headers));
    }

    if (dataRows.length > 0) return { title: 'Residency Evaluation', headers, rows: dataRows } satisfies TableData;
  }

  return null;
}

export function parseStudentSummary(html: string): StudentSummary {
  const root = parse(stripNoise(html));
  const textLines = extractRawText(root)
    .split('\n')
    .map(cleanText)
    .filter(Boolean);
  const img = root.querySelector('img[src*="upload_img"]')?.getAttribute('src');

  const summaryRows = root
    .querySelectorAll('table')
    .flatMap((table) => extractRows(table))
    .find((row) => row.some((cell) => /^\d{6,}$/.test(cell)) && row.length >= 4);

  if (summaryRows) {
    const values = summaryRows.filter(Boolean);
    return {
      id: values.find((value) => /^\d{6,}$/.test(value)),
      name: values.find((value) => /,/.test(value) && !/SUMMER|SEM|YEAR/i.test(value)),
      term: values.find((value) => /\d{4}|SUMMER|SEM/i.test(value)),
      yearLevel: values.find((value) => /YEAR/i.test(value)),
      course: values.find((value) => /^[A-Z]{2,}[A-Z0-9 -]*$/.test(value) && !/SUMMER|YEAR/.test(value)),
      avatarUrl: img ? new URL(img, 'https://automate.cghc.edu.ph/PARENTS_STUDENTS/main_files/').toString() : undefined,
    };
  }

  const idIndex = textLines.findIndex((line) => /^\d{6,}$/.test(line));
  const sequenced = idIndex >= 0 ? textLines.slice(idIndex, idIndex + 5) : [];

  return {
    id: sequenced[0] ?? textLines.find((line) => /^\d{6,}$/.test(line)),
    name: sequenced[1] ?? textLines.find((line) => /Welcome\s+.+\s+to/i.test(line))?.replace(/Welcome\s+|\s+to.+$/gi, ''),
    term: sequenced[2],
    yearLevel: sequenced[3],
    course: sequenced[4],
    avatarUrl: img ? new URL(img, 'https://automate.cghc.edu.ph/PARENTS_STUDENTS/main_files/').toString() : undefined,
  };
}

export function parseModuleHtml(key: PortalModuleKey, html: string): PortalModuleData {
  const root = parse(stripNoise(html));
  const fallbackTitle = moduleFallbackTitle(key);
  const rawText = extractRawText(root);
  let title = extractTitle(root, fallbackTitle);
  if (/^Untitled Document$/i.test(title)) {
    title = rawText.split('\n').find((line) => /ENROLLED LIST|SUBJECTS ENROLLED/i.test(line)) ?? fallbackTitle;
  }
  const personalInfo = key === 'personalInfo' ? parsePersonalInfo(root) : undefined;
  const summary = personalInfo?.summary ?? extractModuleSummary(root, key as Exclude<PortalModuleKey, 'personalInfo'>);
  const tables: TableData[] = [];

  if (key === 'subjects') {
    const table = findTable(root, ['SUBJECT CODE', 'SUBJECT TITLE'], 'Subjects Enrolled');
    if (table) tables.push(table);
  } else if (key === 'schedule') {
    const table = findTable(root, ['SUBJECT CODE', 'SUBJECT NAME', 'SCHEDULE'], 'Enrolled Load Schedule', { stopAtTotal: true });
    if (table) tables.push(table);
  } else if (key === 'ledger') {
    const table = findTable(root, ['DATE', 'PARTICULARS', 'BALANCE'], 'Ledger');
    if (table) tables.push(table);
  } else if (key === 'dues') {
    const table = findTable(root, ['PAYMENT SCHEDULE', 'REQUIRED AMOUNT', 'CUMULATIVE BALANCE'], 'Periodic Dues');
    if (table) tables.push(table);
  } else if (key === 'checklist') {
    const table = parseChecklist(root);
    if (table) tables.push(table);
  }

  if (tables.length === 0 && key !== 'personalInfo') tables.push(...extractGenericTables(root, key, 3));

  return {
    key,
    title,
    subtitle: inferSubtitle(rawText),
    summary,
    infoSections: personalInfo?.infoSections,
    tables,
    rawText,
    fetchedAt: new Date().toISOString(),
  };
}

function inferSubtitle(rawText: string) {
  return rawText
    .split('\n')
    .map(cleanText)
    .find((line) => /SY|SCHOOL YEAR|SUMMER|SEM|ENROLLED|Status:/i.test(line) && line.length < 120);
}

function moduleFallbackTitle(key: PortalModuleKey) {
  switch (key) {
    case 'personalInfo':
      return 'Personal Info';
    case 'subjects':
      return 'Subjects Enrolled';
    case 'schedule':
      return 'Enrolled Load Schedule';
    case 'ledger':
      return 'Ledger';
    case 'dues':
      return 'Periodic Dues';
    case 'checklist':
      return 'Checklist';
  }
}
