import type { PortalModuleConfig, PortalModuleData, PortalModuleKey, StudentSummary } from '../types';
import { cleanText, parseModuleHtml, parseStudentSummary } from '../utils/portalParser';

const BASE_URL = 'https://automate.cghc.edu.ph';
const LOGIN_PATH = '/PARENTS_STUDENTS/main_files/login_new.jsp';
const MENU_PATH = '/PARENTS_STUDENTS/main_files/parents_students_main_links.jsp';
const KEEP_ALIVE_PATH = '/Ajax/AjaxInterface.jsp';

export class PortalSessionExpiredError extends Error {
  constructor(message = 'Your CGH portal session expired. Please sign in again.') {
    super(message);
    this.name = 'PortalSessionExpiredError';
  }
}

export const MODULES: PortalModuleConfig[] = [
  {
    key: 'personalInfo',
    label: 'Personal Info',
    description: 'General student profile and contact records',
    path: '/my_home/stud_personal_info_page.jsp',
  },
  {
    key: 'subjects',
    label: 'Subjects Enrolled',
    description: 'Current enrolled subjects and total units',
    path: '/PARENTS_STUDENTS/enrollment/subjects_enrolled.jsp',
  },
  {
    key: 'schedule',
    label: 'Enrolled Load Schedule',
    description: 'Class days, time, section, room, and faculty',
    path: '/PARENTS_STUDENTS/enrollment/schedule.jsp',
  },
  {
    key: 'ledger',
    label: 'Ledger',
    description: 'Debits, credits, balances, and payment history',
    path: '/PARENTS_STUDENTS/accounts/student_ledger.jsp',
  },
  {
    key: 'dues',
    label: 'Periodic Dues',
    description: 'Required amounts and cumulative balances by period',
    path: '/PARENTS_STUDENTS/accounts/pmt_schedule.jsp',
  },
  {
    key: 'checklist',
    label: 'Checklist',
    description: 'Curriculum residency evaluation and credit status',
    path: '/PARENTS_STUDENTS/acad_performance/stud_cur_residency_eval.jsp',
  },
];

export class CghPortalClient {
  private cookies = new Map<string, string>();
  private authenticated = false;
  private readonly useWebProxy: boolean;
  private readonly proxyBaseUrl: string;
  private proxySessionId?: string;

  constructor(options?: { useWebProxy?: boolean; proxyBaseUrl?: string }) {
    const configuredProxy = configuredProxyBaseUrl();
    this.useWebProxy = options?.useWebProxy ?? (isBrowserWeb() || Boolean(configuredProxy));
    this.proxyBaseUrl = options?.proxyBaseUrl ?? configuredProxy ?? defaultProxyBaseUrl();
  }

  get cookieHeader() {
    return [...this.cookies.entries()].map(([key, value]) => `${key}=${value}`).join('; ');
  }

  async login(username: string, password: string): Promise<StudentSummary> {
    this.cookies.clear();
    this.authenticated = false;
    this.proxySessionId = undefined;

    if (this.useWebProxy) {
      const result = await this.proxyJson<{ sessionId: string; student: StudentSummary }>('/login', {
        method: 'POST',
        body: JSON.stringify({ username: username.trim(), password }),
      });
      this.proxySessionId = result.sessionId;
      this.authenticated = true;
      return result.student;
    }

    let loginHtml = await this.getText(LOGIN_PATH);
    const usernameForm = extractInputs(loginHtml);
    const usernameField = usernameForm.user_id;
    if (!usernameField) throw new Error('CGH login form changed: username field was not found.');
    usernameForm[usernameField] = username.trim();

    loginHtml = await this.postText(LOGIN_PATH, usernameForm, LOGIN_PATH);
    const passwordForm = extractInputs(loginHtml);
    const secondUsernameField = passwordForm.user_id;
    const passwordField = passwordForm.password;
    if (!secondUsernameField || !passwordField) {
      throw new Error(readLoginFailure(loginHtml) || 'CGH login did not show a password field for this user.');
    }

    passwordForm[secondUsernameField] = username.trim();
    passwordForm[passwordField] = password;
    delete passwordForm.show_hide_pwd;

    await this.postText('/commfile/login.jsp', passwordForm, LOGIN_PATH, true);

    const menuHtml = await this.getText(MENU_PATH);
    if (!/<p>\s*Logout\s*<\/p>/i.test(menuHtml)) {
      const rightFrame = await this.getText('/PARENTS_STUDENTS/main_files/parents_student_main_page_rightFrame.jsp');
      throw new Error(readLoginFailure(rightFrame) || 'Login failed. Please check the username and password.');
    }

    this.authenticated = true;
    return parseStudentSummary(menuHtml);
  }

