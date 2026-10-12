import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { test } from 'node:test';

const port = 4273;
const origin = `http://127.0.0.1:${port}`;

async function startServer() {
  const child = spawn(process.execPath, ['server.mjs'], {
    cwd: new URL('..', import.meta.url),
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');

  await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code) => {
      reject(new Error(`Atlas server exited before startup with code ${code}`));
    });
    child.stdout.on('data', (chunk) => {
      if (chunk.includes(`Atlas running at ${origin}`)) resolve();
    });
  });

  return child;
}

async function stopServer(child) {
  if (child.exitCode !== null) return;
  child.kill('SIGTERM');
  await once(child, 'exit');
}

test('GET / serves the Atlas HTML entry point', async (context) => {
  const server = await startServer();
  context.after(() => stopServer(server));

  const response = await fetch(origin);
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') ?? '', /^text\/html/);
  assert.match(body, /<title>Atlas/);
});
