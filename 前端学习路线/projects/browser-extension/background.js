import { validateClip } from './contract.js';

// 初始化存储访问限制。监听器仍在模块顶层同步注册。
const ready = chrome.storage.local.setAccessLevel({
  accessLevel: 'TRUSTED_CONTEXTS',
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 只接受扩展自己的 popup，不允许内容脚本触发特权采集。
  if (sender.id !== chrome.runtime.id ||
      sender.url !== chrome.runtime.getURL('popup.html') ||
      message?.type !== 'clip:current' ||
      !Number.isInteger(message.tabId) || message.tabId < 0) return;

  (async () => {
    await ready;
    // popup 有明确窗口上下文；worker 自行查询 currentWindow 可能取不到标签。
    const tab = await chrome.tabs.get(message.tabId);
    if (!tab.active) throw new Error('目标已不是活动页面');
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => ({
        url: location.href,
        title: document.title,
        // 用户显式选择的文本，不采集表单、Cookie 或完整页面。
        text: (window.getSelection()?.toString() ?? '').slice(0, 2000),
      }),
    });
    const clip = validateClip(results[0]?.result);
    if (!clip) throw new Error('只支持普通 HTTP(S) 页面');
    // 保存单条快照避免读改写数组产生并发丢失；历史列表由后续作业实现。
    await chrome.storage.local.set({ lastClip: clip });
    sendResponse({ ok: true, clip });
  })().catch(() => {
    sendResponse({ ok: false, error: '采集失败：页面受限、权限不足或存储不可用' });
  });
  return true;
});
