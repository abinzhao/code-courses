# 53-API 契约、OpenAPI 与接口协作

## 目标

在单体项目里，一个人同时写前后端，接口怎么定几乎不需要沟通。进入真实全栈团队后，前端、后端、测试、第三方接入方是并行推进的：如果“接口长什么样”只存在于后端工程师的脑子里或一段聊天记录里，团队就会反复陷入“字段对不上、类型猜错了、错误格式不统一、文档早已过期”的联调泥潭。

解决这个问题的工业标准做法，是把接口描述成一份机器可读、可校验、可生成产物的**契约**，而当前应用最广的契约语言就是 OpenAPI。

完成本知识单元后，学员应能够：

1. 解释什么是 API 契约，说明契约优先（contract-first）相对于代码优先的价值、成本与适用场景。
2. 读懂并编写结构完整的 OpenAPI 3.1 文档，正确使用 `openapi`、`info`、`servers`、`paths`、`components` 等顶层结构。
3. 使用参数对象与 `requestBody` 准确描述路径参数、查询参数、请求头与 JSON 请求体，并通过 JSON Schema 表达类型、约束与必填项。
4. 为每个操作描述成功响应与失败响应，设计全 API 统一的错误契约，并在 `components` 中复用 Schema。
5. 使用 Swagger UI、Redoc 等工具把契约渲染为可交互文档，并理解文档与实现保持一致的机制。
6. 说明 API 版本化的常见策略与向后兼容原则，能判断一次变更是否属于破坏性变更，并能使用 Postman 或 Bruno 基于契约组织接口集合。

本单元的核心信念是：契约不是“写完代码后补一份文档”，而是团队协作的接口事实来源；契约的价值不在于写得多漂亮，而在于它是否被双方共同签署、被工具持续校验、并与实现和测试保持同步。

## 技术栈

| 工具或库 | 当前稳定版本线 | 用途 | 学习要求 |
|---|---|---|---|
| OpenAPI | 3.1 规范（3.0.x 存量认知） | 接口契约描述语言 | 掌握顶层结构、参数、请求体、响应、组件复用 |
| JSON Schema | 2020-12（OpenAPI 3.1 对齐） | 描述数据结构与校验规则 | 掌握 type、format、required、enum、约束 |
| Swagger UI | 5.x 稳定版 | 渲染可交互 API 文档 | 会本地启动、能在页面上发起 Try it out 请求 |
| Redoc | 2.x 稳定版 | 渲染只读的静态文档站点 | 会用 CLI 从契约生成单文件 HTML |
| @stoplight/spectral-cli | 6.x 稳定版 | 契约静态校验与风格约束 | 会用规则集检查契约错误与一致性 |
| swagger-ui-express | 5.x 稳定版 | 在 Express 中挂载文档页面 | 理解开发期文档路由的挂载方式 |
| Postman 或 Bruno | 当前稳定版 | 接口调试与集合管理 | 会导入 OpenAPI、组织集合、配置环境变量 |
| VS Code | 当前稳定版 | 编辑 YAML | 安装 YAML 扩展获得 Schema 校验与自动补全 |

约定：

- 契约文件统一命名为 `openapi.yaml`，使用 YAML 而非 JSON 手写，缩进固定两个空格，禁止 Tab。
- 文档中的地址一律使用示例域名 `https://api.example.com`，不出现真实内网地址。
- 所有需要鉴权的示例统一使用占位方案 `BearerAuth`，令牌写作 `<ACCESS_TOKEN>`，不出现真实凭证。
- Schema 命名使用大驼峰名词（如 `Article`、`ArticleListResponse`），操作 ID 使用小写驼峰动词短语（如 `listArticles`）。
- 每个操作必须至少描述一个成功响应和 `4xx` 失败响应，不允许只写 `200`。

开始前检查环境：

```bash
node -v
npx --yes @stoplight/spectral-cli --version
```

预期观察：能打印 Node.js 与 Spectral 版本号即可，版本数字本身不是考点。

## 详细的理论知识讲解和示例伪代码

### 1. 契约与契约优先开发

#### 1.1 什么是 API 契约

API 契约是对一个 HTTP 接口的完整、无歧义描述，通常包含：

```text
1. 接口身份：方法、路径、操作标识
2. 输入约定：路径参数、查询参数、请求头、请求体结构与校验规则
3. 输出约定：各状态码下的响应体结构、字段类型与含义
4. 横切约定：鉴权方式、统一错误结构、分页与排序规则、速率限制
5. 演进约定：版本号、废弃标记、兼容承诺
```

