# EX24 Capstone：测试全源码、机械提取与五路径验收

## 任务卡

第 10 周 18–22 小时；前置 EX23；产出正文抽取哈希表、11 单测、双平台候选、原生安装与五路径证据。

## 1. 任务背景

教材能运行的证据必须来自当前正文，不是作者曾运行过的旧工程。
先从 Markdown 提取，逐文件对账，再安装和测试；不把缺平台写成通过。

## 2. 学习目标

机械提取全部源码；执行单测/产物/真实安装三层验证；
记录五条业务路径、关键失败实验与清理；给独立只读审查可核对证据。

## 3. 前置知识与环境

EX23 的 19 文件，加本文 5 文件共 24。Node≥22.12；Playwright/Chromium 路径见 BASELINE。
从本文将完整 `scripts/extract.mjs` 先放个人 bootstrap 目录，然后传当前教材卷绝对路径与个人空输出目录。
提取器执行写文件，输出目录必须是自己创建的空目录；不把仓库/下载/日常 profile 传为输出。

<a id="s4"></a>
## 4. 核心机制

提取器只读取 EX23/24 的 `<!-- file: path -->`+代码围栏，不抽其他小实验；
逐文件 UTF-8 与末尾换行 SHA-256，参考目录可选。源码 hash 一致不意味着未锁传递依赖一致。
测试分层：domain 11 条→artifact 双 manifest/文件白名单→native 真实安装→main Chromium 五路径。
P1 公共读取文本；P2 保存/options 同步；P3 停止恢复；P4 导出文件名；P5 确认删除 durable={}。
E2E 真实调用 action，但 popup bundle 在 tab 验证；宿主关闭/大小/侧栏/权限弹窗另手测。
CDP 调试开关只用于本次临时 context，不写生产启动方式。

## 5. 设计与步骤

1. 提取到个人空目录，观察 24 hash；有已验证参考工程才传 reference。
2. npm install 生成个人 lock，check/test/build 两目标/artifact。
3. 设 CHROMIUM_PATH 执行 native 与 main，所有运行结束后才能报告。
4. 本地 zip 并列内容/hash；不上传、不签名、不远端写操作。
5. 宿主/平台手测与未验证登记，最后核对文件范围与清理。

<a id="s6"></a>
## 6. 最小可运行示例

以下是完整测试和提取器，不用读者补 mock、步骤或入口：

<a id="file-tests-domain-test-ts"></a>
### tests/domain.test.ts

