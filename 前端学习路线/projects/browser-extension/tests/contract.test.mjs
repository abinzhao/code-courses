import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

test('采集数据必须满足边界', async () => {
  const moduleUrl = new URL('../contract.js', import.meta.url);
  assert.ok(existsSync(moduleUrl), '需要实现采集契约');
  const { validateClip } = await import(moduleUrl);
  assert.equal(validateClip(null), null);
  assert.equal(validateClip({ url: 'javascript:alert(1)', title: 'x', text: 'y' }), null);
  assert.equal(validateClip({ url: 'https://user:pass@example.invalid', title: 'x', text: 'y' }), null);
  assert.equal(validateClip({ url: 'https://example.invalid', title: 1, text: 'y' }), null);
  const clip = validateClip({
    url: 'https://example.invalid/article#section',
    title: '  Atlas  ',
    text: 'x'.repeat(3000),
  });
  assert.deepEqual(clip, {
    url: 'https://example.invalid/article',
    title: 'Atlas',
    text: 'x'.repeat(2000),
  });
});

test('清单仅申请采集所需权限', () => {
  const file = new URL('../manifest.json', import.meta.url);
  assert.ok(existsSync(file), '需要实现 MV3 清单');
  const manifest = JSON.parse(readFileSync(file));
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.permissions, ['activeTab', 'scripting', 'storage']);
  assert.equal(manifest.host_permissions, undefined);
  assert.equal(manifest.background.type, 'module');
});