契约的关键属性是**机器可读**：它不只是给人看的文档，还可以被工具用来做校验、生成文档、生成客户端代码和 Mock。这是它与 Word 文档、Wiki 页面的本质区别。

#### 1.2 全栈关系

在没有契约的协作中，典型冲突链路是：

```text
后端口头说"用户对象有个 name 字段"
前端按字符串处理并直接渲染
后端实际返回 { name: null } 且新增了 display_name
前端出现空白页，双方在联调阶段互相排查
```

契约把这场争论提前到编码之前：双方先就字段、类型、可空性、错误形态达成一致并签字（合并契约文件即视为签字），随后前端基于契约做 Mock 开发，后端基于契约实现与校验，测试基于契约编写用例。三方工作从“串行等待”变成“并行推进”。

#### 1.3 契约优先与代码优先

| 方式 | 流程 | 优势 | 代价 |
|---|---|---|---|
| 契约优先 contract-first | 先写/评审契约，再写前后端代码 | 变更在评审阶段暴露，并行度高 | 前期沟通成本高，需要维护纪律 |
| 代码优先 code-first | 先写后端，用注解/框架反向生成契约 | 上手快，不易出现文档与代码漂移 | 前端被动等待，设计容易被实现细节绑架 |

推荐把契约优先作为团队主线；代码优先只在小型内部脚本、快速验证场景使用，且生成出的契约仍需纳入评审。

#### 1.4 常见误区

> 误区一：契约就是给后端写的技术文档，前端照着做就行。

契约是双边协议，前端必须参与字段设计、错误形态和空值约定的评审，否则协议无法真正落地。

> 误区二：契约写完归档到 Wiki 就完成任务。

脱离工具链、不随代码演进的契约会迅速过期。契约必须进版本库、进 CI 校验，并作为生成产物的源头。

### 2. OpenAPI 文档整体结构

#### 2.1 最小可运行文档

下面是一份结构完整但规模较小的 OpenAPI 3.1 文档，覆盖顶层五大结构：

```yaml
openapi: 3.1.0
info:
  title: 课程示例 API
  version: 1.4.0
  description: 全栈课程中文章模块的示例契约
  contact:
    name: API Platform Team
    email: api@example.com
servers:
  - url: https://api.example.com/v1
    description: 生产环境
  - url: https://api.staging.example.com/v1
    description: 预发环境
paths:
  /articles:
    get:
      operationId: listArticles
      summary: 获取文章列表
      tags: [articles]
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            minimum: 1
            default: 1
      responses:
        '200':
          description: 文章列表
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ArticleListResponse'
components:
  schemas:
    ArticleListResponse:
      type: object
      required: [items, total]
      properties:
        items:
          type: array
          items:
            $ref: '#/components/schemas/Article'
        total:
          type: integer
```

#### 2.2 顶层结构职责

| 字段 | 职责 | 易错点 |
|---|---|---|
| `openapi` | 声明规范版本 | 漏写会导致所有工具拒绝解析 |
| `info` | 标题、版本、联系人、许可证 | `info.version` 是文档版本，不等于 API 路径版本 |
| `servers` | 服务地址列表，支持变量 | 把 localhost 提交进正式契约 |
| `paths` | 路径与操作的核心地图 | 路径末尾随意加斜杠导致两条契约 |
| `components` | 可复用对象仓库（schemas、parameters、responses、securitySchemes） | 只定义不引用，或在 components 里写业务流程 |

#### 2.3 全栈关系与标签

`tags` 用于把操作按业务模块分组，Swagger UI 会按标签分区展示。前端团队也常按标签划分页面模块，因此标签命名应与业务领域（articles、users、comments）一致，而不是与后端代码包名一致。

`servers` 支持变量，可以避免为每个环境手写完整地址：

```yaml
servers:
  - url: https://api.{env}.example.com/v1
    description: 按环境切换
    variables:
      env:
        default: staging
        enum: [staging, prod]
```

#### 2.4 常见误区

> 误区一：把 `info.version` 当作接口兼容承诺。

`1.4.0` 只是这份文档自身的版本号；兼容性承诺要通过版本化路径、变更记录与废弃标记共同表达。

> 误区二：一个文件里混入多个服务的全部接口，无限膨胀。

契约应按服务或领域边界拆分，再通过 `$ref` 引用公共部分；巨型单文件会让评审和合并冲突都变得不可管理。

### 3. 参数与请求体

#### 3.1 四类参数

参数通过 `in` 声明位置。下面的操作同时使用路径参数、查询参数和请求头参数：

