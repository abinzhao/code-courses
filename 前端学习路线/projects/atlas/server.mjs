import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { articles, filterArticles } from './src/articles.js';

const root = resolve(fileURLToPath(new URL('./src/', import.meta.url)));
const requestedPort = Number(process.env.PORT ?? 4173);
const port = Number.isInteger(requestedPort) && requestedPort > 0
  ? requestedPort
  : 4173;

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

function sendJson(response, status, data) {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  response.end(JSON.stringify(data));
}

function handleApi(requestUrl, response) {
  if (requestUrl.pathname !== '/api/articles') return false;

  const keyword = requestUrl.searchParams.get('keyword') ?? '';
  const status = requestUrl.searchParams.get('status') ?? 'all';
  const delay = Number(requestUrl.searchParams.get('delay') ?? 0);
  const result = filterArticles(articles, { keyword, status });

  setTimeout(() => {
    sendJson(response, 200, {
      data: result,
      meta: {
        count: result.length,
        keyword,
        status,
      },
    });
  }, Math.min(Math.max(delay, 0), 5000));

  return true;
}

function resolveStaticPath(pathname) {
  const relativePath = pathname === '/' ? 'index.html' : pathname.slice(1);
  const target = resolve(root, decodeURIComponent(relativePath));
  const isInsideRoot = target === root || target.startsWith(`${root}${sep}`);

  if (!isInsideRoot || !existsSync(target) || !statSync(target).isFile()) {
    return null;
  }

  return target;
}

const server = createServer((request, response) => {
  const requestUrl = new URL(request.url ?? '/', `http://${request.headers.host}`);

  if (handleApi(requestUrl, response)) return;

  const target = resolveStaticPath(requestUrl.pathname);
  if (!target) {
    sendJson(response, 404, {
      error: 'NOT_FOUND',
      message: `资源不存在: ${requestUrl.pathname}`,
    });
    return;
  }

  response.writeHead(200, {
    'content-type': contentTypes[extname(target)] ?? 'application/octet-stream',
    'cache-control': 'no-cache',
    'x-content-type-options': 'nosniff',
  });
  createReadStream(target).pipe(response);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Atlas running at http://127.0.0.1:${port}`);
});

function shutdown() {
  server.close((error) => {
    if (error) {
      console.error(error);
      process.exitCode = 1;
    }
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
