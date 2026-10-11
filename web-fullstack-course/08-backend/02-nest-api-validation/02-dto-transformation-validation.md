# DTO 转换与运行时校验：类型通过不等于输入可信

## 任务卡

| 项目 | 本课约定 |
| --- | --- |
| 任务 | 为创建商品与列表查询建立运行时 DTO 边界，显式处理数字、日期、白名单和嵌套对象 |
| 练习目录 | `$HOME/code/market-backend-lab/nest-api` |
| 主要产物 | create/query/nested DTO、全局 `ValidationPipe`、可创建的内存仓储 |
| 成功证据 | 合法整数分创建为 201；分页字符串显式转换；UTC 查询时间规范化 |
| 失败证据 | 字符串金额、浮点金额、空白标题、未知字段、非法日期和嵌套坏字段为 400 |
| 环境标签 | **Nest 运行时校验、内存仓储、无持久化/认证/授权** |

## 1. 任务背景

控制器签名写成 `create(body: CreateListingDto)` 只告诉 TypeScript 编译器“开发者希望这里是什么”。
网络客户端可以绕过前端，提交：

```json
{
  "title": "   ",
  "description": "",
  "priceCents": "1990",
  "ownerId": "other-user"
}
```

这段 JSON 语法完全合法，却违反四条业务边界。TypeScript 类型编译后不会检查它。
Nest 的 `ValidationPipe`、class-transformer 和 class-validator 共同建立运行时流程：

```text
外部 JSON / query string（不可信）
  -> plain object
  -> DTO class 实例化与显式转换
  -> 字段/嵌套校验
  -> 白名单检查
  -> controller 参数
  -> service
```

转换不是“尽量猜成正确类型”。正文金额字符串应被拒绝；查询参数天生是字符串，才在指定字段上显式转数字。

## 2. 学习目标

完成本课后，你能够：

1. 解释 interface、class DTO 和运行时元数据的差异；
2. 让外部 JSON 在通过管道前保持“不可信/unknown”的心智模型；
3. 使用 `whitelist` 与 `forbidNonWhitelisted` 拒绝未知字段；
4. 禁止全局隐式转换，只在 query 字段使用 `@Type`；
5. 对标题 trim 后再检查非空和长度；
6. 对 `priceCents` 检查安全业务范围内的整数；
7. 把查询日期显式转为有效 `Date`，再规范化成 UTC ISO；
8. 使用 `@ValidateNested` 与 `@Type` 完成嵌套/数组校验；
9. 区分缺失、`null`、空字符串、零和非法值；
10. 证明无效请求不会进入内存仓储。

## 3. 预备知识

完成[上一课](01-bootstrap-modules-dependency-injection.md)，确保 GET 列表可运行。安装 DTO 运行时依赖：

```bash
cd "$HOME/code/market-backend-lab/nest-api"
pnpm add class-transformer class-validator
pnpm list --depth 0
mkdir -p src/listings/dto
```

保存锁文件和实际包版本，不把未核验的补丁号抄进证据。继续使用上一课的 TS 6 兼容装饰器配置。

本课修改同一内存仓储。重启会回到一个源码静态台灯，新增商品会丢失；这是明确的教学 fake。

## 4. 核心理论

### 4.1 class DTO 同时承担运行时构造器

interface 和 type 只存在于编译期；class 在 JavaScript 运行时仍有构造器，装饰器可把校验元数据附在它上面。
控制器必须以值导入 DTO：

```ts
import { CreateListingDto } from "./dto/create-listing.dto.js";
```

若写 `import type`，编译器可能移除导入，ValidationPipe 无法获得预期 metatype。

### 4.2 whitelist 的两种策略

`whitelist: true` 会处理没有校验装饰器的属性；单独使用时通常剥离它们。
再加 `forbidNonWhitelisted: true`，请求会直接失败。教学 API 选择拒绝，理由是：

- 客户端拼错字段能尽早暴露；
- `ownerId` 等危险字段不会被悄悄吞掉后让调用方误判；
- API 演进需要显式契约，而不是接受任意附加值。

这仍不是授权。即使 DTO 不允许 `ownerId`，后端以后还要从会话取得身份并检查对象所有权。

### 4.3 显式转换优于全局猜测

HTTP query 参数天然是字符串，`?page=2` 到达时不是 number。可以在 `page` 字段写
`@Type(() => Number)`，再用 `@IsInt()`、`@Min()`、`@Max()` 验证。

正文 JSON 能区分 number 与 string。对 `priceCents` 不加转换，让 `"1990"` 失败。
全局 `enableImplicitConversion: true` 可能根据设计类型把它变成 number，掩盖客户端契约错误。