  async loadModule(key: PortalModuleKey): Promise<PortalModuleData> {
    if (!this.authenticated) throw new Error('Please log in before loading portal modules.');
    if (this.useWebProxy) {
      if (!this.proxySessionId) throw new Error('Web proxy session is missing. Please login again.');
      const payload = await this.proxyJson<{ html: string } | PortalModuleData>(
        `/module/${key}?sessionId=${encodeURIComponent(this.proxySessionId)}`,
      );
      if ('html' in payload && typeof payload.html === 'string') return parseModuleHtml(key, payload.html);
      if (isPortalModuleData(payload)) return payload;
      throw new Error('Portal proxy returned an invalid module payload. Please refresh this record.');
    }
    return parseModuleHtml(key, await this.loadModuleHtml(key));
  }

  async loadModuleHtml(key: PortalModuleKey): Promise<string> {
    if (!this.authenticated) throw new Error('Please log in before loading portal modules.');
    const config = MODULES.find((module) => module.key === key);
    if (!config) throw new Error(`Unknown module: ${key}`);
    return this.getText(config.path);
  }

  async loadPortalAsset(pathOrUrl: string): Promise<{ contentType: string; bytes: Uint8Array }> {
    if (!this.authenticated) throw new Error('Please log in before loading portal assets.');
    const url = absoluteUrl(pathOrUrl);
    if (new URL(url).origin !== new URL(BASE_URL).origin) throw new Error('Unsupported portal asset URL.');

    const headers = new Headers({
      Accept: 'image/*,*/*;q=0.8',
      Referer: absoluteUrl(MENU_PATH),
      'User-Agent': 'CGH-Mobile/1.0 Expo React Native',
    });
    if (this.cookieHeader) headers.set('Cookie', this.cookieHeader);

    const response = await fetchWithTimeout(url, { method: 'GET', headers });
    this.captureCookies(response.headers);
    if (!response.ok) throw new Error(`CGH portal image request failed (${response.status}).`);

    return {
      contentType: response.headers.get('content-type')?.split(';')[0] || 'image/jpeg',
      bytes: new Uint8Array(await response.arrayBuffer()),
    };
  }

  async refreshSummary(): Promise<StudentSummary> {
    if (this.useWebProxy) {
      if (!this.proxySessionId) throw new Error('Web proxy session is missing. Please login again.');
      return this.proxyJson<StudentSummary>(`/summary?sessionId=${encodeURIComponent(this.proxySessionId)}`);
    }
    const menuHtml = await this.getText(MENU_PATH);
    return parseStudentSummary(menuHtml);
  }

  async keepAlive() {
    if (!this.authenticated) return;
    if (this.useWebProxy) {
      if (!this.proxySessionId) throw new PortalSessionExpiredError('Web proxy session is missing. Please sign in again.');
      await this.proxyJson<{ ok: boolean; message?: string }>(`/keep-alive?sessionId=${encodeURIComponent(this.proxySessionId)}`, { method: 'POST' });
      return;
    }
    const text = await this.postText(KEEP_ALIVE_PATH, { methodRef: '211' }, MENU_PATH);
    if (!/Keeping Session Alive/i.test(text)) {
      throw new PortalSessionExpiredError();
    }
  }

  async logout() {
    if (this.useWebProxy) {
      if (this.proxySessionId) {
        await this.proxyJson<{ ok: boolean }>('/logout', {
          method: 'POST',
          body: JSON.stringify({ sessionId: this.proxySessionId }),
        }).catch(() => undefined);
      }
      this.proxySessionId = undefined;
      this.authenticated = false;
      return;
    }
    if (!this.cookieHeader) return;
    await this.getText('/commfile/logout.jsp?logout_url=../PARENTS_STUDENTS/main_files/parents_students_bottom_content.jsp&body_color=#C39E60').catch(() => undefined);
    this.cookies.clear();
    this.authenticated = false;
  }

  private async proxyJson<T>(path: string, init?: RequestInit): Promise<T> {
    let response: Response;
    try {
      response = await fetchWithTimeout(`${this.proxyBaseUrl}${path}`, {
        ...init,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(init?.headers ?? {}),
        },
      });
    } catch (error) {
      if (error instanceof Error && /timed out/i.test(error.message)) throw error;
      throw new Error(`Web portal proxy is not reachable at ${this.proxyBaseUrl}. Run npm run proxy in another terminal, then retry.`);
    }

