# Atlas 本地安全靶场

零依赖、虚构数据、只监听 `127.0.0.1:4185`，包含反射 HTML 注入/XSS、对象越权、开放重定向和跨源资料更新的漏洞版与修复版。

## 启动

```bash
cd 前端学习路线/projects/security-lab
npm test
npm start
```

默认修复版。先停止服务，再运行 `npm run start:vulnerable` 切换漏洞版。不要同时占用同一端口。访问 `http://127.0.0.1:4185`。

## 四个实验

| 实验 | 请求 | 漏洞版 | 修复版 |
|---|---|---|---|
| XSS | `/preview?title=编码后的标记` | 原样进入 HTML | 输出编码并限制脚本 |
| 越权 | `GET /api/drafts/draft-b`，身份 alice | 返回 bob 草稿 | 403 |
| 重定向 | `/redirect?to=https://outside.invalid/` | 返回外部 Location | 返回 `/` |
| 跨源更新 | 带虚构 Cookie 的 POST /api/profile | 更新资料 | 非本来源 403 |

XSS 使用只设置 DOM marker 的本地字符串：

```html
<img src=x onerror="document.body.dataset.lab='xss'">
```

无需读取 Cookie、用户数据或向外发送请求。浏览器查看 `document.body.dataset.lab`，漏洞版得到 xss，修复版不执行。

越权实验：

```bash
curl -i -H 'x-lab-user: alice' http://127.0.0.1:4185/api/drafts/draft-b
```

重定向用 `curl -i` 查看 Location，不加 `-L` 跟随外部地址。

## CSRF 浏览器实验

先打开靶场首页设置虚构 Cookie。另建独立页面，使用本机 4186 端口静态服务：

```html
<!doctype html>
<html lang="zh-CN">
<meta charset="utf-8">
<title>本地跨源表单</title>
<form action="http://127.0.0.1:4185/api/profile" method="post">
  <input name="name" value="Cross-origin">
  <button>更新本地虚构资料</button>
</form>
</html>
```

从 `http://127.0.0.1:4186` 点击提交，再查看靶场 `/api/profile`。端口不同造成跨源，但同协议同主机仍同站，因此此实验特意证明 SameSite 不等于同源保护。

自动测试中的 Node Fetch 可以手工设置 Origin/Cookie，仅验证服务端分支，不能证明浏览器是否实际携带 Cookie；浏览器实验必须另外记录。

## 教学边界

- `x-lab-user` 和固定虚构 Cookie 都是身份模拟，不能用于生产认证。
- 资料只存内存，重启即重置；没有数据库、密码或真实账号。
- 修复版 Origin 校验是本地受控表单的演示。生产需根据客户端类型设计会话、CSRF token、Fetch Metadata 和来源拒绝策略。
- 靶场不包含真实 SQL 引擎、SSRF 请求器或系统命令执行，不把模拟响应当作真实漏洞验证。
- 代码保留漏洞分支是教学目的；不要复制到业务服务或改为公网监听。

课程入口：[Web 安全测试](../../L5-架构与纵深能力/08-Web安全测试/01-测试范围-靶场与证据.md)。提交[安全测试报告](../../阶段考核/安全测试报告模板.md)，分别记录 HTTP 自动测试与浏览器验证。
