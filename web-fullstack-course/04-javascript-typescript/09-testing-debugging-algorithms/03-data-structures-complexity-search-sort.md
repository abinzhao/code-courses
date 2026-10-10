# 数据结构、复杂度、搜索与排序：先声明前提，再讨论成本

## 任务卡

- **任务**：实现不修改输入的插入排序、二分搜索、Map 索引和唯一 ID，并说明适用前提。
- **产出**：`js-lab/algorithms.mjs` 与 `js-lab/unique.test.mjs` 两个完整文件。
- **运行**：Node.js 24 LTS；先运行算法输出，再运行 1 项唯一 ID 测试。
- **完成证据**：确定输出、tests 1 / pass 1 / fail 0、未排序二分失败和原地排序回归记录。
- **边界**：内存算法不替代 API 校验、后端分页、数据库唯一约束或真实性能测量。

## 1. 任务背景

商品页可以用数组扫描查找，也可以建立 Map；可以线性搜索，也可以在有序数据上二分。
没有规模、查询次数、排序状态和更新频率，就不能只凭大 O 宣称一种写法“更快”。

本单元使用小型算法看清不变量：插入排序的左侧区间始终有序，二分搜索的候选区间必须
来自同一排序规则。代码先保持正确和输入不变，再讨论查询成本。

## 2. 学习目标

完成后你能：

1. 用大 O 描述规模增长而不是编造精确耗时；
2. 说明数组、Map 和 Set 的语义与维护成本；
3. 实现不修改源数组的插入排序；
4. 写出二分搜索的有序前提和区间不变量；
5. 解释前端算法为何不能替代后端数据保证。

## 3. 预备知识

先会数组、循环、函数、引用和 Node 测试。设 `n` 为当前内存商品数：
单次线性查找最坏 O(n)，建立索引也要 O(n) 时间和额外空间。若只查一次，先建索引或排序
未必划算；若反复按 ID 查询并能维护索引，Map 才可能降低后续查找成本。

## 4. 核心理论

### 4.1 大 O 描述增长趋势

O(1) 表示操作数通常不随 `n` 成比例增长；O(n) 表示最多扫描全部；O(log n) 每步缩小
候选区间；O(n²) 常见于嵌套移动。它忽略常数、引擎和硬件，不是毫秒承诺。

### 4.2 Map/Set 有语义，不只是性能标签

Map 的键唯一，后写同键会覆盖旧值；因此外部商品页应先拒绝重复 ID，不能让 Map 静默
决定谁获胜。Set 保留唯一值和插入顺序，适合收藏 ID 或去重结果。ECMAScript 只要求 Map
平均访问次线性，不保证所有实现都是特定哈希表或严格 O(1)。

### 4.3 插入排序的不变量

进入第 `i` 轮时，`[0, i)` 已有序；保存当前值，将更大的左侧元素右移，再插入空位。
最坏 O(n²)，适合教学和小规模近有序数据，不是生产通用排序建议。业务代码通常优先
`toSorted(compare)`，但规范不固定底层算法复杂度。

### 4.4 二分搜索的前提

输入必须按与比较逻辑相同的升序排列。每轮目标若小于中点，排除右半区；反之排除左半区。
返回的是有序投影的下标，不是商品 ID 或原数组位置。若每次查询前都先 O(n log n) 排序，
一次二分通常不如 O(n) 线性查找。

## 5. 元素、属性、API 或配置清单

| 结构/算法 | 典型成本 | 必要边界 |
| --- | --- | --- |
| `Array.find` | 最坏 O(n) | 单次查找简单直接 |
| `Array.map` | O(n) | 创建新数组，不深复制项目 |
| `Map` 索引 | 建立 O(n)，查询平均次线性 | 更新、删除时同步维护 |
| `Set` 去重 | 建立 O(n) 量级 | 不验证项目本身合法 |
| 插入排序 | 最坏 O(n²) | 本例先复制输入 |
| 二分搜索 | O(log n) | 同一规则有序 |
| `toSorted` | 由实现决定具体算法 | 返回新数组，仍需比较函数 |
| `performance.now` | 高分辨率时间戳 | 需热身、重复、固定环境 |

