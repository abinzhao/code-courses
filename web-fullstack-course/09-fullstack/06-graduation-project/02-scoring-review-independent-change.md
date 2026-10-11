# 客观评分、复审与 90 分钟独立修改：让结业结论可以复算

## 任务卡

| 项目 | 本课约定 |
| --- | --- |
| 任务 | 用 100 分表、维度下限、八项否决、五条双前端路径、故障抽题和独立修改完成复审 |
| 评审位置 | reader-owned clean checkout、`market_assessment_test` 和 `evidence/` 脱敏证据 |
| 建议时间 | 环境/冷安装 45 分钟，自动验收 90 分钟，人工路径 90 分钟，答辩 30 分钟，独立修改 90 分钟 |
| 核心产出 | `evidence/assessment-result.json`、`evidence/score.mjs`、评审记录和补考历史 |
| 成功证据 | 基础分 >= 80、七个维度下限满足、八项否决均完成独立复审且未触发、正分有证据 |
| 失败证据 | 总分不足、任一 floor 不足、任一 veto 为 true、证据未执行却给分、结果不可复现 |
| 选修 | Review 最多 5 分单独报告，不计入 100，不帮助跨越 floor/veto |
| 环境边界 | 评分器在受信 host reader 进程运行；候选应用只能在无 evidence mount 容器中运行；缺环境则对应分值为 0 |

## 1. 任务背景

单一总分会掩盖结构性风险：精美的双前端可以把“认证授权 0 分”平均到 80；大量说明文档可以
掩盖数据库并发从未运行。毕业结论必须同时回答：

```text
基础能力总量是否足够？
关键安全/一致性/交付维度是否过线？
是否存在不能接受的一票否决？
证据能否由另一人重跑？
面对新规则，能否独立跨层修改？
```

因此本课不是主观答辩印象，而是“原始结果 -> 分项得分 -> floors -> vetoes -> 最终结论”的可复算
过程。代码阅读可以帮助解释，不能替代必须运行的行为证据。

## 2. 学习目标

完成本课后，你能够：

1. 按十个维度和明确子项计算基础 100 分；
2. 同时应用总分、七个维度下限和八项一票否决；
3. 对未执行/环境阻塞项不给运行分；
4. 让 React 与 Vue 分别完成五条相同业务路径；
5. 在 clean checkout 重跑安装、迁移、HTTP/SQL、浏览器、容器、回滚和恢复；
6. 保留失败 -> 修复 -> 复验历史，而不是覆盖证据；
7. 随机抽取一个隔离故障，按五段诊断恢复；
8. 用 90 分钟新需求检验需求澄清、跨层实现、失败测试和边界表达。

## 3. 预备知识

- 已完成[结业范围、业务闭环与证据包](01-capstone-scope-business-evidence.md)；
- 评审者拿到 commit、lock checksum、image digest、migration checksum 和启动说明；
- 评审者能在 reader-owned 新目录和 `market_assessment_test` 运行；
- 所有真实秘密由评审环境生成，不由候选人证据包提供；
- 候选人与评审者事先确认哪些项目是自动、人工、环境阻塞或外部未授权。

评审开始前冻结评分版本和需求。不能在看到结果后更换 floor、放宽 veto 或把选修加进 100 分。

## 4. 核心理论

### 4.1 完整 100 分表

| 维度 | 分值 | 可观察计分条件 |
| --- | ---: | --- |
| HTTP 契约 | 10 | 共同路径 2；状态码 2；字段/parser 2；UTC 2；整数分 2 |
| 认证授权 | 15 | 登录/退出/过期 3；CSRF 3；对象权限 3；管理员服务端校验 3；凭证不泄露 3 |
| 数据一致性 | 15 | 20 买家仅一次成功 5；version 409 4；事务回滚无部分状态 3；收藏身份隔离 3 |
| 新业务闭环 | 10 | 取消 3；确认 3；两者权限/重复/状态冲突 4 |
| React 前端 | 10 | 五条浏览器路径各 2，包含状态和错误恢复 |
| Vue 前端 | 10 | 与 React 同样五条路径各 2 |
| 可靠性 | 8 | outbox 不丢 3；重复事件单结果 3；失败重放与有序停机 2 |
| 交付与 CI | 10 | 冷安装 2；镜像启动 2；HTTPS/SPA/API 2；CI 门禁 2；digest 回滚 2 |
| 性能与恢复 | 8 | 声明负载并达教学门槛 3；恢复不变量与 RTO/RPO 3；日志/告警 2 |
| 独立修改能力 | 4 | 90 分钟实现 2；解释失败边界并增加有效测试 2 |
| **基础总分** | **100** | 只计算实际可复现结果 |

子项可以部分得分，但评审记录必须指向具体证据。例如“认证做得不错 12 分”不合格；应写哪四个
3 分子项通过、哪个未通过。

### 4.2 七个维度下限同时生效

基础通过需要：

```text
total >= 80
authenticationAuthorization >= 12/15
dataConsistency >= 12/15
reactFrontend >= 8/10
vueFrontend >= 8/10
deliveryCi >= 8/10
performanceRecovery >= 6/8
independentChange >= 3/4
```

这里有七条维度分数约束，所有数值都要同时满足；总分 95 但 Vue 6 分仍不通过。

### 4.3 八项一票否决

以下任一项的 `triggered` 为 true，基础结论只能是 `VETOED`：

1. **对象越权**：普通用户可修改/取消/确认不属于自己的对象。
2. **双重有效预约**：同一 Listing 同时存在两条 pending/confirmed。
3. **浮点元落库**：金额以浮点“元”持久化或跨层出现舍入不确定。
4. **缺少 session 撤销**：logout/过期/事故撤销后旧 Cookie 仍可访问。
5. **生产写操作无 CSRF**：Cookie 认证 mutation 缺少有效 Origin/CSRF 防护。
6. **真实机密进入仓库/证据**：密码、token、Cookie、私钥、生产连接串或真实个人数据泄露。
7. **恢复覆盖真实或共享库**：演练使用 `--clean`/覆盖非隔离目标或破坏他人数据。
8. **为通过而删除保护**：删除关键测试、放宽断言、吞掉错误或关闭门禁制造绿色。

Veto 不是一个脱离证据的 boolean。每项都必须记录 `triggered`、`reviewed` 和自己命名空间下的
reader-owned 复审证据。`triggered: true` 始终得到 `VETOED`；没有触发但
`reviewed: false` 表示结论尚未完成，只能 `REMEDIATE`，不能靠默认 false 获得 PASS。修复后
需要补考并保留原失败记录。

### 4.4 未执行不等于代码不存在

证据等级：

| 状态 | 是否给运行分 | 例子 |
| --- | --- | --- |
| observed pass | 是，按子项 | 本轮 PG18 并发与 SQL 断言通过 |
| observed fail/recovered | 修复并复验后按规则 | 原失败和绿结果都保留 |
| blocked by environment | 否 | 当前没有 Docker daemon |
| external/manual gap | 否或只给明确人工子项 | 托管 CI 未授权、无真实 AT |
| static only | 只给静态子项 | Bash/Node/YAML 解析通过 |

