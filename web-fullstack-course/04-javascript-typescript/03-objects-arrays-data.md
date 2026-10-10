# 03 对象、数组与数据边界

## 本章任务

把单个金额扩展为完整商品记录和分页集合：按稳定 id 更新一件 Listing，
在不修改源集合的情况下筛选、排序、合计和分页，再把外部 JSON 逐字段准入。
最终结果必须保留整数分、规范 UTC 和完整 Listing 契约。

## 产出与前置

完成本章后，你将得到：

- 对象身份、浅复制、冻结和结构化复制的可运行证据；
- 只复制目标路径的内存改价预览；
- 返回 `{ items, page, pageSize, total }` 的非修改式分页函数；
- 合法空页、过滤总数和稳定 id 的验收记录；
- 按已知字段重建完整 Listing 页的 JSON 解析器；
- null、数组、坏金额、坏 UTC、重复 id、矛盾元数据和坏 JSON 的失败证据。

开始前应完成第 2 章，能够编写纯函数、传播错误和解释局部状态。
目标环境为 Node.js 24 LTS，无第三方依赖。

## 学习路线

| 顺序 | 教程 | 核心问题 | 建议时间 |
| ---: | --- | --- | ---: |
| 1 | [对象、引用与定向不可变更新](03-objects-arrays-data/01-objects-references-immutable-updates.md) | 哪些名称共享同一对象，怎样只复制真实变化路径 | 120 分钟 |
| 2 | [数组、集合变换与分页](03-objects-arrays-data/02-arrays-collections-pagination.md) | 怎样让查找、筛选、total、排序和当前页语义不混淆 | 120–150 分钟 |
| 3 | [JSON、序列化与数据边界](03-objects-arrays-data/03-json-serialization-data-boundaries.md) | 怎样把任意 JSON 变成经过证据准入的完整分页 | 150 分钟 |

第 2 篇依赖对象身份，第 3 篇依赖分页语义和错误传播。
建议总投入 7 小时，包括手绘引用图、错误注入和逐字段复验。

## 章级邻里集市任务

在个人 `js-lab/chapter-03/` 完成一个商品目录管道：

1. 从 JSON 文本开始，入口把值视为 unknown。
2. 逐字段解析完整 Listing：id、title、description、priceCents、status、
   ownerId、version、createdAt。
3. `priceCents` 只接受非负安全整数，`createdAt` 只接受有效 UTC `Z` 时间并标准化。
4. 页对象必须返回 `{ items, page, pageSize, total }`，拒绝页容量、剩余总数和 items 矛盾。
5. 查询顺序固定为：解析、筛选、total、非修改式排序、slice。
6. 超出最后一页返回合法空 items，不把 page 偷改为 1。
7. 按 id 更新一件商品并返回新数组；源数组、旧商品和未修改项保持预期身份。
8. 说明内存预览不增加 version，也不证明后端授权或保存成功。

不要用当前数组下标表示资源身份，不用原地 sort，不用 JSON 往返充当通用深复制，
不把字符串价格、非法日期或缺失字段修成默认值。

## 综合验收证据

必须提交：

- original、alias、shallow、nested 的引用关系图；
- 改价前后数组和两个商品的身份比较；
- 筛选第二页的 items、page、pageSize、total 与原顺序；
- page=9 的合法空页；
- 0 分和空集合安全合计；
- 完整 JSON 页准入后的八字段 key 列表；
- `2026-10-11T08:00:00Z` 标准化为 `.000Z`；
- null、数组、字符串价格、2 月 30 日、重复 id、total 矛盾和 malformed JSON 的分类失败；
- 危险额外键没有进入返回 Listing 的证据；
- 一份“现象、证据、原因、修复、复验”记录。

只有所有输出、异常路径和源数据保持性都可观察，才算完成。

## 完成本章后

你应能区分对象身份与内容，选择不会意外修改源集合的数组操作，
并把外部 JSON 留在不可信边界直到完整解析成功。下一章会解释属性查找的原型机制，
以及如何用 ECMAScript 模块组织这些普通记录和显式函数。

## 章节导航

[上一章：函数、作用域与可解释错误](02-functions-scope-errors.md) ·
[返回本卷目录](README.md) ·
[下一章：原型、类与 ECMAScript 模块](04-prototypes-modules.md)
