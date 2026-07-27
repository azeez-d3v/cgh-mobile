import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import {
  CghPortalClient,
  isSessionExpiredError,
  PortalRequestError,
} from '../src/services/cghPortal';
import type { PortalModuleKey } from '../src/types';

const PORT = Number(process.env.CGH_PROXY_PORT ?? 8787);
const sessions = new Map<string, CghPortalClient>();
const allowedMethods = 'GET,POST,OPTIONS';
const allowedHeaders = 'Content-Type,Accept';

function setCors(res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', allowedMethods);
  res.setHeader('Access-Control-Allow-Headers', allowedHeaders);
  res.setHeader('Access-Control-Max-Age', '86400');
}

function sendJson(res: ServerResponse, status: number, payload: unknown) {
  setCors(res);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function readJson<T>(req: IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: Buffer) => {
      body += chunk;
      if (body.length > 1024 * 64) {
        reject(new Error('Request body too large.'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Invalid JSON body.'));
      }
    });
    req.on('error', reject);
  });
}

function getSession(url: URL) {
  const sessionId = url.searchParams.get('sessionId');
  if (!sessionId) throw new Error('Missing sessionId. Please login again.');
  const client = sessions.get(sessionId);
  if (!client) throw new Error('Proxy session expired. Please login again.');
  return { sessionId, client };
}

const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  setCors(res);
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);

  try {
    if (req.method === 'GET' && url.pathname === '/health') {
      sendJson(res, 200, { ok: true, sessions: sessions.size });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/login') {
      const body = await readJson<{ username?: string; password?: string }>(req);
      if (!body.username || !body.password) throw new Error('Missing username or password.');

      const client = new CghPortalClient({ useWebProxy: false });
      const student = await client.login(body.username, body.password);
      if (student.avatarUrl) {
        try {
          const avatar = await client.loadPortalAsset(student.avatarUrl);
          student.avatarUrl = `data:${avatar.contentType};base64,${Buffer.from(avatar.bytes).toString('base64')}`;
        } catch {
          student.avatarUrl = undefined;
        }
      }
      const sessionId = randomUUID();
      sessions.set(sessionId, client);
      sendJson(res, 200, { sessionId, student });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/summary') {
      const { client } = getSession(url);
      sendJson(res, 200, await client.refreshSummary());
      return;
    }

    if (req.method === 'GET' && url.pathname.startsWith('/module/')) {
      const key = decodeURIComponent(url.pathname.replace('/module/', '')) as PortalModuleKey;
      const { client } = getSession(url);
      sendJson(res, 200, { html: await client.loadModuleHtml(key) });
      return;
    }


    if (req.method === 'POST' && url.pathname === '/keep-alive') {
      const { client } = getSession(url);
      await client.keepAlive();
      sendJson(res, 200, { ok: true, message: 'Keeping Session Alive' });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/logout') {
      const body = await readJson<{ sessionId?: string }>(req);
      const sessionId = body.sessionId;
      const client = sessionId ? sessions.get(sessionId) : undefined;
      if (client) await client.logout();
      if (sessionId) sessions.delete(sessionId);
      sendJson(res, 200, { ok: true });
      return;
    }

    sendJson(res, 404, { error: 'Unknown proxy route.' });
  } catch (error) {
    const sessionExpired = isSessionExpiredError(error);
    const portalError = error instanceof PortalRequestError ? error : undefined;
    sendJson(res, sessionExpired || portalError?.code === 'PORTAL_PASSWORD' || portalError?.code === 'PORTAL_STUDENT_ID' ? 401 : 400, {
      error: 'The portal request could not be completed.',
      code: sessionExpired ? 'SESSION_EXPIRED' : portalError?.code ?? 'PORTAL_ERROR',
    });
  }
});

server.listen(PORT, () => {
  console.log(`CGH portal proxy running at http://localhost:${PORT}`);
  console.log('Keep this terminal open while using real login in web preview.');
});
