# 小程序卷技术与证据基线

核对日期：2026-10-12。读者为已掌握 React、TypeScript、HTTP 与共享领域合同的学习者。
本卷 12 章、24 篇正文，运行源码只嵌入 Markdown；依赖、锁文件、提取脚本和产物在个人练习目录。

## 冻结工具链

| 项目 | 精确值/约束 | 来源与用途 |
| --- | --- | --- |
| 实际 Node | 22.22.0 | 本机测试与构建 |
| 实际 npm | 10.9.4 | install 生成 lock，ci 复验 |
| Taro | 4.3.0 | CLI/runtime/react/components/helper/shared/taro、React 框架插件及 weapp/tt/alipay 插件同版 |
| React/react-dom | 18.3.1 | Taro React 主线与文案组件测试 |
| react-test-renderer | 18.3.1；开发类型 18.3.1 | 仅 dev；实际发布/详情页操作边界，不进入平台包 |
| TypeScript | 5.9.3 | MP-24 严格检查，独立于其他卷版本 |
| Webpack | 5.91.0 | 满足 webpack5-runner 当前 peer |
| tsx | 4.20.5 | Node TS/TSX 测试 |
| Babel | core 7.28.0；preset-react/preset-typescript 7.27.1；preset-taro 4.3.0 | Taro JSX/TS 编译 |
| 开发类型 | node 22.15.30；react 18.3.23；react-dom 18.3.7 | 冻结完整包清单 |
| PostCSS | 8.5.6 | Taro 样式处理 |
| 微信工具 | 本机安装 2.01.2510290 | 仅确认安装和 CLI help，不等于项目/账号验收 |

完整 package/tsconfig/Babel/Taro 配置见 [MP-24 §6](12-capstone/02-client-platform-delivery.md#s6)。
本次 npm metadata 核对 CLI 要求 Node >=18，React 插件 peer 为 React 18；
最低 engine 不能代替完整依赖兼容性验证。
精确直接依赖不冻结传递依赖。首次生成 lock 后，独立复建必须保留它并使用 npm ci；
不把最终测试机器之外的工具/版本写为已验证。

## 领域与后端合同

权威来源：[共享契约](../00-guide/project-contract.md)。

- 金额为非负安全整数 `priceCents`；持久时间严格 ISO UTC。
- Listing：`available/reserved/sold`；Reservation：`pending/confirmed/cancelled`。
- 创建预约：pending + reserved；取消 pending：cancelled + available；确认 pending：confirmed + sold。
- 终态重复操作 409；同用户同操作同键同 payload 返回原资源，不创建新预约。
- 不接支付；本地收藏不宣称云同步；离线只保存草稿，不宣布发布/预约成功。
- 原有 Web 后端使用 Cookie 会话。本卷 Bearer、auth/exchange、auth/me/logout、
  预约列表与按键恢复是显式后端扩展，不能直接接通 Web API。
- Capstone 使用内存教学服务与虚构角色，没有真实平台身份、数据库、真实图片上传或消息发送。
  生产扩展见 [MP-23 §12](12-capstone/01-domain-service-tests.md#12-常见问题)
  和 [MP-24 §12](12-capstone/02-client-platform-delivery.md#12-常见问题)。

## 平台配置

| 目标 | Taro 源配置 | build | 运行边界 |
| --- | --- | --- | --- |
| 微信 | project.config.json | build:weapp | touristappid 仅教学构建，真实身份/权限需合法 AppID |
| 抖音 | project.tt.json | build:tt | 空 AppID 不证明真实登录、隐私、预览或审核 |
| 支付宝 | project.alipay.json | build:alipay | authCode 与订阅需独立 adapter，默认未接真实身份 |
| H5 | 本卷未建立完整插件/认证 | 不声称 H5 build | 仅降级对照，不等于小程序生命周期/真机 |

实际产物配置名与包体见 [SELF-CHECK](SELF-CHECK.md)，
不能把 Taro 源 project.tt.json 名称当抖音输出文件名。
主线微信、第二平台抖音、第三平台支付宝，真实验收需要独立记录各平台基础库。
微信隐私辅助 API 官方从 2.32.3 支持；这只说明该 API 的起始版本，
不是已冻结/已真机测试的本卷最低基础库。

## 安全与运行边界

code 只送服务端，不记录原值；AppSecret、平台 session_key、私钥和发送消息凭据只在后端。
客户端存业务 Token 仍不是 HttpOnly/安全硬件，服务端始终检查到期、撤销与对象授权。
教学服务器只绑定回环且用明确替身，不能部署为生产认证/事务系统。
最终测试、安装和构建都在 `/tmp/course-mini-blockfix-20261012/final`；仓库只写本卷 Markdown，
不 commit/push、不上传/提审/发布、不修改共享治理文件。

安装存在上游 deprecated 警告；没有用关闭 strict、吞异常、随意 overrides
或升级主依赖制造通过。本次未做完整依赖漏洞审计；发布前需重新评估供应链。

## 证据层级

Node 纯逻辑、实际 React 文案组件、目标 build、平台工具、真机、真实后端、
预览/提审/发布分别登记。Node IO 替身不能证明平台身份、Storage 配额、TLS、
设备权限或跨层渲染。二维码/上传属于外部操作，必须另获明确授权。
本卷学习验收可包含未验证项，但不能将其标成 pass。

## 官方核对

- [Taro 项目配置](https://docs.taro.zone/docs/project-config/)：三种平台源配置文件名。
- [Taro Hooks](https://docs.taro.zone/docs/hooks)：平台生命周期 hook 与分享配置。
- [Taro uploadFile](https://docs.taro.zone/docs/apis/network/upload/uploadFile)：string body、abort、progress。
- [Taro setStorageSync](https://docs.taro.zone/docs/apis/storage/setStorageSync)：同步写入失败需处理。
- [微信 code2Session](https://developers.weixin.qq.com/miniprogram/dev/server/API/user-login/api_code2session)：服务器 API。
- [微信隐私辅助 API](https://developers.weixin.qq.com/miniprogram/dev/api/open-api/privacy/wx.requirePrivacyAuthorize.html)：同意/拒绝与平台事件。

[返回本卷](README.md) · [全篇覆盖](MINI-PROGRAM-COVERAGE.md) · [实际自检](SELF-CHECK.md)
