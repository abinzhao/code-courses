# 对象、引用与定向不可变更新

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课任务 | 观察对象身份和共享引用，按稳定 id 更新一件商品而保留旧记录 |
| 可观察产出 | `js-lab/object-references.mjs`、`js-lab/immutable-price-update.mjs` |
| 运行条件 | Node.js 24 LTS；无第三方依赖 |
| 建议时间 | 120 分钟 |
| 完成证据 | 身份比较、浅复制证据、原集合未修改 |

## 1. 任务背景

Listing 由多个有名字的字段组成，适合用普通对象记录。把对象赋给另一个变量不会复制内容；
两个名称可能指向同一身份。若页面直接修改共享对象，旧搜索结果、缓存和诊断快照都会一起变化。

另一方面，遇到任何更新就深复制整棵结构也不是可靠设计：它掩盖真正修改范围、浪费资源，
还可能丢失不支持 JSON 的值。可靠做法是按稳定 id 找到目标，只复制确实变化的路径。

## 2. 学习目标

完成本课后，你应能：

- 创建对象字面量并使用固定、计算属性访问；
- 区分稳定资源 id 与数组下标；
- 解释别名、引用身份和严格相等；
- 证明对象展开只做浅复制；
- 使用 `Object.hasOwn` 判断自有字段；
- 说明 `Object.freeze` 的浅层边界；
- 说明 `structuredClone` 的适用范围与限制；
- 按 id 创建定向不可变更新；
- 保留旧 Listing、原数组顺序和未修改记录身份。

## 3. 预备知识

先完成第 2 章，理解函数参数、返回值、作用域和错误。所有 Listing 价格继续使用整数分，
`createdAt` 继续保存 UTC ISO 8601 字符串。

本课源码对象是已知教学种子。`Object.hasOwn`、展开或 clone 都不能证明外部 API 数据有效；
外部准入由本章第 3 篇完成。

## 4. 核心理论

### 4.1 对象是属性集合

对象字面量把相关字段组织为一条记录：

```js
const listing = { id: "listing-1", title: "台灯", priceCents: 1990 };
```

`listing.title` 适合源码中固定属性；`listing[fieldName]` 适合已经受控的计算属性名。
不可信外部字符串不能直接作为任意写入键；应按已知字段重建对象，避免修改原型或内部状态。

### 4.2 id 不是下标

id 在筛选、排序、分页后仍标识同一资源。数组下标只表示当前排列位置；
当前第 0 项可能在下一次排序后变成第 2 项。编辑、收藏和 URL 都应使用稳定 id。

### 4.3 别名与身份

`const alias = original` 复制的是引用。`alias === original` 为 true，
通过任一名称修改属性，另一个名称读取到同一变化。`const` 只禁止重新赋值名称，
不会冻结对象属性。

### 4.4 浅复制与嵌套共享

`{ ...original }` 创建新的顶层对象，但嵌套对象值仍是同一引用：

```text
original ──→ meta
shallow  ──→ 同一个 meta
```

定向更新应复制从根到变化位置的每一层。没有变化的不可变记录可以安全共享身份，
这能让调用者通过身份识别真实修改范围。

### 4.5 freeze 与 structuredClone

`Object.freeze` 阻止对象自身现有属性写入、删除或扩展，但不会递归冻结嵌套对象。
在 ESM 严格模式下写入冻结属性会抛 TypeError。它适合暴露意外修改，不是外部数据校验。

`structuredClone` 能复制许多内建结构并处理循环引用，但函数不能克隆，
自定义类语义也不应依赖它保留。全量 clone 不能替代明确更新路径和领域边界。

## 5. 语法、标准 API 与运行时边界清单

| 语法或 API | 作用 | 边界 |
| --- | --- | --- |
| `{ key: value }` | 创建普通记录 | 不自动验证字段 |
| `object.key` | 固定属性访问 | 属性名写在源码中 |
| `object[key]` | 计算属性访问 | key 必须来自受控集合 |
| `a === b` | 比较引用身份 | 不比较对象内容 |
| `{ ...object }` | 浅复制第一层 | 嵌套引用仍共享 |
| `Object.hasOwn(object, key)` | 判断自有属性 | 存在不代表值合法 |
| `Object.freeze(object)` | 冻结对象第一层 | 不递归，不校验 |
| `Object.isFrozen(object)` | 查询冻结状态 | 不说明嵌套状态 |
| `structuredClone(value)` | 结构化深复制 | 不克隆函数，不替代定向更新 |
| `array.map` | 对目标项创建新记录 | 下一篇系统学习集合方法 |

