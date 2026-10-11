# EX23 Capstone：所有应用文件与完整重建

## 任务卡

第 6 周重建、第 10 周答辩；前置 EX01–EX18；产出原生四文件、WXT 三 UI、后台、内容脚本、共享逻辑与 fixture。测试源码在 EX24，二者合起来才是完整工程。

## 1. 任务背景

交付“邻里集市浏览助手”：默认临时读取公开商品，本地备注、保留设置、导出、确认删除；
用户可选持久目标 host 标记。没有登录、同步、预约、自动交易、页面表单采集或远程代码。
教材只有 Markdown，所有工程文件从当前正文重建，不依赖作者机器 `/tmp` 源码。

## 2. 学习目标

独立重建、安装、测试和双平台打包；解释每个权限与每条数据流；
证明 SW 停止恢复、真实 sender 分权、删除真空；明确未验证平台和宿主 UI。

## 3. 前置知识与环境

Node ≥22.12；本次 Node/npm/WXT/React 与浏览器版本见 [BASELINE](../BASELINE.md)。
创建个人空工程目录，不放共享教材目录，不使用日常 browser profile。
复制本文 19 个文件及 [EX24](02-five-path-acceptance.md) 5 个测试/脚本文件，共 24 个；
也可先按 EX24 机械提取。顶层依赖固定，由 npm install 生成个人锁文件。

<a id="s4"></a>
## 4. 核心机制

```text
toolbar action -> activeTab -> popup read -> isolated public DOM -> parseItem
popup/options/sidepanel -> schema + actual sender -> SW single writer -> storage.local
optional host -> runtime content -> public Item REPORT -> sender origin/tab/frame gate
alarm -> SW reconstruction -> durable timestamps -> serialized prune
user export -> local Blob download; confirmed DELETE -> remove market key
```

权威数据只在 storage.local；模块 tail 仅调度、组件 state 仅展示。
UI sender 是 runtime base+固定 HTML path；content 只能 REPORT，不 GET/DELETE；
REPORT 复核当前 tab，DOM title 仍经 parser 与文本 sink。
Item 不是完整 Web Listing；既有 Listing 状态为 available/reserved/sold，本卷不新增状态。
manifest host pattern 比业务 origin 宽，入口始终检查 127.0.0.1:4173。

## 5. 设计与步骤

1. 重建全部 24 文件，逐文件核对路径和围栏。
2. npm install→check→test→双 build→artifact，失败先定位，不能关闭检查。
3. 安装独立 Chromium 主线，启动 fixture，完成读取保存恢复导出删除。
4. 宿主 popup、sidepanel、权限提示另按 EX24 手测，缺平台标未验证。
5. 本地 zip 候选，不上传；关闭 browser/server，清本次 profile。

<a id="s6"></a>
## 6. 最小可运行示例

下面每段均是**完整文件**，`file` 标记供 EX24 提取。不要复制外层 Markdown。
`.wxt`、`.output`、node_modules、package-lock.json 由工具生成，不手写进教材。

<a id="file-package-json"></a>
### package.json

<!-- file: package.json -->
```json
{
  "name": "neighbor-market-extension",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "wxt",
    "prepare": "wxt prepare",
    "check": "wxt prepare && tsc --noEmit",
    "test": "vitest run",
    "build:chrome": "wxt build -b chrome",
    "build:firefox": "wxt build -b firefox",
    "zip:chrome": "wxt zip -b chrome",
    "zip:firefox": "wxt zip -b firefox",
    "fixture": "node fixtures/server.mjs",
    "e2e": "node tests/browser.mjs"
  },
  "dependencies": {
    "react": "19.3.0",
    "react-dom": "19.3.0"
  },
  "devDependencies": {
    "@types/react": "19.2.14",
    "@types/react-dom": "19.2.3",
    "@wxt-dev/module-react": "1.2.2",
    "wxt": "0.21.4",
    "typescript": "5.9.3",
    "vitest": "5.0.3",
    "jsdom": "29.0.0",
    "playwright": "1.64.0"
  }
}
```

<a id="file-tsconfig-json"></a>
### tsconfig.json

<!-- file: tsconfig.json -->
```json
{
  "extends": "./.wxt/tsconfig.json",
  "compilerOptions": {
    "strict": true,
    "jsx": "react-jsx",
    "types": ["vite/client"]
  },
  "exclude": ["node_modules", ".output", "tests"]
}
```

<a id="file-wxt-config-ts"></a>
### wxt.config.ts