    const payload = await response.json().catch(() => undefined) as { error?: string } | T | undefined;
    if (!response.ok) {
      const message = payload && typeof payload === 'object' && 'error' in payload ? payload.error : undefined;
      const code = payload && typeof payload === 'object' && 'code' in payload ? payload.code : undefined;
      if (code === 'SESSION_EXPIRED') throw new PortalSessionExpiredError(message);
      throw new Error(message || `Portal proxy failed (${response.status}).`);
    }
    return payload as T;
  }

  private async getText(pathOrUrl: string) {
    return this.requestText(pathOrUrl, { method: 'GET' });
  }

  private async postText(pathOrUrl: string, body: Record<string, string>, referer?: string, manualRedirect = false) {
    return this.requestText(pathOrUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Referer: absoluteUrl(referer ?? LOGIN_PATH),
      },
      body: encodeForm(body),
    }, manualRedirect);
  }

  private async requestText(pathOrUrl: string, init: RequestInit, manualRedirect = false) {
    const headers = new Headers(init.headers);
    headers.set('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8');
    headers.set('User-Agent', 'CGH-Mobile/1.0 Expo React Native');
    if (this.cookieHeader) headers.set('Cookie', this.cookieHeader);

    let response: Response;
    try {
      response = await fetchWithTimeout(absoluteUrl(pathOrUrl), { ...init, headers, redirect: manualRedirect ? 'manual' : 'follow' });
    } catch (error) {
      if (error instanceof Error && /timed out/i.test(error.message)) throw error;
      throw new Error(`Unable to reach the CGH portal. ${error instanceof Error ? error.message : 'Check your connection and try again.'}`);
    }
    this.captureCookies(response.headers);

    const text = await response.text();
    if (!isLoginRequest(pathOrUrl) && looksLoggedOut(text)) {
      this.authenticated = false;
      throw new PortalSessionExpiredError();
    }
    if (manualRedirect && response.status >= 300 && response.status < 400) return text;
    if (!response.ok) {
      throw new Error(`CGH portal request failed (${response.status}): ${cleanText(text).slice(0, 120)}`);
    }
    return text;
  }

  private captureCookies(headers: Headers) {
    const anyHeaders = headers as Headers & { getSetCookie?: () => string[] };
    const cookieHeaders = anyHeaders.getSetCookie?.() ?? splitSetCookie(headers.get('set-cookie') ?? headers.get('Set-Cookie'));

    for (const cookieHeader of cookieHeaders) {
      const [pair] = cookieHeader.split(';');
      const separator = pair.indexOf('=');
      if (separator <= 0) continue;
      const name = pair.slice(0, separator).trim();
      const value = pair.slice(separator + 1).trim();
      if (value) this.cookies.set(name, value);
      else this.cookies.delete(name);
    }
  }
}

function absoluteUrl(pathOrUrl: string) {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${BASE_URL}${pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`}`;
}

function encodeForm(body: Record<string, string>) {
  return Object.entries(body)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
}

function extractInputs(html: string) {
  const stripped = html.replace(/<!--[\s\S]*?-->/g, '');
  const inputs: Record<string, string> = {};
  for (const input of stripped.match(/<input\b[^>]*>/gi) ?? []) {
    const attrs = extractAttributes(input);
    const name = attrs.name;
    if (!name) continue;
    const type = (attrs.type ?? '').toLowerCase();
    if (type === 'checkbox' || type === 'submit' || type === 'button') continue;
    inputs[name] = attrs.value ?? '';
  }
  return inputs;
}

function extractAttributes(tag: string) {
  const attrs: Record<string, string> = {};
  const attrPattern = /([\w:-]+)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s>]+))?/g;
  let match: RegExpExecArray | null;
  while ((match = attrPattern.exec(tag))) {
    const key = match[1].toLowerCase();
    if (key === 'input') continue;
    const raw = match[2] ?? '';
    attrs[key] = raw.replace(/^['"]|['"]$/g, '');
  }
  return attrs;
}

function splitSetCookie(header: string | null) {
  if (!header) return [];
  return header.split(/,(?=\s*[^;,\s]+=)/g).map((value) => value.trim());
}

function readLoginFailure(html: string) {
  const match = html.match(/<div[^>]*font-weight\s*:\s*bold[^>]*>([\s\S]*?)<\/div>/i);
  return match ? cleanText(match[1].replace(/<[^>]+>/g, ' ')) : undefined;
}


function isBrowserWeb() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function defaultProxyBaseUrl() {
  if (typeof window !== 'undefined' && window.location?.hostname) {
    return `http://${window.location.hostname}:8787`;
  }
  return 'http://localhost:8787';
}

function isPortalModuleData(value: unknown): value is PortalModuleData {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<PortalModuleData>;
  return typeof candidate.key === 'string' && Boolean(candidate.summary) && Array.isArray(candidate.tables);
}

function configuredProxyBaseUrl() {
  const value = typeof process !== 'undefined' ? process.env.EXPO_PUBLIC_CGH_PROXY_URL?.trim() : undefined;
  return value || undefined;
}


export function isSessionExpiredError(error: unknown) {
  return error instanceof PortalSessionExpiredError || (error instanceof Error && /session expired|already logged out|please sign in again|please login again/i.test(error.message));
}

function isLoginRequest(pathOrUrl: string) {
  return pathOrUrl.includes('login_new.jsp') || pathOrUrl.includes('/commfile/login.jsp');
}

function looksLoggedOut(html: string) {
  return /You are already logged out|Please login again|Student\/Parent\/New Student Login/i.test(html);
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 20_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('The portal request timed out. Check your connection and retry.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
