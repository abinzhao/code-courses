# Contributing to Code Courses

[**English**](#english) · [**中文**](#中文)

Thanks for taking the time to contribute! 🎉 This is an open educational project, and improvements from the community are what make it better for everyone.

---

## English

### Ways to Contribute

- 🐛 **Report a bug** — typo, broken link, incorrect code, or outdated content via a [Bug Report](https://github.com/abinzhao/code-courses/issues/new?template=bug_report.md).
- 💡 **Suggest an improvement** — a new course, unit, or clearer explanation via a [Feature Request](https://github.com/abinzhao/code-courses/issues/new?template=feature_request.md).
- 📝 **Submit a pull request** — fix an issue or add content directly.
- ⭐ **Spread the word** — star the repo and share it with others.

### Ground Rules

1. Be kind and respectful. Follow the [Code of Conduct](./CODE_OF_CONDUCT.md).
2. Keep contributions focused — one logical change per issue/PR.
3. All course content must be accurate, runnable, and free of secrets.
4. Follow the [13-section unit contract](web-fullstack-course/00-guide/unit-writing-template.md) and the course's task-based writing style.

### Pull Request Workflow

1. Fork the repository and create a branch from `main`.
2. Use a clear branch name, e.g. `fix/miniprogram-typo` or `feat/add-unit`.
3. Make your change.
   - Fix broken links or incorrect code; verify the code matches the stated tech stack.
   - Do **not** commit secrets, certificates, `.env` files, or build artifacts.
4. Ensure links are valid (no broken links) and markdown renders correctly.
5. Commit using [Conventional Commits](https://www.conventionalcommits.org/):

   ```text
   feat: add async queue unit
   fix: correct order callback signature
   docs: clarify rpx conversion
   test: cover coupon redeem flow
   ```

6. Open a pull request and fill out the PR template. Link any related issues with `Closes #123`.
7. Respond to review feedback. CI and maintainer review must pass before merge.

### Commit Message Types

| Type | Use for |
|---|---|
| `feat` | New content or feature |
| `fix` | Bug or error corrections |
| `docs` | Documentation-only changes |
| `test` | Adding or updating tests |
| `chore` | Tooling, structure, or maintenance |
| `refactor` | Reworking content without changing its meaning |

### Reporting Bugs

Please include:

- The course / file path and a link;
- What you observed vs. what you expected;
- Steps to reproduce, and a screenshot if helpful;
- Your environment (OS, WeChat/base-library version where relevant).

### Style Notes for Course Content

- Each tutorial includes a task card, the 13 numbered sections, a capability recap, and working unit navigation. See the [writing template](web-fullstack-course/00-guide/unit-writing-template.md).
- Explain the mechanism before the API; include runnable examples and common pitfalls.
- Record the verification date and official sources. Runnable project snapshots pin the validated dependency versions; distinguish recommended versions from versions actually tested.

---

## 中文

### 贡献方式

- 🐛 **报告缺陷** —— 错别字、断链、错误代码或过时内容，可提交 [Bug 报告](https://github.com/abinzhao/code-courses/issues/new?template=bug_report.md)。
- 💡 **提出建议** —— 新课程、新单元或更清晰的讲解，可提交 [功能建议](https://github.com/abinzhao/code-courses/issues/new?template=feature_request.md)。
- 📝 **提交 Pull Request** —— 直接修复 Issue 或补充内容。
- ⭐ **分享传播** —— 点 Star 并分享给更多人。

### 基本准则

1. 友善尊重，遵守[行为准则](./CODE_OF_CONDUCT.md)。
2. 一次只做一个聚焦的改动，一个 Issue/PR 对应一件事。
3. 所有内容必须准确、可运行，且不含任何密钥。
4. 遵循[13 节单元写作契约](web-fullstack-course/00-guide/unit-writing-template.md)与任务驱动的写作风格。

### Pull Request 流程

1. Fork 仓库，基于 `main` 新建分支。
2. 分支名清晰，如 `fix/miniprogram-typo`、`feat/add-unit`。
3. 进行修改：修复断链或错误代码；**不要**提交密钥、证书、`.env` 或构建产物。
4. 确保链接有效、Markdown 正常渲染。
5. 使用[约定式提交](https://www.conventionalcommits.org/zh-hans/)：

   ```text
   feat: add async queue unit
   fix: correct order callback signature
   docs: clarify rpx conversion
   ```

6. 发起 Pull Request 并填写模板，用 `Closes #123` 关联 Issue。
7. 响应评审，CI 与维护者评审通过后才会合并。

### 提交类型

| 类型 | 用途 |
|---|---|
| `feat` | 新增内容或功能 |
| `fix` | 修复错误 |
| `docs` | 仅文档改动 |
| `test` | 新增或更新测试 |
| `chore` | 工具、结构或维护 |
| `refactor` | 不改变含义的内容重构 |

### 课程内容风格

- 每篇详细教程包含任务卡、13 个编号章节、能力总结与可达的单元导航，具体见[写作模板](web-fullstack-course/00-guide/unit-writing-template.md)。
- 先讲机制再讲 API，配可运行示例与常见误区。
- 记录核验日期与官方来源；可运行项目快照固定已验证的依赖版本，区分推荐版本、本机版本与实际通过范围。

Happy contributing! 感谢你的贡献！