<!-- file: tests/domain.test.ts -->
```ts
import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import {
  parseItem, parseMessage, authorize, migrate, createRepository,
  ORIGIN, readPublicItem,
} from '../shared/domain';

const item = { id: 'lamp', title: 'Desk lamp', priceCents: 1990, url: `${ORIGIN}/items/lamp` };
const ui = { id: 'ext', url: 'chrome-extension://ext/popup.html' };
const page = { id: 'ext', url: item.url, origin: ORIGIN, frameId: 0, tab: { id: 8, url: item.url } };

describe('boundary contracts', () => {
  it('parses public item and rejects foreign origins, extra fields and negative cents', () => {
    expect(parseItem(item)).toEqual(item);
    for (const value of [{ ...item, url: 'https://example.com/items/lamp' },
      { ...item, cookie: 'not-read' }, { ...item, priceCents: -1 },
      { ...item, url: `${ORIGIN}/items/other` }]) {
      expect(() => parseItem(value)).toThrow();
    }
  });
  it('validates schema rather than trusting TypeScript', () => {
    expect(parseMessage({ v: 1, type: 'SAVE', item, note: '' }).type).toBe('SAVE');
    for (const value of [null, { v: 2, type: 'GET' }, { v: 1, type: 'GET', tabId: 1 },
      { v: 1, type: 'SAVE', item, note: 'x'.repeat(501) }]) {
      expect(() => parseMessage(value)).toThrow();
    }
  });
  it('binds content reports to actual top-frame sender URL and denies UI operations', () => {
    expect(authorize(parseMessage({ v: 1, type: 'REPORT', item }), page, 'ext')).toBe(true);
    for (const sender of [{ ...page, frameId: 1 }, { ...page, origin: 'http://localhost:4173' },
      { ...page, tab: { id: 8, url: `${ORIGIN}/items/book` } }, { ...page, id: 'other' }]) {
      expect(() => authorize(parseMessage({ v: 1, type: 'REPORT', item }), sender, 'ext')).toThrow();
    }
    expect(() => authorize(parseMessage({ v: 1, type: 'DELETE' }), page, 'ext')).toThrow();
    expect(authorize(parseMessage({ v: 1, type: 'DELETE' }), ui, 'ext')).toBe(true);
    expect(authorize(parseMessage({ v: 1, type: 'GET' }), { ...ui, tab: { id: 9 } }, 'ext')).toBe(true);
    expect(() => authorize(parseMessage({ v: 1, type: 'GET' }),
      { ...ui, url: 'chrome-extension://foreign/options.html' }, 'ext')).toThrow();
  });
  it('migrates v1 idempotently and refuses corrupt state', () => {
    const old = { version: 1, favorites: [item] };
    const state = migrate(old, 1000);
    expect(state.items[0].note).toBe('');
    expect(migrate(state, 2000)).toEqual(state);
    expect(() => migrate({ version: 99 })).toThrow();
    expect(() => migrate({ version: 1, favorites: [item, item] }, 1000)).toThrow('STORAGE');
  });
  it('reads only the public article and keeps markup as text', () => {
    const dom = new JSDOM('<article data-market-item="lamp"><h1>&lt;img src=x onerror=alert(1)&gt;</h1><span data-cents="1990"></span></article><input value="ignored">');
    expect(readPublicItem(dom.window.document, item.url).title).toContain('<img');
    expect(() => readPublicItem(dom.window.document, 'http://localhost:4173/items/lamp')).toThrow();
    dom.window.close();
  });
});

describe('single writer storage', () => {
  it('serializes concurrent writes without lost updates', async () => {
    let data: unknown;
    const repo = createRepository({ read: async () => data, write: async value => { data = value; } }, () => 1000);
    await Promise.all([repo.save(item, 'one'), repo.save({ ...item, id: 'book', url: `${ORIGIN}/items/book` }, 'two')]);
    expect((await repo.get()).items.map(row => row.item.id)).toEqual(['lamp', 'book']);
  });
  it('recovers a failed queue and deletes before later reads', async () => {
    let data: unknown;
    let fail = true;
    const repo = createRepository({ read: async () => data, write: async value => {
      if (fail) { fail = false; throw Error('quota'); }
      data = value;
    } }, () => 1000);
    await expect(repo.save(item, '')).rejects.toThrow('quota');
    await repo.save(item, 'kept');
    await repo.clear();
    expect((await repo.get()).items).toEqual([]);
  });
  it('rebuilds from durable state after writer restart and applies retention', async () => {
    let data: unknown;
    const io = { read: async () => data, write: async (value: unknown) => { data = value; } };
    await createRepository(io, () => 1000).save(item, 'persisted');
    expect((await createRepository(io, () => 2000).get()).items[0].note).toBe('persisted');
    await createRepository(io, () => 40 * 86400000).prune();
    expect((await createRepository(io, () => 40 * 86400000).get()).items).toEqual([]);
  });
  it('does not recreate deleted storage during retention alarm', async () => {
    let writes = 0;
    const repo = createRepository({ read: async () => undefined, write: async () => { writes++; } }, () => 1000);
    await repo.prune();
    expect(writes).toBe(0);
  });
  it('rejects the 101st item without removing existing notes', async () => {
    let data: unknown;
    const repo = createRepository({ read: async () => structuredClone(data),
      write: async value => { data = structuredClone(value); } }, () => 1000);
    for (let n = 0; n < 100; n++) {
      await repo.save({ ...item, id: `item-${n}`, url: `${ORIGIN}/items/item-${n}` }, 'kept');
    }
    await expect(repo.save(item, 'overflow')).rejects.toThrow('QUOTA');
    expect((await repo.get()).items).toHaveLength(100);
    expect((await repo.get()).items.every(row => row.note === 'kept')).toBe(true);
  });
  it('retains the exact boundary and removes one millisecond later', async () => {
    let data: unknown;
    let now = 1000;
    const repo = createRepository({ read: async () => structuredClone(data),
      write: async value => { data = structuredClone(value); } }, () => now);
    await repo.save(item, 'boundary');
    await repo.retention(1);
    now += 86400000;
    await repo.prune();
    expect((await repo.get()).items).toHaveLength(1);
    now++;
    await repo.prune();
    expect((await repo.get()).items).toHaveLength(0);
  });
});
```

