# 课程生成进度

## 当前批次：B0

B0 只建立全量索引、课程入口和校验器，不生成新的课程正文或实验。

| 项目 | 目标 | 当前 |
| --- | ---: | ---: |
| 阶段 | 9 | 9 |
| 周次 | 48 | 48 |
| 单元清单 | 96 | 96 |
| 已完成正文 | 96 | 2（U01、U02） |
| 已完成实验入口 | 96 | 2（U01、U02） |

完整字段索引见[`course-manifest.json`](./course-manifest.json)。它是单元 ID、周次、阶段、标题、正文路径、实验路径、前后导航、阶段成果和 Node.js 版本要求的结构化入口；它不替代正文，也不会把缺失文件标记为完成。

## 生成批次

| 批次 | 范围 | 单元数 |
| --- | --- | ---: |
| B0 | 全量清单、校验器、导航更新 | 0 |
| B1 | W2–W4 HTML 与可访问性 | 6 |
| B2 | W5–W12 CSS | 16 |
| B3 | W13–W20 浏览器、JavaScript、TypeScript 和工具 | 16 |
| B4 | W21–W26 React | 12 |
| B5 | W27–W32 Vue 3 | 12 |
| B6 | W33–W37 前端工程化 | 10 |
| B7 | W38–W43 Node.js、NestJS、PostgreSQL、Prisma | 12 |
| B8 | W44–W48 全栈集成、部署与毕业项目 | 10 |
| B9 | 全量链接、章节、实验入口、命令和导航收口 | 0 |

## 维护规则

1. 每个单元必须同时登记 lesson 和 lab；只有对应文件真实存在并通过内容契约，才算完成。
2. `previous` 和 `next` 必须指向 manifest 中相邻的单元；U01 的 `previous`、U96 的 `next` 使用 `null`。
3. `requiresNode24` 表示该单元实验的工具链是否以 Node.js 24 为运行基线，不表示所有浏览器观察都必须使用 Node.js。
4. 新增正文和实验后，先运行链接检查，再运行全量完整性检查。
5. 校验器失败时保留按单元 ID 和路径输出的错误，不通过删除检查项或填写空目录来消除错误。

## 校验命令

在仓库根目录执行：

```bash
. "$HOME/.nvm/nvm.sh"
nvm use 24
node --check web-fullstack-course/scripts/check-course-completeness.js
node --check web-fullstack-course/scripts/check-course-links.js
node web-fullstack-course/scripts/check-course-links.js
node web-fullstack-course/scripts/check-course-completeness.js
```

B0 阶段预期：manifest、周次、阶段和 W1 内容检查通过；由于 U03–U96 尚未生成，完整性检查必须以非零状态退出，并逐项列出缺失的正文和实验入口。
