# 第五章：表单、提交与验证

> 把用户输入变成可检查的表单数据，并清楚区分浏览器约束、业务规则和服务端最终判定。

## 本章任务

邻里集市需要一张商品发布表单。页面不仅要“有几个输入框”，还必须回答：

1. 哪些控件会成为提交数据，字段名和值从哪里来；
2. 不同 input 类型怎样表示文本、数值、日期、选择、文件和命令；
3. 标签、分组、建议值、计算结果和进度怎样表达；
4. 原生约束与业务校验如何组合，错误怎样被看见和恢复；
5. 为什么客户端通过仍不代表有权发布、文件可信或服务器已经保存。

本章始终使用“本地预览”教学边界。所有完整案例都会阻止网络写入，并明确显示“未保存到服务器”。

## 学习成果

完成本章后，你将拥有：

- 一份能预测 successful controls 的提交记录；
- 一张按职责组织的 22 种现行 input 类型观察页；
- 一个包含标签、选择、分组、输出、进度和测量值的发布表单；
- 一个能显示原生与自定义错误、恢复首个无效控件焦点的预览流程；
- 一份文件类型、大小、隐藏字段、权限和服务端验证边界说明；
- 多次使用 FormData、URLSearchParams、ValidityState 和提交事件取证的记录。

## 详细教程

| 顺序 | 教程 | 核心问题 | 建议时间 |
| --- | --- | --- | ---: |
| 1 | [表单目标、方法与编码](05-forms-validation/01-form-action-method-encoding.md) | 配置 action、method、enctype、target 和验证入口，预测浏览器如何发送表单。 | 1–2 小时 |
| 2 | [成功控件、提交者与名称值](05-forms-validation/02-successful-controls-submitter-values.md) | 从控件树构造有序条目，区分 id、name、value、disabled、readonly 与提交者覆盖。 | 1–2 小时 |
| 3 | [FormData、查询串与程序化提交](05-forms-validation/03-formdata-query-programmatic-submit.md) | 观察 GET 与 POST 数据，保留 FormData 多值，并区分 requestSubmit() 与 submit()。 | 1–2 小时 |
| 4 | [input 类型与值状态模型](05-forms-validation/04-input-types-value-state.md) | 按输入任务选择 type，并区分当前值、默认值、脏值、checked 与 defaultChecked。 | 1–2 小时 |
| 5 | [文本、数值与范围输入](05-forms-validation/05-text-number-range-inputs.md) | 为文本、邮箱、URL、搜索、电话、密码、数值和范围任务选择正确输入模型。 | 1–2 小时 |
| 6 | [日期、时间、颜色与类型化值 API](05-forms-validation/06-date-time-color-inputs.md) | 处理日期时间和颜色输入的机器值、地区化界面与类型化 DOM API。 | 1–2 小时 |
| 7 | [选择、文件、隐藏与命令输入](05-forms-validation/07-choice-file-command-inputs.md) | 配置 checkbox、radio、file、hidden、button 和提交类输入的名称值与默认行为。 | 1–2 小时 |
| 8 | [showPicker 与渐进增强](05-forms-validation/08-showpicker-progressive-enhancement.md) | 把 showPicker() 作为可检测增强，并在不支持、拒绝或无脚本时保留原生输入基线。 | 1–2 小时 |
| 9 | [标签、可见名称与 textarea](05-forms-validation/09-label-textarea.md) | 建立 label 与控件的可靠关联，并区分 textarea 的初始文本、当前值和换行。 | 1–2 小时 |
| 10 | [选择控件、选项与按钮](05-forms-validation/10-select-option-button.md) | 处理 select、option、optgroup、多选状态和 button 的可见文字与提交值。 | 1–2 小时 |
| 11 | [分组、建议、输出、进度与测量](05-forms-validation/11-fieldset-datalist-output-progress-meter.md) | 使用 fieldset、legend、datalist、output、progress 和 meter 表达分组与状态。 | 1–2 小时 |
| 12 | [输入辅助、表单所有者与状态](05-forms-validation/12-input-assistance-form-state.md) | 配置输入辅助属性和 form 所有者，并区分内容属性、默认状态与当前状态。 | 1–2 小时 |
| 13 | [约束属性与验证候选者](05-forms-validation/13-constraint-attributes-candidates.md) | 判断 willValidate 候选者，并使用 required、长度、pattern、min、max、step 和文件提示约束。 | 1–2 小时 |
| 14 | [ValidityState、自定义错误与 invalid](05-forms-validation/14-validity-custom-errors-invalid.md) | 读取 ValidityState，管理 validationMessage 与 setCustomValidity() 生命周期，并处理 invalid 事件。 | 1–2 小时 |
| 15 | [文件检查与服务端信任边界](05-forms-validation/15-file-checks-server-boundaries.md) | 分层处理文件提示、前端预检查和服务端最终检查，并区分验证、认证、授权与 CSRF。 | 1–2 小时 |