“工作流文件存在”不等于 GitHub Actions 已运行；“备份脚本语法通过”不等于恢复得分。

所有得分证据都相对于固定根
`/tmp/full-course-verification/batch-f/reader-owned`，输入使用 `reader-owned/...` POSIX 相对
路径；拒绝绝对路径、反斜杠、空段以及 `.`/`..`。评分器本身在受信 host reader 进程运行；同 uid
候选应用必须留在没有 evidence mount 的容器中，不能与评分器共享宿主文件视图。

字符串合规不等于证据存在：固定根本身必须是当前 uid、非 symlink、精确 `0700` 的目录，realpath
只允许固定 `/tmp/.../reader-owned` 或 macOS 的 `/private/tmp/.../reader-owned`。评分器从根
逐组件 `lstat`；每个中间目录都必须由当前 uid 拥有、非 symlink 且 group/world 不可写。最终项
必须是当前 uid 拥有、非空 regular file，且 group/world 不可写；`0600`、`0640`、`0644` 等可读
模式可以，`0620`、`0602`、`0666` 不可以。检查时保存根、全部目录和文件的 dev/ino，用
`O_NOFOLLOW` 打开文件后再从根逐级 `lstat`；任一组件身份或安全属性变化都拒绝。任何
`earned > 0` 的维度和选修 Review 都必须至少有一条真实证据；veto review 的证据也执行同样
检查。候选人仓库历史截图、伪造路径、评审者机器绝对路径或空 evidence 数组不能支撑得分。

### 4.5 五条双前端路径

React 与 Vue 分别、顺序运行：

1. 注册 -> 登录 -> 刷新恢复 -> 退出 -> 受保护页拒绝；
2. 分页搜索 -> 空结果 -> 取消旧请求 -> 服务器错误 -> 重试恢复；
3. 发布整数分商品 -> owner 编辑 -> stranger 越权 403；
4. 收藏 PUT/重复 PUT -> 故障回滚 -> 身份切换隔离 -> DELETE；
5. 两买家竞争 -> 一个 201/一个 409 -> 旧 version 编辑 409 -> 草稿保留 -> 重读采用。

每条 2 分要求关键 success、loading/error/permission/conflict 状态都可观察，且数据库结果正确。
仅截图终态、仅组件单测或另一框架通过都不能给该路径分。

### 4.6 无障碍是路径质量，不是截图

每套前端至少人工验证：

- 键盘到达、操作和退出 modal/popover；
- 可见焦点；
- label/name/role/value；
- 错误与字段关联；
- 状态变化通过 live region 或可理解文本表达；
- 冲突后焦点和草稿可恢复；
- reduced motion 不阻断信息。

Chromium 键盘证据不等于 VoiceOver/NVDA/JAWS。没有真实辅助技术时明确 manual gap。

### 4.7 补考保留历史

补考记录必须包含：

```text
failed_at_utc
original command/path
original status/assertion
root cause
changed files/migrations
same-command retest
affected regression set
new remaining boundary
reviewer decision
```

不要替换原日志或只上传绿截图。若修复引入新 veto，结论仍失败。

### 4.8 独立修改验证迁移能力

运行现成项目主要证明复制与整合；90 分钟修改要求候选人面对一个未预演的小规则，完成：

```text
澄清规则/边界
  -> 失败测试
  -> 向后兼容迁移/约束
  -> 服务端校验/授权/事务
  -> contracts
  -> React + Vue 必要交互
  -> 受影响测试
  -> 未完成/未验证说明
```

限时结束未全绿可以诚实列剩余项；不能降低断言或声称预计通过。

## 5. 评分字段、证据与命令清单

| 字段/动作 | 规则 |
| --- | --- |
| `maximum` | 与固定表一致，不能由候选人修改 |
| `earned` | 0..maximum integer |
| `executed` | 该维度至少有本轮行为证据 |
| `evidence` | 正分时非空；固定根/逐组件身份与权限稳定，文件真实、非空 |
| `vetoes` | 八个固定对象：`triggered`、`reviewed`、独立 `evidence` |
| veto review | false + reviewed + 独立证据才可排除；unreviewed 阻止 PASS |
| `optionalReview` | 0..5，单独显示；正分同样必须有 reader-owned 证据 |
| `total` | 十个基础维度求和，不加 optional |
| `floors` | 固定阈值同时比较 |
| `decision` | PASS / REMEDIATE / VETOED |
| cold install | frozen lock，记录 lock hash |
| database | target/version/migration/HTTP/SQL |
| browser | React/Vue 五路径分别执行 |
| delivery | isolated Compose、TLS、digest rollback |
| restore | 全新 `market_restore_test` |
| accessibility | 自动 + 键盘 + 明确人工缺口 |

## 6. 最小可运行案例

### 6.1 一份可复算的示例结果

下面是**格式演示**，不是任何学员的成绩。

**完整文件：`evidence/assessment-result.json`**

```json
{
  "label": "DEMO_ASSESSMENT_FORMAT_NOT_A_CANDIDATE_RESULT",
  "assessedAt": "2026-10-11T12:00:00.000Z",
  "sourceCommit": "demo-local-commit",
  "dimensions": {
    "httpContract": {
      "earned": 9,
      "executed": true,
      "evidence": ["reader-owned/http/contract-summary.txt"]
    },
    "authenticationAuthorization": {
      "earned": 12,
      "executed": true,
      "evidence": ["reader-owned/http/auth-authorization-summary.txt"]
    },
    "dataConsistency": {
      "earned": 12,
      "executed": true,
      "evidence": ["reader-owned/database/concurrency-summary.txt"]
    },
    "newBusinessLoop": {
      "earned": 8,
      "executed": true,
      "evidence": ["reader-owned/http/cancel-confirm-summary.txt"]
    },
    "reactFrontend": {
      "earned": 8,
      "executed": true,
      "evidence": ["reader-owned/browser-react/five-paths.txt"]
    },
    "vueFrontend": {
      "earned": 8,
      "executed": true,
      "evidence": ["reader-owned/browser-vue/five-paths.txt"]
    },
    "reliability": {
      "earned": 6,
      "executed": true,
      "evidence": ["reader-owned/operations/outbox-replay-summary.txt"]
    },
    "deliveryCi": {
      "earned": 8,
      "executed": true,
      "evidence": ["reader-owned/delivery/cold-install-release-rollback.txt"]
    },
    "performanceRecovery": {
      "earned": 6,
      "executed": true,
      "evidence": ["reader-owned/operations/load-restore-summary.txt"]
    },
    "independentChange": {
      "earned": 3,
      "executed": true,
      "evidence": ["reader-owned/assessment/independent-change.txt"]
    }
  },
  "vetoes": {
    "objectAuthorizationBypass": {
      "triggered": false,
      "reviewed": true,
      "evidence": [
        "reader-owned/vetoes/objectAuthorizationBypass/review.txt"
      ]
    },
    "multipleActiveReservations": {
      "triggered": false,
      "reviewed": true,
      "evidence": [
        "reader-owned/vetoes/multipleActiveReservations/review.txt"
      ]
    },
    "floatingMajorCurrencyPersisted": {
      "triggered": false,
      "reviewed": true,
      "evidence": [
        "reader-owned/vetoes/floatingMajorCurrencyPersisted/review.txt"
      ]
    },
    "sessionRevocationMissing": {
      "triggered": false,
      "reviewed": true,
      "evidence": [
        "reader-owned/vetoes/sessionRevocationMissing/review.txt"
      ]
    },
    "cookieMutationWithoutCsrf": {
      "triggered": false,
      "reviewed": true,
      "evidence": [
        "reader-owned/vetoes/cookieMutationWithoutCsrf/review.txt"
      ]
    },
    "realSecretOrPersonalDataCommitted": {
      "triggered": false,
      "reviewed": true,
      "evidence": [
        "reader-owned/vetoes/realSecretOrPersonalDataCommitted/review.txt"
      ]
    },
    "restoreTouchedSharedOrProductionData": {
      "triggered": false,
      "reviewed": true,
      "evidence": [
        "reader-owned/vetoes/restoreTouchedSharedOrProductionData/review.txt"
      ]
    },
    "protectiveTestOrAssertionRemoved": {
      "triggered": false,
      "reviewed": true,
      "evidence": [
        "reader-owned/vetoes/protectiveTestOrAssertionRemoved/review.txt"
      ]
    }
  },
  "optionalReview": {
    "earned": 0,
    "evidence": []
  }
}
```

