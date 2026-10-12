import test from 'node:test';
import assert from 'node:assert/strict';

test('popup 指定 tab，worker 校验消息与活动状态后采集', async () => {
  let listener;
  let stored;
  let executions = 0;
  globalThis.chrome = {
    runtime: {
      id: 'lab-extension',
      getURL: path => `chrome-extension://lab-extension/${path}`,
      onMessage: { addListener: value => { listener = value; } },
    },
    tabs: {
      get: async id => ({ id, active: id === 7 }),
      // worker 没有可靠的聚焦窗口，旧逻辑在此取不到标签。
      query: async () => [],
    },
    scripting: {
      executeScript: async ({ target }) => {
        executions += 1;
        assert.equal(target.tabId, 7);
        return [{ result: { url: 'https://example.invalid/', title: 'Atlas', text: '测试' } }];
      },
    },
    storage: { local: {
      setAccessLevel: async () => {},
      set: async value => { stored = value; },
    } },
  };
  try {
    await import('../background.js');
    const sender = { id: 'lab-extension', url: 'chrome-extension://lab-extension/popup.html' };
    assert.equal(listener({ type: 'clip:current', tabId: 7 }, { ...sender, url: 'https://example.invalid/' }, () => assert.fail('非 popup 不可触发')), undefined);
    assert.equal(executions, 0);
    assert.equal(listener({ type: 'clip:current', tabId: '7' }, sender, () => assert.fail('非法 tab ID 不可触发')), undefined);
    assert.equal(executions, 0);
    const send = message => new Promise(resolve => {
      assert.equal(listener(message, sender, resolve), true);
    });
    const denied = await send({ type: 'clip:current', tabId: 8 });
    assert.equal(denied.ok, false);
    assert.equal(executions, 0);
    const response = await send({ type: 'clip:current', tabId: 7 });
    assert.equal(response.ok, true);
    assert.equal(executions, 1);
    assert.deepEqual(stored.lastClip, response.clip);
  } finally {
    delete globalThis.chrome;
  }
});