预计总学习时间：22–26 小时。

## 知识依赖图

```text
表单提交模型
  → name/value 与 successful controls
  → input 类型和当前/默认值
  → label/fieldset/select/textarea 等控件关系
  → 原生约束与 ValidityState
  → 自定义业务错误和文件检查
  → 服务端重复校验、权限与并发边界
```

如果字段没有正确进入 FormData，后续校验和接口设计都建立在错误输入上；如果只看最终 JSON，又会错过控件默认行为和提交来源。

## 本章知识地图

### 提交

- `action`、`method`、`enctype`、`target`；
- UTF-8、autocomplete、novalidate；
- `name`、`value`、提交按钮和成功控件；
- GET 查询与 POST 请求体边界；
- FormData、同名多值、URLSearchParams；
- `requestSubmit()` 与 `submit()`。

### 输入和值

- 22 种现行 input 类型；
- 当前值、默认值、checked/defaultChecked；
- 数值、日期、时间和颜色的机器格式；
- `valueAsNumber`、`valueAsDate`、stepUp/stepDown；
- hidden/file/button 的信任与行为边界；
- 未知类型回退和渐进增强。

### 控件与分组

- `label`、`textarea`、`select`、`option`、`optgroup`；
- `button`、`fieldset`、`legend`；
- `datalist`、`output`、`progress`、`meter`；
- multiple、size、selectedOptions；
- 输入辅助属性与可见说明。

### 验证和文件

- required、长度、pattern、min/max/step；
- accept、multiple 和 File 对象检查；
- ValidityState、check/reportValidity；
- setCustomValidity 生命周期；
- invalid 事件、错误汇总和首个无效控件；
- 浏览器、业务和服务端校验分工。

完整落点见 [HTML 教学覆盖矩阵](HTML-COVERAGE.md) 的 FRM 组。

## 章级综合案例：商品发布预览

### 个人目录

```text
market-learning/
└── practice/
    └── html-chapter-05/
        ├── index.html
        └── form-check.md
```

`index.html` 可以直接打开。若练习 GET 地址栏变化，可复制到单独查询页；主发布案例必须拦截提交，避免把本地表单误发到未知目标。

### 字段要求

表单至少包含：

- 商品标题：普通文本、可见标签、长度与非空白业务规则；
- 商品描述：多行文本、长度说明和剩余量提示；
- 价格：整数分、最小值/最大值/步长；
- 分类：带空选项和 optgroup 的 select；
- 标签建议：允许自由输入的 datalist；
- 商品状态：明确机器值的 radio 组；
- 交接选项：同名 checkbox 多值；
- 图片：multiple file，只做本地名称、类型和大小检查；
- 版本：隐藏教学字段，并明确它不可信；
- 条款确认：必选 checkbox；
- 价格 output、自检 meter 和预览 progress。

### 行为要求

- `submit` 事件阻止网络导航；
- `event.submitter` 区分“预览”和“保存草稿”意图；
- FormData 使用 `getAll()` 保留同名多值；
- 业务校验每次都能清除过期 customError；
- 无效提交显示错误汇总并聚焦首个无效控件；
- 合法输入生成 Listing 预览，`priceCents` 保持安全整数；
- `createdAt` 预览值使用 UTC ISO，并说明真实时间应由服务端生成；
- reset 后读取的是重置完成后的值；
- 页面始终显示“本地预览，未保存到服务器”。

