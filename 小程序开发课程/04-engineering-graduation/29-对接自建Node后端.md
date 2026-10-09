# 29-对接自建Node后端

## 目标

完成本知识单元后，学员应能把「逛吃指南」的数据通道与登录体系从“只依赖微信云开发”升级为“微信小程序 + 自建 Node.js 后端 + PostgreSQL”的标准三层架构：小程序负责交互与展示，Node 服务负责鉴权、业务编排与数据落库，并且在迁移过程中保证老用户不掉登录、核心数据不丢、云开发与自建后端可以平滑并行。

学员应能够：

1. 说清为什么要从云开发走向自建后端：多端复用、复杂业务编排、数据主权、成本与团队协作边界，以及什么情况下反而应该继续使用云开发。
2. 掌握微信公众平台四类服务器域名（`request`、`uploadFile`、`downloadFile`、`socket`）的配置方式与各自对应的小程序 API，知道它们是四张独立白名单、互不复用。
3. 说清合法域名的硬性合规要求：必须 HTTPS、证书有效、域名需完成 ICP 备案、端口与 IP 直连的限制，以及开发期“不校验合法域名”只能用于调试、不能带上线。
4. 使用 Express 或 NestJS 搭建结构化的 Node 服务，分层组织路由、控制器、服务、中间件与数据访问层，并完成基础的错误处理与请求日志。
5. 完整实现小程序登录态打通：`wx.login` 拿到临时 `code` 发送到自建后端，后端调用微信 `code2Session` 换取 `openid` 与 `session_key`，再签发自建 JWT 返回小程序。
6. 说清 JWT 的结构与验证原理，牢记 `AppSecret`、JWT 签名密钥只能保存在服务端，绝不能写进小程序包或前端代码；后续请求在请求头携带 token，服务端用中间件统一校验。
7. 在 U17 接口层的基础上实现 401 处理：token 过期时只触发一次静默重登，其他请求排队、登录恢复后自动重放，业务代码对换 token 过程无感知。
8. 设计 PostgreSQL 表结构承接核心数据，编写一次性迁移脚本把云数据库历史数据迁出，并通过“双写 + 灰度读 + 一致性校验对账”完成平滑切换。
9. 对接文件上传：小程序用 `wx.uploadFile` 直传自建后端（或经后端签发凭证直传对象存储），服务端校验类型、大小与归属，落库文件元数据。
10. 实现多环境 `baseUrl` 与配置校验：本地、联调（BOE）、生产环境严格隔离，配合 `__wxConfig.envVersion` 自动识别运行环境，缺失关键配置时启动即报错而不是运行中崩溃；并能根据业务场景判断云开发与自建后端的混合架构取舍，用 WebSocket 实现实时消息，最终给出鉴权一致性检查清单与灰度回滚预案。

## 技术栈

本单元使用微信原生能力与 TypeScript 编写小程序侧代码，服务端使用 Node.js + TypeScript，数据库使用 PostgreSQL，实时能力使用 WebSocket。

| 工具或环境 | 用途 | 学习要求 |
|---|---|---|
| 微信公众平台 · 服务器域名 | 配置 request/uploadFile/downloadFile/socket 四类合法域名 | 会区分四张白名单并正确配置 |
| HTTPS 证书 + ICP 备案 | 合法域名合规前置条件 | 理解证书链、备案主体与驳回原因 |
| Node.js 20 LTS | 服务端运行时 | 会用 npm scripts 管理启动与迁移 |
| Express 4 / NestJS 10 | Web 服务框架 | 至少掌握一种，理解中间件/分层 |
| PostgreSQL 15+ | 关系型数据库 | 会设计表结构、写迁移与对账 SQL |
| `pg` / TypeORM / Prisma | Node 访问 PostgreSQL | 会参数化查询，杜绝 SQL 拼接 |
| `jsonwebtoken` | 签发与校验 JWT | 理解载荷、过期时间与签名算法 |
| 微信 `code2Session` 接口 | code 换 openid/session_key | 掌握请求参数与错误码 |
| `wx.login` / `wx.checkSession` | 小程序登录与会话检查 | 会判断何时需要重新登录 |
| `wx.request` 封装（U17 接口层） | 携带 token 访问 API | 会在拦截器注入与处理 401 |
| `wx.uploadFile` / `wx.downloadFile` | 文件直传与下载 | 知道域名白名单与 header 差异 |
| `wx.connectSocket` 等 | WebSocket 长连接 | 会带鉴权、心跳与断线重连 |
| `config/env.ts` + `__wxConfig.envVersion` | 多环境 baseUrl 隔离 | 会做配置校验与启动期断言 |
| dotenv / 环境变量 | 服务端密钥注入 | 密钥只走环境变量，不入库 |
| 微信开发者工具 + 真机 | 联调与合规验证 | 关闭“不校验域名”后真机验证 |

工程约定：

- 所有密钥（`AppID` 可公开、`AppSecret`、JWT 密钥、数据库口令）只存在于服务端环境变量与 CI Secrets，仓库中只保留 `.env.example`。
- 小程序侧所有请求仍收敛到 U17 的 `utils/request`，新增的自建 API 走 `services/*`，页面不得出现裸 `wx.request`。
- 迁移期默认“双写、读旧、灰度读新、可回滚”，禁止一次性停掉云开发。
- 涉及域名数量、备案规则、code 有效期等数字，一律以微信官方文档与公众平台实际规则为准。

