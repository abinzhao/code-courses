# 制品、发布、缓存与回滚边界

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课产出 | 一份提交绑定制品清单、静态资源发布顺序和可判定回滚方案 |
| 建议时间 | 100 分钟 |
| 可执行范围 | 本地 `dist` 与临时发布目录 |
| 外部边界 | 不上传 registry/CDN，不改 DNS/TLS，不部署生产 |
| 完成证据 | 制品摘要校验、错误路径失败、旧 hash 资源保留和回滚限制说明 |

## 1. 任务背景

邻里集市 CI 已通过，但“检查通过”“生成制品”“部署文件”“向用户发布”是四个动作。若部署阶段重新构建，测试过的是 A 产物，上线的可能是 B 产物；若先切换 HTML 再上传新 chunk，用户会拿到引用不存在文件的入口；若清掉所有旧 hash 文件，已打开页面和回滚入口都会失效。

前端文件回滚也不能撤销已经完成的预约、收藏或数据库迁移。本课只在本地目录模拟静态制品流转。

## 2. 学习目标

- 区分 check、artifact、deploy 和 release。
- 将制品绑定到提交 SHA 和内容摘要。
- 设计缓存 key、命中与失败回退。
- 使用“资源先行、入口后切换”发布顺序。
- 为 HTML 和 hash 资源选择不同缓存语义。
- 定义发布后读取路径和会话过期检查。
- 解释静态回滚与数据库恢复的边界。

## 3. 预备知识

先在个人项目生成生产构建：

```bash
pnpm verify
git rev-parse HEAD
find dist -type f -print | sort
```

若目录没有 Git 提交，使用明确的本地练习标识，例如 `local-uncommitted`，不得伪造提交 SHA。`dist` 必须来自当前已检查输入，不能复用不明时间的旧目录。

## 4. 核心理论

### 4.1 四个阶段

`check` 运行规则并产生退出结果；`artifact` 是可保存的构建输出；`deploy` 把指定 artifact 放入环境；`release` 让用户流量或入口指向该版本。阶段可由同一系统编排，但证据不能互换。

### 4.2 提交与摘要

制品名称包含提交 SHA，清单记录每个文件的 SHA-256。部署前后都可校验摘要，证明传输内容未变化。摘要只证明字节相同，不证明代码安全、业务正确或来源可信；来源还需受控构建和访问权限。

### 4.3 缓存与发布顺序

带内容 hash 的 JS/CSS 可使用长缓存并标记 immutable；入口 HTML 应重新验证，因为它决定引用哪组资源。发布时先上传新 hash 文件，再切换 HTML，保留旧资源至少覆盖活动页面和回滚窗口。

缓存键需包含会影响依赖的维度，例如 OS、Node、pnpm 和锁文件 hash。cache miss 应退回正常冻结安装；缓存损坏不能让质量门被跳过。

### 4.4 回滚不是时间倒流

静态回滚是把入口重新指向兼容旧资源。它不能取消服务端写入，也不能自动还原数据库 schema。若新前端依赖已删除 API 或不可逆迁移，旧入口可能无法工作。全栈发布需要向前兼容窗口、迁移策略与单独恢复演练。

## 5. 元素、属性、API 或配置清单

| 项目 | 作用 | 边界 |
| --- | --- | --- |
| commit SHA | 标识源码输入 | 不等于制品摘要 |
| SHA-256 | 校验文件字节 | 不证明业务正确 |
| artifact name | 连接构建与提交 | 需防止同名覆盖 |
| `Cache-Control: immutable` | 长期缓存 hash 资源 | 不用于可变 HTML |
| `no-cache` | 允许存储但每次重验证 | 不等于绝不存储 |
| cache key | 查找可复用工具数据 | 不替代锁文件 |
| release pointer | 当前入口或版本指针 | 切换需要原子/可恢复策略 |
| smoke check | 验证入口与只读关键路径 | 不使用真实用户写操作 |
| rollback | 恢复兼容旧入口 | 不撤销数据库写入 |

## 6. 最小可运行案例

在临时目录模拟两个版本：