`Number("")` 是 0，`Number("1e3")` 是 1000。若产品不接受这些 query 写法，应在转换前增加字符串格式规则，
不能只依赖转换结果。

### 4.4 trim、长度和 Unicode

标题先用 `@Transform` 去首尾空白，再检查长度与 `\S`。`@Length` 按 JavaScript 字符串长度规则工作，
不是完整的人类字素簇计数；包含 emoji 和组合字符的严格产品上限需要单独定义。

描述允许空字符串但不允许 `null`。`@IsString()` 会拒绝 null；`@MaxLength(2000)` 负责上限。

### 4.5 日期转换与 UTC

查询 `createdAfter=2026-10-11T08:00:00.000Z` 先检查末尾 `Z` 或显式偏移量，再通过
`@Transform` 转为 `Date`，由 `@IsDate()` 拒绝未转换字符串与 Invalid Date。进入 service 后立即
`toISOString()`，得到规范 UTC。

不要接受没有时区的持久时间字符串并猜本地时区。界面本地化属于前端显示层。

### 4.6 嵌套校验需要两个动作

对嵌套对象/数组：

- `@Type(() => ChildDto)` 把 plain object 实例化为子 DTO；
- `@ValidateNested()` 递归执行子 DTO 的规则。

只写其中一个都不完整。`@IsArray()` 与 `@ArrayMaxSize()` 负责容器，子项规则负责每个元素。

### 4.7 可选不等于可为 null

`@IsOptional()` 通常跳过 `undefined` 和 `null` 的后续校验，是否允许 null 要按产品契约确认。
本课 query 可选字段来自 URL；正文创建字段全部必填，不使用 `skipMissingProperties`。

PATCH DTO 的缺失语义与创建不同，后续更新接口要单独设计，不能把创建 DTO 直接全部 optional。

## 5. 元素、属性、API 或配置清单

| API / 装饰器 | 用途 | 本课边界 |
| --- | --- | --- |
| `ValidationPipe` | DTO 转换、白名单、校验 | 不执行对象授权 |
| `transform: true` | plain object -> DTO instance | 不等于全局隐式类型猜测 |
| `enableImplicitConversion: false` | 禁止按设计类型自动转换 | query 用 `@Type` 显式转换 |
| `whitelist: true` | 识别有装饰器字段 | 配合 forbid 才拒绝未知字段 |
| `forbidNonWhitelisted: true` | 未知字段为 400 | 不代替版本兼容策略 |
| `validationError.target/value: false` | 不在错误详情回显目标/原值 | 仍需统一错误契约 |
| `@Transform` | trim 标题/查询词 | 转换函数也要防非字符串 |
| `@Type(() => Number)` | query 数字转换 | 正文金额不使用 |
| `@Transform` + `Date` | 只转换带时区的 query 日期 | 校验后再 UTC ISO 化 |
| `@IsInt` / `@Min` / `@Max` | 整数和范围 | 金额还应满足 JS 安全整数；当前上限更小 |
| `@Length` / `@MaxLength` | 字符串长度 | 不等于数据库字节长度 |
| `@Matches(/\S/u)` | 拒绝全空白 | 先 trim 更清楚 |
| `@ValidateNested` | 递归子 DTO | 还需要 `@Type` |
| `@ArrayMaxSize` | 限制批量项数 | 不替代请求体字节上限 |
| `plainToInstance` | 独立探针实例化 DTO | 实例化本身不校验 |
| `validate` | 独立执行 class-validator | HTTP 中由 pipe 调用 |

## 6. 最小可运行案例

### 6.1 创建 DTO

创建完整文件 `src/listings/dto/create-listing.dto.ts`：

```ts
import { Transform } from "class-transformer";
import {
  IsInt,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export class CreateListingDto {
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsString()
  @Length(1, 100)
  @Matches(/\S/u, { message: "title must contain a non-whitespace character" })
  title!: string;

  @IsString()
  @MaxLength(2000)
  description!: string;

  @IsInt()
  @Min(0)
  @Max(100_000_000)
  priceCents!: number;
}
```

没有 `ownerId/status/version/createdAt`。这些字段由身份、业务规则和服务器生成，不能由创建正文指定。

### 6.2 查询 DTO

创建完整文件 `src/listings/dto/list-listings-query.dto.ts`：

```ts
import { Transform, Type } from "class-transformer";
import {
  IsDate,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export class ListListingsQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (
      typeof value !== "string" ||
      !/(?:Z|[+-]\d{2}:\d{2})$/u.test(value)
    ) {
      return value;
    }
    return new Date(value);
  })
  @IsDate()
  createdAfter?: Date;
}
```