## 详细的理论知识讲解和示例伪代码

### 1. 为什么从云开发走向自建后端

云开发（CloudBase）在课程前半段极大地降低了门槛：免运维、自带鉴权、云函数 + 云数据库 + 云存储开箱即用。但随着「逛吃指南」业务变复杂，自建后端的诉求会自然出现：

- **多端复用**：同一套业务要同时服务小程序、H5、管理后台、App，云函数的小程序私有鉴权不再通用。
- **复杂业务编排**：交易、风控、定时任务、消息队列、跨服务事务在标准 Node 服务上生态更完整。
- **数据主权与合规**：核心经营数据需要落在自己掌控的数据库中，便于备份、审计与迁移。
- **团队协作与工程化**：前后端版本独立、接口契约化、CI/CD、灰度发布都需要标准服务形态。
- **成本与可移植性**：避免被单一平台锁定，可在任意云主机或容器平台部署。

但要避免“为了自建而自建”的误区。以下情况继续使用云开发反而更合理：只有小程序一个端、业务简单、团队没有运维能力、追求最快上线。真实的成熟方案往往是**混合架构**：云开发承担部分弱业务能力（如下发小程序订阅消息、云调用），自建后端承担核心数据与交易。

```text
演进路线（贯穿本单元）：
  阶段 0：纯云开发（现状）
  阶段 1：搭建 Node + PostgreSQL，先打通登录与只读接口
  阶段 2：核心数据双写（云数据库 + PostgreSQL）
  阶段 3：灰度读新链路，对账校验
  阶段 4：读写全部切到自建后端，云开发降级为补充能力
```

### 2. 服务器合法域名配置全景：四张独立白名单

小程序在正式环境只能访问在公众平台登记过的服务器域名。很多初学者以为“配一个域名就全通”，实际上微信把网络能力拆成四张互相独立的白名单：

| 白名单类别 | 对应的小程序 API | 典型用途 |
|---|---|---|
| request 合法域名 | `wx.request` | 普通 HTTPS 接口调用 |
| uploadFile 合法域名 | `wx.uploadFile` | 上传文件 |
| downloadFile 合法域名 | `wx.downloadFile` | 下载文件（下载后才能用本地路径） |
| socket 合法域名 | `wx.connectSocket` | WebSocket / wss 长连接 |

关键工程事实：

1. 四张列表互不复用。同一个域名既要请求接口又要上传文件，必须在 request 和 uploadFile 两个列表里都添加。
2. 配置路径：微信公众平台 → 开发管理 → 开发设置 → 服务器域名；一个月内可修改次数有限，生产域名变更要提前规划。
3. 必须填写域名而非 IP，且只支持默认端口语义（HTTPS 走 443），不支持任意端口。
4. 域名必须经过 ICP 备案；校验失败会在真机直接报错，开发者工具若勾选“不校验合法域名”则会掩盖问题。
5. `downloadFile` 与 `uploadFile` 的 header、超时与 `wx.request` 行为略有差异，封装时要分别处理。

开发期可以在开发者工具勾选“不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书”，但这只对当前调试者的工具生效，真机和体验版不受影响。误区：带着这个勾选提测，导致“工具正常、真机全挂”。

### 3. HTTPS 与 ICP 备案要求

合法域名有两条硬门槛：**HTTPS** 与 **ICP 备案**。

HTTPS 方面：

- 必须使用受信任 CA 签发的证书，自签名证书在真机不被接受；
- 证书链要完整（中间证书缺失会导致部分安卓机型握手失败）；
- 证书需在有效期内、域名与证书的 SAN/CN 匹配；
- TLS 版本与加密套件需满足微信当前要求，老旧的 TLS 1.0/1.1 可能被拒绝。

ICP 备案方面：

- 域名需通过服务器所在云厂商完成 ICP 备案，备案主体通常需要与小程序主体一致或具备关联关系；
- 备案有审核周期（数个工作日到数周），是项目排期中最容易被忽略的前置项；
- 海外节点、未备案域名无法作为小程序合法域名；
- 备案被驳回的常见原因：域名信息与主体不一致、网站内容与报备名称不符、缺少前置审批（如涉及特定行业）。

```text
上线前合规检查顺序：
  购买域名 → 实名认证 → 云厂商提交 ICP 备案 → 备案通过
    → 部署服务并签发/配置 HTTPS 证书（可用云厂商免费 DV 证书）
    → 公众平台配置四类域名 → 关闭“不校验域名”真机回归
```

常见误区：用 IP 直连“先顶上”；用还没备案的域名联调真机；证书只在一个节点更新导致部分请求偶发失败；认为 HTTP 在局域网测试没问题就能上线。

### 4. 搭建 Node 服务：Express / NestJS 与分层结构

服务端最小可用结构建议如下，核心是分层：路由只做参数接收，控制器编排用例，服务承载业务逻辑，数据访问层负责 PostgreSQL。

```text
server/
├── src/
│   ├── main.ts              # 启动入口
│   ├── app.module.ts        # NestJS 模块装配（或 Express 的 app.ts）
│   ├── common/
│   │   ├── guards/jwt.guard.ts
│   │   ├── filters/http-exception.filter.ts
│   │   └── middlewares/request-logger.middleware.ts
│   ├── modules/auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   └── dto/
│   ├── modules/shops/
│   │   ├── shops.controller.ts
│   │   ├── shops.service.ts
│   │   └── shops.repository.ts
│   └── config/env.ts
├── migrations/              # 数据库迁移脚本
├── package.json
└── tsconfig.json
```

