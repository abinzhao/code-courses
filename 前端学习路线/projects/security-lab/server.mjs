import http from 'node:http';
import { pathToFileURL } from 'node:url';

const escapeHtml = (text) => text.replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));

export function createLabServer({ mode = 'fixed' } = {}) {
  if (!['fixed', 'vulnerable'].includes(mode)) throw new Error('未知实验模式');
  const drafts = {
    'draft-a': { id: 'draft-a', owner: 'alice', title: 'Alice 的虚构草稿' },
    'draft-b': { id: 'draft-b', owner: 'bob', title: 'Bob 的虚构草稿' },
  };
  let name = 'Alice';
  const fixed = mode === 'fixed';

  const server = http.createServer(async (req, res) => {
    const expectedHost = `127.0.0.1:${server.address().port}`;
    if (req.headers.host !== expectedHost) {
      res.writeHead(400).end('Host rejected');
      return;
    }
    const origin = `http://${expectedHost}`;
    const url = new URL(req.url, origin);
    const json = (status, value) => {
      if (res.destroyed || res.headersSent) return;
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(value));
    };
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (fixed) {
      res.setHeader('Content-Security-Policy',
        "default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
    }
    if (req.method === 'GET' && url.pathname === '/') {
      // 虚构会话仅用于本地 CSRF 机制实验，不是生产认证。
      res.setHeader('Set-Cookie', 'lab_session=alice; HttpOnly; SameSite=Lax; Path=/');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<!doctype html><html lang="zh-CN"><meta charset="utf-8">
        <title>本地安全实验</title><h1>${mode} 模式</h1>
        <p>仅有虚构数据；端口不同为跨源，仍可能同站。</p>
        <form action="/preview"><label>预览标题 <input name="title"></label><button>预览</button></form>
        <form action="/api/profile" method="post"><label>资料名 <input name="name"></label><button>更新虚构资料</button></form>
        <p><a href="/api/profile">查看资料</a></p></html>`);
      return;
    }
    if (req.method === 'GET' && url.pathname === '/preview') {
      const raw = url.searchParams.get('title') ?? '';
      if (raw.length > 1000) return json(413, { code: 'TITLE_TOO_LARGE' });
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<!doctype html><html><meta charset="utf-8"><title>Preview</title><h1>${fixed ? escapeHtml(raw) : raw}</h1></html>`);
      return;
    }
    if (req.method === 'GET' && url.pathname.startsWith('/api/drafts/')) {
      const user = req.headers['x-lab-user'];
      if (!['alice', 'bob'].includes(user)) return json(401, { code: 'LOGIN_REQUIRED' });
      const draft = drafts[url.pathname.slice('/api/drafts/'.length)];
      if (!draft) return json(404, { code: 'NOT_FOUND' });
      if (fixed && draft.owner !== user) return json(403, { code: 'FORBIDDEN' });
      return json(200, draft);
    }
    if (req.method === 'GET' && url.pathname === '/redirect') {
      let target = url.searchParams.get('to') ?? '/';
      if (fixed) {
        try {
          const parsed = new URL(target, origin);
          target = target.startsWith('/') && parsed.origin === origin
            ? parsed.pathname + parsed.search + parsed.hash : '/';
        } catch {
          target = '/';
        }
      }
      if (/[\r\n]/.test(target)) return json(400, { code: 'INVALID_LOCATION' });
      res.writeHead(302, { Location: target }).end();
      return;
    }
    if (url.pathname === '/api/profile' && req.method === 'GET') {
      return json(200, { name });
    }
    if (url.pathname === '/api/profile' && req.method === 'POST') {
      if (!req.headers.cookie?.split(/;\s*/).includes('lab_session=alice')) {
        return json(401, { code: 'LOGIN_REQUIRED' });
      }
      if (fixed && req.headers.origin !== origin) {
        return json(403, { code: 'ORIGIN_REJECTED' });
      }
      if (req.headers['content-type']?.split(';')[0] !== 'application/x-www-form-urlencoded') {
        return json(415, { code: 'FORM_REQUIRED' });
      }
      try {
        const chunks = [];
        let size = 0;
        let tooLarge = false;
        for await (const chunk of req) {
          size += chunk.length;
          if (size > 1024) tooLarge = true;
          if (!tooLarge) chunks.push(chunk);
          if (size > 16 * 1024) {
            req.destroy();
            return;
          }
        }
        if (tooLarge) return json(413, { code: 'BODY_TOO_LARGE' });
        const value = new URLSearchParams(Buffer.concat(chunks).toString('utf8')).get('name');
        if (!value || value.length > 100) return json(422, { code: 'INVALID_NAME' });
        name = value;
        return json(200, { name });
      } catch {
        return json(400, { code: 'INCOMPLETE_BODY' });
      }
    }
    json(404, { code: 'NOT_FOUND' });
  });
  server.requestTimeout = 5000;
  server.headersTimeout = 3000;
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const mode = process.env.LAB_MODE ?? 'fixed';
  const server = createLabServer({ mode });
  server.listen(4185, '127.0.0.1', () => {
    console.log(`本地虚构数据靶场：${mode} http://127.0.0.1:4185`);
  });
}