这份格式恰好基础 80 分、满足 floors、十个正分维度有证据且八项 veto 都有独立复审证据，仅用于
证明计算器输入。真实结果必须替换整个文件并指向真实脱敏证据，不能改 label 后冒充。

### 6.2 完整评分计算器

**完整文件：`evidence/score.mjs`**

```js
import {
  closeSync,
  constants,
  fstatSync,
  lstatSync,
  openSync,
  realpathSync,
} from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const EVIDENCE_ROOT =
  "/tmp/full-course-verification/batch-f/reader-owned";
const EVIDENCE_ROOT_REALPATHS = new Set([
  "/tmp/full-course-verification/batch-f/reader-owned",
  "/private/tmp/full-course-verification/batch-f/reader-owned",
]);

const DIMENSIONS = {
  httpContract: { maximum: 10, floor: null },
  authenticationAuthorization: { maximum: 15, floor: 12 },
  dataConsistency: { maximum: 15, floor: 12 },
  newBusinessLoop: { maximum: 10, floor: null },
  reactFrontend: { maximum: 10, floor: 8 },
  vueFrontend: { maximum: 10, floor: 8 },
  reliability: { maximum: 8, floor: null },
  deliveryCi: { maximum: 10, floor: 8 },
  performanceRecovery: { maximum: 8, floor: 6 },
  independentChange: { maximum: 4, floor: 3 },
};

const VETOES = [
  "objectAuthorizationBypass",
  "multipleActiveReservations",
  "floatingMajorCurrencyPersisted",
  "sessionRevocationMissing",
  "cookieMutationWithoutCsrf",
  "realSecretOrPersonalDataCommitted",
  "restoreTouchedSharedOrProductionData",
  "protectiveTestOrAssertionRemoved",
];

const DIMENSION_RESULT_KEYS = ["earned", "executed", "evidence"];
const VETO_REVIEW_KEYS = ["triggered", "reviewed", "evidence"];
const OPTIONAL_REVIEW_KEYS = ["earned", "evidence"];
const ASSESSMENT_KEYS = [
  "label",
  "assessedAt",
  "sourceCommit",
  "dimensions",
  "vetoes",
  "optionalReview",
];
const CANDIDATE_LABEL = "CANDIDATE_ASSESSMENT_RESULT";

function requireExactKeys(value, expected, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    throw new Error(`${label} keys differ: ${actual.join(",")}`);
  }
}

function canonicalUtc(value, label) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
  ) {
    throw new Error(`${label} must be canonical UTC ISO 8601`);
  }
  const time = Date.parse(value);
  if (!Number.isFinite(time) || new Date(time).toISOString() !== value) {
    throw new Error(`${label} is not a real canonical timestamp`);
  }
  return value;
}

function checkedCommit(value, label) {
  if (typeof value !== "string" || !/^[a-f0-9]{7,64}$/.test(value)) {
    throw new Error(`${label} must be a lowercase hexadecimal commit`);
  }
  return value;
}

function isReaderOwnedRelativePath(value) {
  if (
    typeof value !== "string" ||
    value.startsWith("/") ||
    value.includes("\\")
  ) {
    return false;
  }
  const parts = value.split("/");
  return (
    parts.length >= 2 &&
    parts[0] === "reader-owned" &&
    parts.every((part) => part !== "" && part !== "." && part !== "..")
  );
}

function lstatEvidence(path, label) {
  try {
    return lstatSync(path);
  } catch (error) {
    throw new Error(`${label} does not exist: ${path}`, { cause: error });
  }
}

function checkedEvidenceRoot(label) {
  const stats = lstatEvidence(EVIDENCE_ROOT, label);
  if (
    stats.isSymbolicLink() ||
    !stats.isDirectory() ||
    stats.uid !== process.getuid() ||
    (stats.mode & 0o7777) !== 0o700
  ) {
    throw new Error(
      `${label} evidence root must be current-uid mode-700 directory`,
    );
  }
  const resolved = realpathSync(EVIDENCE_ROOT);
  if (!EVIDENCE_ROOT_REALPATHS.has(resolved)) {
    throw new Error(`${label} evidence root realpath is not fixed`);
  }
  return {
    path: EVIDENCE_ROOT,
    stats,
    kind: "root",
    label,
  };
}

function checkedEvidenceDirectory(path, label) {
  const stats = lstatEvidence(path, label);
  if (
    stats.isSymbolicLink() ||
    !stats.isDirectory() ||
    stats.uid !== process.getuid() ||
    (stats.mode & 0o022) !== 0
  ) {
    throw new Error(
      `${label} component must be a current-uid non-writable directory: ${path}`,
    );
  }
  return { path, stats, kind: "directory", label };
}

function checkedEvidenceRegularFile(path, label) {
  const stats = lstatEvidence(path, label);
  if (
    stats.isSymbolicLink() ||
    !stats.isFile() ||
    stats.uid !== process.getuid() ||
    stats.size <= 0 ||
    (stats.mode & 0o022) !== 0
  ) {
    throw new Error(
      `${label} must be a current-uid nonempty protected file: ${path}`,
    );
  }
  return { path, stats, kind: "file", label };
}

function assertEvidenceComponentUnchanged(component) {
  const current = lstatEvidence(component.path, component.label);
  if (
    current.isSymbolicLink() ||
    current.dev !== component.stats.dev ||
    current.ino !== component.stats.ino
  ) {
    throw new Error(
      `${component.label} component changed while opening: ${component.path}`,
    );
  }
  if (
    component.kind === "root" &&
    (
      !current.isDirectory() ||
      current.uid !== process.getuid() ||
      (current.mode & 0o7777) !== 0o700
    )
  ) {
    throw new Error(`${component.label} evidence root became unsafe`);
  }
  if (
    component.kind === "directory" &&
    (
      !current.isDirectory() ||
      current.uid !== process.getuid() ||
      (current.mode & 0o022) !== 0
    )
  ) {
    throw new Error(`${component.label} directory became unsafe`);
  }
  if (
    component.kind === "file" &&
    (
      !current.isFile() ||
      current.uid !== process.getuid() ||
      current.size <= 0 ||
      (current.mode & 0o022) !== 0
    )
  ) {
    throw new Error(`${component.label} file became unsafe`);
  }
}

function checkedEvidenceFile(relativePath, label) {
  const relativeParts = relativePath.split("/").slice(1);
  let currentPath = EVIDENCE_ROOT;
  const components = [checkedEvidenceRoot(label)];
  const rootRealpath = realpathSync(currentPath);

  for (let index = 0; index < relativeParts.length; index += 1) {
    currentPath = join(currentPath, relativeParts[index]);
    const isFinal = index === relativeParts.length - 1;
    components.push(
      isFinal
        ? checkedEvidenceRegularFile(currentPath, label)
        : checkedEvidenceDirectory(currentPath, label),
    );
  }

  const evidenceRealpath = realpathSync(currentPath);
  const expectedRealpath = join(rootRealpath, ...relativeParts);
  if (evidenceRealpath !== expectedRealpath) {
    throw new Error(`${label} realpath differs from its fixed evidence path`);
  }

  const before = components.at(-1).stats;

  let descriptor;
  try {
    descriptor = openSync(
      currentPath,
      constants.O_RDONLY | constants.O_NOFOLLOW,
    );
    const opened = fstatSync(descriptor);
    if (
      !opened.isFile() ||
      opened.uid !== process.getuid() ||
      opened.size <= 0 ||
      (opened.mode & 0o022) !== 0 ||
      opened.dev !== before.dev ||
      opened.ino !== before.ino
    ) {
      throw new Error(`${label} changed while opening`);
    }
    for (const component of components) {
      assertEvidenceComponentUnchanged(component);
    }
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
}

function checkedEvidence(value, label, options = {}) {
  if (
    !Array.isArray(value) ||
    value.some((item) => !isReaderOwnedRelativePath(item))
  ) {
    throw new Error(
      `${label} must contain only reader-owned relative paths`,
    );
  }
  if (new Set(value).size !== value.length) {
    throw new Error(`${label} must not contain duplicate paths`);
  }
  if (options.required && value.length === 0) {
    throw new Error(`${label} must not be empty`);
  }
  if (
    options.prefix &&
    value.some((item) => !item.startsWith(options.prefix))
  ) {
    throw new Error(`${label} must use ${options.prefix}`);
  }
  for (const item of value) {
    checkedEvidenceFile(item, label);
  }
  return value;
}

export function scoreAssessment(input, expectedSourceCommit) {
  requireExactKeys(input, ASSESSMENT_KEYS, "assessment");
  if (input.label !== CANDIDATE_LABEL) {
    throw new Error(`assessment.label must be ${CANDIDATE_LABEL}`);
  }
  const assessedAt = canonicalUtc(input.assessedAt, "assessment.assessedAt");
  const sourceCommit = checkedCommit(
    input.sourceCommit,
    "assessment.sourceCommit",
  );
  const expectedCommit = checkedCommit(
    expectedSourceCommit,
    "expectedSourceCommit",
  );
  if (sourceCommit !== expectedCommit) {
    throw new Error("assessment sourceCommit differs from reviewed commit");
  }
  requireExactKeys(input.dimensions, Object.keys(DIMENSIONS), "dimensions");
  requireExactKeys(input.vetoes, VETOES, "vetoes");

  let total = 0;
  const unmetFloors = [];
  const dimensionResults = {};
  for (const [name, rule] of Object.entries(DIMENSIONS)) {
    const result = input.dimensions[name];
    requireExactKeys(result, DIMENSION_RESULT_KEYS, `dimensions.${name}`);
    if (typeof result.executed !== "boolean") {
      throw new Error(`${name}.executed must be boolean`);
    }
    if (
      !Number.isInteger(result.earned) ||
      result.earned < 0 ||
      result.earned > rule.maximum
    ) {
      throw new Error(`${name}.earned must be 0..${rule.maximum}`);
    }
    if (!result.executed && result.earned !== 0) {
      throw new Error(`${name} cannot earn points without execution`);
    }
    checkedEvidence(result.evidence, `${name}.evidence`, {
      required: result.earned > 0,
    });
    total += result.earned;
    const floorMet = rule.floor === null || result.earned >= rule.floor;
    if (!floorMet) {
      unmetFloors.push({
        dimension: name,
        earned: result.earned,
        required: rule.floor,
      });
    }
    dimensionResults[name] = {
      earned: result.earned,
      maximum: rule.maximum,
      floor: rule.floor,
      floorMet,
      executed: result.executed,
    };
  }

  const activeVetoes = [];
  const unreviewedVetoes = [];
  for (const name of VETOES) {
    const review = input.vetoes[name];
    requireExactKeys(review, VETO_REVIEW_KEYS, `vetoes.${name}`);
    if (
      typeof review.triggered !== "boolean" ||
      typeof review.reviewed !== "boolean"
    ) {
      throw new Error(`${name} veto flags must be boolean`);
    }
    checkedEvidence(review.evidence, `${name}.evidence`, {
      required: review.triggered || review.reviewed,
      prefix: `reader-owned/vetoes/${name}/`,
    });
    if (review.triggered) activeVetoes.push(name);
    if (!review.reviewed) unreviewedVetoes.push(name);
  }

  const optional = input.optionalReview;
  requireExactKeys(optional, OPTIONAL_REVIEW_KEYS, "optionalReview");
  if (
    !Number.isInteger(optional.earned) ||
    optional.earned < 0 ||
    optional.earned > 5
  ) {
    throw new Error("optionalReview.earned must be 0..5");
  }
  checkedEvidence(optional.evidence, "optionalReview.evidence", {
    required: optional.earned > 0,
  });

  const baseConditionsMet = total >= 80 && unmetFloors.length === 0;
  const decision = activeVetoes.length > 0
    ? "VETOED"
    : baseConditionsMet && unreviewedVetoes.length === 0
      ? "PASS"
      : "REMEDIATE";
  return {
    label: "RECALCULATED_ASSESSMENT",
    assessedAt,
    sourceCommit,
    total,
    maximum: 100,
    optionalReview: optional.earned,
    optionalExcludedFromBase: true,
    dimensionResults,
    unmetFloors,
    activeVetoes,
    unreviewedVetoes,
    vetoReviewComplete: unreviewedVetoes.length === 0,
    decision,
  };
}

if (
  process.argv[1] &&
  realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1])
) {
  const inputPath = process.argv[2] ?? "evidence/assessment-result.json";
  const expectedSourceCommit = process.argv[3];
  if (!expectedSourceCommit) {
    throw new Error(
      "usage: node evidence/score.mjs INPUT EXPECTED_SOURCE_COMMIT",
    );
  }
  const input = JSON.parse(await readFile(inputPath, "utf8"));
  console.log(JSON.stringify(
    scoreAssessment(input, expectedSourceCommit),
    null,
    2,
  ));
}
```