数字和日期只在声明字段上转换。`priceCents` 不复用这个策略。

### 6.3 全局管道

更新 `src/main.ts` 为完整文件：

```ts
import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";

const app = await NestFactory.create(AppModule);
app.setGlobalPrefix("api/v1");
app.useGlobalPipes(new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
  transformOptions: {
    enableImplicitConversion: false,
  },
  validationError: {
    target: false,
    value: false,
  },
}));
app.enableShutdownHooks();
await app.listen(3000, "127.0.0.1");
console.log("listening http://127.0.0.1:3000/api/v1");
```

运行 `pnpm build`。构建成功只证明类型与语法，不证明 pipe 收到了真实 HTTP 请求。

## 7. 邻里集市集成案例

### 7.1 扩展仓储端口和内存实现

把 `src/listings/listings.repository.ts` 更新为：

```ts
import type { Listing } from "./listing.js";

export const LISTINGS_REPOSITORY = Symbol("LISTINGS_REPOSITORY");

export interface ListingsRepository {
  findAll(): readonly Listing[];
  insert(listing: Listing): void;
}
```

把 `MemoryListingsRepository` 中增加方法：

```ts
insert(listing: Listing): void {
  this.items.push(listing);
}
```

这仍是 singleton 内存数组，方法名 `insert` 不表示执行了 SQL。

### 7.2 更新 service

用以下完整文件替换 `src/listings/listings.service.ts`：

```ts
import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { CreateListingDto } from "./dto/create-listing.dto.js";
import type { ListListingsQueryDto } from "./dto/list-listings-query.dto.js";
import type { Listing } from "./listing.js";
import {
  LISTINGS_REPOSITORY,
  type ListingsRepository,
} from "./listings.repository.js";

@Injectable()
export class ListingsService {
  constructor(
    @Inject(LISTINGS_REPOSITORY)
    private readonly repository: ListingsRepository,
  ) {}

  list(query: ListListingsQueryDto) {
    const createdAfter = query.createdAfter?.toISOString();
    const normalizedQuery = query.q?.toLocaleLowerCase("zh-CN");
    const filtered = this.repository.findAll().filter((listing) => {
      const matchesText =
        normalizedQuery === undefined ||
        listing.title.toLocaleLowerCase("zh-CN").includes(normalizedQuery);
      const matchesTime =
        createdAfter === undefined || listing.createdAt > createdAfter;
      return matchesText && matchesTime;
    });
    const start = (query.page - 1) * query.pageSize;
    return {
      items: filtered.slice(start, start + query.pageSize),
      page: query.page,
      pageSize: query.pageSize,
      total: filtered.length,
    };
  }

  create(input: CreateListingDto): Listing {
    const listing: Listing = Object.freeze({
      id: randomUUID(),
      title: input.title,
      description: input.description,
      priceCents: input.priceCents,
      status: "available",
      ownerId: "demo-user",
      version: 1,
      createdAt: new Date().toISOString(),
    });
    this.repository.insert(listing);
    return listing;
  }
}
```

`toISOString()` 把有效 Date 规范为 UTC。字符串比较仅在规范 ISO 时间形状相同时成立；
第 3 章数据库使用 `timestamptz`，不依赖应用字符串排序完成所有查询。

### 7.3 更新 controller

用以下完整文件替换 `src/listings/listings.controller.ts`：

```ts
import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { CreateListingDto } from "./dto/create-listing.dto.js";
import { ListListingsQueryDto } from "./dto/list-listings-query.dto.js";
import { ListingsService } from "./listings.service.js";

@Controller("listings")
export class ListingsController {
  constructor(private readonly listings: ListingsService) {}

  @Get()
  list(@Query() query: ListListingsQueryDto) {
    return this.listings.list(query);
  }

  @Post()
  create(@Body() body: CreateListingDto) {
    return this.listings.create(body);
  }
}
```

DTO 必须是值导入。构建、启动并请求：

```bash
pnpm build
pnpm start
```

```bash
curl -i -X POST http://127.0.0.1:3000/api/v1/listings \
  -H 'Content-Type: application/json' \
  --data '{"title":"  二手自行车  ","description":"正常使用","priceCents":19900}'

curl -i 'http://127.0.0.1:3000/api/v1/listings?page=1&pageSize=10&q=%E8%87%AA%E8%A1%8C%E8%BD%A6&createdAfter=2026-01-01T00%3A00%3A00.000Z'
```