```yaml
paths:
  /articles/{articleId}:
    get:
      operationId: getArticle
      tags: [articles]
      security:
        - BearerAuth: []
      parameters:
        - name: articleId
          in: path
          required: true
          description: 文章唯一标识
          schema:
            type: string
            format: uuid
        - name: include
          in: query
          description: 需要同时返回的关联资源
          schema:
            type: array
            items:
              type: string
              enum: [author, comments]
          style: form
          explode: true
        - name: X-Trace-Id
          in: header
          required: false
          schema:
            type: string
            maxLength: 64
      responses:
        '200':
          description: 文章详情
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ArticleResponse'
        '404':
          $ref: '#/components/responses/NotFound'
```

要点：路径参数必须显式写 `required: true`；数组查询参数通过 `style: form` + `explode: true` 表达为 `include=author&include=comments`。

#### 3.2 请求体与 JSON Schema

写操作使用 `requestBody`，请求体结构同样由 JSON Schema 描述：

```yaml
    post:
      operationId: createArticle
      summary: 创建文章
      tags: [articles]
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ArticleCreateRequest'
            examples:
              basic:
                summary: 一篇普通文章
                value:
                  title: 契约优先开发入门
                  content: 先定义接口，再并行实现。
                  tags: [api, teamwork]
      responses:
        '201':
          description: 创建成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ArticleResponse'
        '422':
          $ref: '#/components/responses/ValidationError'
```

请求体 Schema 定义在组件中，约束包括必填、长度、范围与枚举：

```yaml
    ArticleCreateRequest:
      type: object
      required: [title, content]
      additionalProperties: false
      properties:
        title:
          type: string
          minLength: 1
          maxLength: 120
        content:
          type: string
          minLength: 1
        tags:
          type: array
          items:
            type: string
          maxItems: 10
          uniqueItems: true
```

#### 3.3 全栈关系

契约中的每一条约束都是前后端共同的承诺：前端据此做表单校验与禁用提交按钮，后端据此做不可信输入的二次校验，测试据此构造边界用例。

需要特别注意可空性。OpenAPI 3.1 直接对齐 JSON Schema，使用 `type: ['string', 'null']` 表达可空：

```yaml
        summary:
          type: ['string', 'null']
          description: 摘要允许为空
```

字段是“缺省”还是“显式为 null”是两种不同语义，必须在评审中讲清楚，前端不能混为一谈。

#### 3.4 常见误区

> 误区一：把校验只写在前端，契约里不体现约束。

契约不写约束，后端就可能接受任意输入，前端校验沦为装饰。所有约束应以 Schema 为准，前端只做体验层的提前校验。

> 误区二：参数全部用 `type: string`，连分页页码也是字符串。

宽松类型会把转换和校验责任推给每一个调用方。能用 `integer`、`boolean`、枚举表达的，不要用字符串。

### 4. 响应与统一错误契约

#### 4.1 成功响应

一个操作可以有多个成功状态码，语义必须不同，例如 `200` 表示返回实体，`201` 表示创建成功，`204` 表示无内容。响应体建议使用“包装对象 + 数据实体”的稳定结构：

```yaml
    ArticleResponse:
      type: object
      required: [data]
      properties:
        data:
          $ref: '#/components/schemas/Article'
    Article:
      type: object
      required: [id, title, status, createdAt]
      properties:
        id:
          type: string
          format: uuid
        title:
          type: string
        status:
          type: string
          enum: [draft, published, archived]
        createdAt:
          type: string
          format: date-time
```

#### 4.2 统一错误契约

全 API 必须共享同一套错误结构，前端才能写一个通用的错误处理分支。下面的错误契约包含机器可读的错误码、人类可读的信息、可选的字段级错误与请求追踪 ID：

```yaml
    Error:
      type: object
      required: [error]
      properties:
        error:
          type: object
          required: [code, message]
          properties:
            code:
              type: string
              description: 稳定的机器可读错误码
              example: ARTICLE_NOT_FOUND
            message:
              type: string
              description: 面向开发者的错误描述
              example: 指定的文章不存在
            details:
              type: array
              items:
                $ref: '#/components/schemas/FieldError'
            traceId:
              type: string
              example: 01HXYZEXAMPLETRACEID
    FieldError:
      type: object
      required: [field, message]
      properties:
        field:
          type: string
          example: title
        message:
          type: string
          example: 标题长度不能超过 120
```

#### 4.3 复用错误响应

把常见错误响应定义为可复用组件，所有操作统一引用，保证状态码与结构一致：

```yaml
  responses:
    BadRequest:
      description: 请求参数有误
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
    Unauthorized:
      description: 未认证或令牌失效
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
    Forbidden:
      description: 已认证但无权限
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
    NotFound:
      description: 资源不存在
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
    ValidationError:
      description: 请求体校验失败
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
```