### 6.3 静态检查与复算

示例命令必须先在固定 `/tmp` 根创建全部 sample evidence，不能在仓库中放同名空壳。以下 setup
从示例 JSON 收集每一条 dimension/veto/optional 路径，创建当前 uid 的 `0700` 根/中间目录和
非空 `0600` 文件；退出时只删除本次新建的 `/tmp` reader-owned 根：

```bash
set -euo pipefail
umask 077
SAMPLE_ROOT=/tmp/full-course-verification/batch-f/reader-owned
TMP_DIR=$(mktemp -d)
CANDIDATE_INPUT=$TMP_DIR/candidate-assessment.json
EXPECTED_COMMIT=0123456789abcdef0123456789abcdef01234567
test ! -e "$SAMPLE_ROOT"
trap 'rm -rf "$SAMPLE_ROOT" "$TMP_DIR"' EXIT

node - evidence/assessment-result.json "$SAMPLE_ROOT" \
  "$CANDIDATE_INPUT" "$EXPECTED_COMMIT" <<'NODE'
const fs = require("node:fs");
const path = require("node:path");
const [inputPath, root, candidatePath, expectedCommit] =
  process.argv.slice(2);
const input = JSON.parse(fs.readFileSync(inputPath, "utf8"));
input.label = "CANDIDATE_ASSESSMENT_RESULT";
input.sourceCommit = expectedCommit;
input.assessedAt = "2026-10-11T12:00:00.000Z";
fs.writeFileSync(candidatePath, JSON.stringify(input), { mode: 0o600 });
fs.mkdirSync(root, { recursive: true, mode: 0o700 });
fs.chmodSync(root, 0o700);
const paths = [
  ...Object.values(input.dimensions).flatMap((item) => item.evidence),
  ...Object.values(input.vetoes).flatMap((item) => item.evidence),
  ...input.optionalReview.evidence,
];
for (const relative of new Set(paths)) {
  const parts = relative.split("/");
  if (
    parts.length < 2 ||
    parts[0] !== "reader-owned" ||
    parts.some((part) => !part || part === "." || part === "..")
  ) {
    throw new Error(`unsafe sample evidence path: ${relative}`);
  }
  const target = path.join(root, ...parts.slice(1));
  fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
  fs.writeFileSync(target, `sample evidence for ${relative}\n`, {
    mode: 0o600,
  });
}
NODE

node --check evidence/score.mjs
node -e '
  const fs = require("node:fs");
  JSON.parse(fs.readFileSync("evidence/assessment-result.json", "utf8"));
'
node evidence/score.mjs "$CANDIDATE_INPUT" "$EXPECTED_COMMIT"
if node evidence/score.mjs \
  evidence/assessment-result.json "$EXPECTED_COMMIT"; then
  echo "expected demo label to be rejected" >&2
  exit 1
fi
```