## 6. 最小可运行案例

创建完整文件 `js-lab/object-references.mjs`：

```js
const original = {
  id: "listing-1",
  priceCents: 100,
  meta: { note: "old" },
};
const fieldName = "priceCents";
const alias = original;

alias.priceCents = 200;
console.log(original.priceCents);
console.log(alias === original);
console.log(original[fieldName]);
console.log(Object.hasOwn(original, "priceCents"));
console.log(Object.hasOwn(original, "missing"));

const shallow = { ...original, priceCents: 300 };
shallow.meta.note = "shared-change";
console.log(shallow === original);
console.log(original.meta.note);
console.log(shallow.meta === original.meta);

const independent = structuredClone(original);
independent.meta.note = "independent";
console.log(original.meta.note);
console.log(independent.meta.note);

const frozen = Object.freeze({ id: "frozen", priceCents: 0 });
console.log(Object.isFrozen(frozen));
```

运行 `node object-references.mjs`，预期完整输出：

```text
200
true
200
true
false
false
shared-change
true
shared-change
independent
true
```

`shallow` 与 original 顶层身份不同，但 `meta` 相同。structuredClone 后的 meta 独立，
这不表示所有业务更新都该深复制。

## 7. 邻里集市集成案例

创建完整文件 `js-lab/immutable-price-update.mjs`：

```js
const listings = Object.freeze([
  Object.freeze({
    id: "listing-1",
    title: "台灯",
    description: "功能正常，自提",
    priceCents: 1990,
    status: "available",
    ownerId: "user-1",
    version: 1,
    createdAt: "2026-10-11T08:00:00.000Z",
  }),
  Object.freeze({
    id: "listing-2",
    title: "书架",
    description: "三层木制书架",
    priceCents: 5000,
    status: "available",
    ownerId: "user-2",
    version: 3,
    createdAt: "2026-10-11T09:00:00.000Z",
  }),
]);

function previewPriceChange(items, id, priceCents) {
  if (!Array.isArray(items)) throw new TypeError("items must be an array");
  if (typeof id !== "string" || !id) throw new TypeError("id must be text");
  if (!Number.isSafeInteger(priceCents) || priceCents < 0) {
    throw new RangeError("priceCents must be a non-negative safe integer");
  }
  if (!items.some((item) => item.id === id)) {
    throw new Error(`listing not found: ${id}`);
  }
  return items.map((item) =>
    item.id === id ? { ...item, priceCents } : item,
  );
}

const updated = previewPriceChange(listings, "listing-1", 1500);

console.log(`old-price=${listings[0].priceCents}`);
console.log(`new-price=${updated[0].priceCents}`);
console.log(`array-same=${updated === listings}`);
console.log(`target-same=${updated[0] === listings[0]}`);
console.log(`untouched-same=${updated[1] === listings[1]}`);
console.log(`old-order=${listings.map((item) => item.id).join(",")}`);
console.log(`new-order=${updated.map((item) => item.id).join(",")}`);
console.log(`utc-preserved=${updated[0].createdAt === listings[0].createdAt}`);
console.log(`version-preserved=${updated[0].version === listings[0].version}`);
```

运行 `node immutable-price-update.mjs`，预期输出：

```text
old-price=1990
new-price=1500
array-same=false
target-same=false
untouched-same=true
old-order=listing-1,listing-2
new-order=listing-1,listing-2
utc-preserved=true
version-preserved=true
```

这是本机“改价预览”，不是已保存 PATCH。它保留服务端读到的 version，
不会自行加一，也不证明当前用户有权限。真实写入必须携带 version，
由后端核对 owner 和冲突，再返回新的完整 Listing。

## 8. 常见错误与排查路径

**明确错误示例：用视图下标修改源数据。**

```js
const visible = listings.toSorted((a, b) => a.priceCents - b.priceCents);
listings[0].priceCents = 0;
```

