import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

test('本地靶场的漏洞与修复行为', async (t) => {
  const moduleUrl = new URL('../server.mjs', import.meta.url);
  assert.ok(existsSync(moduleUrl), '需要实现可运行靶场');
  const { createLabServer } = await import(moduleUrl);
  for (const mode of ['vulnerable', 'fixed']) {
    const server = createLabServer({ mode });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    t.after(() => new Promise((resolve) => server.close(resolve)));

    await t.test(`${mode}: XSS 标记文本`, async () => {
      const marker = '<img src=x onerror="document.body.dataset.lab=\'xss\'">';
      const response = await fetch(`${base}/preview?title=${encodeURIComponent(marker)}`);
      const html = await response.text();
      if (mode === 'vulnerable') assert.ok(html.includes(marker));
      else {
        assert.ok(html.includes('&lt;img'));
        assert.ok(!html.includes(marker));
      }
    });
    await t.test(`${mode}: 资源归属授权`, async () => {
      const response = await fetch(`${base}/api/drafts/draft-b`, {
        headers: { 'x-lab-user': 'alice' },
      });
      assert.equal(response.status, mode === 'vulnerable' ? 200 : 403);
      const own = await fetch(`${base}/api/drafts/draft-a`, {
        headers: { 'x-lab-user': 'alice' },
      });
      assert.equal(own.status, 200);
      const missing = await fetch(`${base}/api/drafts/draft-a`);
      assert.equal(missing.status, 401);
    });
    await t.test(`${mode}: 外部重定向`, async () => {
      const response = await fetch(`${base}/redirect?to=${encodeURIComponent('https://outside.invalid/')}`, {
        redirect: 'manual',
      });
      assert.equal(response.status, 302);
      assert.equal(response.headers.get('location'),
        mode === 'vulnerable' ? 'https://outside.invalid/' : '/');
    });
    await t.test(`${mode}: 跨源写入`, async () => {
      const before = await (await fetch(`${base}/api/profile`)).json();
      const response = await fetch(`${base}/api/profile`, {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          cookie: 'lab_session=alice',
          origin: 'http://127.0.0.1:4999',
        },
        body: 'name=Cross-origin',
      });
      assert.equal(response.status, mode === 'vulnerable' ? 200 : 403);
      const after = await (await fetch(`${base}/api/profile`)).json();
      assert.equal(after.name, mode === 'vulnerable' ? 'Cross-origin' : before.name);
      const allowed = await fetch(`${base}/api/profile`, {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          cookie: 'lab_session=alice',
          origin: base,
        },
        body: 'name=Allowed',
      });
      assert.equal(allowed.status, 200);
    });
    await t.test(`${mode}: 请求边界`, async () => {
      const wrongType = await fetch(`${base}/api/profile`, {
        method: 'POST', headers: { cookie: 'lab_session=alice', origin: base },
        body: 'name=wrong',
      });
      assert.equal(wrongType.status, 415);
      const response = await fetch(`${base}/api/profile`, {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          cookie: 'lab_session=alice', origin: base,
        },
        body: 'name=' + 'x'.repeat(2000),
      });
      assert.equal(response.status, 413);
    });
  }
});