示例预期输出 total 80、无 unmet floors/active/unreviewed veto、decision PASS、
optionalExcludedFromBase true，并回显匹配的 `sourceCommit` 与规范 `assessedAt`。原始 demo 文件
必须因 label 非候选结果而失败；若没有先创建全部真实 sample evidence，候选临时副本必须因首个
不存在文件而非零退出。这个 PASS 只证明示例数字、临时 provenance 和本轮临时文件满足算法，
不是毕业结论。

### 6.4 PASS/floor/veto/证据负向断言

以下命令只改临时副本。floor 用 `httpContract +1` 抵消 `authenticationAuthorization -1`，因此
总分仍为 80，可证明失败来自 floor；unreviewed false veto 必须得到 REMEDIATE，true veto 必须
得到 VETOED；基础维度或 optional 正分却无证据、`0777` 根、中间目录 symlink 或文件删除都必须
非零：

```bash
set -euo pipefail
umask 077
TMP_DIR=$(mktemp -d)
SAMPLE_ROOT=/tmp/full-course-verification/batch-f/reader-owned
EXPECTED_COMMIT=0123456789abcdef0123456789abcdef01234567
test ! -e "$SAMPLE_ROOT"
trap 'rm -rf "$TMP_DIR" "$SAMPLE_ROOT"' EXIT

node - evidence/assessment-result.json "$TMP_DIR" "$EXPECTED_COMMIT" <<'NODE'
const fs = require("node:fs");
const path = require("node:path");
const [source, directory, expectedCommit] = process.argv.slice(2);
const base = JSON.parse(fs.readFileSync(source, "utf8"));
base.label = "CANDIDATE_ASSESSMENT_RESULT";
base.sourceCommit = expectedCommit;
base.assessedAt = "2026-10-11T12:00:00.000Z";
const clone = () => structuredClone(base);
const write = (name, value) => {
  fs.writeFileSync(`${directory}/${name}.json`, JSON.stringify(value));
};

write("pass", clone());

const floor = clone();
floor.dimensions.httpContract.earned = 10;
floor.dimensions.authenticationAuthorization.earned = 11;
write("floor", floor);

const veto = clone();
veto.vetoes.objectAuthorizationBypass.triggered = true;
write("veto", veto);

const unreviewed = clone();
unreviewed.vetoes.objectAuthorizationBypass.reviewed = false;
unreviewed.vetoes.objectAuthorizationBypass.evidence = [];
write("unreviewed", unreviewed);

const noEvidence = clone();
noEvidence.dimensions.httpContract.evidence = [];
write("no-evidence", noEvidence);

const optionalNoEvidence = clone();
optionalNoEvidence.optionalReview.earned = 1;
write("optional-no-evidence", optionalNoEvidence);

const demoLabel = clone();
demoLabel.label = "DEMO_ASSESSMENT_FORMAT_NOT_A_CANDIDATE_RESULT";
write("demo-label", demoLabel);

const wrongCommit = clone();
wrongCommit.sourceCommit = "abcdefabcdefabcdefabcdefabcdefabcdefabcd";
write("wrong-commit", wrongCommit);

const malformedTimestamp = clone();
malformedTimestamp.assessedAt = "2026-10-11 12:00:00";
write("malformed-timestamp", malformedTimestamp);

const evidenceRoot =
  "/tmp/full-course-verification/batch-f/reader-owned";
fs.mkdirSync(evidenceRoot, { recursive: true, mode: 0o700 });
fs.chmodSync(evidenceRoot, 0o700);
const paths = [
  ...Object.values(base.dimensions).flatMap((item) => item.evidence),
  ...Object.values(base.vetoes).flatMap((item) => item.evidence),
  ...base.optionalReview.evidence,
];
for (const relative of new Set(paths)) {
  const parts = relative.split("/");
  if (
    parts.length < 2 ||
    parts[0] !== "reader-owned" ||
    parts.some((part) => !part || part === "." || part === "..")
  ) {
    throw new Error(`unsafe sample evidence path: ${relative}`);
  }
  const target = path.join(evidenceRoot, ...parts.slice(1));
  fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
  fs.writeFileSync(target, `sample evidence for ${relative}\n`, {
    mode: 0o600,
  });
}
NODE

assert_decision() {
  EXPECTED=$1
  INPUT=$2
  ACTUAL=$(
    node evidence/score.mjs "$INPUT" "$EXPECTED_COMMIT" |
      node -e '
        let text = "";
        process.stdin.on("data", (chunk) => { text += chunk; });
        process.stdin.on("end", () => {
          process.stdout.write(JSON.parse(text).decision);
        });
      '
  )
  [[ "$ACTUAL" == "$EXPECTED" ]]
}

assert_decision PASS "$TMP_DIR/pass.json"
assert_decision REMEDIATE "$TMP_DIR/floor.json"
assert_decision VETOED "$TMP_DIR/veto.json"
assert_decision REMEDIATE "$TMP_DIR/unreviewed.json"

score_direct() {
  node --input-type=module -e '
    import fs from "node:fs";
    import { pathToFileURL } from "node:url";
    const [inputPath, modulePath, expectedCommit] = process.argv.slice(1);
    const { scoreAssessment } = await import(pathToFileURL(modulePath).href);
    const input = JSON.parse(fs.readFileSync(inputPath, "utf8"));
    if (scoreAssessment(input, expectedCommit).decision !== "PASS") {
      process.exit(1);
    }
  ' "$TMP_DIR/pass.json" "$PWD/evidence/score.mjs" "$EXPECTED_COMMIT"
}
score_direct

for provenance_case in demo-label wrong-commit malformed-timestamp; do
  if node evidence/score.mjs \
    "$TMP_DIR/$provenance_case.json" "$EXPECTED_COMMIT"; then
    echo "expected provenance case to fail: $provenance_case" >&2
    exit 1
  fi
done

if node evidence/score.mjs \
  "$TMP_DIR/no-evidence.json" "$EXPECTED_COMMIT"; then
  echo "expected earned dimension without evidence to fail" >&2
  exit 1
fi
if node evidence/score.mjs \
  "$TMP_DIR/optional-no-evidence.json" "$EXPECTED_COMMIT"; then
  echo "expected optional points without evidence to fail" >&2
  exit 1
fi

chmod 0777 "$SAMPLE_ROOT"
if node evidence/score.mjs "$TMP_DIR/pass.json" "$EXPECTED_COMMIT"; then
  echo "expected mode-0777 evidence root to fail" >&2
  exit 1
fi
chmod 0700 "$SAMPLE_ROOT"

mv "$SAMPLE_ROOT/http" "$TMP_DIR/real-http"
ln -s "$TMP_DIR/real-http" "$SAMPLE_ROOT/http"
if node evidence/score.mjs "$TMP_DIR/pass.json" "$EXPECTED_COMMIT"; then
  echo "expected symlinked evidence parent to fail" >&2
  exit 1
fi
rm "$SAMPLE_ROOT/http"
mv "$TMP_DIR/real-http" "$SAMPLE_ROOT/http"

MISSING=$SAMPLE_ROOT/http/contract-summary.txt
rm "$MISSING"
if node evidence/score.mjs "$TMP_DIR/pass.json" "$EXPECTED_COMMIT"; then
  echo "expected deleted evidence file to fail" >&2
  exit 1
fi
if node evidence/score.mjs; then
  echo "expected default CLI input to fail after evidence deletion" >&2
  exit 1
fi
if score_direct; then
  echo "expected direct scoreAssessment call to fail after evidence deletion" >&2
  exit 1
fi
```