<a id="file-tests-artifacts-mjs"></a>
### tests/artifacts.mjs

<!-- file: tests/artifacts.mjs -->
```js
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
for (const target of ['chrome', 'firefox']) {
  const root = `.output/${target}-mv3`;
  const manifest = JSON.parse(await readFile(`${root}/manifest.json`, 'utf8'));
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.host_permissions, undefined);
  assert.equal(manifest.content_scripts, undefined);
  assert.equal(manifest.web_accessible_resources, undefined);
  assert.deepEqual(manifest.optional_host_permissions, ['http://127.0.0.1/*']);
  assert.deepEqual(manifest.permissions, ['storage', 'alarms', 'activeTab', 'scripting',
    ...(target === 'chrome' ? ['sidePanel'] : [])]);
  const files = [];
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) await walk(path); else files.push(path);
    }
  }
  await walk(root);
  const fixed = new Set(['manifest.json', 'background.js', 'popup.html',
    'options.html', 'sidepanel.html', 'content-scripts/market.js']);
  const generated = /^(?:assets\/App-[\w-]+\.css|chunks\/(?:App|options|popup|sidepanel)-[\w-]+\.js)$/;
  const names = files.map(path => relative(root, path).split('\\').join('/'));
  assert.equal(names.length, 11, `${target}: unexpected file count`);
  for (const name of fixed) assert.ok(names.includes(name), `${target}: missing ${name}`);
  for (const name of names) {
    assert.ok(fixed.has(name) || generated.test(name), `${target}: unexpected file ${name}`);
  }
  assert.equal(files.some(path => path.endsWith('.map')), false);
  for (const path of files.filter(path => /\.(js|html|json)$/.test(path))) {
    const text = await readFile(path, 'utf8');
    assert.equal(/<all_urls>|https?:\/\/[^"' \t\n]+\.js["']|unsafe-eval/.test(text), false, path);
  }
  assert.equal(target === 'chrome' ? manifest.background.service_worker : manifest.background.scripts[0], 'background.js');
  console.log(`${target} manifest allowlist + ${files.length} files PASS`);
}
```

<a id="file-tests-native-mjs"></a>
### tests/native.mjs

<!-- file: tests/native.mjs -->
```js
import { chromium } from 'playwright';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
const profile = await mkdtemp(join(tmpdir(), 'native-market-'));
let context;
try {
  const path = resolve('native');
  context = await chromium.launchPersistentContext(profile, {
    executablePath: process.env.CHROMIUM_PATH,
    headless: true,
    args: [`--disable-extensions-except=${path}`, `--load-extension=${path}`],
  });
  const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
  const page = await context.newPage();
  await page.goto(`chrome-extension://${new URL(worker.url()).host}/popup.html`);
  await page.getByRole('button', { name: 'Count once' }).click();
  await page.getByText('Count 1', { exact: true }).waitFor();
  await page.reload();
  await page.getByRole('button', { name: 'Count once' }).click();
  await page.getByText('Count 2', { exact: true }).waitFor();
  console.log('Native MV3 installed + popup + message + durable counter PASS');
} finally {
  await context?.close();
  await rm(profile, { recursive: true, force: true });
}
```

<a id="file-tests-browser-mjs"></a>
### tests/browser.mjs

<!-- file: tests/browser.mjs -->
```js
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';
import { startFixture } from '../fixtures/server.mjs';