预期创建为 201，标题已 trim，金额仍是 `19900`，时间以 `Z` 结尾；查询 DTO 中 page/pageSize 为 number，
createdAfter 为有效 Date 后转 UTC ISO。必须以实际响应记录为证据。

### 7.4 嵌套 DTO 独立探针

创建完整文件 `src/listings/dto/preview-batch.dto.ts`：

```ts
import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsDate,
  ValidateNested,
} from "class-validator";
import { CreateListingDto } from "./create-listing.dto.js";

export class ListingPreviewItemDto {
  @ValidateNested()
  @Type(() => CreateListingDto)
  listing!: CreateListingDto;

  @Transform(({ value }) => {
    if (
      typeof value !== "string" ||
      !/(?:Z|[+-]\d{2}:\d{2})$/u.test(value)
    ) {
      return value;
    }
    return new Date(value);
  })
  @IsDate()
  requestedAt!: Date;
}

export class PreviewBatchDto {
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ListingPreviewItemDto)
  items!: ListingPreviewItemDto[];
}
```

这是独立 DTO 教学探针，不是邻里集市正式 API；它用于证明嵌套规则，避免凭空增加生产端点。

创建完整文件 `src/dto-probe.ts`：

```ts
import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { PreviewBatchDto } from "./listings/dto/preview-batch.dto.js";

const raw: unknown = {
  items: [{
    listing: {
      title: "书架",
      description: "",
      priceCents: "8000",
    },
    requestedAt: "not-a-date",
  }],
};

const dto = plainToInstance(PreviewBatchDto, raw);
const errors = await validate(dto, {
  whitelist: true,
  forbidNonWhitelisted: true,
});

console.log(JSON.stringify({ errorCount: errors.length }));
if (errors.length === 0) {
  throw new Error("expected nested validation errors");
}
```

执行：

```bash
pnpm build
node dist/dto-probe.js
```

预期 `errorCount` 大于 0 且进程退出 0，证明坏嵌套输入被发现；它不是 HTTP 或数据库测试。

## 8. 常见错误与排查路径

### 8.1 明确错误：启用全局隐式转换

错误配置：

```ts
transformOptions: {
  enableImplicitConversion: true,
}
```

随后发送：

```bash
curl -i -X POST http://127.0.0.1:3000/api/v1/listings \
  -H 'Content-Type: application/json' \
  --data '{"title":"台灯","description":"","priceCents":"1990"}'
```

| 项目 | 记录 |
| --- | --- |
| 现象 | 字符串金额可能被按设计类型转成 number 后通过 |
| 证据 | 响应 201，而原始 JSON 中 priceCents 明确是 string |
| 原因 | 全局隐式转换掩盖正文契约错误 |
| 修复 | 恢复 `enableImplicitConversion: false`，只对 query 指定 `@Type` |
| 复验 | 字符串金额 400，数值 1990 为 201 |

### 8.2 只开 whitelist，不 forbid

**现象：** 带 `ownerId` 的请求成功，但字段被静默丢弃。
**证据：** 客户端以为字段生效，服务端没有错误。
**原因：** whitelist 只剥离，未要求未知字段失败。
**修复：** 打开 `forbidNonWhitelisted`。
**复验：** 同一请求 400，仓储数量不增加。

### 8.3 嵌套 DTO 漏掉 `@Type`

临时删除 `@Type(() => CreateListingDto)`，运行 probe。

**现象：** 子对象可能保持 plain object，子 DTO 规则不按预期执行。
**证据：** 错误树缺少 `priceCents` 等子字段证据，甚至错误数为 0。
**原因：** `@ValidateNested` 没有可识别的子 class 实例。
**修复：** 恢复 `@Type` 与 `@ValidateNested`。
**复验：** probe 明确发现字符串金额和坏日期。

### 8.4 创建 DTO 使用 `skipMissingProperties`

**现象：** 缺少 title/priceCents 的创建请求可能穿过校验。
**原因：** 把 PATCH 的部分更新语义误用于 POST 创建。
**修复：** 创建管道不跳过缺失字段；更新 DTO 单独设计。
**复验：** `{}` 为 400，服务不创建默认零价匿名商品。

### 8.5 把无时区日期当 UTC

**现象：** 不同机器对 `2026-10-11T08:00:00` 得到不同时间点。
**证据：** `toISOString()` 随本机时区产生不同结果。
**原因：** 输入没有 `Z` 或偏移量。
**修复：** API 要求 RFC 3339/ISO 字符串带明确时区，并增加字符串格式约束。
**复验：** `...Z` 规范化稳定，无时区值被拒绝。

## 9. 课后题