`visible[0]` 未必是 `listings[0]`，而且直接修改共享记录会改变所有引用它的视图。

**明确错误示例：误以为展开是深复制。**

```js
const copy = { ...original };
copy.meta.note = "changed";
```

原对象的 `meta.note` 也会变化。

### 五段诊断记录

| 项目 | 记录 |
| --- | --- |
| 现象 | 在排序视图改价后，另一列表中的旧商品也变化 |
| 证据 | `selected === sourceItem` 为 true，更新代码直接写属性 |
| 原因 | 多个视图共享同一对象引用，并用当前下标代替稳定 id |
| 修复 | 按 id 定位；为目标创建新对象，为集合创建新数组 |
| 复验 | 旧价格仍为 1990；目标身份变化；未修改项身份和顺序保留 |

不要用 `JSON.parse(JSON.stringify(value))` 作为通用修复。它会丢失 undefined、函数等值，
时间仍只是字符串，而且不能解释应该修改哪一层。

## 9. 课后题

1. `const object` 是否意味着属性不能改？
2. 对象展开后，嵌套对象一定独立吗？
3. 为什么稳定 id 不能用当前下标代替？
4. Object.freeze 是否能证明价格为非负整数分？

**参考答案：**

1. 不是；const 只限制绑定重新赋值。
2. 不一定；展开是浅复制，嵌套引用默认共享。
3. 筛选、排序、分页会改变位置，资源身份不应随视图位置变化。
4. 不能；freeze 只约束写操作，不验证字段和值域。

## 10. 实践练习

### 基础

增加计算属性读取 `const key = "title"`，证明点号与受控方括号读取同一标题。

### 进阶

实现 `previewStatusChange(items, id, status)`，状态只允许 available、reserved、sold，
并保持源数组、旧目标和未修改项不变。

### 故障注入

临时直接执行 `listings[0].priceCents = 1`，观察冻结对象在 ESM 中的 TypeError；
恢复不可变更新并再次核对全部身份断言。

**答案标准：**

- 基础两种访问都输出台灯；
- 进阶非法状态拒绝，合法状态只创建目标新对象；
- 故障注入保留异常行和修复后 9 行输出，不删除 freeze 来掩盖直接修改。

## 11. 阶段验收

- [ ] 能画出 original、shallow 与 meta 的共享关系。
- [ ] 解释 alias、浅复制和 structuredClone 的身份差异。
- [ ] 改价后旧价格保留，目标身份变化，未修改项身份保留。
- [ ] 更新按 id，不依赖筛选或排序后的下标。
- [ ] 整数分、UTC 与 version 均未被猜测性修复。
- [ ] 明确说明前端预览不等于后端授权或持久化成功。
- [ ] 不把 freeze、clone 或 hasOwn 当作外部数据完整校验。

## 12. 常见问题

**不可变更新是否要求复制所有商品？**

不要求。复制数组和被修改记录即可；未修改的不可变记录可以共享身份。

**可以把完整 API DTO 转成 class 再更新吗？**

没有必要。普通记录和显式函数更适合传输数据；类不会自动校验 JSON 或赋予权限。

**structuredClone 是否安全地复制任何值？**

不是。函数不可克隆，资源和自定义语义也有边界；它更不能决定业务上应复制哪一层。

## 13. 扩展阅读

资料快照日期：**2026-10-11**。

- [MDN：使用对象](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Working_with_objects)
- [MDN：`Object.hasOwn`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/hasOwn)
- [MDN：`Object.freeze`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze)
- [MDN：`structuredClone`](https://developer.mozilla.org/en-US/docs/Web/API/Window/structuredClone)
- [MDN：展开语法](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax)

## 我现在能做到什么

我能用身份和引用解释对象变化，识别浅复制的嵌套共享，
并按稳定 id 只复制目标路径，保留旧商品、顺序、整数分、UTC 和服务端版本。

## 单元导航

[上一章：函数、作用域与可解释错误](../02-functions-scope-errors.md) ·
[返回第 3 章入口](../03-objects-arrays-data.md) ·
[下一篇：数组、集合变换与分页](02-arrays-collections-pagination.md)