## 观察与证据

保存：

```text
提交按钮与 event.submitter：
FormData.entries()：
同名字段 getAll()：
URLSearchParams 结果：
disabled/readonly/unchecked 控件是否出现：
value 与 defaultValue：
checked 与 defaultChecked：
至少五个 ValidityState 成员：
customError 设置与清除：
首个无效控件焦点：
文件名/类型/大小检查：
服务端必须重复检查的项目：
```

不要把浏览器气泡截图当作完整证据。还要记录 DOM 状态、错误文字、焦点和修复后的同一路径。

## 章级故障演练

### 故障一：字段缺少 `name`

页面能输入标题，但 FormData 中没有它。检查 id/name 职责，添加字段名后复验。

### 故障二：禁用字段被遗漏

为了“防止修改”而禁用价格，结果提交数据缺少价格。根据需求选择正常可编辑、readonly 支持类型或单独可信数据来源；服务端仍不信任客户端值。

### 故障三：同名多选被对象转换丢失

用 `Object.fromEntries(new FormData(form))` 读取多个交接选项，只保留一个值。恢复为 `getAll()` 或明确的多值转换。

### 故障四：按钮默认提交

预览辅助按钮漏写 `type="button"`，意外触发提交。记录 submit 事件和 submitter，再修正按钮类型。

### 故障五：过期自定义错误

输入修正后仍无法提交。检查 `customError` 和 validationMessage，在每次重新验证时用空字符串清除。

### 故障六：只依赖 `accept`

修改文件选择器或构造请求后提交不符合类型的文件。说明 accept 只是选择提示；客户端检查 File，服务端重新检查大小、真实格式、恶意内容和权限。

### 故障七：直接给本地时间加 `Z`

把 `datetime-local` 字符串直接拼接 `Z`，造成时刻偏移。先确定业务时区，再转换为 UTC。

## 本章验收

### 提交模型

- [ ] 能预测每个 successful control 的名称和值；
- [ ] GET 不承担发布、删除或预约等状态改变；
- [ ] enctype 与文件上传需求匹配；
- [ ] 同名多值没有被静默覆盖；
- [ ] `requestSubmit()` 保留校验和 submit 事件；
- [ ] 不把 POST 当成加密或授权。

### 控件和值

- [ ] 22 种现行 input 类型都有可观察用途与边界；
- [ ] 标识符不误用 number；
- [ ] 当前值和默认值可以分别解释；
- [ ] 日期时间机器格式与可见本地格式不混淆；
- [ ] hidden、readonly、disabled 都不承担权限；
- [ ] 文件输入没有泄露路径或声称自动上传。

### 验证与恢复

- [ ] 原生约束和业务规则各有明确责任；
- [ ] ValidityState 能定位失败原因；
- [ ] 自定义错误在修正后被清除；
- [ ] 错误汇总与字段错误都可见；
- [ ] 键盘可以到达错误并继续完成；
- [ ] 客户端通过后仍等待服务端最终响应；
- [ ] 预览成功没有被描述成真实发布成功。

### 提交材料

```text
个人页面路径
successful controls 预测表
input 类型观察记录
FormData 与 URLSearchParams
错误汇总和焦点证据
文件检查边界
七次故障恢复
服务端验证清单
未验证浏览器/辅助技术
```

## 进入下一章前

如果你只会读取 `.value`，却不能预测 FormData、解释默认值、清除 customError 或描述服务端边界，应先重做对应练习。下一章会在可靠结构和表单基础上系统学习原生交互、DOM 与事件。

[上一章：表格与二维数据](04-tables-data.md) · [开始本章第一课](./05-forms-validation/01-form-action-method-encoding.md) · [下一章：原生交互、DOM 与事件](06-interactive-dom.md) · [返回 HTML 模块](README.md)