Express 版本的最小入口：

```typescript
// src/app.ts
import express from 'express'
import cors from 'cors'
import { authRouter } from './modules/auth/auth.router'
import { shopsRouter } from './modules/shops/shops.router'
import { errorHandler } from './common/error-handler'
import { requestLogger } from './common/middlewares/request-logger.middleware'

const app = express()

app.use(express.json())
app.use(cors())
app.use(requestLogger)

app.use('/api/v1/auth', authRouter)
app.use('/api/v1/shops', shopsRouter)

// 统一错误处理必须注册在所有路由之后
app.use(errorHandler)

const port = Number(process.env.PORT) || 3000
app.listen(port, () => {
  console.log(`guangchi api listening on ${port}`)
})
```

NestJS 版本用依赖注入与装饰器表达同样的分层，Controller 不直接碰数据库：

```typescript
// src/modules/shops/shops.controller.ts
import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt.guard'
import { ShopsService } from './shops.service'

@Controller('api/v1/shops')
@UseGuards(JwtAuthGuard)
export class ShopsController {
  constructor(private readonly shopsService: ShopsService) {}

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.shopsService.findOne(id)
  }
}
```

统一响应结构沿用 U17 契约，服务端成功时返回 `code/data/message/traceId`，异常由全局过滤器收敛，避免把堆栈直接抛给前端。

### 5. 登录态打通：wx.login code 换 openid 与 JWT

这是本单元最核心的链路。小程序不应该把 `AppSecret` 放在前端，也不应该自己“伪造”用户身份；正确做法是用一次性 `code` 让后端去微信换身份，再由后端签发自己的登录凭证。

```text
小程序                         自建 Node 服务                    微信接口
  │ wx.login() 取 code            │                                │
  │ ────────────────► POST /auth/login { code }                   │
  │                                │ ── GET code2Session ───────► │
  │                                │ ◄─ { openid, session_key } ──│
  │                                │ 落库/更新用户，签发 JWT        │
  │ ◄──── { token, userInfo } ──── │                                │
  │ 后续请求 Header: Authorization: Bearer <token>                 │
```

小程序侧登录服务：

```typescript
// services/auth.ts
import { request } from '../utils/request'

interface LoginResult {
  token: string
  user: { id: number; openid: string; nickname: string }
}

export function login(): Promise<LoginResult> {
  return new Promise((resolve, reject) => {
    wx.login({
      success: async ({ code }) => {
        try {
          const res = await request<LoginResult>({
            url: '/api/v1/auth/login',
            method: 'POST',
            data: { code },
            auth: false // 登录接口本身不需要 token
          })
          wx.setStorageSync('token', res.token)
          resolve(res)
        } catch (err) {
          reject(err)
        }
      },
      fail: reject
    })
  })
}
```

服务端登录服务（NestJS 示例，同样思路适用于 Express）：

```typescript
// src/modules/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { UsersRepository } from '../users/users.repository'

interface Code2SessionResponse {
  openid?: string
  session_key?: string
  unionid?: string
  errcode?: number
  errmsg?: string
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepo: UsersRepository,
    private readonly jwtService: JwtService
  ) {}

  async loginByCode(code: string) {
    const url = new URL('https://api.weixin.qq.com/sns/jscode2session')
    url.searchParams.set('appid', process.env.WX_APPID!)
    url.searchParams.set('secret', process.env.WX_SECRET!)
    url.searchParams.set('js_code', code)
    url.searchParams.set('grant_type', 'authorization_code')

    const resp = await fetch(url)
    const data = (await resp.json()) as Code2SessionResponse

    if (!data.openid || !data.session_key) {
      // code 失效、被使用过或 AppSecret 错误都会走到这里
      throw new UnauthorizedException(`code2session failed: ${data.errcode}`)
    }

    // 用户不存在则创建，存在则更新；session_key 如需解密手机号等再加密存储或缓存
    const user = await this.usersRepo.upsertByOpenid(data.openid)

    const token = await this.jwtService.signAsync(
      { sub: user.id, openid: data.openid },
      { expiresIn: '7d', secret: process.env.JWT_SECRET }
    )

    return { token, user }
  }
}
```

关键事实：`code` 有效期很短且只能使用一次；`session_key` 是敏感数据，用于解密用户加密数据（如手机号），不应下发给小程序、不应出现在 JWT 中。

### 6. JWT 结构与“密钥只在服务端”

JWT（JSON Web Token）由三部分组成，用 `.` 连接：`Header.Payload.Signature`。

```text
Header   {"alg":"HS256","typ":"JWT"}          → Base64Url
Payload  {"sub":1001,"openid":"oXXXX",        → Base64Url
          "iat":1781020800,"exp":1781625600}
Signature HMACSHA256(base64Header + "." + base64Payload, JWT_SECRET)
```

要点与误区：