```bash
rm -rf /tmp/market-release-lab
mkdir -p /tmp/market-release-lab/artifacts/v1/assets
printf 'console.log("v1")\\n' > /tmp/market-release-lab/artifacts/v1/assets/app-a1.js
printf '<script type="module" src="/assets/app-a1.js"></script>\\n' > /tmp/market-release-lab/artifacts/v1/index.html
cd /tmp/market-release-lab/artifacts/v1
shasum -a 256 index.html assets/app-a1.js > SHA256SUMS
shasum -a 256 -c SHA256SUMS
```

预期两行均为 `OK`。把 `app-a1.js` 末尾追加一个空格，再复验应失败；恢复原文件并重新校验才可继续。实验结束删除 `/tmp/market-release-lab`。

## 7. 邻里集市集成案例

CI 产出：

```text
market-web-<commit-sha>/
  index.html
  assets/app-<content-hash>.js
  assets/app-<content-hash>.css
  SHA256SUMS
  RELEASE.json
```

`RELEASE.json` 示例：

```json
{
  "schemaVersion": 1,
  "commit": "读取 CI 提供的真实提交标识",
  "builtAt": "读取构建时真实 UTC ISO 8601 时间",
  "source": "authorized-ci",
  "entry": "index.html"
}
```

这些描述值必须由受控流程写入实际值，不能把说明文字当作生产清单。发布时间保持 UTC ISO 8601。
本地构建只有在 index 与工作树都干净时才能绑定 `HEAD`；存在未提交或未跟踪输入时必须标为
`local-uncommitted`，不能把不同输入伪装成该提交的制品。

先从第 05 章当前已验证的 `dist` 生成本地 artifact，再模拟部署。所有删除都限定到本课固定的
`/tmp` 目录，执行前逐项核对变量：

```bash
artifact=/tmp/market-artifact
release=/tmp/market-release
case "$artifact:$release" in
  /tmp/market-artifact:/tmp/market-release) ;;
  *) echo "refusing unexpected release paths" >&2; exit 1 ;;
esac
rm -rf "$artifact" "$release"
mkdir -p "$artifact" "$release"
cp -R dist/. "$artifact/"

if git rev-parse --is-inside-work-tree >/dev/null 2>&1 \
  && [ -z "$(git status --porcelain --untracked-files=normal)" ]; then
  commit="$(git rev-parse HEAD)"
else
  commit="local-uncommitted"
fi
built_at="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
COMMIT="$commit" BUILT_AT="$built_at" ARTIFACT="$artifact" node --input-type=module -e '
  import { writeFileSync } from "node:fs";
  const manifest = {
    schemaVersion: 1,
    commit: process.env.COMMIT,
    builtAt: process.env.BUILT_AT,
    source: "local-teaching-build",
    entry: "index.html",
  };
  writeFileSync(
    `${process.env.ARTIFACT}/RELEASE.json`,
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
'
(
  cd "$artifact"
  find . -type f ! -name SHA256SUMS -exec shasum -a 256 {} \; > SHA256SUMS
  shasum -a 256 -c SHA256SUMS
)

mkdir -p "$release/assets"
cp -R "$artifact/assets/." "$release/assets/"
find "$release/assets" -type f -print | sort
cp "$artifact/RELEASE.json" "$release/RELEASE.json"
cp "$artifact/index.html" "$release/index.next.html"
mv "$release/index.next.html" "$release/index.html"
```

预期摘要校验全部为 `OK`，artifact 同时包含实际构建文件、`RELEASE.json` 和
`SHA256SUMS`。`local-teaching-build` 明确表示它不是托管 CI 或生产制品。

顺序要求：

1. 校验提交标识和 `SHA256SUMS`。
2. 上传/复制新 hash 资源。
3. 确认所有 HTML 引用目标存在。
4. 原子切换入口。
5. 检查入口、动态 chunk、只读列表、空数据、错误恢复和会话过期路径。
6. 观察窗口内保留旧 hash 资源。
7. 出现阻断问题时切回兼容旧入口，并继续评估服务端数据影响。

`VITE_` 值和 Source Map 一旦进入制品就是浏览器可读内容；从 CI secret store 读取也不会让它们保持秘密。

## 8. 常见错误与排查路径

### 错误实验：先切入口，后提供资源