操作中按语义引用，并根据需要补充状态相关的错误码说明：

```yaml
      responses:
        '200':
          description: 成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ArticleResponse'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'
```

#### 4.4 全栈关系

状态码是传输层语义，错误体中的 `code` 是业务语义，两者不能互相替代。前端处理逻辑通常是：

```ts
type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
    traceId?: string;
  };
};

function translateError(body: ApiErrorBody): string {
  // 业务码优先，保证后端调整 message 文案时不会破坏前端逻辑
  switch (body.error.code) {
    case 'ARTICLE_NOT_FOUND':
      return '文章不存在或已被删除';
    case 'ARTICLE_LOCKED':
      return '文章正在被他人编辑，请稍后再试';
    default:
      return body.error.message;
  }
}
```

#### 4.5 常见误区

> 误区一：所有错误都返回 `200`，在响应体里放 `{ success: false }`。

这会让 HTTP 中间件、监控、重试机制全部失效。传输层失败必须使用 4xx/5xx 状态码。

> 误区二：5xx 响应直接返回异常堆栈。

堆栈会暴露实现细节和内部路径，属于安全问题。错误体只暴露稳定的错误码、可读信息和 traceId。

### 5. Schema 复用、分页与鉴权组件

#### 5.1 $ref 的复用边界

`components` 中可以存放四类高频复用对象：`schemas`（数据结构）、`parameters`（参数）、`responses`（响应）、`securitySchemes`（鉴权方案）。复用分页参数与分页响应包装：

```yaml
  parameters:
    PageParam:
      name: page
      in: query
      schema:
        type: integer
        minimum: 1
        default: 1
    PageSizeParam:
      name: pageSize
      in: query
      schema:
        type: integer
        minimum: 1
        maximum: 100
        default: 20
  schemas:
    Pagination:
      type: object
      required: [page, pageSize, total]
      properties:
        page:
          type: integer
        pageSize:
          type: integer
        total:
          type: integer
          description: 符合条件的总条数
```

列表响应统一组合分页信息与实体数组：

```yaml
    ArticleListResponse:
      type: object
      required: [items, pagination]
      properties:
        items:
          type: array
          items:
            $ref: '#/components/schemas/Article'
        pagination:
          $ref: '#/components/schemas/Pagination'
```

#### 5.2 鉴权方案组件

在组件中声明鉴权方案，并在全局或操作级别引用：

```yaml
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
security:
  - BearerAuth: []
```

全局声明后默认所有操作都需要鉴权；公开操作可以用空数组显式放开：

```yaml
    get:
      operationId: listPublicArticles
      security: []
```

#### 5.3 全栈关系

复用组件是契约层的“公共函数”：分页结构改一次，所有列表接口同时生效。这要求组件设计保持稳定，不要把某个列表的特殊字段塞进通用分页对象；特殊字段应放在各自的响应结构中。

#### 5.4 常见误区

> 误区一：每个列表接口各写一套分页字段（pageNum/current_page/page 混用）。

前端不得不为每个接口写适配层。分页命名与结构必须在契约层统一。

> 误区二：`$ref` 指向 Wiki 截图或外部不可控链接。

引用必须指向文档内锚点或纳入版本库的受控文件，保证契约自包含、可离线解析。

### 6. Swagger UI 与文档生成

#### 6.1 本地启动 Swagger UI

不写任何后端代码，也可以用容器快速预览契约渲染效果：

```bash
docker run --rm -p 8080:8080 \
  -e SWAGGER_JSON=/openapi.yaml \
  -v "$PWD/openapi.yaml:/openapi.yaml:ro" \
  swaggerapi/swagger-ui:v5.18.2
```

打开 `http://localhost:8080`，可以看到按标签分组的接口，并通过 “Try it out” 直接向 `servers` 中声明的地址发起请求。

#### 6.2 在 Express 中挂载文档

开发期也可以直接把文档挂在 API 服务上，方便联调同学从同一入口访问：

```ts
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import fs from 'node:fs';
import yaml from 'yaml';

const app = express();
const document = yaml.parse(fs.readFileSync('./openapi.yaml', 'utf8'));

app.use('/docs', swaggerUi.serve, swaggerUi.setup(document));
app.listen(3000, () => {
  console.log('docs at http://localhost:3000/docs');
});
```

生产环境是否开放文档页应按团队安全策略决定；常见做法是仅在非生产环境挂载，或在网关层加访问控制。

#### 6.3 生成静态文档与契约校验

用 Redoc 生成可托管的单文件 HTML：

```bash
npx @redocly/cli build-docs openapi.yaml --output docs/api.html
```

用 Spectral 对契约做静态检查，把语法错误、缺描述、缺错误响应等问题挡在合并之前：