不能把评分器异常吞掉后继续出证书。`unreviewedVetoes` 非空虽不是 schema 错误，也必须阻止 PASS。
PASS 测试必须创建全部真实 sample evidence；根变成 `0777`、任一中间目录变成 symlink 或任一
引用文件被删除后，`scoreAssessment` 和 CLI 都必须立即抛错，不能继续使用之前的 PASS。组件
dev/ino 的打开后重走由评分器每次文件检查执行，不能缓存第一次通过的路径快照。

## 7. 邻里集市集成案例

### 7.1 评审者从 clean checkout 开始

只在 reader-owned 临时目录：

```bash
set -euo pipefail
umask 077
EVIDENCE_ROOT=/tmp/full-course-verification/batch-f/reader-owned
ASSESS_ROOT=$EVIDENCE_ROOT/final-review
test ! -e "$EVIDENCE_ROOT" && test ! -L "$EVIDENCE_ROOT"
mkdir -p -m 0700 "$EVIDENCE_ROOT"
mkdir -m 0700 "$ASSESS_ROOT"
```

评审者取得指定 commit 的本地副本，不接收候选人的 `node_modules`、dist、数据库 volume 或秘密。
候选 API 先按上一课放入无 evidence mount 的隔离容器；`score.mjs` 留在受信 host reader 进程，
不能放进候选容器执行。
在项目中记录：

```bash
node --version
pnpm --version
shasum -a 256 pnpm-lock.yaml
pnpm install --frozen-lockfile
git status --short
EXPECTED_SOURCE_COMMIT=$(git rev-parse HEAD)
[[ "$EXPECTED_SOURCE_COMMIT" =~ ^[a-f0-9]{40,64}$ ]]
```

预期安装不改 lock，源码工作区保持干净。registry/network 阻塞记 blocked；缓存安装不证明公共
registry 首次下载。最终复算必须由同一受信 reviewer shell 运行
`node evidence/score.mjs "$CANDIDATE_RESULT" "$EXPECTED_SOURCE_COMMIT"`；候选人填写的
`sourceCommit` 只有与 clean checkout 的 `HEAD` 完全一致才会进入计分。

### 7.2 数据库与 HTTP 复审

在自有 loopback PostgreSQL 18 创建 `market_assessment_test`，检查 connected server、库名和
migration checksum。运行：

- 两次 migration：首次 applied、再次 already applied；
- fixture 两次：可重放；
- API 单元/真实 HTTP/PG 测试；
- 20 买家 verifier；
- active reservation 独立 SQL；
- 取消/确认 actor-state 矩阵；
- 事务注入回滚和 outbox 同成同败。

HTTP 状态与数据库结果必须通过同一 runId/listingId 关联。不能只引用开发者机器历史。

### 7.3 五条路径分别跑两套前端

顺序启动 React -> 执行五条 -> 停止 -> Vue -> 执行五条，或使用明确隔离 origin/API。不能让两个
origin 共用错误 APP_ORIGIN 配置。每条保留：

```text
frontend
path number
start URL
test account class
expected states
observed states
HTTP requestId/status
database assertion
keyboard/focus result
trace sanitization result
```

Playwright 失败 trace 和截图也要保留；修复后另存，不覆盖。

### 7.4 容器、HTTPS 与健康

只使用固定本地 project：

