# 数组、集合变换与分页

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课任务 | 在不修改源集合的前提下完成查找、筛选、排序、合计与分页 |
| 可观察产出 | `js-lab/array-transforms.mjs`、`js-lab/listing-pagination.mjs` |
| 运行条件 | Node.js 24 LTS；无第三方依赖 |
| 建议时间 | 120–150 分钟 |
| 完成证据 | 空集合、过滤总数、越界空页、原顺序与身份检查 |

## 1. 任务背景

邻里集市列表要回答不同问题：有没有某个 id、哪些标题匹配、当前页展示什么、
全部匹配记录有多少、当前可见商品总价是多少。把这些含义都塞进一个数组长度，
会让分页按钮、空状态和合计相互矛盾。

数组方法通过输入和输出表达变换。关键不是记住名称，而是知道它是否修改原数组、
找不到时返回什么、空数组怎样处理，以及结果中的对象是否仍与源集合共享身份。

## 2. 学习目标

完成本课后，你应能：

- 使用下标并处理不存在元素；
- 区分 `find`、`some`、`filter`、`map`、`reduce`、`slice`；
- 为 `reduce` 提供空集合初始值；
- 在每次金额累计后检查安全整数；
- 区分原地 `sort` 与非修改式 `toSorted`；
- 先筛选、再计数、再排序和分页；
- 接受合法的超范围空页；
- 进行指定 locale 的大小写归一文本匹配；
- 在筛选和排序后继续使用稳定 id 与原记录身份。

## 3. 预备知识

先完成[对象、引用与定向不可变更新](01-objects-references-immutable-updates.md)，
理解数组可以创建新外壳但仍共享其中对象。完整 Listing 的价格是整数分，
时间是 UTC 字符串；分页函数只接收已经通过外部边界的记录。

## 4. 核心理论

### 4.1 下标与缺失

数组下标从 0 开始。读取超范围位置得到 `undefined`，不会自动得到空对象：

```js
const first = items[0];
if (first !== undefined) {
  console.log(first.id);
}
```

不要使用页面下标作为商品 id。排序、筛选或新数据插入都会改变位置。

### 4.2 各方法回答不同问题

| 方法 | 回答 | 找不到或空集合 | 是否修改源数组 |
| --- | --- | --- | --- |
| `find` | 第一项是什么 | `undefined` | 否 |
| `some` | 是否至少有一项 | `false` | 否 |
| `filter` | 哪些项符合 | `[]` | 否 |
| `map` | 每项转换成什么 | `[]` | 否 |
| `reduce` | 全部累计成什么 | 取决于初始值 | 否，但回调可错误修改对象 |
| `slice` | 某个区间是什么 | `[]` | 否 |
| `sort` | 原地排序 | 原数组 | **是** |
| `toSorted` | 排序后的新数组 | `[]` | 否 |

新数组不代表元素被深复制。filter、map 中若直接返回原对象，身份仍共享。

### 4.3 安全金额合计

`reduce((sum, item) => sum + item.priceCents, 0)` 能让空数组得到 0，
但仍要校验每项和每次新合计。两个安全整数的和可能超出安全范围。
不要把非法项过滤掉后仍报告合计成功。

### 4.4 分页数据流

正确顺序是：

```text
已准入完整记录 → 按查询筛选 → 得到 total → 稳定排序 → 计算 offset → slice 当前页
```

`total` 是全部匹配数，不是当前页 `items.length`。页码从 1 开始；
合法但超出末页的 page 返回空 items，并保留真实 total，不偷偷改回第 1 页。

### 4.5 文本与身份

本课使用 `toLocaleLowerCase("zh-CN")` 后做子串匹配，让 `LED` 与 `led` 相配。
这是教学级包含搜索，不等于分词、拼音或数据库全文搜索。
排序后得到的下标只属于当前视图，收藏与更新仍使用 item.id。

## 5. 语法、标准 API 与运行时边界清单

| API | 作用 | 关键边界 |
| --- | --- | --- |
| `array[index]` | 按位置读取 | 越界为 undefined |
| `find` | 返回第一项 | 需处理 undefined |
| `some` | 返回是否存在 | 不返回目标项 |
| `filter` | 新建匹配数组 | 元素身份默认共享 |
| `map` | 一对一转换 | 花括号回调需 return |
| `reduce` | 累计结果 | 空集合应提供初始值 |
| `slice(start, end)` | 取半开区间 | 不修改源数组 |
| `sort(compareFn)` | 原地排序 | 会修改源数组 |
| `toSorted(compareFn)` | 非修改式排序 | Node 24 可用 |
| `toLocaleLowerCase(locale)` | locale 感知大小写归一 | 不等于完整搜索 |
| `Array.isArray` | 检查数组外形 | 不验证元素字段 |