```bash
npx @stoplight/spectral-cli lint openapi.yaml \
  --ruleset spectral:oas
```

可以自定义团队规则集，例如强制每个操作都必须有 `operationId` 和至少一个错误响应：

```yaml
extends: ['spectral:oas']
rules:
  operation-operationId: error
  operation-description: warn
  info-contact: error
```

#### 6.4 全栈关系

文档不是独立产物，而是契约的“视图”。正确链路是：修改契约 → CI 中 Spectral 校验 → 生成/部署文档 → 前端重新生成类型与 Mock。这样文档永远不会比契约更新，也不会比契约更旧。

#### 6.5 常见误区

> 误区一：让前端直接阅读 YAML 源码理解接口。

YAML 是给工具和评审用的；接口的人类视图应该是 Swagger UI / Redoc，二者各取所需。

> 误区二：文档页可以执行任意请求，就不需要鉴权保护。

可交互文档会暴露接口结构与服务器地址，本身属于攻击面，必须按环境控制访问。

### 7. 契约优先落地与 API 版本化

#### 7.1 破坏性变更判定

判断一次变更是否破坏既有调用方，可用下面的快速清单：

```text
属于破坏性变更：
- 删除字段、重命名字段、修改字段类型
- 收紧约束（长度变短、枚举值减少、必填项增加）
- 修改状态码语义、改变错误结构
- 修改路径或请求方法

属于兼容变更：
- 新增可选字段
- 放宽约束（长度变长、枚举值增加）
- 新增接口、新增响应头
```

注意：给响应新增字段对“严格解析”的旧客户端理论上也可能是破坏性的，因此契约应明确要求客户端忽略未知字段。

#### 7.2 版本化策略

| 策略 | 形式 | 优点 | 缺点 |
|---|---|---|---|
| URI 版本 | `/v1/articles`、`/v2/articles` | 直观、可在网关路由 | URL 膨胀，版本与资源耦合 |
| 请求头版本 | `Accept: application/vnd.example.v2+json` | URL 保持稳定 | 不直观，调试成本高 |
| 查询参数版本 | `/articles?version=2` | 改动小 | 容易被缓存和默认值混淆 |

课程主线采用 URI 版本：版本号写进 `servers` 的 base URL，路径内不重复版本，避免同一文档里出现两种版本表达。

#### 7.3 废弃与过渡

无法一步删除的字段先标记废弃，并在描述中写明替代方案和移除时间：

```yaml
        authorName:
          type: string
          deprecated: true
          description: 已废弃，请使用 author.displayName；计划在 v2 移除
```

版本演进的推荐节奏是：v1 标记废弃 → 观察一个发布周期 → 发布 v2 并并行提供 → 调用方迁移完成后下线 v1。下线前应通过访问日志确认没有剩余 v1 流量。

#### 7.4 全栈关系

版本化不是后端单方面的事：前端需要知道自己当前使用的契约版本，并把“升级契约版本、重新生成类型、修复编译错误”作为一个显式任务纳入排期，而不是在后端切换后被动救火。

#### 7.5 常见误区

> 误区一：每次加字段就发一个新版本。

兼容变更不需要新版本。滥用版本会让团队同时维护大量平行接口，成本不可接受。

> 误区二：v2 上线后立即删除 v1。

不做并行期和流量确认的强制下线，会直接打断尚未迁移的客户端。

### 8. Postman、Bruno 集合与协作流程

#### 8.1 从契约生成集合

Postman 与 Bruno 都支持直接导入 OpenAPI 文件，导入后会按标签生成请求集合。集合必须配合**环境**使用，把地址和令牌参数化，而不是写死在每个请求中：

```text
集合变量：
  baseUrl = https://api.staging.example.com/v1
  token   = <ACCESS_TOKEN>

请求 URL：{{baseUrl}}/articles
请求头：Authorization: Bearer {{token}}
```

#### 8.2 Bruno 集合示例

Bruno 使用纯文本 `.bru` 文件，可以进版本库做代码评审。一个请求文件示例：

```text
meta {
  name: 创建文章
  seq: 2
}

post {{baseUrl}}/articles {
  headers {
    Authorization: Bearer {{token}}
    Content-Type: application/json
  }
  body:json {
    "title": "从集合发起的请求",
    "content": "用于人工验证契约"
  }
}

tests {
  test("状态码为 201", function () {
    expect(res.getStatus()).to.equal(201);
  });
  test("返回了文章 ID", function () {
    expect(res.getBody().data.id).to.be.a("string");
  });
}
```

#### 8.3 团队协作闭环

把契约、文档、集合串起来的标准协作流程：