## 6. 最小可运行案例

完整文件 `js-lab/algorithms.mjs`：

```js
import { pathToFileURL } from "node:url";

export function binarySearchPrices(sorted, target) {
  let low = 0;
  let high = sorted.length - 1;
  while (low <= high) {
    const middle = low + Math.floor((high - low) / 2);
    const value = sorted[middle];
    if (value === target) return middle;
    if (value < target) low = middle + 1;
    else high = middle - 1;
  }
  return -1;
}

export function insertionSortNumbers(values) {
  const sorted = [...values];
  for (let index = 1; index < sorted.length; index += 1) {
    const value = sorted[index];
    let position = index - 1;
    while (position >= 0 && sorted[position] > value) {
      sorted[position + 1] = sorted[position];
      position -= 1;
    }
    sorted[position + 1] = value;
  }
  return sorted;
}

export function buildListingIndex(items) {
  const index = new Map();
  for (const item of items) {
    if (index.has(item.id)) throw new Error(`duplicate id: ${item.id}`);
    index.set(item.id, item);
  }
  return index;
}

export function uniqueIds(items) {
  return [...new Set(items.map((item) => item.id))];
}

function isNondecreasing(values) {
  return values.every((value, index) =>
    index === 0 || values[index - 1] <= value,
  );
}

const isMain = process.argv[1] !== undefined
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  const summaries = [
    { id: "a", priceCents: 1990 },
    { id: "b", priceCents: 500 },
    { id: "c", priceCents: 0 },
  ];
  const byId = buildListingIndex(summaries);
  const favorites = new Set(["a", "a", "c"]);
  const prices = summaries.map((item) => item.priceCents);
  const sorted = insertionSortNumbers(prices);

  console.log(byId.get("b")?.priceCents ?? "missing");
  console.log(favorites.size);
  console.log(sorted.join(","));
  console.log(prices.join(","));
  console.log(binarySearchPrices(sorted, 1990));
  console.log(binarySearchPrices(sorted, 800));
  console.log(`sorted=${isNondecreasing(sorted)}`);
}
```

运行：

```bash
node algorithms.mjs
```

完整输出：

```text
500
2
0,500,1990
1990,500,0
2
-1
sorted=true
```

第四行证明源价格顺序未变。可选链只处理索引中可能缺失的键，不证明索引数据有效；
`buildListingIndex` 已明确拒绝当前输入中的重复 ID。

## 7. 邻里集市集成案例

完整文件 `js-lab/unique.test.mjs`：

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { uniqueIds } from "./algorithms.mjs";