## 6. 最小可运行案例

创建完整文件 `js-lab/array-transforms.mjs`：

```js
function sumCents(items) {
  return items.reduce((total, item) => {
    if (!Number.isSafeInteger(item.priceCents) || item.priceCents < 0) {
      throw new RangeError(`invalid price: ${item.id}`);
    }
    const next = total + item.priceCents;
    if (!Number.isSafeInteger(next)) throw new RangeError("total overflow");
    return next;
  }, 0);
}

const items = [
  { id: "a", title: "台灯", priceCents: 1990 },
  { id: "b", title: "书架", priceCents: 5000 },
  { id: "c", title: "赠品", priceCents: 0 },
];

console.log(items[0].id);
console.log(items[9] === undefined);
console.log(items.find((item) => item.id === "b").title);
console.log(items.some((item) => item.priceCents === 0));
console.log(items.filter((item) => item.priceCents > 0).length);
console.log(items.map((item) => item.id).join(","));
console.log(sumCents(items));
console.log(sumCents([]));

const descending = items.toSorted((a, b) =>
  a.priceCents === b.priceCents
    ? a.id.localeCompare(b.id, "en")
    : a.priceCents < b.priceCents ? 1 : -1,
);
console.log(descending.map((item) => item.id).join(","));
console.log(items.map((item) => item.id).join(","));
```

运行 `node array-transforms.mjs`，预期输出：

```text
a
true
书架
true
2
a,b,c
6990
0
b,a,c
a,b,c
```

空集合合计为 0，0 分商品仍存在于集合中。toSorted 后源顺序保持 a,b,c。

## 7. 邻里集市集成案例

创建完整文件 `js-lab/listing-pagination.mjs`：

```js
function paginateListings(items, { page = 1, pageSize = 20, q = "" } = {}) {
  if (!Array.isArray(items)) throw new TypeError("items must be an array");
  if (!Number.isSafeInteger(page) || page < 1) {
    throw new RangeError("page must be a positive safe integer");
  }
  if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw new RangeError("pageSize must be from 1 to 100");
  }
  if (typeof q !== "string") throw new TypeError("q must be text");

  const keyword = q.trim().toLocaleLowerCase("zh-CN");
  const filtered = items.filter((item) =>
    item.title.toLocaleLowerCase("zh-CN").includes(keyword),
  );
  const total = filtered.length;
  const ordered = filtered.toSorted((a, b) =>
    a.priceCents === b.priceCents
      ? a.id.localeCompare(b.id, "en")
      : a.priceCents < b.priceCents ? 1 : -1,
  );
  const offset = (page - 1) * pageSize;
  if (!Number.isSafeInteger(offset)) throw new RangeError("offset overflow");

  return {
    items: ordered.slice(offset, offset + pageSize),
    page,
    pageSize,
    total,
  };
}

const listings = [
  {
    id: "listing-1",
    title: "台灯",
    description: "功能正常，自提",
    priceCents: 1990,
    status: "available",
    ownerId: "user-1",
    version: 1,
    createdAt: "2026-10-11T08:00:00.000Z",
  },
  {
    id: "listing-2",
    title: "书架",
    description: "三层木制书架",
    priceCents: 5000,
    status: "available",
    ownerId: "user-2",
    version: 1,
    createdAt: "2026-10-11T09:00:00.000Z",
  },
  {
    id: "listing-3",
    title: "LED 台灯",
    description: "暖色阅读灯",
    priceCents: 2500,
    status: "reserved",
    ownerId: "user-3",
    version: 2,
    createdAt: "2026-10-11T10:00:00.000Z",
  },
];

const page = paginateListings(listings, {
  page: 2,
  pageSize: 1,
  q: "台灯",
});
console.log(`page=${page.page}, pageSize=${page.pageSize}, total=${page.total}`);
console.log(`ids=${page.items.map((item) => item.id).join(",")}`);
console.log(`same-identity=${page.items[0] === listings[0]}`);
console.log(`source-order=${listings.map((item) => item.id).join(",")}`);

const localeMatch = paginateListings(listings, { q: "led" });
console.log(`locale-match=${localeMatch.items[0].id}`);

const emptyPage = paginateListings(listings, { page: 9, pageSize: 1 });
console.log(`empty-items=${emptyPage.items.length}, total=${emptyPage.total}`);
```