```text
1. 需求进入接口设计阶段，责任人提交 openapi.yaml 变更
2. 前后端与测试共同评审契约，重点看字段语义与错误形态
3. 合并后 CI 执行 Spectral 校验并发布新版文档
4. 前端基于契约生成类型与 Mock（下一单元展开）
5. 后端按契约实现，并用契约测试验证响应符合 Schema
6. 人工探索使用 Postman/Bruno 集合，集合随契约更新
7. 联调问题若源于契约缺陷，先改契约再改代码，不允许私下绕过
```

#### 8.4 常见误区

> 误区一：集合里的请求和契约长期不一致也没人管。

集合是契约的派生品，契约变更后应重新导入或生成，并通过脚本定期比对，避免集合成为第二份“事实来源”。

> 误区二：把带真实令牌的集合文件直接提交进仓库。

令牌只能放在本地环境变量或客户端的加密存储中；仓库中只保留占位符 `<ACCESS_TOKEN>`。

## 课后题

1. 什么是 API 契约？它与一份写在 Wiki 上的接口文档相比，最本质的区别是什么？
2. 契约优先与代码优先各自的流程是什么？在什么情况下你会选择代码优先？请说明理由。
3. OpenAPI 文档中 `info.version`、`servers` 与 URI 版本号（如 `/v1`）分别表达什么？为什么不能用 `info.version` 替代接口版本承诺？
4. 场景分析：后端说“列表接口明天能好”，前端却需要今天就把文章列表页做完。请描述在契约已经评审通过的前提下，前端如何不阻塞地推进，以及契约在其中扮演的角色。
5. 一个 `GET /articles/{articleId}` 接口需要哪些参数？请分别说明路径参数、查询参数和请求头参数在 OpenAPI 中如何声明，路径参数为什么必须写 `required: true`。
6. 场景分析：联调时前端发现 `summary` 字段有时是字符串、有时是 `null`，前端代码直接调用 `.length` 导致页面崩溃。请从契约可空性的角度说明问题出在哪、契约应如何修改、前端应如何防御。
7. 为什么错误不能统一返回 `200` 加 `{ success: false }`？请至少从两个角度说明其危害，并解释 HTTP 状态码与错误体中的业务错误码 `code` 各负责什么。
8. 场景分析：后端在 5xx 响应中返回了完整异常堆栈，包含文件路径与 SQL 片段。这会带来什么风险？正确的 5xx 响应应包含哪些信息？
9. 判断以下变更分别属于破坏性变更还是兼容变更，并说明理由：删除一个响应字段；新增一个可选请求字段；把枚举值从 3 个增加到 5 个；把字段类型从 integer 改为 string；新增一个接口。
10. 场景分析：团队计划用 v2 替换 v1，后端希望上线 v2 当天就下线 v1。作为全栈工程师，你会如何设计废弃与迁移节奏？需要用什么证据判断 v1 是否可以安全下线？

## 实践练习题

### 练习 1：编写文章模块契约

#### 任务

为“文章管理”模块从零编写一份 `openapi.yaml`，覆盖文章的列表、详情、创建、更新四个操作。

概念范围：

```text
GET    /articles          分页列表，支持 status 与标签筛选
GET    /articles/{id}     文章详情
POST   /articles          创建文章
PATCH  /articles/{id}     更新文章部分字段
```

#### 步骤约束

1. 使用 OpenAPI 3.1，包含完整的 `info`、两个环境的 `servers`、`tags` 与 `components`。
2. 文章实体至少包含 `id`、`title`、`content`、`status`、`tags`、`createdAt`、`updatedAt`，其中 `status` 使用枚举，`id` 使用 UUID 格式。
3. 列表接口必须复用统一的分页参数与分页响应结构。
4. 每个操作至少描述一个成功响应和一个 `4xx` 响应，错误响应统一引用错误契约组件。
5. 创建请求体必须声明必填、长度与数组约束，并设置 `additionalProperties: false`。
6. 写完后使用 Spectral 校验，修复所有 error 级问题。

#### 提交物

- `openapi.yaml`；
- Spectral 校验命令与输出；
- 一张“字段与约束清单”表格，列出每个字段的类型、是否必填、约束与可空性；
- 200 字以内的契约设计说明。

#### 验收标准

- 文档结构完整，能被 Swagger UI 正常渲染；
- 四个操作的路径、方法、参数与响应齐全；
- 错误结构在所有操作中保持一致；
- 无真实地址、真实令牌，鉴权一律使用 `<ACCESS_TOKEN>` 占位；
- Spectral 无 error 级输出。

### 练习 2：Swagger UI 与统一错误契约

#### 任务