test("keeps first occurrence order and preserves input", () => {
  const items = [{ id: "b" }, { id: "a" }, { id: "b" }];
  const before = structuredClone(items);

  assert.deepEqual(uniqueIds(items), ["b", "a"]);
  assert.deepEqual(uniqueIds([]), []);
  assert.deepEqual(items, before);
});
```

运行：

```bash
node --test unique.test.mjs
```

摘要应包含 tests 1、pass 1、fail 0。`uniqueIds` 是算法练习：它不会验证 ID 非空、
商品字段完整或服务端唯一性。真实 API 页仍由第 08 章解析器拒绝重复 ID。

集成判断：

- 当前只有几十项且只查一次：`find` 往往更简单；
- 反复按 ID 查询且更新可控：建立 Map，并在增删改时同步维护；
- 按价格二分：维护独立有序价格投影，同时保留稳定商品 ID；
- 数据规模大：请求后端固定排序和分页，不下载全库到浏览器。

## 8. 常见错误与排查路径

**错误实验一：未排序二分。**

```js
binarySearchPrices([1990, 500, 0], 0);
```

该调用可能返回 `-1`，尽管 0 存在，因为输入违反升序前提。不能把它当算法对合法输入的错误。

**错误实验二：原地排序。**

```js
function brokenSort(values) {
  return values.sort((left, right) => left - right);
}
```

调用后源数组也改变，破坏本课“不修改输入”的契约。

| 项目 | 记录 |
| --- | --- |
| 现象 | 存在的价格搜索不到；页面原展示顺序被改变 |
| 证据 | 二分输入不是升序；排序前后数组引用相同且源内容变化 |
| 原因 | 调用方破坏二分前提；排序实现原地修改输入 |
| 修复 | 在边界维护有序投影；排序前复制或使用 `toSorted` |
| 复验 | `sorted=true`，1990 返回 2；源价格仍为 `1990,500,0` |

不要在二分函数内部每次 O(n) 全量验证排序后仍宣称整个操作是 O(log n)。
可在数据建立或更新边界验证一次，并把有序性作为结构不变量。

## 9. 课后题

1. 为什么先排序再二分一次通常不优于 `find`？
2. Map 中重复 ID 会发生什么？
3. `toSorted` 是否保证所有引擎采用同一算法？
4. Set 去重通过是否证明数据库唯一？

答案：

1. 排序通常 O(n log n)，单次线性查找最坏 O(n)。
2. 后值覆盖前值，所以准入层应先拒绝重复而非静默选择。
3. 不保证；规范定义结果和稳定性要求，不固定实现算法。
4. 不能；它只处理当前内存输入，无法约束并发写入。

## 10. 实践练习

**基础**：验证空数组、单元素和重复价格：

```js
console.log(insertionSortNumbers([]).length);
console.log(binarySearchPrices([500], 500));
console.log(insertionSortNumbers([2, 1, 2]).join(","));
```

参考输出为 `0`、`0`、`1,2,2`。

**进阶**：测量 `find` 与预建 Map 的重复查询。参考标准：固定数据规模和查询次数，
先建立正确性断言，再多次运行并报告 Node、硬件、热身和波动；不能只贴一次毫秒值。

**故障注入**：将 `const sorted = [...values]` 改为直接引用 `values`。算法输出仍可能有序，
但源数组不变断言或第四行输出必须失败；恢复复制后重新运行算法和 unique 测试。

## 11. 阶段验收

- [ ] 两个完整文件通过 `node --check`。
- [ ] 算法七行输出逐行匹配。
- [ ] 唯一 ID 测试恰好 1 项并通过。
- [ ] 插入排序不修改来源，空数组和重复值行为明确。
- [ ] 二分搜索调用前明确按同一规则升序。
- [ ] 已记录未排序输入和原地排序的失败证据。
- [ ] 能说明 Map/Set 的建立、空间和维护成本。
- [ ] 没有把内存算法冒充后端分页或数据库约束。

## 12. 常见问题

**二分搜索为何不直接接 Listing 数组？**

可以接收比较函数和有序记录，但仍须定义排序键、重复键和返回身份；本课先用数字展示不变量。

**插入排序是否适合生产商品列表？**

通常不需要自写。它用于理解排序过程，实际优先标准库和后端排序。

**Map 一定比数组快吗？**

不一定。小集合、单次查询和频繁重建时，简单数组可能更合适，应测量完整成本。

**唯一 ID 测试为什么保留首次顺序？**

Set 按插入顺序迭代；契约明确后，调用者不会因去重意外改变展示顺序。

## 13. 扩展阅读

资料快照：2026-10-11。

- [MDN：Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map)
- [MDN：Set](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set)
- [MDN：Array.prototype.sort](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort)
- [MDN：Array.prototype.toSorted](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/toSorted)
- [ECMAScript：Map Objects](https://tc39.es/ecma262/multipage/keyed-collections.html#sec-map-objects)
- [Node.js：Performance measurement APIs](https://nodejs.org/docs/latest-v24.x/api/perf_hooks.html)

兼容边界：复杂度是算法模型，实际性能受数据、引擎和硬件影响。本单元没有浏览器渲染、
真实数据库、后端索引或生产容量证据。

## 我现在能做到什么

我能在写搜索或索引前说明数据前提与维护成本，用自动测试守住输入不变和去重顺序，
并拒绝把小型内存算法夸大为系统级数据保证。

## 单元导航

- 上一单元：[确定性异步测试与系统调试](./02-deterministic-async-testing-debugging.md)
- 下一单元：[第 09 章入口](../09-testing-debugging-algorithms.md)