运行 `node listing-pagination.mjs`，预期输出：

```text
page=2, pageSize=1, total=2
ids=listing-1
same-identity=true
source-order=listing-1,listing-2,listing-3
locale-match=listing-3
empty-items=0, total=3
```

先筛选“台灯”得到两件，再按价格降序，第二页才是 listing-1。
返回项仍是已准入记录的同一身份，源数组顺序不变。真实 API 必须在后端独立校验分页参数、
定义稳定排序；前端本地分页不能替代数据库分页。

## 8. 常见错误与排查路径

**明确错误示例：把本页长度当 total。**

```js
return {
  items: pageItems,
  page,
  pageSize,
  total: pageItems.length,
};
```

第二页只有一项时会错误报告总数 1，分页按钮可能提前消失。

**明确错误示例：原地排序。**

```js
const ordered = items.sort((a, b) => a.priceCents - b.priceCents);
```

`ordered === items`，其他持有源数组的视图也看到顺序变化。

### 五段诊断记录

| 项目 | 记录 |
| --- | --- |
| 现象 | 搜索第二页后界面显示“共 1 件”，无法回到第一页 |
| 证据 | filtered.length 为 2，pageItems.length 为 1，返回 total 使用后者 |
| 原因 | 混淆全部匹配数与当前页项数 |
| 修复 | 筛选后立即保存 total，再排序和 slice |
| 复验 | 第二页 items 长度 1、total 2；第 9 页 items 0、total 3 |

若排序后更新错商品，记录当前下标与 id；修复应改用稳定 id，而不是保存旧下标映射。

## 9. 课后题

1. `find` 找不到时返回什么？
2. 为什么 reduce 需要初始 0？
3. `filter` 返回新数组是否表示对象也被复制？
4. 合法超范围页为什么可以返回空 items？

**参考答案：**

1. `undefined`。
2. 它定义空集合合计并保持累加类型清楚；没有初始值时空数组会抛错。
3. 不表示；匹配元素通常仍是原对象引用。
4. page 参数本身合法，只是当前没有记录；空数据与参数错误应区分。

## 10. 实践练习

### 基础

用 find 查找缺失 id，输出 `not-found`，不得访问 undefined 的属性。

### 进阶

增加 status 筛选，要求先同时完成文本与状态筛选，再计算 total 和分页。

### 故障注入

把 toSorted 改为 sort，记录源顺序变化；恢复后再制造 total 使用 items.length 的错误，
分别保存两次失败与复验结果。

**答案标准：**

- 基础没有异常且输出 not-found；
- 进阶 total 代表全部双条件匹配项；
- 故障注入能分别定位“原数组被改”和“总数语义错误”，不能用复制所有对象掩盖。

## 11. 阶段验收

- [ ] find、some、filter、map、reduce、slice 的空结果可准确说明。
- [ ] 空集合金额合计为 0，坏金额和累计溢出明确失败。
- [ ] 过滤后 total 正确，本页 items 可以为空。
- [ ] 原数组顺序保持不变。
- [ ] 视图项继续通过稳定 id 标识，身份共享得到明确说明。
- [ ] 文本匹配指定 locale，但不宣称等同数据库全文搜索。
- [ ] 本地分页不替代 API 校验、后端分页或数据库约束。

## 12. 常见问题

**map 可以只用于 console.log 吗？**

技术上能执行，但它表达“生成新集合”。只有副作用时用循环或 forEach 更清楚。

**toSorted 会复制每个对象吗？**

不会。它创建新数组并重排引用，元素对象仍共享。

**是否应该把全部数据库记录下载到浏览器分页？**

不应该。大数据量、权限和并发顺序由后端查询与数据库约束处理。

## 13. 扩展阅读

资料快照日期：**2026-10-11**。

- [MDN：索引集合](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Indexed_collections)
- [MDN：`find`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find)
- [MDN：`reduce`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce)
- [MDN：`slice`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/slice)
- [MDN：`sort`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort)
- [MDN：`toSorted`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/toSorted)

## 我现在能做到什么

我能为集合操作选择正确方法，安全累计整数分，按筛选结果计算 total，
返回合法空页，并在排序和分页后保留源顺序、稳定 id 与清楚的对象身份。

## 单元导航

[上一篇：对象、引用与定向不可变更新](01-objects-references-immutable-updates.md) ·
[返回第 3 章入口](../03-objects-arrays-data.md) ·
[下一篇：JSON、序列化与数据边界](03-json-serialization-data-boundaries.md)