基于练习 1 的契约，完成文档的本地渲染，并为“评论”操作补充一组完整的错误响应链路。

#### 步骤约束

1. 使用容器方式启动 Swagger UI，确认四个操作都能在页面上展示并支持 Try it out。
2. 在 `components/schemas` 中定义统一 `Error` 与 `FieldError`，包含业务码、信息、字段级错误与 `traceId`。
3. 在 `components/responses` 中定义 400、401、403、404、422 五个可复用错误响应。
4. 为 `POST /articles` 同时挂上 `201`、`401`、`422` 三类响应，并给出每种响应的示例。
5. 使用 Redoc 或 Redocly CLI 生成一份单文件静态 HTML 文档。

#### 提交物

- 更新后的 `openapi.yaml`；
- Swagger UI 启动命令；
- 静态文档生成命令与产物路径；
- 三类响应的示例 JSON；
- 一份“状态码与业务码对照表”。

#### 验收标准

- 文档页可正常打开，分组清晰；
- 所有错误响应都引用同一套 Schema，没有重复定义；
- 示例 JSON 与 Schema 完全一致；
- 5xx 设计中不包含堆栈等内部信息；
- 生成的 HTML 可在浏览器直接打开。

### 练习 3：版本化与接口集合

#### 任务

对文章契约做一次演进：发布 v2，把创建接口的 `tags` 字段语义升级为对象数组，并保留 v1 并行运行；同时建立 Postman 或 Bruno 集合做人工验证。

#### 步骤约束

1. 通过 `servers` base URL 表达版本，v1 与 v2 各自一份文档或显式分组，不允许在路径中出现两套版本写法。
2. 在 v1 的 `tags` 字段上标记 `deprecated: true`，描述中写明替代字段与计划移除版本。
3. v2 的标签结构使用对象数组（至少含 `id` 与 `name`），并保证新增字段均为兼容式新增。
4. 将契约导入 Postman 或 Bruno，配置包含 `baseUrl` 与 `token` 两个变量的环境，令牌只写 `<ACCESS_TOKEN>`。
5. 为创建文章请求编写至少两条集合内断言（状态码、返回体字段）。
6. 用 Spectral 校验两份契约并保留输出。

#### 提交物

- v1、v2 两份契约文件（或受控的分组结构）；
- Postman/Bruno 集合导出文件或 `.bru` 文件；
- 环境变量配置截图或文本说明（令牌必须是占位符）；
- 断言定义与一次本地运行结果；
- 一份“破坏性变更评估表”，说明本次哪些是兼容变更、哪些需要新版本。

#### 验收标准

- v1、v2 可以并行被工具解析，互不污染；
- 废弃字段有明确替代方案与移除说明；
- 集合中没有写死的地址与真实令牌；
- 断言至少覆盖状态码与响应体结构；
- 能清楚解释为什么 `tags` 语义升级必须走新版本而不是直接改 v1。

## 阶段验收作业

### 作业名称

全模块 API 契约与协作产物包

### 作业场景

你所在的全栈小组要开发一个“文章与评论”小型系统。团队约定：任何一行前后端代码开始之前，必须先完成契约的评审与合并；契约是接口的唯一事实来源，文档、类型、Mock、集合都从契约派生。你需要独立完成这套契约及全部派生产物，证明团队可以基于它并行开工。

### 提交物

```text
contract-lab/
├── openapi/
│   ├── openapi.yaml            # 主契约（文章与评论模块）
│   └── spectral.yaml           # 团队规则集
├── generated/
│   └── api.html                # Redoc/Redocly 生成的静态文档
├── collection/
│   └── article-api.bru         # Bruno 集合（或 Postman 导出文件）
├── docs/
│   ├── change-policy.md        # 兼容与版本化策略
│   └── field-dictionary.md     # 字段词典
└── README.md
```

### 必做内容

1. 主契约至少包含六个操作：文章列表、文章详情、创建文章、更新文章、发表评论、删除评论。
2. 必须包含统一分页结构、统一错误契约、鉴权组件，且至少有一个公开操作与若干受保护操作。
3. 评论实体与文章实体之间通过 `$ref` 表达关联，不允许复制字段定义。
4. 至少设计一次废弃标记，演示字段级的兼容演进。
5. `spectral.yaml` 在官方规则集基础上至少增加两条团队规则。
6. 字段词典用表格说明每个字段的含义、类型、可空性与示例，供评审使用。
7. 变更策略文档明确写出破坏性变更清单、版本化方式、废弃与下线节奏。

### 演示步骤

学员需要在 20 分钟内完成以下演示：