```bash
docker compose --project-name market-assessment-lab \
  -f /tmp/full-course-verification/batch-f/reader-owned/final-review/market/compose.yaml \
  config --quiet
```

实际可用时验证：migration exit 0、db/api healthy、数据库不发布、API 非 root、HTTP -> HTTPS、
明确受信本地 CA、SPA deep link、missing asset 404、API 不回 HTML、Cookie/CSRF、live/ready。
没有 Docker 时这些子项 0 分，不以 `config` 通过代替启动。

### 7.5 CI 与发布/回滚

本地逐条运行 workflow 命令并故障注入一个 React/Vue 类型错误。托管 CI 只有实际 run URL、
commit 和结论才能给托管证据。PR/fork 不获得发布秘密。

发布/回滚只在 `market-assessment-lab` 使用本地构建 digest/明确隔离 registry；不推组织 registry、
不连接生产。回滚证明：

- previous digest 已记录；
- expand 后 schema 兼容旧应用；
- 回到旧应用后，新写入仍存在；
- 不运行旧 migration，不 drop 新列，不恢复备份替代应用回滚。

### 7.6 性能、恢复与故障

按第 5 章：

- 10,000 行、并发 1 -> 10、60 秒、公共列表 100%；
- 状态/错误/p95/pool/plan/waits；
- PG18 custom dump/catalog/checksum；
- 全新 `market_restore_test` 单事务恢复；
- 权限/业务不变量/API smoke 与 RTO/RPO；
- 随机故障一项：db、Redis、worker、错误 API 配置、证书临近到期。

当前没有 Docker/PG18 时，这些运行分不能获得；Node/Bash 语法只作为静态辅助。

### 7.7 八项 veto 逐条反证

评审不是凭声明勾“无”，而是给反证：

| Veto | 最低反证 |
| --- | --- |
| 对象越权 | 两账号 403 + DB 不变 |
| 双重预约 | 20 买家 + partial unique index + SQL 一条 |
| 浮点元 | parser/DTO/SQL integer CHECK + 12345 往返 |
| session 撤销缺失 | logout/过期/事故撤销后旧 Cookie 401 |
| Cookie 写无 CSRF | 错 Origin/token 403 + 正确请求成功 |
| 真实机密泄露 | repo/evidence 扫描 + trace 审查 + 轮换记录 |
| 恢复误伤 | 固定新库、目标预检、无 clean、ownership 记录 |
| 删除保护 | 原始测试/diff/故障门禁与 review 记录 |

如果缺证据，不应轻率写 `triggered: false, reviewed: true`；应写
`triggered: false, reviewed: false, evidence: []`，评分器会列入 `unreviewedVetoes` 并阻止
最终 PASS。每项完成复审后把独立证据放到
`reader-owned/vetoes/<veto-name>/...`，不能八项共用一份笼统声明。

### 7.8 随机故障抽题

评审从以下等概率选择一项，目标都固定 reader-owned local：

- stop `market-assessment-lab` Redis；
- stop `market-assessment-lab` db；
- 制造 version 409；
- 把临时 API base 改为错误 loopback 端口；
- 使用本地测试证书触发 30 天 `checkend` 失败。

候选人必须先描述 blast radius 和停止条件，再按“现象、证据、原因、修复、复验”。直接重启全部
容器、删 volume、清队列或放宽检查，本项失败并检查是否触发 veto 8。

### 7.9 90 分钟独立修改

评审现场随机选择一题：

1. **预约最长时长与过期释放**：定义 UTC expiresAt、worker/outbox、并发确认边界；
2. **评分筛选**：定义未评价、分页排序、索引、React/Vue URL 状态；
3. **退出全部设备**：定义 user session epoch/删除范围，证明所有旧 Cookie 401。

计时规则：

- 前 10 分钟可提澄清并写验收；
- 可查官方文档和现有仓库，不能粘贴预制分支/答案；
- 至少先得到一个与新规则直接相关的失败测试；
- migration 必须向后兼容或说明停止窗口；
- 服务端权限/事务先于只做按钮；
- 两个前端完成最小必要交互；
- 结束时运行受影响测试并列未验证项。

2 分实现要求核心规则跨 DB/API/至少必要 UI 可运行；2 分解释/测试要求有有效失败测试、边界和
回归。只加页面按钮最多不能获得实现满分。

### 7.10 补考流程

结论为 REMEDIATE/VETOED 时：

1. 冻结原结果 JSON 和 evidence；
2. 创建 remediation 记录，列根因与影响面；
3. 最小修复，不删除关键断言；
4. 重跑原失败命令；
5. 重跑依赖回归，例如授权修复需双前端与 API；
6. 生成新 assessment JSON；
7. 评分器复算；
8. reviewer 对比两版并签署新结论。

选修加分不参与补救基础分或 floor。

## 8. 常见错误与排查路径

### 8.1 明确错误示例

```json
{
  "vueFrontend": {
    "earned": 10,
    "executed": false,
    "evidence": ["reader-owned/browser-vue/reviewer-says-it-looks-similar.txt"]
  }
}
```

评分器必须拒绝。React 通过、代码相似或评审主观判断都不是 Vue 浏览器证据。

### 8.2 五段诊断记录

**现象**：候选人基础 86 分，但旧 Cookie 在“退出全部设备”后仍能访问 `/auth/me`。
**证据**：保留修改前 Cookie 的 200、修改命令、修改后仍 200、session rows/epoch；Cookie 值脱敏。
**原因**：只删除当前 session，其他设备 token 没有 user epoch 检查。
**修复**：事务内提升 user session epoch，认证查询比较 token epoch；新登录写当前 epoch。
**复验**：全部旧 Cookie 401，新登录 200，普通 logout 仍只撤销当前 session，双前端状态恢复。
**结论**：独立修改相应子项补考；若基础 session 撤销也缺失，同时检查 veto 4。

### 8.3 错误对照表

| 现象 | 证据 | 原因 | 修复/复验 |
| --- | --- | --- | --- |
| 总分 >=80 仍 REMEDIATE | unmet floors | 关键维度未过线 | 修复该维度并重跑依赖 |
| floors 全过但 VETOED | active vetoes | 不可接受风险 | 保留原证据，专项补考 |
| 分数/floors 通过却 REMEDIATE | unreviewed vetoes | 否决项未逐项复审 | 补独立 evidence 后复算 |
| 评分器拒绝 JSON | stderr/schema | 键缺失、超分、未执行给分 | 修正记录，不改固定规则 |
| 正分 evidence 仍被拒绝 | stderr/filesystem | 根非 0700、文件缺失/空、坏权限、symlink、逃根或组件 dev/ino 变化 | 在固定根重采安全真实证据或归零 |
| E2E 绿但 DB 错 | SQL assertion | 测试只看 UI | 加最终数据库不变量 |
| 本地 CI 绿无 hosted run | evidence class | 混淆环境 | 托管项未验证 |
| restore 很快却没分 | runbook | 无业务 smoke/RTO 终点错 | 完整全新库恢复 |
| 键盘可用却称 AT 通过 | manual record | 证据外推 | 标真实 AT gap |
| 补考只留绿截图 | evidence history | 覆盖原失败 | 恢复原证据与同命令链 |

