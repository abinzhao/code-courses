import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const port = Number(process.env.PORT || 4173);
const rootDirectory = path.dirname(fileURLToPath(import.meta.url));
const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
]);

function isInsideRoot(candidatePath) {
  const relativePath = path.relative(rootDirectory, candidatePath);
  return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}

function sendResponse(response, statusCode, body, contentType = 'text/plain; charset=utf-8') {
  response.writeHead(statusCode, {
    'Content-Type': contentType,
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
  });
  response.end(body);
}

async function resolveRequestedFile(requestUrl) {
  const url = new URL(requestUrl || '/', 'http://localhost');
  let pathname;

  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    const error = new Error('INVALID_URL_ENCODING');
    error.statusCode = 400;
    throw error;
  }

  const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const candidatePath = path.resolve(rootDirectory, relativePath);

  if (!isInsideRoot(candidatePath)) {
    const error = new Error('PATH_OUTSIDE_ROOT');
    error.statusCode = 403;
    throw error;
  }

  let candidateStat;
  try {
    candidateStat = await stat(candidatePath);
  } catch {
    const error = new Error('FILE_NOT_FOUND');
    error.statusCode = 404;
    throw error;
  }

  if (candidateStat.isDirectory()) {
    const indexPath = path.join(candidatePath, 'index.html');
    if (!isInsideRoot(indexPath)) {
      const error = new Error('PATH_OUTSIDE_ROOT');
      error.statusCode = 403;
      throw error;
    }
    return indexPath;
  }

  return candidatePath;
}

const server = createServer(async (request, response) => {
  const method = request.method || 'GET';

  if (method !== 'GET' && method !== 'HEAD') {
    sendResponse(response, 405, 'Method Not Allowed\n');
    console.log(`${method} ${request.url} -> 405`);
    return;
  }

  let statusCode = 200;

  try {
    const filePath = await resolveRequestedFile(request.url);
    const body = await readFile(filePath);
    const extension = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes.get(extension) || 'application/octet-stream';

    response.writeHead(statusCode, {
      'Content-Type': contentType,
      'Content-Length': body.byteLength,
      'Cache-Control': 'no-store',
    });
    if (method === 'HEAD') {
      response.end();
    } else {
      response.end(body);
    }
    console.log(`${method} ${request.url} -> ${statusCode}`);
  } catch (error) {
    statusCode = Number(error.statusCode) || 500;
    const messages = new Map([
      [400, 'Bad Request\n'],
      [403, 'Forbidden\n'],
      [404, 'Not Found\n'],
      [500, 'Internal Server Error\n'],
    ]);
    sendResponse(response, statusCode, messages.get(statusCode) || messages.get(500));
    console.log(`${method} ${request.url} -> ${statusCode}`);
  }
});

server.listen(port, () => {
  console.log(`NoteFlow U01 server running at http://localhost:${port}`);
});

function closeServer(signal) {
  console.log(`\nReceived ${signal}; stopping server.`);
  server.close(() => process.exit(0));
}

process.on('SIGINT', () => closeServer('SIGINT'));
process.on('SIGTERM', () => closeServer('SIGTERM'));