1. 用自己的语言讲解契约的顶层结构与一次请求的完整描述路径。
2. 展示 Swagger UI 或生成的静态文档，任选一个操作说明其参数、请求体与全部响应。
3. 现场运行 Spectral 校验，并解释输出中的规则含义。
4. 从 Postman/Bruno 集合发起一次创建文章请求（可打到 Mock 或教学环境），展示断言结果。
5. 讲解统一错误契约，并演示前端会如何依据业务码而非文案做分支。
6. 讲解版本化与废弃设计，回答导师提出的“这次变更是否破坏兼容”的追问。

导师可以临时指定一个字段变更，要求学员现场判断它属于兼容变更还是破坏性变更，并说明契应如何修改。

### 评分标准

总分 100 分，70 分及以上通过。

| 维度 | 分值 | 满分要求 |
|---|---:|---|
| 契约完整性与正确性 | 30 | 六个操作齐全，结构、参数、请求体、响应正确，可被工具解析 |
| Schema 设计与复用 | 20 | 实体、分页、错误、鉴权组件设计合理，$ref 复用充分，无重复定义 |
| 统一错误契约 | 15 | 状态码与业务码语义清晰，错误响应全 API 一致，无堆栈泄露 |
| 文档与工具链 | 15 | Spectral 校验、Swagger UI/静态文档、集合均能实际运行 |
| 版本化与演进设计 | 10 | 能正确判定破坏性变更，废弃标记与迁移节奏合理 |
| 规范与表达 | 10 | 命名统一，无真实密钥，README 与字段词典清晰可复现 |

细分评分规则：

#### 契约完整性与正确性：30 分

- 六个操作路径与方法正确：10 分；
- 参数与请求体描述完整、约束合理：10 分；
- 响应覆盖成功与失败场景：5 分；
- 文档通过 Spectral 无 error：5 分。

#### Schema 设计与复用：20 分

- 文章、评论实体建模合理：8 分；
- 分页与鉴权组件复用：6 分；
- 关联通过 $ref 表达、无复制粘贴：6 分。

#### 统一错误契约：15 分

- Error/FieldError 结构完整：6 分；
- 五个以上操作复用同一错误组件：5 分；
- 状态码与业务码职责区分清楚：4 分。

#### 文档与工具链：15 分

- Swagger UI 或静态文档可访问：6 分；
- 自定义 Spectral 规则生效：4 分；
- Postman/Bruno 集合可运行且断言有效：5 分。

#### 版本化与演进设计：10 分

- 破坏性变更判定正确：5 分；
- 废弃字段与下线节奏可执行：5 分。

#### 规范与表达：10 分

- 命名、缩进、文件组织统一：4 分；
- 无真实地址与凭证：3 分；
- README 与字段词典能指导他人复现：3 分。

### 强制不通过条件

出现以下任一情况，本次验收不通过；修正后重新验收：

1. 提交的契约无法被 Swagger UI 或 Spectral 解析，存在 YAML 语法错误。
2. 六个操作缺少任意一个，或存在只写 `200`、没有失败响应的操作。
3. 错误结构各接口不一致，或在 5xx 中返回异常堆栈。
4. 出现真实令牌、密码、内网地址等敏感信息。
5. 无法判断给定变更是破坏性变更还是兼容变更，或版本化方式自相矛盾。
6. 集合、文档与契约三者明显不一致且无法解释派生关系。
7. 只提交截图，没有契约源文件与可运行命令。

### 学习目标与验收映射

| 学习目标 | 验收证据 |
|---|---|
| 解释契约价值与契约优先 | README 中的协作流程说明与现场讲解 |
| 编写结构完整的 OpenAPI 文档 | `openapi.yaml` 顶层结构与 Spectral 校验结果 |
| 描述参数与请求体 | 六个操作的参数、requestBody 与约束定义 |
| 描述响应与统一错误契约 | Error/FieldError 组件及各操作引用 |
| 使用 Swagger UI 与文档生成工具 | 静态文档产物与现场演示 |
| 掌握版本化与接口集合 | `change-policy.md`、废弃字段与 Bruno/Postman 集合 |

### 提交前自检

- [ ] 六个操作均包含成功响应与至少一个失败响应。
- [ ] 所有路径参数都显式声明 `required: true`。
- [ ] 分页、错误、鉴权均通过组件复用，没有重复定义。
- [ ] Spectral 校验无 error，自定义规则已实际生效。
- [ ] 静态文档可以在浏览器直接打开。
- [ ] 集合中只存在 `<ACCESS_TOKEN>` 占位，没有真实凭证。
- [ ] 废弃字段写有替代方案与移除版本。
- [ ] README 中的命令可在另一台机器上按顺序执行成功。