- JWT 的载荷只是 Base64Url 编码，**不是加密**，任何人都能解开看到内容。因此绝不能把 `AppSecret`、`session_key`、身份证号等敏感数据放进 Payload。
- 防篡改靠签名：服务端用只有自己知道的 `JWT_SECRET` 校验，前端无法伪造合法签名。
- `exp` 过期时间要结合业务，太短体验差、太长风险高；也可引入 refresh token 双 token 机制。
- `AppSecret` 与 `JWT_SECRET` 是两种不同密钥：前者用于和微信服务器通信，后者用于给自家用户签发登录态，二者都只能存在服务端。
- 常见误区：为了“调试方便”把 `AppSecret` 写进小程序 config；把密钥提交进 Git；在多个环境复用同一个 JWT 密钥（应环境隔离）。

服务端校验中间件：

```typescript
// src/common/guards/jwt.guard.ts
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import type { Request } from 'express'

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>()
    const auth = req.headers.authorization || ''
    const [, token] = auth.split(' ')

    if (!token) {
      throw new UnauthorizedException('missing token')
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET
      })
      // 把用户信息挂到 request 上，后续业务直接取当前登录用户
      ;(req as Request & { user?: unknown }).user = payload
      return true
    } catch {
      throw new UnauthorizedException('invalid or expired token')
    }
  }
}
```

### 7. 请求头携带 token 与 401 处理

U17 已经建立了接口层，这里补上鉴权头与 401 重登重放。要点：token 过期只重登一次，避免多个请求同时 401 引发无限重登循环。

```typescript
// utils/request.ts（节选，承接 U17）
import { config } from '../config/env'

let isRefreshing = false
let waitQueue: Array<() => void> = []

function request<T>(options: RequestOptions): Promise<T> {
  return new Promise((resolve, reject) => {
    const doRequest = () => {
      const token = wx.getStorageSync('token')
      wx.request({
        url: config.baseUrl + options.url,
        method: options.method || 'GET',
        data: options.data,
        timeout: 10000,
        header: {
          'content-type': 'application/json',
          ...(options.auth === false ? {} : { Authorization: `Bearer ${token}` })
        },
        success: async (res) => {
          if (res.statusCode === 401 && options.auth !== false) {
            // 已有重登在进行：排队等待新 token
            if (isRefreshing) {
              waitQueue.push(() => resolve(request<T>(options)))
              return
            }
            isRefreshing = true
            try {
              const { login } = await import('../services/auth')
              await login()
              waitQueue.forEach((fn) => fn())
              waitQueue = []
              resolve(request<T>(options)) // 用新 token 重放本次请求
            } catch (err) {
              waitQueue = []
              reject(err)
            } finally {
              isRefreshing = false
            }
            return
          }
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve((res.data as ApiResponse<T>).data)
          } else {
            reject(new ApiError(res.statusCode, res.data))
          }
        },
        fail: (err) => reject(new ApiError(-1, err.errMsg))
      })
    }
    doRequest()
  })
}
```

服务端返回 401 的典型场景：缺少 token、签名无效、token 过期、用户被封禁。注意“登录接口自己返回 401”时不能再触发重登（用 `auth: false` 排除），否则会形成死循环。误区：每个 401 都弹一次登录失效框；重放写操作导致重复下单（写请求重放要确认服务端幂等）。

### 8. PostgreSQL 建模与历史数据迁移

以「逛吃指南」核心实体店铺、评价为例设计表结构：

```sql
-- migrations/001_init.sql
CREATE TABLE users (
  id          BIGSERIAL PRIMARY KEY,
  openid      VARCHAR(64) NOT NULL UNIQUE,
  nickname    VARCHAR(64) NOT NULL DEFAULT '',
  avatar_url  TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE shops (
  id          BIGSERIAL PRIMARY KEY,
  source_id   VARCHAR(64),              -- 对应云数据库 _id，迁移对账用
  name        VARCHAR(100) NOT NULL,
  city        VARCHAR(50) NOT NULL,
  address     TEXT NOT NULL DEFAULT '',
  latitude    DOUBLE PRECISION,
  longitude   DOUBLE PRECISION,
  cover_url   TEXT NOT NULL DEFAULT '',
  created_by  BIGINT REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_shops_city ON shops(city);

CREATE TABLE reviews (
  id          BIGSERIAL PRIMARY KEY,
  shop_id     BIGINT NOT NULL REFERENCES shops(id),
  user_id     BIGINT NOT NULL REFERENCES users(id),
  rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  content     TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reviews_shop ON reviews(shop_id);
```

历史数据迁移脚本思路：分页拉取云数据库集合 → 转换字段与外键 → 批量写入 PostgreSQL → 记录 `source_id` 便于回查。务必使用参数化查询或 ORM，禁止字符串拼接 SQL。