<!-- file: wxt.config.ts -->
```ts
import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifestVersion: 3,
  hooks: {
    'build:manifestGenerated': (_wxt, manifest) => {
      // Runtime registration must not turn optional host access into install-time access.
      delete manifest.host_permissions;
    },
  },
  manifest: ({ browser }) => ({
    name: 'Neighbor Market Helper',
    description: 'Local notes for public loopback market items. No account or remote sync.',
    permissions: ['storage', 'alarms', 'activeTab', 'scripting', ...(browser === 'chrome' ? ['sidePanel'] : [])],
    optional_host_permissions: ['http://127.0.0.1/*'],
    content_security_policy: { extension_pages: "script-src 'self'; object-src 'self'; connect-src http://127.0.0.1:4173" },
    ...(browser === 'firefox' ? {
      browser_specific_settings: {
        gecko: {
          id: 'neighbor-market@example.invalid',
          strict_min_version: '140.0',
          data_collection_permissions: { required: ['none'] },
        },
      },
    } : { minimum_chrome_version: '120' }),
  }),
});
```

<a id="file-shared-domain-ts"></a>
### shared/domain.ts

<!-- file: shared/domain.ts -->
```ts
export const ORIGIN = 'http://127.0.0.1:4173';
export const HOST = `${ORIGIN}/*`;
export type Item = { id: string; title: string; priceCents: number; url: string };
export type State = {
  version: 2; retentionDays: number;
  items: { item: Item; note: string; updatedAt: number }[];
};
export type Message =
  | { v: 1; type: 'REPORT'; item: Item }
  | { v: 1; type: 'SAVE'; item: Item; note: string }
  | { v: 1; type: 'SET_RETENTION'; days: number }
  | { v: 1; type: 'GET' | 'DELETE' };

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('SCHEMA');
  return value as Record<string, unknown>;
}
function keys(value: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(value).length !== allowed.length ||
      Object.keys(value).some(key => !allowed.includes(key))) throw Error('SCHEMA');
}
function text(value: unknown, max: number): string {
  if (typeof value !== 'string' || value.length > max) throw Error('SCHEMA');
  return value;
}
export function targetUrl(raw: unknown): string {
  const url = new URL(text(raw, 300));
  if (url.origin !== ORIGIN || url.username || url.password ||
      url.search || url.hash || !/^\/items\/[a-z0-9-]{1,40}$/.test(url.pathname)) {
    throw Error('ORIGIN');
  }
  return url.href;
}
export function parseItem(value: unknown): Item {
  const row = record(value);
  keys(row, ['id', 'title', 'priceCents', 'url']);
  const id = text(row.id, 40);
  const title = text(row.title, 120).trim();
  const url = targetUrl(row.url);
  if (!/^[a-z0-9-]{1,40}$/.test(id) || !title || new URL(url).pathname !== `/items/${id}` ||
      !Number.isSafeInteger(row.priceCents) || (row.priceCents as number) < 0 ||
      (row.priceCents as number) > 100000000) throw Error('SCHEMA');
  return { id, title, priceCents: row.priceCents as number, url };
}
export function parseMessage(value: unknown): Message {
  const row = record(value);
  if (row.v !== 1) throw Error('VERSION');
  if (row.type === 'GET' || row.type === 'DELETE') {
    keys(row, ['v', 'type']);
    return { v: 1, type: row.type };
  }
  if (row.type === 'REPORT' || row.type === 'SAVE') {
    keys(row, row.type === 'REPORT' ? ['v', 'type', 'item'] : ['v', 'type', 'item', 'note']);
    const item = parseItem(row.item);
    return row.type === 'REPORT' ? { v: 1, type: 'REPORT', item } :
      { v: 1, type: 'SAVE', item, note: text(row.note, 500) };
  }
  if (row.type === 'SET_RETENTION') {
    keys(row, ['v', 'type', 'days']);
    if (![1, 7, 30].includes(row.days as number)) throw Error('SCHEMA');
    return { v: 1, type: 'SET_RETENTION', days: row.days as number };
  }
  throw Error('TYPE');
}
type Sender = {
  id?: string; url?: string; origin?: string; frameId?: number;
  tab?: { id?: number; url?: string };
};
export function authorize(msg: Message, sender: Sender, extensionId: string,
  extensionBase = `chrome-extension://${extensionId}/`): true {
  if (sender.id !== extensionId) throw Error('SENDER');
  if (msg.type === 'REPORT') {
    if (!Number.isInteger(sender.tab?.id) || sender.frameId !== 0 ||
        sender.origin !== ORIGIN || new URL(sender.url ?? '').origin !== ORIGIN ||
        targetUrl(sender.tab?.url) !== msg.item.url) throw Error('SENDER');
  } else {
    const url = new URL(sender.url ?? '');
    const base = new URL(extensionBase);
    if (url.protocol !== base.protocol || url.host !== base.host ||
        !['/popup.html', '/options.html', '/sidepanel.html'].includes(url.pathname) ||
        url.search || url.hash) throw Error('SENDER');
  }
  return true;
}
export function migrate(value: unknown, now: number): State {
  if (value === undefined) return { version: 2, retentionDays: 30, items: [] };
  const row = record(value);
  if (row.version === 1) {
    keys(row, ['version', 'favorites']);
    if (!Array.isArray(row.favorites) || row.favorites.length > 100) throw Error('STORAGE');
    const items = row.favorites.map(item => ({ item: parseItem(item), note: '', updatedAt: now }));
    if (new Set(items.map(entry => entry.item.id)).size !== items.length) throw Error('STORAGE');
    return {
      version: 2, retentionDays: 30,
      items,
    };
  }
  keys(row, ['version', 'retentionDays', 'items']);
  if (row.version !== 2 || ![1, 7, 30].includes(row.retentionDays as number) ||
      !Array.isArray(row.items) || row.items.length > 100) throw Error('STORAGE');
  const items = row.items.map(value => {
    const entry = record(value);
    keys(entry, ['item', 'note', 'updatedAt']);
    if (!Number.isSafeInteger(entry.updatedAt) || (entry.updatedAt as number) < 0) throw Error('STORAGE');
    return { item: parseItem(entry.item), note: text(entry.note, 500), updatedAt: entry.updatedAt as number };
  });
  if (new Set(items.map(entry => entry.item.id)).size !== items.length) throw Error('STORAGE');
  return { version: 2, retentionDays: row.retentionDays as number, items };
}
export function readPublicItem(doc: Document, url: string): Item {
  targetUrl(url);
  const article = doc.querySelector('article[data-market-item]');
  if (!article) throw Error('NO_ITEM');
  const cents = article.querySelector('[data-cents]')?.getAttribute('data-cents') ?? '';
  if (!/^(0|[1-9]\d*)$/.test(cents)) throw Error('SCHEMA');
  return parseItem({
    id: article.getAttribute('data-market-item'),
    title: article.querySelector('h1')?.textContent,
    priceCents: Number(cents), url,
  });
}
type IO = { read(): Promise<unknown>; write(value: State): Promise<void>; remove?(): Promise<void> };
export function createRepository(io: IO, clock: () => number) {
  let tail: Promise<unknown> = Promise.resolve();
  function serial<T>(task: () => Promise<T>): Promise<T> {
    const next = tail.then(task);
    tail = next.catch(() => undefined);
    return next;
  }
  async function load() {
    const raw = await io.read();
    const state = migrate(raw, clock());
    if (raw !== undefined && record(raw).version === 1) await io.write(state);
    return state;
  }
  function update(change: (state: State) => State) {
    return serial(async () => {
      const state = change(await load());
      if (new TextEncoder().encode(JSON.stringify(state)).byteLength > 200000) throw Error('QUOTA');
      await io.write(state);
      return state;
    });
  }
  return {
    get: () => serial(load),
    save: (raw: unknown, note: string) => update(state => {
      const item = parseItem(raw);
      const entry = { item, note: text(note, 500), updatedAt: clock() };
      const index = state.items.findIndex(row => row.item.id === item.id);
      if (index < 0) state.items.push(entry); else state.items[index] = entry;
      if (state.items.length > 100) throw Error('QUOTA');
      return state;
    }),
    retention: (days: number) => update(state => {
      if (![1, 7, 30].includes(days)) throw Error('SCHEMA');
      return { ...state, retentionDays: days };
    }),
    clear: () => serial(async () => {
      if (io.remove) await io.remove(); else await io.write(migrate(undefined, clock()));
      return migrate(undefined, clock());
    }),
    prune: () => serial(async () => {
      const raw = await io.read();
      if (raw === undefined) return migrate(undefined, clock());
      const state = migrate(raw, clock());
      state.items = state.items.filter(row => clock() - row.updatedAt <= state.retentionDays * 86400000);
      await io.write(state);
      return state;
    }),
  };
}
```

<a id="file-shared-app-tsx"></a>
### shared/App.tsx

<!-- file: shared/App.tsx -->
```tsx
import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { HOST, ORIGIN, migrate, parseItem, targetUrl, type Item, type Message, type State } from './domain';
import './ui.css';

async function request(msg: Message): Promise<State> {
  const response: unknown = await browser.runtime.sendMessage(msg);
  if (!response || typeof response !== 'object' || !('ok' in response) || response.ok !== true ||
      !('data' in response)) throw Error('Request rejected; storage may be corrupt or full');
  return migrate(response.data, Date.now());
}
export function App({ mode }: { mode: 'popup' | 'options' | 'sidepanel' }) {
  const [state, setState] = useState<State>({ version: 2, retentionDays: 30, items: [] });
  const [item, setItem] = useState<Item>();
  const [note, setNote] = useState('');
  const [status, setStatus] = useState('Loading');
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [windowId, setWindowId] = useState<number>();
  useEffect(() => {
    let alive = true;
    void browser.windows.getCurrent().then(win => {
      if (alive) setWindowId(win.id);
    }, () => { if (alive) setStatus('Window unavailable'); });
    void request({ v: 1, type: 'GET' }).then(value => {
      if (alive) { setState(value); setStatus('Ready'); }
    }, () => { if (alive) setStatus('Unable to read saved data'); });
    const change = () => {
      void request({ v: 1, type: 'GET' }).then(value => { if (alive) setState(value); },
        () => { if (alive) setStatus('Refresh failed'); });
    };
    browser.storage.onChanged.addListener(change);
    return () => { alive = false; browser.storage.onChanged.removeListener(change); };
  }, []);
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    try { await action(); }
    catch (error) { setStatus(error instanceof Error ? error.message : 'Operation failed'); }
    finally { setBusy(false); }
  }
  async function read() {
    const [tab] = await browser.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab?.id || !tab.url) throw Error('Open the target page and click the toolbar action first');
    const url = targetUrl(tab.url);
    const results = await browser.scripting.executeScript({
      target: { tabId: tab.id, frameIds: [0] },
      func: () => {
        if (location.origin !== 'http://127.0.0.1:4173') return null;
        const article = document.querySelector('article[data-market-item]');
        const cents = article?.querySelector('[data-cents]')?.getAttribute('data-cents') ?? '';
        if (!/^(0|[1-9]\d*)$/.test(cents)) return null;
        return { id: article?.getAttribute('data-market-item'),
          title: article?.querySelector('h1')?.textContent, priceCents: Number(cents), url: location.href };
      },
    });
    const value = parseItem(results[0]?.result);
    if (value.url !== url || targetUrl((await browser.tabs.get(tab.id)).url) !== url) throw Error('Page changed; read again');
    setItem(value);
    setStatus('Public item read');
  }
  async function grant() {
    // Invoke the permission prompt directly inside the user gesture.
    const accepted = await browser.permissions.request({ origins: [HOST] });
    if (!accepted) { setStatus('Permission declined; use toolbar activeTab'); return; }
    if (!(await browser.scripting.getRegisteredContentScripts()).some(row => row.id === 'market')) {
      await browser.scripting.registerContentScripts([{
        id: 'market', matches: [HOST], js: ['content-scripts/market.js'],
        allFrames: false, runAt: 'document_idle',
      }]);
    }
    setStatus('Target host enabled; reload the market page');
  }
  async function revoke() {
    await browser.scripting.unregisterContentScripts({ ids: ['market'] });
    await browser.permissions.remove({ origins: [HOST] });
    setItem(undefined);
    setStatus('Host permission removed; reload existing pages to remove injected scripts');
  }
  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'market-notes.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus('Export requested; exported files are outside extension deletion');
  }
  return <main>
    <h1>Neighbor Market Helper</h1>
    <p>Public items at {ORIGIN}. Notes stay on this device.</p>
    <p role="status" aria-live="polite">{status}</p>
    <button disabled={busy} onClick={() => void run(grant)}>Enable target host</button>
    <button disabled={busy} onClick={() => void run(revoke)}>Revoke target host</button>
    {mode !== 'options' && <>
      <button disabled={busy} onClick={() => void run(read)}>Read current item</button>
      {item && <section aria-label="Current item">
        <h2>{item.title}</h2><p>{(item.priceCents / 100).toFixed(2)} yuan</p>
        <label>Private note<textarea maxLength={500} value={note} onChange={event => setNote(event.target.value)} /></label>
        <button disabled={busy} onClick={() => void run(async () => {
          setState(await request({ v: 1, type: 'SAVE', item, note })); setStatus('Saved locally');
        })}>Save locally</button>
      </section>}
    </>}
    <h2>Saved items ({state.items.length})</h2>
    <ul>{state.items.map(row => <li key={row.item.id}>
      <strong>{row.item.title}</strong><p>{row.note}</p>
    </li>)}</ul>
    <label>Retention days<select value={state.retentionDays} disabled={busy}
      onChange={event => void run(async () => {
        setState(await request({ v: 1, type: 'SET_RETENTION', days: Number(event.target.value) }));
        setStatus('Retention saved');
      })}>
      {[1, 7, 30].map(day => <option key={day} value={day}>{day}</option>)}
    </select></label>
    <button onClick={exportData} disabled={busy}>Export local data</button>
    <label><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />
      Confirm deletion of all extension notes and settings</label>
    <button disabled={busy || !confirmed} onClick={() => void run(async () => {
      setState(await request({ v: 1, type: 'DELETE' })); setItem(undefined); setNote('');
      setConfirmed(false); setStatus('All extension data deleted');
    })}>Delete all local data</button>
    <button onClick={() => void browser.runtime.openOptionsPage().catch(() => setStatus('Options unavailable'))}>Open options</button>
    {mode === 'popup' && <button onClick={() => {
      if (import.meta.env.FIREFOX) {
        const firefox = browser as unknown as { sidebarAction: { open(): Promise<void> } };
        void firefox.sidebarAction.open().catch(() => setStatus('Sidebar unavailable'));
      } else {
        if (windowId === undefined) { setStatus('Window unavailable'); return; }
        void browser.sidePanel.open({ windowId }).catch(() => setStatus('Side panel needs a direct toolbar gesture'));
      }
    }}>Open side panel</button>}
  </main>;
}
```

<a id="file-shared-ui-css"></a>
### shared/ui.css

<!-- file: shared/ui.css -->
```css
:root { color-scheme: light dark; font: 16px/1.5 system-ui; }
body { margin: 0; min-width: 300px; }
main { max-width: 42rem; padding: 1rem; }
h1 { font-size: 1.3rem; }
button, textarea, select { font: inherit; max-width: 100%; }
button { margin: .25rem; padding: .5rem; }
label { display: block; margin-block: .75rem; }
textarea { display: block; width: 95%; min-height: 4rem; }
li { overflow-wrap: anywhere; }
:focus-visible { outline: 3px solid Highlight; outline-offset: 2px; }
@media (forced-colors: active) { button { border: 1px solid ButtonText; } }
```

<a id="file-entrypoints-background-ts"></a>
### entrypoints/background.ts

<!-- file: entrypoints/background.ts -->
```ts
import { browser } from 'wxt/browser';
import { defineBackground } from 'wxt/utils/define-background';
import { authorize, createRepository, parseMessage } from '../shared/domain';

export default defineBackground(() => {
  const repo = createRepository({
    read: async () => (await browser.storage.local.get('market')).market,
    write: state => browser.storage.local.set({ market: state }),
    remove: () => browser.storage.local.remove('market'),
  }, Date.now);
  const alarmName = 'market-retention';
  async function ensureAlarm() {
    if (!(await browser.alarms.get(alarmName))) {
      await browser.alarms.create(alarmName, { periodInMinutes: 1 });
    }
  }
  browser.runtime.onMessage.addListener((raw, sender, respond) => {
    void (async () => {
      const msg = parseMessage(raw);
      authorize(msg, sender, browser.runtime.id, browser.runtime.getURL('/'));
      if (msg.type === 'REPORT') {
        const current = await browser.tabs.get(sender.tab!.id!);
        if (current.url !== msg.item.url) throw Error('PAGE_CHANGED');
        return { accepted: true };
      }
      if (msg.type === 'SAVE') return repo.save(msg.item, msg.note);
      if (msg.type === 'DELETE') return repo.clear();
      if (msg.type === 'SET_RETENTION') return repo.retention(msg.days);
      return repo.get();
    })().then(data => respond({ ok: true, data }), () => respond({ ok: false, error: 'REQUEST_FAILED' }));
    return true;
  });
  browser.alarms.onAlarm.addListener(alarm => {
    if (alarm.name === alarmName) void repo.prune().catch(() => console.warn('RETENTION_FAILED'));
  });
  browser.runtime.onInstalled.addListener(() => {
    void repo.get().catch(() => console.warn('MIGRATION_FAILED'));
    void ensureAlarm().catch(() => console.warn('ALARM_FAILED'));
  });
  browser.runtime.onStartup.addListener(() => void ensureAlarm().catch(() => console.warn('ALARM_FAILED')));
  void ensureAlarm().catch(() => console.warn('ALARM_FAILED'));
  // Chrome hides private notes from untrusted content-script storage contexts.
  if ('setAccessLevel' in browser.storage.local) {
    void browser.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' })
      .catch(() => console.warn('STORAGE_ACCESS_FAILED'));
  }
});
```

<a id="file-entrypoints-market-content-ts"></a>
### entrypoints/market.content.ts

<!-- file: entrypoints/market.content.ts -->
```ts
import { browser } from 'wxt/browser';
import { defineContentScript } from 'wxt/utils/define-content-script';
import { ORIGIN, readPublicItem } from '../shared/domain';

export default defineContentScript({
  matches: ['http://127.0.0.1/*'],
  registration: 'runtime',
  allFrames: false,
  runAt: 'document_idle',
  main(ctx) {
    if (location.origin !== ORIGIN || window.top !== window) return;
    const marker = document.createElement('aside');
    marker.id = 'neighbor-helper';
    marker.setAttribute('aria-label', 'Market helper');
    const shadow = marker.attachShadow({ mode: 'open' });
    const status = document.createElement('p');
    status.setAttribute('role', 'status');
    shadow.append(status);
    document.body.append(marker);
    let last = '';
    function refresh() {
      try {
        const item = readPublicItem(document, location.href);
        const next = JSON.stringify(item);
        if (next === last) return;
        last = next;
        status.textContent = `Public item: ${item.title}`;
        void browser.runtime.sendMessage({ v: 1, type: 'REPORT', item }).then(response => {
          if (!response?.ok) status.textContent = 'Page report rejected';
        }, () => { status.textContent = 'Extension unavailable; reload page'; });
      } catch {
        last = '';
        status.textContent = 'Not a supported public item';
      }
    }
    let queued = false;
    const observer = new MutationObserver(records => {
      if (records.every(row => row.target === marker || marker.contains(row.target))) return;
      if (queued) return;
      queued = true;
      queueMicrotask(() => { queued = false; refresh(); });
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true });
    ctx.addEventListener(window, 'popstate', refresh);
    ctx.addEventListener(window, 'pageshow', refresh);
    ctx.onInvalidated(() => { observer.disconnect(); marker.remove(); });
    refresh();
  },
});
```

<a id="file-entrypoints-popup-index-html"></a>
### entrypoints/popup/index.html

<!-- file: entrypoints/popup/index.html -->
```html
<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Neighbor Market Helper</title></head>
<body><div id="root"></div><script type="module" src="./main.tsx"></script></body>
</html>
```

<a id="file-entrypoints-popup-main-tsx"></a>
### entrypoints/popup/main.tsx

<!-- file: entrypoints/popup/main.tsx -->
```tsx
import { createRoot } from 'react-dom/client';
import { App } from '../../shared/App';
createRoot(document.getElementById('root')!).render(<App mode="popup" />);
```

<a id="file-entrypoints-options-index-html"></a>
### entrypoints/options/index.html

<!-- file: entrypoints/options/index.html -->
```html
<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="manifest.open_in_tab" content="true"><title>Market settings</title></head>
<body><div id="root"></div><script type="module" src="./main.tsx"></script></body>
</html>
```

<a id="file-entrypoints-options-main-tsx"></a>
### entrypoints/options/main.tsx

<!-- file: entrypoints/options/main.tsx -->
```tsx
import { createRoot } from 'react-dom/client';
import { App } from '../../shared/App';
createRoot(document.getElementById('root')!).render(<App mode="options" />);
```

<a id="file-entrypoints-sidepanel-index-html"></a>
### entrypoints/sidepanel/index.html

<!-- file: entrypoints/sidepanel/index.html -->
```html
<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Market side panel</title></head>
<body><div id="root"></div><script type="module" src="./main.tsx"></script></body>
</html>
```

<a id="file-entrypoints-sidepanel-main-tsx"></a>
### entrypoints/sidepanel/main.tsx

<!-- file: entrypoints/sidepanel/main.tsx -->
```tsx
import { createRoot } from 'react-dom/client';
import { App } from '../../shared/App';
createRoot(document.getElementById('root')!).render(<App mode="sidepanel" />);
```

<a id="file-fixtures-server-mjs"></a>
### fixtures/server.mjs

<!-- file: fixtures/server.mjs -->
```js
import http from 'node:http';

export function startFixture() {
  const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'");
    if (req.url === '/spa.js') {
      res.setHeader('Content-Type', 'text/javascript');
      res.end(`document.querySelector('#next').addEventListener('click', () => {
        history.pushState({}, '', '/items/book');
        const article = document.querySelector('article');
        article.dataset.marketItem = 'book';
        article.querySelector('h1').textContent = 'Book shelf';
        article.querySelector('[data-cents]').dataset.cents = '2500';
      });`);
      return;
    }
    if (req.url === '/api/public') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ status: 'public-fixture', itemCount: 2 }));
      return;
    }
    const id = req.url === '/items/book' ? 'book' : 'lamp';
    const title = id === 'book' ? 'Book shelf' : '&lt;img src=x onerror=alert(1)&gt; Desk lamp';
    const frame = req.url?.includes('frame=1');
    res.end(`<!doctype html><html lang="en"><meta charset="utf-8"><title>Public market fixture</title>
      <body><article data-market-item="${id}"><h1>${title}</h1><p data-cents="1990">19.90 yuan</p></article>
      <button id="next">SPA next item</button>${frame ? '' : '<iframe title="Embedded public item" src="/items/book?frame=1"></iframe>'}
      <script src="/spa.js"></script></body></html>`);
  });
  return new Promise(resolve => server.listen(4173, '127.0.0.1', () => resolve(server)));
}
if (process.argv[1]?.endsWith('/server.mjs')) {
  const server = await startFixture();
  console.log('Fixture at http://127.0.0.1:4173/items/lamp');
  const stop = () => server.close();
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}
```

<a id="file-native-manifest-json"></a>
### native/manifest.json

<!-- file: native/manifest.json -->
```json
{
  "manifest_version": 3,
  "name": "Market Native Lab",
  "version": "1.0.0",
  "minimum_chrome_version": "120",
  "permissions": ["storage", "activeTab", "scripting", "alarms"],
  "background": { "service_worker": "worker.js" },
  "action": { "default_popup": "popup.html" },
  "content_security_policy": { "extension_pages": "script-src 'self'; object-src 'self'" }
}
```

<a id="file-native-worker-js"></a>
### native/worker.js

<!-- file: native/worker.js -->
```js
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id || sender.url !== chrome.runtime.getURL('popup.html') ||
      !message || message.type !== 'COUNT' || Object.keys(message).length !== 1) {
    respond({ ok: false }); return false;
  }
  void chrome.storage.local.get('count').then(async data => {
    const count = Number.isSafeInteger(data.count) ? data.count : 0;
    await chrome.storage.local.set({ count: count + 1 });
    respond({ ok: true, count: count + 1 });
  }, () => respond({ ok: false }));
  return true;
});
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'lab') console.info('LAB_ALARM');
});
chrome.runtime.onInstalled.addListener(() => {
  void chrome.alarms.create('lab', { periodInMinutes: 1 });
});
```

<a id="file-native-popup-html"></a>
### native/popup.html

<!-- file: native/popup.html -->
```html
<!doctype html>
<html lang="en"><meta charset="utf-8"><title>Market Native Lab</title>
<body><button id="read">Read public title</button><button id="count">Count once</button>
<p id="status" role="status"></p><script src="popup.js"></script></body></html>
```

<a id="file-native-popup-js"></a>
### native/popup.js

<!-- file: native/popup.js -->
```js
const status = document.querySelector('#status');
const countButton = document.querySelector('#count');
countButton.addEventListener('click', async () => {
  countButton.disabled = true;
  try {
    const response = await chrome.runtime.sendMessage({ type: 'COUNT' });
    status.textContent = response?.ok ? `Count ${response.count}` : 'Count rejected';
  } catch { status.textContent = 'Worker unavailable'; }
  finally { countButton.disabled = false; }
});
document.querySelector('#read').addEventListener('click', async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = new URL(tab.url);
    if (url.origin !== 'http://127.0.0.1:4173' || !/^\/items\/[a-z0-9-]+$/.test(url.pathname)) {
      throw Error('Target only');
    }
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id, frameIds: [0] },
      func: () => {
        if (location.origin !== 'http://127.0.0.1:4173') return null;
        return document.querySelector('article[data-market-item] h1')?.textContent ?? null;
      },
    });
    if (typeof result.result !== 'string' || result.result.length > 120) throw Error('Invalid public title');
    status.textContent = result.result;
  } catch { status.textContent = 'Open target and invoke toolbar action'; }
});
```

完整运行命令，在个人工程逐条执行：

```sh
npm install
npm run check
npm test
npm run build:chrome
npm run build:firefox
node tests/artifacts.mjs
```

预期测试与两份 manifest 白名单通过；真实结果见 SELF-CHECK。
手动演示单独终端 `npm run fixture`，浏览器加载 `.output/chrome-mv3`，打开
`http://127.0.0.1:4173/items/lamp`，工具栏调用后 Read current item→Save locally。
不要同时运行 fixture 与自动 E2E，因为 E2E 自己绑定 4173。
停止：fixture `Ctrl+C`，关独立浏览器，移除练习扩展；自动脚本 finally 负责其临时 profile。

<a id="s7"></a>
## 7. 业务集成

popup 临时读；options 管设置/导出删除；sidepanel 共享 UI，但宿主开启方式按目标分支。
默认没有必选 host、静态 content、WAR；Enable target host 经用户 request 再注册；
拒绝保持临时模式，Revoke 后刷新旧页。
notes 只从扩展 textarea 输入，React 文本渲染，不读取网页 form/cookie/password。
若 UI 关闭时 SAVE 响应未知，重开 GET；id upsert 支持可解释的人工重试，非自动无限重发。
v1 转 v2 拒绝重复 ID/坏数据；v2 校验每次读；业务 100 项、200000 UTF-8 bytes；
local 平台配额另 catch。当前数量/字段预算下业务 byte 上限是额外防线，不宣称测试已达到字节上限。
DELETE 移除 notes/settings key，不撤权限、不删导出文件；alarm 后仍不写空 key。

<a id="s8"></a>
## 8. 错误实验与排查

| 实验 | 必须看到的失败 | 原因与修复 | 复验 |
|---|---|---|---|
| 删除 manifest hook | artifact 拒绝必选 host | WXT runtime 入口仍生成 host；恢复 hook | 双 build/artifact |
| content 发 DELETE | ok=false | UI/content 分权 | 真 sender E2E |
| v1 重复 ID | STORAGE | 不能生成后续不可读 v2；恢复/显式处理旧数据 | domain tests |
| io.write 一次拒绝 | 本次失败、下一次成功 | 调度 tail 恢复不吞调用者失败 | 单测 |
| prune undefined 也写 | writes=0 断言失败 | 删除后重建 key | 修 guard→单测→P5 |
| SPA URL/DOM 更新 | Book shelf 标记 | 当前 tab 绑定与 DOM observer | E2E |

只在个人工程注入错误，恢复完整源码后再生成候选。不要放宽权限、吞错误或删断言。

## 9. 课后思考与答案

1. 主线与原生计数区别？答案：原生只演示串行用户动作；主线采用唯一业务 writer、strict parser、迁移与完整删除。
2. 能直接接真实集市账号吗？答案：不能；需另定接口、用户授权、数据合同和安全评审，当前不读认证数据。
3. Firefox build 可否算五路径通过？答案：不能，真实五路径只在本次隔离 Chromium 上执行。

<a id="s10"></a>
## 10. 分层练习与参考答案

- 基础：全文件从正文重建。答案：24 文件，extract hash 与源参考一致，再 install/check/test/build。
- 进阶：答辩一致性范围。答案：单 SW 接受操作按队列执行；终止中响应未知，恢复从 storage，非事务数据库。
- 故障注入：伪 UI URL 与页面 DELETE。答案：scheme/host/path/sender gate 拒绝，durable 数据不变。

<a id="s11"></a>
## 11. 验收清单

- [ ] 19 应用文件+EX24 的 5 测试/脚本完整重建。
- [ ] check、11 单测、双 build、artifact、原生和五路径运行完成。
- [ ] 公开字段/文本 sink/实际 sender/串行写/恢复/删除边界可解释。
- [ ] 不使用 all_urls、秘密、远程代码、远程同步或商店上传。
- [ ] 测试 context/server/profile 清理，剩余未验证项登记。

## 12. 小结

完整工程不只是 UI 源码：配置、入口、fixture、测试与恢复合同共同构成可重建交付。

## 13. 扩展阅读

- [WXT](https://wxt.dev/guide/installation)
- [Chrome 平台概念](https://developer.chrome.com/docs/extensions/develop)
- [MDN WebExtensions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)

## 我现在能做到什么

能交付所有文件齐备、权限最小、状态可恢复且验证范围可审计的本地浏览助手。

## 单元导航

[上一页 EX22](../11-release/02-safari-conversion-signing.md) · [卷入口](../README.md) · [下一页 EX24](02-five-path-acceptance.md)
