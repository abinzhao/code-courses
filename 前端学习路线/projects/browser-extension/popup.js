const button = document.querySelector('#clip');
const status = document.querySelector('#status');
const result = document.querySelector('#result');

chrome.storage.local.get('lastClip').then(({ lastClip }) => {
  if (lastClip) result.textContent = JSON.stringify(lastClip, null, 2);
}).catch(() => {
  status.textContent = '读取本机记录失败';
});

button.addEventListener('click', async () => {
  button.disabled = true;
  status.textContent = '正在采集';
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!Number.isInteger(tab?.id)) throw new Error('未找到活动页面');
    const response = await chrome.runtime.sendMessage({
      type: 'clip:current', tabId: tab.id,
    });
    if (!response?.ok) throw new Error(response?.error ?? '扩展未响应');
    result.textContent = JSON.stringify(response.clip, null, 2);
    status.textContent = '已保存到本机';
  } catch (error) {
    status.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});