const fixture = await startFixture();
const profile = await mkdtemp(join(tmpdir(), 'market-profile-'));
let context;
try {
  const path = resolve('.output/chrome-mv3');
  context = await chromium.launchPersistentContext(profile, {
    executablePath: process.env.CHROMIUM_PATH,
    headless: process.env.HEADED !== '1',
    args: ['--enable-unsafe-extension-debugging', `--disable-extensions-except=${path}`, `--load-extension=${path}`],
  });
  const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
  const id = new URL(worker.url()).host;
  const options = await context.newPage();
  options.on('pageerror', error => console.log('OPTIONS_ERROR', error.message));
  options.on('console', msg => { if (msg.type() === 'error') console.log('OPTIONS_CONSOLE', msg.text()); });
  await options.goto(`chrome-extension://${id}/options.html`);
  await options.getByRole('status').filter({ hasText: 'Ready' }).waitFor();
  const market = await context.newPage();
  await market.goto('http://127.0.0.1:4173/items/lamp');
  await market.bringToFront();
  const session = await context.newCDPSession(market);
  const browserSession = await context.browser().newBrowserCDPSession();
  const { targetInfos } = await browserSession.send('Target.getTargets', { filter: [{ type: 'tab' }] });
  const tabTarget = targetInfos.find(row => row.url === market.url());
  assert.ok(tabTarget, 'market tab target exists');
  await browserSession.send('Extensions.triggerAction', { id, targetId: tabTarget.targetId });
  // Playwright does not expose browser-chrome popup targets as normal pages.
  // After invoking the actual action for activeTab, verify its bundled UI in a tab.
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${id}/popup.html`);
  await popup.getByText('Ready', { exact: true }).waitFor();
  await market.bringToFront();
  await popup.getByRole('button', { name: 'Read current item', exact: true }).evaluate(el => el.click());
  await popup.getByText('Public item read', { exact: true }).waitFor();
  assert.equal(await popup.locator('img').count(), 0);
  console.log('P1 public read + text sink PASS');
  const marketTab = await popup.evaluate(async () => (await chrome.tabs.query({ active: true }))[0].id);
  await popup.evaluate(tabId => chrome.scripting.executeScript({
    target: { tabId, frameIds: [0] }, files: ['content-scripts/market.js'],
  }), marketTab);
  await market.locator('#neighbor-helper').waitFor();
  assert.equal(await market.frameLocator('iframe').locator('#neighbor-helper').count(), 0);
  const rejected = await popup.evaluate(async tabId => {
    const results = await chrome.scripting.executeScript({
      target: { tabId, frameIds: [0] },
      func: async () => chrome.runtime.sendMessage({ v: 1, type: 'DELETE' }),
    });
    return results[0].result;
  }, marketTab);
  assert.equal(rejected.ok, false);
  await market.getByRole('button', { name: 'SPA next item' }).click();
  await market.locator('#neighbor-helper').getByText('Public item: Book shelf', { exact: true }).waitFor();
  console.log('Content isolated injection + iframe exclusion + SPA + real sender rejection PASS');
  await popup.getByLabel('Private note', { exact: true }).fill('Local test note');
  await popup.getByRole('button', { name: 'Save locally', exact: true }).click();
  await popup.getByText('Saved locally', { exact: true }).waitFor();
  await options.getByText('Local test note', { exact: true }).waitFor();
  console.log('P2 save + options synchronization PASS');
  await options.bringToFront();
  await session.send('ServiceWorker.enable');
  const versions = [];
  session.on('ServiceWorker.workerVersionUpdated', event => versions.push(...event.versions));
  let stopped;
  await session.send('ServiceWorker.startWorker', { scopeURL: `chrome-extension://${id}/` });
  stopped = await new Promise((resolveDone, reject) => {
    const timeout = setTimeout(() => { clearInterval(check); reject(Error('worker version timeout')); }, 10000);
    const check = setInterval(() => {
      const version = versions.find(row => row.scriptURL === worker.url() && row.runningStatus === 'running');
      if (version) { clearTimeout(timeout); clearInterval(check); resolveDone(version); }
    }, 50);
  });
  await session.send('ServiceWorker.stopWorker', { versionId: stopped.versionId });
  await options.reload();
  await options.getByText('Local test note', { exact: true }).waitFor();
  console.log('P3 worker termination + storage recovery PASS');
  const downloadPromise = options.waitForEvent('download');
  await options.getByRole('button', { name: 'Export local data', exact: true }).click();
  const download = await downloadPromise;
  assert.equal(download.suggestedFilename(), 'market-notes.json');
  console.log('P4 user export PASS');
  await options.getByLabel('Confirm deletion of all extension notes and settings').check();
  await options.getByRole('button', { name: 'Delete all local data', exact: true }).click();
  await options.getByText('All extension data deleted', { exact: true }).waitFor();
  const durable = await options.evaluate(async () => chrome.storage.local.get(null));
  assert.deepEqual(durable, {});
  console.log('P5 confirmed deletion + durable empty state PASS');
  const alarm = await options.evaluate(() => chrome.alarms.get('market-retention'));
  assert.equal(alarm.periodInMinutes, 1);
  await options.keyboard.press('Tab');
  assert.notEqual(await options.evaluate(() => document.activeElement.tagName), 'BODY');
  assert.equal(await options.getByRole('button', { name: 'Delete all local data', exact: true }).isDisabled(), true);
  console.log('Keyboard focus + deletion confirmation + alarm registration PASS');
  console.log(`Installed Chromium extension ${id}; five paths PASS`);
} finally {
  await context?.close();
  await new Promise(resolveDone => fixture.close(resolveDone));
  await rm(profile, { recursive: true, force: true });
}
```

<a id="file-scripts-extract-mjs"></a>
### scripts/extract.mjs

<!-- file: scripts/extract.mjs -->
```js
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { resolve, dirname, relative } from 'node:path';
import { createHash } from 'node:crypto';
const [course, output, reference] = process.argv.slice(2);
if (!course || !output) throw Error('usage: node scripts/extract.mjs COURSE OUTPUT [REFERENCE]');
const root = resolve(output);
await mkdir(root, { recursive: true });
if ((await readdir(root)).length) throw Error('output must be empty; refusing overwrite');
const documents = [
  '12-capstone/01-complete-project-rebuild.md',
  '12-capstone/02-five-path-acceptance.md',
];
let count = 0;
const paths = new Set();
for (const name of documents) {
  const text = await readFile(resolve(course, name), 'utf8');
  for (const match of text.matchAll(/<!-- file: ([\w./-]+) -->\n```[^\n]*\n([\s\S]*?)\n```/g)) {
    const [, path, body] = match;
    const destination = resolve(root, path);
    if (relative(root, destination).startsWith('..')) throw Error('unsafe path');
    if (paths.has(path)) throw Error(`duplicate source ${path}`);
    paths.add(path);
    const source = `${body}\n`;
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, source);
    const hash = createHash('sha256').update(source).digest('hex');
    if (reference) {
      const original = await readFile(resolve(reference, path));
      if (hash !== createHash('sha256').update(original).digest('hex')) throw Error(`hash mismatch ${path}`);
    }
    console.log(`${hash}  ${path}`);
    count++;
  }
}
if (count !== 24) throw Error(`incomplete project: ${count}, expected 24`);
console.log(`extracted ${count} files; ${reference ? 'all hashes match' : 'no reference comparison'}`);
```

在个人 bootstrap 目录执行，将占位路径替换为自己已有目录：

```sh
node scripts/extract.mjs "/absolute/path/to/12-browser-extension" "/absolute/path/to/empty-rebuilt"
cd "/absolute/path/to/empty-rebuilt"
npm install
npm run check
npm test
npm run build:chrome
npm run build:firefox
node tests/artifacts.mjs
CHROMIUM_PATH="/absolute/path/to/chrome-for-testing" node tests/native.mjs
CHROMIUM_PATH="/absolute/path/to/chrome-for-testing" npm run e2e
npm run zip:chrome
npm run zip:firefox
```

预期 extracted 24 files、11 passed、双 manifest PASS、native PASS、P1..P5 PASS。
若参考工程在个人目录，用第三个参数比较每个 hash；没有参考时不能声称一致，仅记录抽取 hash。
E2E 自己启动 fixture，运行前不要另占 4173；finally 关闭 browser/server 并删除自己 mkdtemp profile。
命令结束无测试 session；手工 fixture `Ctrl+C`，手工独立浏览器关掉，移除实验扩展。

<a id="s7"></a>
## 7. 业务集成

| 路径 | 自动证据 | 未自动证明 |
|---|---|---|
| P1 | 实际 activeTab、公開 Item、无 img | 工具栏 popup 尺寸/关闭 |
| P2 | SAVE 响应、options note 同步 | 多设备同步（本卷没有） |
| P3 | CDP stopWorker 后 GET 恢复 | 自然空闲时间与 OS 睡眠 |
| P4 | 用户按钮触发 download、文件名 | 下载内容人工保护 |
| P5 | 确认后 durable={}、再次禁用 | 外部导出/备份删除 |

额外自动断言：顶层 content、iframe 排除、fixture SPA、真实 content DELETE 拒绝、
alarm 周期对象、基本 Tab 焦点。单测覆盖 schema、sender、迁移重复 ID、并发写、失败恢复、
过期、删除后不写、100 项配额和精确保留边界。
手测表：popup 关闭重开/未保存草稿/窄宽、侧栏直接动作/失败/关闭、optional 拒绝/同意/撤销刷新、
全键盘与阅读器、Firefox 安装/权限/sidebar、Safari 条件路线。未做就写未验证。

<a id="s8"></a>
## 8. 错误实验与排查

| 故障 | 失败证据 | 最小修复与复验 |
|---|---|---|
| Markdown 源码漏文件 | 提取数量不足或构建 import 失败 | 补完整文件，重提取/全 hash |
| 文档改了代码却用旧工程测 | hash mismatch | 从当前正文重新建，不改 hash 断言 |
| Firefox 默认 MV2 | artifact MV3 断言失败 | config 显式 MV3，双 build |
| CDP target 用 page | triggerAction 参数失败 | filter type tab；不支持则独立手点并登记 |
| profile/server 未关闭 | 命令挂起或端口被占 | finally 释放自己资源，再运行 |
| 删除后 alarm 重建 key | 单测 writes 不为0 | undefined guard，再跑单测/P5 |

失败日志不包含完整备注、headers、环境或真实数据。连续两次同类修正失败时停止猜测，核对前提。

## 9. 课后思考与答案

1. 什么证据能说明教材可重建？答案：当前 Markdown→24 文件 hash→独立安装检查/测试/构建，不是旧 tmp 工程 PASS。
2. 为什么不自动提交商店？答案：外部写需要授权且本卷禁止；本地候选已满足教程范围。
3. 为什么仍列未验证？答案：编译与模型断言不能证明 Firefox/Safari/宿主提示实际行为。

<a id="s10"></a>
## 10. 分层练习与参考答案

- 基础：从零提取并跑 11 测试。答案：所有源码以 file 标记为准；记录 tool/version/hash/result。
- 进阶：独立只读审查。答案：逐边界追入口→parser→sender→writer→sink，核对全部 manifest 与测试覆盖。
- 故障注入：正文源代码改一字符但保留旧参考。答案：hash 对账拒绝，必须用当前正文重建与测试，不跳过。

<a id="s11"></a>
## 11. 验收清单

- [ ] 24 文件机械提取，全 hash 记录；参考比较范围明确。
- [ ] check/11 test/双 build/artifact/native/main/zip 有本次结果。
- [ ] 五路径与额外断言按具体范围报告。
- [ ] 手测未完成不标通过，无商店上传。
- [ ] profile/server/session 结束；教材只有 Markdown。

## 12. 小结

验证的是当前可重建交付物与明确平台路径，不是作者记忆中的“曾经能跑”。

## 13. 扩展阅读

- [Playwright 扩展](https://playwright.dev/docs/chrome-extensions)
- [Chrome 扩展端到端测试](https://developer.chrome.com/docs/extensions/how-to/test/end-to-end-testing)
- [WXT 发布](https://wxt.dev/guide/essentials/publishing)

## 我现在能做到什么

能把正文、源码、构建产物与真实路径证据对齐，独立报告成功和未验证边界。

## 单元导航

[上一页 EX23](01-complete-project-rebuild.md) · [卷入口](../README.md) · [实际自检](../SELF-CHECK.md)