## 9. 课后题

**问题 1：为什么 80 分之外还要 floors？**
参考答案：防止前端或文档高分抵消授权、一致性、交付和恢复等关键风险。

**问题 2：为什么 veto 不能只扣 10 分？**
参考答案：越权、双重预约、真实秘密或破坏性恢复意味着系统/证据不可接受，不是一般完成度问题。

**问题 3：为什么 Review 加分不计入基础 100？**
参考答案：选修不能代替强制闭环；分开报告保持不同候选人的基础能力可比较。

**问题 4：为什么独立修改允许未完成但不允许降低标准？**
参考答案：时间有限可以暴露真实剩余工作；删除测试/放宽断言会破坏证据诚信，无法判断能力。

## 10. 实践练习

### 基础：机械复算

只在固定 `/tmp` 根临时创建示例 JSON 引用的全部非空 `0600` evidence，再运行评分器，分别制造
总分 79、auth 11、一个 veto true、一个 false veto `reviewed: false`、正分 evidence 为空和
optional 正分 evidence 为空。预期前两种 REMEDIATE、true veto 为 VETOED、unreviewed 为
REMEDIATE，最后两种拒绝输入；完整真实文件得到 80 分 PASS。再依次把根改为 `0777`、把一个
中间目录替换成 symlink、删除任一引用文件，`scoreAssessment`、显式 CLI 和默认 CLI 都必须失败。

### 进阶：双前端评审

由非实现者按五条路径分别跑 React/Vue，记录 HTTP/DB/键盘证据。预期十条路径可独立定位；
任一框架失败只扣该框架相关路径，并触发受影响契约回归。

### 故障注入：补考完整性

故意让旧 version 被静默覆盖，保存失败，修复为 409 + 草稿恢复，再跑 API/DB/双前端。预期原
失败仍保留，评分变化可追溯；删除失败证据或断言则触发 veto 8。

## 11. 阶段验收

- [ ] 十个维度上限之和恰好 100，选修 0..5 单独报告。
- [ ] 总分 >=80 与 auth/data/React/Vue/delivery/recovery/independent floors 同时检查。
- [ ] 固定 reader-owned 根为当前 uid、精确 0700、非 symlink，realpath 只允许 `/tmp`/`/private/tmp` 固定值。
- [ ] 每条 evidence 从固定根解析；中间目录为当前 uid、非 symlink、group/world 不可写。
- [ ] 最终 evidence realpath 固定，且为当前 uid 的非空 regular file、group/world 不可写。
- [ ] 保存根/目录/文件 dev/ino，`O_NOFOLLOW` 打开后从根重走；任一组件变化立即拒绝。
- [ ] 根 0777、父目录 symlink、伪造/空/坏权限文件和删除 PASS 所用任一文件都会立即抛错。
- [ ] `scoreAssessment`、显式 CLI 输入与默认 `evidence/assessment-result.json` 执行相同文件检查。
- [ ] 八项 veto 均有 triggered/reviewed/独立 evidence；true 为 VETOED，unreviewed 阻止 PASS。
- [ ] 未执行维度不能得分，静态/本地/托管/人工证据不混用。
- [ ] React 与 Vue 分别完成五条路径、数据库结果和键盘检查。
- [ ] clean install、PG18、容器、HTTPS、CI、rollback、restore 按实际环境计分。
- [ ] 随机故障只作用 reader-owned local target，按五段记录恢复。
- [ ] 90 分钟修改包含澄清、失败测试、服务端规则、两个前端和未验证边界。
- [ ] 补考保留原失败、修复、同命令复验与受影响回归。
- [ ] Node 24 下真实 evidence PASS，根 0777/父 symlink/删除失败及 floor/veto/unreviewed/no-evidence 断言符合预期。
- [ ] 候选应用在无 evidence mount 容器运行，评分器只在受信 host reader 进程运行。
- [ ] 当前无 Docker/PG18 时，交付/恢复相关运行分未被误授。

## 12. 常见问题

**评审者可以看代码后酌情给运行分吗？**
不能。可以给明确静态子项，但要求运行的 HTTP/DB/浏览器/恢复分必须有本轮证据。

**一项缺陷能影响多个维度吗？**
可以。比如对象越权影响 auth、前端路径和 veto；评分记录要解释关联，不能人为只扣一处。

**独立修改只完成后端能得几分？**
按实际子项。核心规则/测试可得部分，但缺两个前端必要交互不能获得完整实现分。

**托管 CI 没权限运行怎么办？**
本地逐命令证据保留，但托管权限/服务/保护环境标 external-not-authorized，不声称通过。

**补考后可以删除旧 score JSON 吗？**
不能。新旧结果和 reviewer 决定都应保留，敏感内容则先处理泄露和轮换，再保存脱敏事件摘要。

**八项 veto 可以共用一份“全部检查通过”记录吗？**
不能。每项风险、命令和反证不同，必须写入自己的
`reader-owned/vetoes/<veto-name>/...`；未完成的项标 `reviewed: false`，不得预填为已排除。

**路径字符串合法但文件还没生成，可以先出分吗？**
不能。`scoreAssessment` 每次复算都重新读取固定 reader-owned 根的当前文件状态；不存在、空文件、
symlink、逃根、非 regular、owner 不符或 group/world 可写都会抛错。打开文件后还会从根重走并
比较每个组件 dev/ino；不能缓存上一次 PASS。

**为什么同 uid 候选应用不能直接运行在 host？**
同 uid 进程不受 `0600`/`0700` 隔离，能读取或替换评审证据。候选应用必须在不挂载 evidence 根
的 Docker 容器中；只有受信 host reader 进程生成 attestation、读取 evidence 和执行评分器。

## 13. 扩展阅读

官方资料快照：**2026-10-11**。

- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/)：
  可验证安全要求。
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)：可访问性成功标准。
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)：用户可观察行为测试。
- [PostgreSQL 18 Constraints](https://www.postgresql.org/docs/18/ddl-constraints.html)：数据库不变量。
- [GitHub Actions Security Hardening](https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions)：
  CI 权限与不可信代码。
- [Docker Compose](https://docs.docker.com/compose/)：本地可复现服务。
- [课程级项目验收](../../00-guide/project-contract.md)。

## 我现在能做到什么

我能让另一位评审者在干净隔离环境中复现项目，用固定 100 分表、关键维度下限和八项否决得出
可复算结论，并通过故障抽题和 90 分钟新需求检验真实的跨层修改能力。

## 单元导航

- 上一课：[结业范围、业务闭环与证据包](01-capstone-scope-business-evidence.md)
- 章节目录：[06 毕业项目](../README.md#06-毕业项目)
- 分卷入口：[全栈联调与交付](../README.md)
- 课程级评分：[统一项目契约与阶段验收](../../00-guide/project-contract.md)
- 全书入口：[Web 全栈课程](../../README.md)