```typescript
// scripts/migrate-shops.ts
import { db } from '../src/database'
import { cloud } from '../src/cloud-sdk'

async function migrateShops() {
  const pageSize = 100
  let offset = 0

  while (true) {
    const { data } = await cloud.database()
      .collection('shops')
      .skip(offset)
      .limit(pageSize)
      .get()

    if (data.length === 0) break

    for (const item of data) {
      // ON CONFLICT 保证脚本可重复执行（幂等迁移）
      await db.query(
        `INSERT INTO shops (source_id, name, city, address, latitude, longitude, cover_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT DO NOTHING`,
        [item._id, item.name, item.city, item.address, item.latitude, item.longitude, item.coverUrl]
      )
    }
    offset += pageSize
  }
}

migrateShops().then(() => process.exit(0))
```

误区：迁移脚本只跑一遍、不可重放，中途失败后无法续跑；不保留 `source_id` 导致无法对账；云数据库的弱类型脏数据（缺字段、类型不一致）直接写入库造成约束报错——应先做数据清洗。

### 9. 双写、灰度读与一致性对账：平滑切换

直接“停机迁移、一夜切换”风险极高。推荐四步法：

```text
第一步 双写：新数据同时写云数据库与 PostgreSQL，以云开发结果为准返回
第二步 灰度读：按用户/比例把部分读请求切到 PostgreSQL，比对两边结果
第三步 对账：离线任务比对全量数据，差异自动补偿
第四步 切主：PostgreSQL 成为主数据源，云开发只保留兜底，观察后下线
```

双写示例（服务端在写服务里同时落两处）：

```typescript
async function createReview(input: CreateReviewInput, userId: number) {
  // 先写主库（迁移早期以云数据库为准时顺序相反）
  const review = await this.reviewsRepo.insert({ ...input, userId })

  // 双写到云数据库；失败不阻断主流程，但要记录补偿
  try {
    await this.cloudReviews.add({
      shopSourceId: input.shopSourceId,
      rating: input.rating,
      content: input.content
    })
  } catch (err) {
    await this.repairQueue.push({ type: 'review_mirror', payload: review })
  }

  return review
}
```

对账 SQL（统计两边数量与抽样差异）：

```sql
-- 以 source_id 关联，找出云侧有、PG 侧缺失或关键字段不一致的记录
SELECT s.source_id, s.name
FROM staging_cloud_shops s
LEFT JOIN shops p ON p.source_id = s.source_id
WHERE p.id IS NULL
   OR p.name IS DISTINCT FROM s.name
   OR p.city IS DISTINCT FROM s.city;
```

误区：双写不考虑失败补偿，时间一长两边数据悄悄分叉；灰度只按“整体开/关”，无法快速回滚；对账只比总数不比明细，总数相同但记录错位也发现不了。

### 10. 文件上传对接

小程序上传使用 `wx.uploadFile`，它发的是 `multipart/form-data`，与 `wx.request` 的 JSON 不同；上传域名需单独配置 uploadFile 合法域名。

```typescript
// services/upload.ts
export function uploadShopImage(filePath: string): Promise<{ url: string }> {
  const token = wx.getStorageSync('token')
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: config.baseUrl + '/api/v1/uploads/image',
      filePath,
      name: 'file', // 与服务端接收字段一致
      header: { Authorization: `Bearer ${token}` },
      formData: { scene: 'shop' },
      success(res) {
        if (res.statusCode === 200) {
          resolve(JSON.parse(res.data).data)
        } else {
          reject(new Error('upload failed'))
        }
      },
      fail: reject
    })
  })
}
```

服务端要做安全校验：限制 MIME 类型与扩展名白名单、文件大小上限、重命名文件避免路径穿越、校验当前用户是否有权为该店铺上传，并把元数据落库。

```typescript
import multer from 'multer'
import { randomUUID } from 'crypto'

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp'])

const upload = multer({
  storage: multer.diskStorage({
    destination: 'uploads/shops',
    filename: (_req, file, cb) => {
      const ext = file.mimetype.split('/')[1]
      cb(null, `${randomUUID()}.${ext}`)
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, ALLOWED.has(file.mimetype))
  }
})

shopRouter.post('/uploads/image', authMiddleware, upload.single('file'), async (req, res) => {
  const file = req.file
  if (!file) {
    return res.status(400).json({ code: 400, message: 'invalid file' })
  }
  const url = `${process.env.CDN_BASE_URL}/shops/${file.filename}`
  await req.context.db.files.insert({ url, ownerId: req.user.sub, scene: req.body.scene })
  res.json({ code: 0, data: { url } })
})
```

生产环境更推荐“后端签发临时凭证、客户端直传对象存储（OSS/COS/S3）”的架构，以减轻 Node 服务带宽压力；下载文件若要在小程序内使用本地路径，走 `wx.downloadFile` 并配置 downloadFile 合法域名。误区：信任前端传入的文件名与类型；上传不鉴权导致任意用户写满磁盘。

### 11. 多环境 baseUrl 与配置校验

至少需要三个环境并严格隔离：本地开发、联调/测试（BOE）、生产。环境之间数据库、域名、密钥都应不同，禁止测试数据污染生产。

```typescript
// config/env.ts
type EnvVersion = 'develop' | 'trial' | 'release'

interface EnvConfig {
  baseUrl: string
  wsUrl: string
  enableMock: boolean
}

const ENV_MAP: Record<EnvVersion, EnvConfig> = {
  develop: {
    baseUrl: 'https://api-boe.guangchi.example',
    wsUrl: 'wss://ws-boe.guangchi.example',
    enableMock: true
  },
  trial: {
    baseUrl: 'https://api-boe.guangchi.example',
    wsUrl: 'wss://ws-boe.guangchi.example',
    enableMock: false
  },
  release: {
    baseUrl: 'https://api.guangchi.example',
    wsUrl: 'wss://ws.guangchi.example',
    enableMock: false
  }
}

// 微信运行时自动标识当前版本：开发版/体验版/正式版
const envVersion = (__wxConfig.envVersion || 'develop') as EnvVersion
export const config = ENV_MAP[envVersion]

// 启动期配置校验：缺关键配置立即抛出，而不是等用户操作时才崩
function assertConfig(c: EnvConfig) {
  if (!/^https:\/\//.test(c.baseUrl)) {
    throw new Error(`非法 baseUrl（正式环境必须 HTTPS）：${c.baseUrl}`)
  }
  if (!c.wsUrl.startsWith('wss://')) {
    throw new Error('WebSocket 必须使用 wss')
  }
}
assertConfig(config)
```

服务端同样用环境变量隔离，并提供 `.env.example` 列明所需变量，真实 `.env` 加入 `.gitignore`。误区：用代码里的 `if/else` 手动切环境，发版忘改导致请求打到测试库；release 环境误用 http；把密钥写进小程序配置——小程序包是可被解包的，不存在“前端保密”。

### 12. 云开发与自建后端混合架构选型

混合架构没有标准答案，应按“能力适配 + 迁移成本”做取舍。一个常见的分工：

| 能力 | 建议承载方 | 理由 |
|---|---|---|
| 核心业务数据（店铺、评价、交易） | 自建 Node + PostgreSQL | 多端复用、数据主权、强一致 |
| 小程序私有能力（订阅消息、云调用、微信开放接口代调用） | 云开发/云函数 | 免维护 access_token、与微信生态贴合 |
| 文件存储 | 对象存储（自建后端签发） | 带宽与成本，CDN 加速 |
| 实时消息（客服、订单状态） | 自建 WebSocket | 可控的连接管理与鉴权 |
| 低频边缘逻辑（图片安全检测回调） | 云函数 | 事件驱动、按量付费 |

混合架构必须解决身份打通：云函数侧若要识别自建用户，可由 Node 服务短期签发受限令牌，或双方共享以 openid 为键的身份映射，避免出现“两套登录、用户对不上”。误区：同一份数据两边都当主数据，无人对一致性负责；为了“全都要”把链路搞得过度复杂，排障时无从下手。

### 13. WebSocket 实时场景

适合 WebSocket 的场景：商家接单实时通知、客服会话、订单状态流转、直播互动。`wx.connectSocket` 必须使用 `wss://` 且域名进入 socket 合法域名白名单。鉴权建议在连接建立时通过查询参数或握手后首条消息携带 token（小程序在 header 注入上的支持有限，查询参数需接受其暴露面，最好用一次性短期票据）。

```typescript
// services/realtime.ts
export class RealtimeClient {
  private task: WechatMiniprogram.SocketTask | null = null
  private heartbeatTimer: number | null = null

  connect(token: string) {
    this.task = wx.connectSocket({
      url: `${config.wsUrl}/ws?token=${encodeURIComponent(token)}`,
      success() {}
    })

    this.task.onOpen(() => {
      this.startHeartbeat()
    })

    this.task.onMessage((evt) => {
      this.dispatch(JSON.parse(evt.data as string))
    })

    this.task.onClose(() => {
      this.stopHeartbeat()
      this.scheduleReconnect(token) // 指数退避重连
    })
  }

  private startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      this.task?.send({ data: JSON.stringify({ type: 'ping' }) })
    }, 25000) as unknown as number
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer)
  }

  private dispatch(message: unknown) {
    // 按 type 分发到页面/状态中心
  }

  private scheduleReconnect(token: string) {
    // 断线重连需退避并限制次数，避免服务端故障时疯狂重连
  }
}
```

服务端在连接握手时校验 JWT，把连接与 `userId` 绑定；要维护心跳与僵尸连接回收、单用户多端连接策略、消息投递确认。误区：把 wss 写成 ws；不做心跳导致连接被中间网络静默断开；重连无退避造成雪崩；收到消息后直接 `this.setData` 全量更新，跨线程大数据传输拖慢页面（应只更新渲染字段）。

### 14. 鉴权一致性检查清单与灰度回滚

切换上线前，用清单逐项核对，确保云开发时代与自建后端时代的鉴权语义一致：

```text
鉴权一致性检查清单：
  □ 所有受保护接口都经过统一 JWT 中间件，无“裸奔”接口
  □ token 只在登录/重登时获得，AppSecret、JWT_SECRET 不在前端出现
  □ 401 只触发一次重登，排队与重放正确，登录接口本身不参与重登
  □ 写操作重放具备服务端幂等保证（幂等键/唯一约束）
  □ 文件上传/下载、WebSocket 均带身份校验并配置了对应域名白名单
  □ 迁移的用户 openid 与历史数据归属完全对应，越权访问被拦截
  □ 多环境密钥、数据库、域名隔离，release 强制 HTTPS/wss
```

灰度与回滚预案：先内部白名单、再按 openid 哈希小比例放量；接口层保留“数据源开关”，可远程把读写切回云开发；双写与对账任务保留到观察期结束。一旦出现大面积登录失败或数据错乱，先回滚读链路止血，再排查。误区：没有回滚开关就强切；只监控接口成功率不监控“登录用户数/下单用户数”等业务漏斗，鉴权悄悄坏了却没有告警。

## 课后题

1. 请说清小程序四类服务器域名分别对应哪些 API，为什么“同一个域名配置了 request 合法域名，`wx.uploadFile` 仍然失败”？
2. 合法域名为什么必须同时满足 HTTPS 与 ICP 备案？请列出从购买域名到真机可访问的完整合规链路，并指出最容易拖延工期的环节。
3. 请完整画出小程序登录时序：`wx.login` 的 code 如何到自建后端、后端如何与微信交互、最终返回什么；并说明 code 与 session_key 各自的特性与保密要求。
4. JWT 的三段结构是什么？为什么说 JWT 载荷“不是加密、只是编码”？这对“能往 JWT 里放什么数据”提出了什么约束？
5. `AppSecret` 与 `JWT_SECRET` 有什么区别？为什么二者都不能放进小程序包？请举出至少三种错误的密钥存放方式及其后果。
6. 多个请求同时遇到 401 时，接口层应如何协作？为什么登录接口本身要排除在“401 自动重登重放”逻辑之外？写操作重放还要额外保证什么？
7. 从云数据库迁移历史数据到 PostgreSQL，为什么要保留 `source_id`、为什么迁移脚本要可重复执行？请描述一种“只比总数发现不了”的数据分叉问题。
8. 请描述“双写 → 灰度读 → 对账 → 切主”四步切换法中，每一步失败时应如何回滚；双写失败为什么要进入补偿队列而不是直接忽略？
9. 场景题：「逛吃指南」提测当天，开发者工具里所有接口、上传、WebSocket 都正常，但真机体验版全部请求失败，扫码进入的同事都复现。请给出排查思路：至少指出三类可能原因，并说明为什么工具会掩盖这些问题、后续如何避免。
10. 场景题：商家端需要在顾客下单后 3 秒内收到接单提醒。产品同时要求“历史数据不能丢、切换期老用户不掉登录”。请设计实时方案（协议、域名、鉴权、心跳重连）与迁移切换方案（双写与回滚开关），并指出两个方案中各自最关键的一个安全风险。

## 实践练习题

### 练习 1：打通登录链路并校验 JWT

#### 任务

在自建 Node 服务上实现 `POST /api/v1/auth/login`：接收小程序 `wx.login` 的 code，调用微信 `code2Session` 换取 openid，创建或更新用户后签发 JWT；小程序侧在启动时完成登录、缓存 token，并提供一个受保护接口 `GET /api/v1/users/me` 验证“携带 token 能访问、不携带返回 401”。

参考代码：

```typescript
// auth.controller.ts（NestJS）
@Post('login')
async login(@Body('code') code: string) {
  if (!code || typeof code !== 'string') {
    throw new BadRequestException('missing code')
  }
  return this.authService.loginByCode(code)
}
```

```typescript
// app.ts 启动后静默登录（节选）
import { login } from './services/auth'

App({
  onLaunch() {
    wx.checkSession({
      success: () => {
        // session_key 未过期，但若本地无自建 token 仍需登录
        if (!wx.getStorageSync('token')) login().catch(console.error)
      },
      fail: () => login().catch(console.error)
    })
  }
})
```

#### 步骤约束

1. `AppSecret`、`JWT_SECRET` 必须通过服务端环境变量读取，仓库中只允许出现 `.env.example`，提交记录里不得出现真实密钥。
2. JWT 必须设置过期时间；`session_key` 不得出现在返回体或 JWT 载荷中。
3. 必须实测三种结果：带正确 token 返回当前用户；不带 token 返回 401；篡改/过期 token 返回 401。
4. 联调域名需为已配置的 request 合法域名，真机验证时关闭“不校验合法域名”。

#### 提交物

- 服务端 auth 模块代码与 `.env.example`；
- 小程序登录服务与启动登录代码；
- 三种鉴权结果的请求截图（含状态码）；
- 200 字以内的链路说明。

#### 验收标准

- 真机可完成登录并缓存 token，受保护接口鉴权结果符合预期；
- 全仓库检索不到真实 `AppSecret` 与 JWT 密钥；
- 能现场解释 code 的一次性与 JWT 的防篡改原理。

### 练习 2：核心数据建模、迁移与双写

#### 任务

为“店铺 + 评价”设计 PostgreSQL 表结构，编写可重复执行的迁移脚本把云数据库历史数据迁入并保留 `source_id`；在创建评价的服务端接口中实现双写（PostgreSQL 为主、云数据库为镜像，镜像失败进入补偿队列），并编写一段对账 SQL 找出两边缺失或不一致的记录。

伪代码：

```text
迁移：
  分页读取云数据库 shops → 清洗/类型转换 → 参数化批量写入
  使用 ON CONFLICT/存在性判断保证可重跑
双写：
  createReview：先写 PG → 再写云数据库
  云侧失败 → repairQueue 记录待补偿，不阻断主流程返回
对账：
  按 source_id 左连接，输出缺失记录与字段不一致记录
```

#### 步骤约束

1. 所有 SQL 必须参数化或走 ORM，禁止字符串拼接用户输入。
2. 迁移脚本中断后重新执行不得产生重复数据或主键冲突。
3. 至少人为制造一次镜像失败（如云侧集合暂不可写），验证补偿队列记录正确、主流程仍成功。
4. 对账结果需包含“缺失记录”和“字段不一致记录”两类，不能只统计总数。

#### 提交物

- 建表 SQL / 迁移定义；
- 迁移脚本与双写、补偿代码；
- 对账 SQL 及其在测试数据上的输出；
- 一份迁移前后数量对照表。

#### 验收标准

- 迁移可重跑、数量与明细可对上，脏数据有清洗处理；
- 双写失败不影响主写且可补偿；
- 对账 SQL 能真实发现预置的缺失与不一致数据。

### 练习 3：文件上传、多环境配置与 WebSocket 实时通知

#### 任务

实现店铺图片上传：小程序 `wx.uploadFile` 直传 Node 服务，服务端校验类型/大小、重命名落盘并返回可访问 URL；同时完成多环境 baseUrl/wsUrl 配置与启动期校验；最后用 `wx.connectSocket` 实现一条“下单 → 商家收到通知”的实时链路，连接带鉴权、心跳与断线重连。

参考代码：

```typescript
// 小程序上传调用
const { url } = await uploadShopImage(tempFilePath)
this.setData({ coverUrl: url }) // setData 跨线程把结果送到渲染层
```

```typescript
// WebSocket 连接（节选）
const token = wx.getStorageSync('token')
wx.connectSocket({ url: `${config.wsUrl}/ws?token=${encodeURIComponent(token)}` })
```

#### 步骤约束

1. 上传域名、socket 域名必须分别加入 uploadFile、socket 合法域名白名单，正式地址使用 https/wss 且已备案。
2. 服务端上传必须鉴权并做类型白名单与大小限制，文件名不得信任前端。
3. 配置校验必须在启动期对非法 baseUrl（非 https）/wsUrl（非 wss）直接报错。
4. WebSocket 需演示：正常收到通知、杀掉服务后自动退避重连、重连期间不重复弹窗。

#### 提交物

- 上传接口与小程序上传代码、上传成功截图；
- 多环境配置文件与配置校验代码；
- WebSocket 客户端与服务端连接管理代码、实时通知录屏。

#### 验收标准

- 真机完成上传并展示图片，非法文件被服务端拒绝；
- 不同运行版本自动命中对应环境，非法配置启动即失败；
- 实时通知与断线重连实际跑通，鉴权缺失时连接被拒绝。

## 阶段验收作业

本作业是工程化结业阶段的后端证据点：为「逛吃指南」落地一条可上线的自建后端链路，要求登录态与云开发时代一致、核心数据完成迁移与双写、域名合规、且具备灰度与回滚能力。

### 任务描述

1. 完成域名合规：准备已 ICP 备案域名与有效 HTTPS 证书，在公众平台正确配置 request、uploadFile、socket（downloadFile 视需要）四类域名，并输出合规检查记录。
2. 搭建 Node + PostgreSQL 服务：分层组织代码，实现登录（code 换 openid + JWT）、当前用户、店铺列表/详情、创建评价等接口，统一响应结构与错误处理。
3. 小程序侧接入：在 U17 接口层上完成 token 注入与 401 单次重登重放，完成至少一个页面从云函数调用切换到自建 API。
4. 数据迁移与双写：完成店铺、评价、用户映射的历史数据迁移，创建评价等写接口双写并具备补偿，提供对账结果。
5. 实现文件上传与一项实时能力（WebSocket 通知），并完成多环境配置与启动期校验。
6. 提交切换方案：灰度放量方式、回滚开关、监控指标（登录用户数、接口成功率、业务漏斗）与观察期计划。

### 完成标准

- 关闭“不校验合法域名”后，真机全链路（登录、接口、上传、WebSocket）可用；
- 老用户在切换后无需重新授权即可获得自建 token，openid 与历史数据归属一致；
- 核心数据迁移数量与明细可对账，双写失败可补偿，读链路可灰度、可一键切回云开发；
- 全仓库与小程序包中均不出现服务端密钥；
- 具备书面灰度、回滚与监控方案，且关键流程已在真机演示。

### 评分要点（100 分）

| 维度 | 分值 | 要点 |
|---|---:|---|
| 域名合规与 HTTPS | 10 | 四类域名配置正确、证书有效、ICP 备案齐全 |
| Node 服务架构 | 15 | 分层清晰、统一响应与错误处理、配置走环境变量 |
| 登录与 JWT 鉴权 | 20 | code2Session 链路正确、密钥只在服务端、401 重登重放正确 |
| 数据建模与迁移 | 15 | 表结构合理、迁移可重跑、保留 source_id、参数化查询 |
| 双写对账与切换 | 15 | 双写补偿、对账发现明细差异、灰度与回滚开关可用 |
| 文件上传与 WebSocket | 10 | 上传安全校验、wss 鉴权、心跳与退避重连 |
| 环境隔离与方案文档 | 10 | 多环境配置与启动校验、灰度/回滚/监控方案完整 |
| 表达与现场答辩 | 5 | 能讲清架构取舍、登录时序与一致性保障 |

### 强制不通过条件

- 在小程序代码、配置或 Git 历史中出现真实 `AppSecret`、JWT 密钥或数据库口令；
- 未备案域名、HTTP/ws 或自签名证书被当作“正式可用”，或只在勾选“不校验合法域名”下验证；
- 401 处理存在重登死循环、重复弹窗，或写操作无幂等保证导致重复数据；
- 历史数据只迁数量不对明细、迁移不可重跑，或无法证明 openid 与用户数据归属一致；
- 双写没有补偿与对账、没有回滚开关就强切主数据源；
- 文件上传不鉴权或不做类型/大小校验，WebSocket 无鉴权、无心跳重连；
- 无法现场解释登录链路、JWT 防篡改原理或混合架构选型理由。

完成本作业后，「逛吃指南」具备了独立于云开发的标准化后端：身份、数据、文件、实时消息都在可控的自建服务中闭环，且迁移过程安全可回滚。下一单元 U30 将在此基础上引入 npm 构建、TypeScript 严格检查、ESLint/Prettier、miniprogram-ci 与 GitHub Actions，把整条交付链路升级为可复现的自动化流水线。
