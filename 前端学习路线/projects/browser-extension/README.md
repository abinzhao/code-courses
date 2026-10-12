# Atlas Manifest V3 本地采集器

零依赖浏览器扩展：用户点击后采集当前 HTTP(S) 页面的标题与选中文字，最多保存 2000 码元文本到本机，不发送网络请求。

## 加载

1. 在独立 Chrome/Chromium 测试资料打开 `chrome://extensions`。
2. 开启开发者模式，选择“加载已解压的扩展程序”。
3. 选择当前 `browser-extension` 目录。
4. 打开 Atlas `http://127.0.0.1:4173`，选择一段文字。
5. 点击工具栏扩展图标，再点击“采集当前页面”。

这是浏览器扩展，不能用 `npm start` 当网页运行。`npm test` 仅验证数据契约与清单权限，`npm run check` 检查 JS 语法。

## 数据与权限

- `activeTab`：用户操作临时授予当前页访问；导航后不保证持续有效。
- `scripting`：在当前页面 isolated world 读取标题与选中文字。
- `storage`：保存一条 `lastClip`，重启 worker 后从 storage 恢复。
- 无 host_permissions、远端请求、后台全站采集或 Cookie 权限。
- popup 用 textContent 显示数据，并从自己的窗口查询活动 tab ID；worker 仅接受自己 popup 的 `clip:current`，校验 tab ID 与活动状态后采集。worker 不自行假定存在“当前窗口”。
- URL 会去掉 fragment，但保留查询串；用户采集前应确认 URL 没有秘密。产品化作业需设计 query 脱敏规则，不能把任意网页 URL 当无敏感数据。

## 关键验证

| 路径 | 预期 |
|---|---|
| 普通 HTTP(S) 页 | 保存标题、URL 与选中文字 |
| popup 关闭再开 | 读取 lastClip |
| worker 停止后再采集 | 唤醒并正常工作 |
| chrome:// 或商店等受限页面 | 显示可理解的失败，不空白 |
| 未选择文字 | 允许空文本，仅保存标题 |
| HTML 风格选中文字 | 原样显示文本，不执行 |
| 同一 tab 重复采集 | 更新单条快照，无无界增长 |

若调试器保持 worker 活跃，不能用它证明正常生命周期。先关闭 worker DevTools，再停止/闲置并验证重启。

## 继续实现

后续课程要求补齐历史列表、schema 升级、导出、清空确认、可选网站权限和浏览器差异。当前起点只实现最小采集闭环，不包含同步服务、商店发布或自动采集。

课程入口：[MV3 架构](../../L5-架构与纵深能力/09-浏览器扩展开发/01-MV3架构-权限与第一个扩展.md)。