**问题 1：为什么 controller 参数写 DTO 仍不能替代 ValidationPipe？**
参考答案：TypeScript 标注只在编译期，网络 JSON 在运行时可为任意形状；需要实例化与运行校验。

**问题 2：为什么 query page 可以转换，而 body priceCents 不转换？**
参考答案：URL query 天然是字符串，协议需要显式适配；JSON 本身区分数值/字符串，金额契约要求数值整数分。

**问题 3：`@ValidateNested` 为什么还需要 `@Type`？**
参考答案：plain object 没有子 DTO 构造器身份；`@Type` 负责实例化，nested 负责递归验证。

**问题 4：未知字段拒绝是否已经解决越权？**
参考答案：没有。它只限制输入形状；真实身份、对象所有权和角色权限仍需后端认证/授权。

## 10. 实践练习

### 基础：验证零元商品

提交 `priceCents: 0`。

可判定标准：

- 201 成功；
- 响应仍为数字 0；
- 代码没有用 `if (!priceCents)` 把零当缺失；
- `priceCents: -1` 和 `0.5` 为 400。

### 进阶：严格查询数字语法

让 page 只接受十进制正整数字符串，拒绝空字符串、`1e2`、`1.5`。

可判定标准：

- 在转换前检查原始字符串格式；
- `page=2` 转为 number 2；
- 三种异常都为 400；
- 默认缺失仍为 1；
- 不影响 body 金额规则。

### 故障注入：删除 DTO 值导入

尝试把 controller 中 DTO 改为 `import type` 或把参数类型改为 interface。

可判定标准：

1. 构建/运行或 HTTP 行为出现可观察差异；
2. 非法正文不再有正确校验证据；
3. 恢复 class 值导入；
4. 字符串金额与未知 ownerId 再次 400；
5. 记录现象、证据、原因、修复、复验。

## 11. 阶段验收

- [ ] 全局 pipe 开启 transform、whitelist、forbidNonWhitelisted。
- [ ] `enableImplicitConversion` 明确为 false。
- [ ] 标题 trim 后校验，空白/101 长度失败。
- [ ] 描述必须是字符串且最多 2000 字符。
- [ ] 金额 0 和 19900 成功，字符串/小数/负数/超上限失败。
- [ ] query page/pageSize 显式转数字并有上下限。
- [ ] createdAfter 是有效 Date，进入 service 后规范化为 UTC ISO。
- [ ] 嵌套探针同时使用 `@Type` 和 `@ValidateNested`。
- [ ] 未知 `ownerId` 被拒绝，仓储不增加。
- [ ] 重启数据恢复到源码种子，未宣称持久化。
- [ ] 实际 HTTP 结果与单独 DTO probe 证据没有混写。

## 12. 常见问题

**可以直接在 DTO 中做数据库查询吗？**
不应。DTO 负责局部输入形状；需要仓储的业务规则放 service，并考虑事务和竞态。

**为什么错误详情暂时还是 Nest 默认形状？**
本课先验证输入规则；下一课用 exception factory 与 filter 统一成稳定 API 错误契约。

**class-validator 能保证数据库约束吗？**
不能。脚本、其他服务和并发仍可绕过应用；第 3 章把关键不变量下沉到数据库。

**是否应自动 trim description？**
这是产品决策。本课只 trim title；不能在未定义时悄悄改变用户正文。

## 13. 扩展阅读

资料快照日期：**2026-10-11**。

- [NestJS Validation](https://docs.nestjs.com/techniques/validation)：ValidationPipe 与 DTO。
- [NestJS Pipes](https://docs.nestjs.com/pipes)：转换与校验边界。
- [class-validator](https://github.com/typestack/class-validator)：字段和嵌套规则。
- [class-transformer](https://github.com/typestack/class-transformer)：plain class 转换与 `@Type`。
- [TypeScript Decorators](https://www.typescriptlang.org/docs/handbook/decorators.html)：本兼容线使用的传统装饰器背景。
- [ECMAScript Date](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Date/toISOString)：UTC ISO 规范化。

## 我现在能做到什么

我能把 HTTP 正文和 query 当作不可信输入，使用 class DTO、显式转换、白名单和嵌套规则建立运行时边界，
并让整数分、UTC 时间、缺失/空值和未知字段得到可判定结果，而不是依赖 TypeScript 类型自我安慰。

## 单元导航

[返回本章 Hub](../02-nest-api-validation.md) ·
[上一课：启动、模块与依赖注入](01-bootstrap-modules-dependency-injection.md) ·
[下一课：管道、过滤器与错误契约](03-pipes-filters-error-contract.md)