先把 `index.html` 指向不存在的 `assets/app-new.js`，再用脚本检查：

```bash
node --input-type=module <<'JS'
import { readFile, access } from "node:fs/promises";
import { dirname, resolve } from "node:path";
const entry = "/tmp/market-release/index.html";
const html = await readFile(entry, "utf8");
const sources = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((match) => match[1]);
for (const source of sources) {
  const relative = source.startsWith("/") ? source.slice(1) : source;
  await access(resolve(dirname(entry), relative));
}
console.log(`entry references: PASS (${sources.length})`);
JS
```

- **现象**：入口已更新，但页面请求新资源返回 404。
- **证据**：检查脚本以 `ENOENT` 非零退出，浏览器 Network 显示缺失 chunk。
- **原因**：发布顺序先暴露引用，后上传目标。
- **修复**：恢复旧入口，先提供所有新 hash 资源，再切换 HTML。
- **复验**：脚本打印 `PASS`，本地生产预览能加载入口和延迟 chunk。

不能通过关闭脚本或清空引用“修复”；那会改变要发布的行为。

## 9. 课后题

1. 为什么部署时不应随意重新构建？
   **答案**：会让已测试制品与上线制品失去一一对应；若必须重建，要重新建立同等证据。
2. 为什么旧 hash 文件需要保留？
   **答案**：旧 HTML、已打开页面和回滚入口仍可能请求它们。
3. 前端回滚能撤销预约吗？
   **答案**：不能，预约是服务端事实，需要独立事务和恢复决策。
4. `immutable` 能用于 `index.html` 吗？
   **答案**：通常不应；入口需要及时发现新版本或回滚版本。

## 10. 实践练习

- **基础**：生成本地 SHA-256 清单并校验。验收：篡改单字节失败，恢复后通过。
- **进阶**：为入口、hash JS、Source Map 和错误报告分别写缓存/访问策略。验收：说明每种内容为何不同。
- **故障注入**：删除一个延迟 chunk。验收：入口引用或浏览器交互检查失败；恢复 chunk 后通过。

## 11. 阶段验收

必须提交以下本地证据，而不是生产成功声明：

```bash
if git rev-parse --is-inside-work-tree >/dev/null 2>&1 \
  && [ -z "$(git status --porcelain --untracked-files=normal)" ]; then
  git rev-parse HEAD
else
  printf 'local-uncommitted\n'
fi
pnpm verify
find dist -type f -print | sort
(cd /tmp/market-artifact && shasum -a 256 -c SHA256SUMS)
```

通过条件：干净输入的制品关联真实提交，其他本地输入明确标为未提交；摘要通过；缺失路径会失败；
发布计划采用资源先行；旧资源有保留窗口；列出托管 CI、registry、CDN headers、TLS、域名切换、
生产部署和数据库恢复的未验证状态。

## 12. 常见问题

**上传 artifact 就算部署吗？** 不算。artifact 仍是存储的构建结果，尚未进入用户访问环境。

**缓存失败是否应阻断发布？** 缓存是加速层，miss 应正常安装；若缓存内容导致校验失败，应丢弃缓存并保留失败证据。

**只检查首页 200 足够吗？** 不够。还需资源、延迟加载、关键只读路径、错误恢复和会话边界；写操作必须避免使用未经授权的真实数据。

## 13. 扩展阅读

资料快照：2026-10-11。

- [GitHub Actions 制品](https://docs.github.com/en/actions/using-workflows/storing-workflow-data-as-artifacts)
- [MDN HTTP 缓存](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching)
- [Vite 静态部署](https://vite.dev/guide/static-deploy.html)
- [SLSA Provenance](https://slsa.dev/provenance/)

## 我现在能做到什么

我能让构建制品关联提交和摘要，设计不会短暂暴露缺失资源的发布顺序，区分缓存与完整性，并明确静态回滚不能恢复哪些服务端状态。

## 单元导航

- 章入口：[06 CI、Git 与发布](../06-ci-git-release.md)
- 上一课：[可复现 CI 质量流水线](02-ci-reproducible-quality-pipeline.md)
- 下一课：[结业项目契约与脚手架](../07-engineering-capstone/01-capstone-contract-scaffold.md)
