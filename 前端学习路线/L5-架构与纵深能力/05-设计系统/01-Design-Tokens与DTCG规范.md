# 01-Design Tokens 与 DTCG 规范

<!-- course-meta:start -->
> **课程元数据**
> - 层级：L5 架构与纵深能力
> - 先修：[02-RUM 性能监控与埋点](../04-可观测性/02-RUM性能监控与埋点.md)
> - 建议用时：180-300 分钟
> - 技术基线：2026-10，详见[技术基线与来源](../../技术基线与来源.md)
> - 一手资料：[W3C Design Tokens](https://www.designtokens.org/)
> - 完成要求：运行示例、完成至少基础作业、提交验证记录
<!-- course-meta:end -->

## 学习目标

- 理解设计系统的三大分层（Tokens → Components → Patterns）及其协作关系
- 掌握 DTCG（Design Tokens Community Group）规范的核心理念与 Token 分类体系
- 能独立设计一套完整的 Design Token 体系（颜色、间距、字号、圆角、阴影、动效）
- 使用 Style Dictionary 将 Token 单源定义自动生成为 CSS 变量、SCSS 变量、JS 常量等多平台产物
- 理解 Figma ↔ 代码 Token 同步的工程化流程

---

## 内容讲解

### 一、设计系统的三大层次：从原子到页面

设计系统不是"一套组件库"，而是一个分层的可组合体系。每一层都建立在下一层之上：

```
Patterns（页面模式）      ← 登录页布局、筛选+列表页、表单校验流程
    ↑ 组合
Components（组件）        ← Button、Input、Modal、Card、Table
    ↑ 消费
Design Tokens（设计令牌）  ← 颜色值、间距值、字号、圆角、阴影
```

**Tokens 是地基**。如果颜色值以十六进制硬编码在每个组件里，想改主色调就得翻 200 个文件。Tokens 把设计决策"命名化"和"集中化"——改一个地方，全局生效。

Tokens 层的问题在团队扩张时被急剧放大：设计师用的是 Figma 里的色板，前端写的是 CSS 变量，iOS 写的是 Swift UIColor，Android 写的是 XML color。四个平台四套值，稍有不同步就会产出"同一个设计稿、四种视觉结果"的灾难。Token 的核心价值就是**单源真理（Single Source of Truth）**——从一个定义文件生成所有平台的产物。

```
Token 定义（JSON/YAML）──→ CSS 变量     → Web
                        ──→ SCSS 变量   → Web（兼容旧项目）
                        ──→ JS/TS 常量  → React / React Native
                        ──→ XML         → Android
                        ──→ Swift       → iOS
```

---

### 二、DTCG 规范简介

DTCG（Design Tokens Community Group）是 W3C 旗下的社区组，目标是**标准化 Token 文件格式**，让不同的 Token 工具和平台之间能互通。目前规范处于编辑草案阶段，但已有 Style Dictionary 4.x、Token Studio（Figma 插件）等主流工具落地。

DTCG 规范的核心概念：

```json
// 一个符合 DTCG 规范的 Token 定义
{
  "color": {
    "brand": {
      "primary": {
        "$value": "#4F46E5",       // Token 的实际值
        "$type": "color",          // Token 类型（必须声明）
        "$description": "品牌主色，用于主按钮、链接、激活态"  // 用途说明（可选但推荐）
      }
    }
  }
}
```

关键规则：
- `$value` 是 Token 的实际值，必须存在
- `$type` 声明 Token 的**类型**，决定输出格式（color 输出为 HEX/RGBA，dimension 输出为带单位的数值等）
- `$description` 是可选但强烈推荐的，它让非技术人员也能理解 Token 的用途
- 键名用点号分隔形成 Token 路径，如 `color.brand.primary`

这个格式解决了之前每个工具自己定一套 JSON 结构（Amazon 一种、Material 一种、Figma 一种）的碎片化问题。

---

### 三、Token 分类：三层架构

DTCG 没有强制三层分类，但业界最佳实践是分为三层：

#### 3.1 Global Tokens（原始值）

最底层的纯值，不含任何语义。它们是颜料，不是画。

```json
{
  "color": {
    "palette": {
      "indigo": {
        "100": { "$value": "#E0E7FF", "$type": "color" },
        "500": { "$value": "#6366F1", "$type": "color" },
        "900": { "$value": "#312E81", "$type": "color" }
      },
      "red": {
        "500": { "$value": "#EF4444", "$type": "color" }
      }
    }
  },
  "spacing": {
    "scale": {
      "1": { "$value": "4px", "$type": "dimension" },
      "2": { "$value": "8px", "$type": "dimension" },
      "4": { "$value": "16px", "$type": "dimension" },
      "8": { "$value": "32px", "$type": "dimension" }
    }
  }
}
```

Global Token 的特点：纯值、不含语义、与业务无关。它们像一个巨大的色板——有人会直接使用 `#6366F1`，但**没人应该直接引用 Global Token**。

#### 3.2 Alias Tokens（语义引用）

Alias Token **引用** Global Token，赋予其语义含义。这是最关键的一层——它把"靛蓝 500 号"翻译成了"品牌主色"。

```json
{
  "color": {
    "brand": {
      "primary": {
        "$value": "{color.palette.indigo.500}",  // 引用 Global Token
        "$type": "color",
        "$description": "品牌主色"
      },
      "primaryHover": {
        "$value": "{color.palette.indigo.900}",
        "$type": "color"
      }
    },
    "semantic": {
      "success": { "$value": "{color.palette.green.500}", "$type": "color" },
      "danger":  { "$value": "{color.palette.red.500}", "$type": "color" },
      "warning": { "$value": "{color.palette.amber.500}", "$type": "color" }
    }
  },
  "spacing": {
    "inline": {
      "tight":  { "$value": "{spacing.scale.1}", "$type": "dimension" },
      "normal": { "$value": "{spacing.scale.2}", "$type": "dimension" },
      "loose":  { "$value": "{spacing.scale.4}", "$type": "dimension" }
    }
  }
}
```

**为什么多这一层间接引用**：设计师说"品牌主色改成橙色"，你只需改 `color.palette.indigo.500` → `color.palette.orange.500`，所有引用 `color.brand.primary` 的地方自动更新。如果组件直接硬编码 `#6366F1`，这就是一次全项目的大扫除。

#### 3.3 Component Tokens（组件专用）

为特定组件定制的 Token，引用 Alias Token。例如 Button 组件的背景色在默认态、悬停态、禁用态各不同，但都通过语义引用上游：

```json
{
  "component": {
    "button": {
      "primary": {
        "background":     { "$value": "{color.brand.primary}", "$type": "color" },
        "backgroundHover": { "$value": "{color.brand.primaryHover}", "$type": "color" },
        "text":           { "$value": "{color.neutral.white}", "$type": "color" },
        "borderRadius":   { "$value": "{borderRadius.md}", "$type": "borderRadius" }
      },
      "danger": {
        "background":     { "$value": "{color.semantic.danger}", "$type": "color" },
        "text":           { "$value": "{color.neutral.white}", "$type": "color" }
      }
    },
    "input": {
      "border":         { "$value": "{color.neutral.gray.300}", "$type": "color" },
      "borderFocus":    { "$value": "{color.brand.primary}", "$type": "color" },
      "borderRadius":   { "$value": "{borderRadius.md}", "$type": "borderRadius" },
      "padding":        { "$value": "{spacing.inline.normal}", "$type": "dimension" }
    }
  }
}
```

**三种 Token 的引用方向是单向的**：Component → Alias → Global。永远不要让 Global Token 引用 Alias Token，这会形成循环依赖，也破坏了分层隔离的意义。

---

### 四、Token 八种核心类型

DTCG 规范定义了以下 Token 类型（`$type` 字段）：

| 类型 | 值示例 | 输出格式 |
|------|--------|----------|
| `color` | `#4F46E5`、`rgba(0,0,0,0.5)` | HEX/RGBA |
| `dimension` | `16px`、`1.5rem`、`100%` | 带单位的数值 |
| `fontFamily` | `'Inter', sans-serif` | 字符串 |
| `fontWeight` | `400`、`700` | 数值 |
| `fontSize` | `14px`、`1rem` | dimension |
| `lineHeight` | `1.5`、`24px` | 数值或 dimension |
| `letterSpacing` | `0.5px`、`-0.02em` | dimension |
| `borderRadius` | `4px`、`50%` | dimension |
| `cubicBezier` | `[0.4, 0, 0.2, 1]` | 贝塞尔曲线数组 |
| `duration` | `200ms`、`0.3s` | 时间 |
| `shadow` | 见下文 | 复合值 |
| `opacity` | `0.5` | 数值 |

**关键：`$type` 不是装饰**。Style Dictionary 等工具依据 `$type` 决定如何转换和输出 Token。例如 `dimension` 类型的 Token 可以在 Web 平台输出 `rem`，在 Android 输出 `dp`——同一个值，不同单位的转换逻辑由类型驱动。

---

### 五、实战：设计一套完整 Token 体系

下面是一套可直接用于生产项目的 Token 定义（DTCG 格式）。

#### 5.1 颜色体系

```
设计规则：
- 主色系（Primary）：品牌色 + 10 个梯度
- 中性色（Neutral）：灰度 + 10 个梯度
- 语义色：success / danger / warning / info
- 每个梯度命名采用 50/100/200...900/950 标准
```

#### 5.2 间距体系

```
设计规则：
- 基于 4px 基础网格（4px base grid）
- 命名用数字表示倍数：1 = 4px, 2 = 8px, ..., 16 = 64px
- 语义别名：tight = 间距-1, normal = 间距-2, loose = 间距-4
```

#### 5.3 字号与行高

```
设计规则：
- 使用 major third (1.25) 音阶比例：12/14/16/20/24/30/38/48
- 行高：正文 1.5，标题 1.2
```

完整定义文件 `tokens.json`：

```json
{
  "color": {
    "palette": {
      "brand": {
        "50":  { "$value": "#EEF2FF", "$type": "color", "$description": "品牌色 50 — 最浅背景" },
        "500": { "$value": "#6366F1", "$type": "color", "$description": "品牌色 500 — 主色" },
        "900": { "$value": "#312E81", "$type": "color", "$description": "品牌色 900 — 最深色" }
      },
      "neutral": {
        "0":   { "$value": "#FFFFFF", "$type": "color" },
        "50":  { "$value": "#FAFAFA", "$type": "color" },
        "300": { "$value": "#D4D4D8", "$type": "color" },
        "900": { "$value": "#18181B", "$type": "color" }
      },
      "red":    { "500": { "$value": "#EF4444", "$type": "color" } },
      "green":  { "500": { "$value": "#22C55E", "$type": "color" } },
      "amber":  { "500": { "$value": "#F59E0B", "$type": "color" } }
    },
    "semantic": {
      "text":           { "$value": "{color.palette.neutral.900}", "$type": "color" },
      "textSecondary":  { "$value": "{color.palette.neutral.300}", "$type": "color" },
      "bg":             { "$value": "{color.palette.neutral.0}", "$type": "color" },
      "bgSecondary":    { "$value": "{color.palette.neutral.50}", "$type": "color" },
      "brand":          { "$value": "{color.palette.brand.500}", "$type": "color" },
      "brandHover":     { "$value": "{color.palette.brand.900}", "$type": "color" },
      "success":        { "$value": "{color.palette.green.500}", "$type": "color" },
      "danger":         { "$value": "{color.palette.red.500}", "$type": "color" },
      "warning":        { "$value": "{color.palette.amber.500}", "$type": "color" }
    }
  },

  "fontSize": {
    "xs":   { "$value": "12px", "$type": "fontSize", "$description": "辅助文字、标签" },
    "sm":   { "$value": "14px", "$type": "fontSize", "$description": "正文小号、描述文字" },
    "base": { "$value": "16px", "$type": "fontSize", "$description": "正文默认" },
    "lg":   { "$value": "20px", "$type": "fontSize", "$description": "小标题" },
    "xl":   { "$value": "24px", "$type": "fontSize", "$description": "模块标题" },
    "2xl":  { "$value": "30px", "$type": "fontSize", "$description": "页面标题" },
    "3xl":  { "$value": "38px", "$type": "fontSize", "$description": "Hero 标题" }
  },

  "fontWeight": {
    "regular": { "$value": 400, "$type": "fontWeight" },
    "medium":  { "$value": 500, "$type": "fontWeight" },
    "bold":    { "$value": 700, "$type": "fontWeight" }
  },

  "lineHeight": {
    "tight":  { "$value": 1.2, "$type": "lineHeight", "$description": "标题" },
    "normal": { "$value": 1.5, "$type": "lineHeight", "$description": "正文" },
    "loose":  { "$value": 1.8, "$type": "lineHeight", "$description": "长文" }
  },

  "spacing": {
    "1":  { "$value": "4px",  "$type": "dimension" },
    "2":  { "$value": "8px",  "$type": "dimension" },
    "3":  { "$value": "12px", "$type": "dimension" },
    "4":  { "$value": "16px", "$type": "dimension" },
    "6":  { "$value": "24px", "$type": "dimension" },
    "8":  { "$value": "32px", "$type": "dimension" },
    "12": { "$value": "48px", "$type": "dimension" },
    "16": { "$value": "64px", "$type": "dimension" }
  },

  "borderRadius": {
    "none": { "$value": "0",     "$type": "borderRadius" },
    "sm":   { "$value": "4px",  "$type": "borderRadius", "$description": "小控件：Tag、Badge" },
    "md":   { "$value": "8px",  "$type": "borderRadius", "$description": "默认：Button、Input、Card" },
    "lg":   { "$value": "12px", "$type": "borderRadius", "$description": "大容器：Modal" },
    "full": { "$value": "9999px", "$type": "borderRadius", "$description": "全圆：Avatar、Pill" }
  },

  "shadow": {
    "sm": {
      "$value": "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
      "$type": "shadow",
      "$description": "轻微阴影 — Card hover"
    },
    "md": {
      "$value": "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
      "$type": "shadow",
      "$description": "中等阴影 — Dropdown、Modal"
    },
    "lg": {
      "$value": "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
      "$type": "shadow",
      "$description": "大阴影 — Modal 弹窗"
    }
  },

  "duration": {
    "fast":    { "$value": "150ms", "$type": "duration", "$description": "微交互：hover、focus" },
    "normal":  { "$value": "300ms", "$type": "duration", "$description": "过渡动画：展开、收起" },
    "slow":    { "$value": "500ms", "$type": "duration", "$description": "入场动画：Modal 弹出" }
  },

  "opacity": {
    "disabled": { "$value": 0.4, "$type": "opacity", "$description": "禁用态不透明度" }
  }
}
```

---

### 六、Style Dictionary：从 Token 定义到多平台产物

Style Dictionary 是 Amazon 开源的 Token 转换工具，能从一份 JSON 定义生成 CSS 变量、SCSS 变量、JS 常量等多种格式。

#### 6.1 安装和初始化

```bash
npm install -D style-dictionary
mkdir -p tokens config
```

#### 6.2 配置文件

```javascript
// config/style-dictionary.config.js
// Style Dictionary 的配置文件，定义"从哪读到 Token"和"输出什么格式"
const StyleDictionary = require('style-dictionary');

// 自定义转换器：把 dimension 类型的 px 值转换为 rem（1rem = 16px）
StyleDictionary.registerTransform({
  name: 'size/pxToRem',
  type: 'value',
  // matcher：只有 $type 为 dimension 的 Token 才走这个转换
  matcher: (token) => token.$type === 'dimension',
  transformer: (token) => {
    const pxValue = parseFloat(token.$value);
    // 16px 是默认浏览器根字号，可以根据项目调整
    return `${(pxValue / 16).toFixed(3)}rem`;
  },
});

// 自定义格式：生成 TypeScript 常量文件（可被 IDE 自动补全）
StyleDictionary.registerFormat({
  name: 'typescript/constants',
  formatter: ({ dictionary }) => {
    // dictionary.allProperties 包含展平后的全部 Token
    const lines = dictionary.allProperties.map(
      (prop) => `export const ${prop.name} = '${prop.value}';`
    );
    return [
      '// 本文件由 Style Dictionary 自动生成，请勿手动编辑',
      '// 生成命令：npm run build:tokens',
      '',
      ...lines,
    ].join('\n');
  },
});

module.exports = {
  source: ['tokens/**/*.json'], // Token 源文件（支持 glob 模式拆分多个文件）

  platforms: {
    // 平台 1：CSS 自定义属性（CSS 变量）
    css: {
      transformGroup: 'css',
      // 追加自定义 px → rem 转换
      transforms: [
        'attribute/cti',  // category/type/item → CSS 变量命名
        'name/cti/kebab', // 转换为 kebab-case 命名（如 color-bg-primary）
        'size/pxToRem',   // 自定义：px → rem
        'color/css',      // 颜色值转换为标准 CSS 格式
      ],
      buildPath: 'dist/css/',
      files: [
        {
          destination: 'variables.css',
          format: 'css/variables', // 输出 :root { --color-bg-primary: #FFF; }
        },
      ],
    },

    // 平台 2：SCSS 变量（兼容老项目或 Sass 工具链）
    scss: {
      transformGroup: 'scss',
      buildPath: 'dist/scss/',
      files: [
        {
          destination: '_variables.scss',
          format: 'scss/variables', // 输出 $color-bg-primary: #FFF;
        },
      ],
    },

    // 平台 3：TypeScript 常量
    ts: {
      transformGroup: 'js',
      buildPath: 'dist/ts/',
      files: [
        {
          destination: 'tokens.ts',
          format: 'typescript/constants', // 使用上面注册的自定义格式
        },
      ],
    },

    // 平台 4：JSON（可被 Figma 插件消费，用于同步）
    json: {
      transformGroup: 'js',
      buildPath: 'dist/json/',
      files: [
        {
          destination: 'tokens.json',
          format: 'json/flat', // 展平的 JSON：{ "color-bg-primary": "#FFF" }
        },
      ],
    },
  },
};
```

#### 6.3 执行构建

```bash
# 在 package.json 中添加脚本
# "build:tokens": "style-dictionary build --config config/style-dictionary.config.js"

npm run build:tokens
```

构建产物展示（`dist/css/variables.css`）：

```css
/**
 * 本文件由 Style Dictionary 自动生成，请勿手动编辑
 * 生成命令：npm run build:tokens
 */
:root {
  --color-palette-brand-50: #EEF2FF;
  --color-palette-brand-500: #6366F1;
  --color-palette-brand-900: #312E81;
  --color-semantic-text: #18181B;
  --color-semantic-brand: #6366F1;
  --color-semantic-danger: #EF4444;
  --font-size-base: 1rem;
  --font-size-xl: 1.5rem;
  --spacing-1: 0.25rem;
  --spacing-4: 1rem;
  --spacing-8: 2rem;
  --border-radius-md: 0.5rem;
  --shadow-md: 0 0.25rem 0.375rem -0.0625rem rgba(0, 0, 0, 0.1);
  --duration-normal: 300ms;
}
```

**在 CSS 中使用**：

```css
/* ✅ 正确：引用 Token */
.btn-primary {
  background: var(--color-semantic-brand);
  padding: var(--spacing-2) var(--spacing-4);
  border-radius: var(--border-radius-md);
}

/* ❌ 错误：硬编码值 —— 换主题时这里就脱节了 */
.btn-primary {
  background: #6366F1;
  padding: 8px 16px;
  border-radius: 8px;
}
```

---

### 七、Tailwind CSS 的 Token 化配置

如果你使用 Tailwind CSS，其 `tailwind.config.js` 本质就是一套 Design Token 配置。关键在于**不要从 `tokens.json` 复制粘贴一份到 Tailwind 配置**——这会导致双源问题。正确做法是让 Tailwind 直接引用 Token 产物或共享源。

```javascript
// tailwind.config.js —— 让 Tailwind 使用同一套 Token
// 方法：直接引入由 Style Dictionary 生成的 JS 常量
const tokens = require('./dist/js/tokens');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // 将 Token 常量映射到 Tailwind 的颜色类名系统
        brand: {
          50:  tokens.ColorPaletteBrand50,   // #EEF2FF
          500: tokens.ColorPaletteBrand500,  // #6366F1
          900: tokens.ColorPaletteBrand900,  // #312E81
        },
        semantic: {
          danger:  tokens.ColorSemanticDanger,  // #EF4444
          success: tokens.ColorSemanticSuccess, // #22C55E
        },
      },
      fontSize: {
        xs:   tokens.FontSizeXs,
        base: tokens.FontSizeBase,
        xl:   tokens.FontSizeXl,
      },
      borderRadius: {
        md: tokens.BorderRadiusMd,
        lg: tokens.BorderRadiusLg,
      },
      spacing: {
        // Tailwind 的 spacing scale 影响 padding/margin/width/height 等所有尺寸工具类
        // 把 Token 间距注入 Tailwind 的默认 spacing scale
        1:  tokens.Spacing1,
        4:  tokens.Spacing4,
        8:  tokens.Spacing8,
      },
      boxShadow: {
        md: tokens.ShadowMd,
        lg: tokens.ShadowLg,
      },
    },
  },
  plugins: [],
};
```

这样你就能在 JSX 中写 `className="bg-brand-500 text-white rounded-md shadow-md"`，而 Tailwind 实际使用的是你统一管理的 Token 值。改一处 Token 定义，Tailwind 生成的所有工具类同步更新。

---

### 八、Figma ↔ 代码 Token 同步流程

Token 的终极目标是让**设计工具和生产代码使用同一套值**。核心思路是：Figma 用 Token Studio 插件管理 Token → 导出为 DTCG 格式的 JSON → 这个 JSON 就是 Style Dictionary 的源文件。

```
Figma 设计稿
  ↕ Token Studio 插件（管理 Token）
  ↕ 导出 DTCG JSON
Style Dictionary（tokens.json）
  ↓ 构建
CSS 变量 / SCSS / JS / TS
  ↓ 引用
组件代码
```

**工作流**：

1. 设计师在 Figma 中安装 Token Studio 插件，用可视化界面管理 Token
2. 设计师修改 Token 后，从 Token Studio 导出 `tokens.json`（DTCG 格式）
3. 将 `tokens.json` 提交到 Git 仓库（放在 `tokens/` 目录下）
4. CI 构建时运行 `style-dictionary build`，重新生成所有平台的产物
5. CI 检查产物是否有变化的 diff——如果有，说明 Token 发生了变化，自动触发视觉回归测试

**反向同步（代码 → Figma）**：

如果开发者需要新增 Token（比如新组件需要的 Component Token），流程反过来：在 Git 的 `tokens.json` 中新增 → 提 PR → 设计师 Review → Token Studio 导入回 Figma。谁是源不重要，保持**单向流动**才重要——不要让两端互相覆盖。

---

### 九、实战：用 Style Dictionary 搭建一套 Token 系统

#### 项目结构

```
my-token-system/
├── tokens/
│   └── tokens.json              # 单源 Token 定义（DTCG 格式）
├── config/
│   └── style-dictionary.config.js  # 构建配置
├── dist/
│   ├── css/variables.css        # CSS 自定义属性
│   ├── scss/_variables.scss     # SCSS 变量
│   └── ts/tokens.ts            # TypeScript 常量
├── src/
│   └── button.css               # 使用 Token 的组件样式
├── package.json
└── tailwind.config.js           # 使用 Token 的 Tailwind 配置
```

#### 步骤总览

```bash
# 1. 初始化项目
npm init -y
npm install -D style-dictionary

# 2. 创建 tokens.json（使用第五节的定义）
mkdir tokens && touch tokens/tokens.json

# 3. 创建 Style Dictionary 配置
mkdir config && touch config/style-dictionary.config.js

# 4. 执行构建
npx style-dictionary build --config config/style-dictionary.config.js

# 5. 检查产物
ls dist/css/ dist/scss/ dist/ts/

# 6. 在 CSS 中引用 Token
# 在 HTML 的 <link> 中引入 dist/css/variables.css
# 在组件 CSS 中使用 var(--xxx)

# 7. （可选）集成 Tailwind CSS
# npm install -D tailwindcss
# 按第七节配置 tailwind.config.js
```

---

## 常见问题

**Q1：Global Token 和 Alias Token 看起来只是多了一层引用，真的有必要吗？**

有必要。Global Token 是"调色板"，Alias Token 是"语义"。当你说"把主要按钮颜色改成红色"，你改的是 `color.semantic.brand` 指向的底层色值，而不需要去 200 个组件文件里一个个改。多一层间接引用的成本是一个文件多几行 JSON，收益是全局变更只需改一行。

**Q2：Token 命名用 kebab-case 还是 camelCase？**

DTCG 规范推荐 JSON 键用 camelCase，构建输出时由工具转换为平台约定。CSS 变量输出 kebab-case（`--color-brand-primary`），SCSS 变量用 kebab-case（`$color-brand-primary`），JS 常量用 PascalCase 或 camelCase。不要手动管理命名约定——这正是 Style Dictionary 的 `name/cti/kebab` 转换器做的事。

**Q3：设计师不改 Token，直接在 Figma 里调颜色怎么同步？**

这是组织流程问题，不是技术问题。需要建立约定：组件库中的所有样式值必须从 Token 引用，不允许 detach（分离）。Token Studio 插件可以在 Figma 中锁定 Token 绑定的图层，阻止设计师直接改色值。如果设计师"非要用这个特殊的蓝色"，那是 Token 体系不够灵活的信号——可能需要新增一个 Token 而非绕过系统。

**Q4：Style Dictionary 和 Design Token 的对比？还有哪些替代方案？**

Style Dictionary 是最成熟的方案（Amazon 出品、社区活跃、v4 已支持原生 DTCG）。其他选择：Theo（Salesforce 出品，更老但更简洁）、Diez（Haiku 出品，支持原生代码生成，但已不再活跃维护）、Cobalt（新工具，专注 DTCG 规范）。大多数团队选 Style Dictionary 即可。

**Q5：Tailwind 已经有了 `theme` 配置，还需要单独维护 Tokens 吗？**

如果你的团队只有 Web 端，把 Tailwind 的 `theme` 当作 Token 单源是可以的。但如果有 iOS/Android 端，建议从 `tokens.json` 单源生成 Tailwind 配置和其他平台产物，而不是反过来。

**Q6：Token 文件要不要提交到 Git？源文件和产物分别怎么处理？**

源文件（`tokens/*.json`）必须提交到 Git——它是单源真理。构建产物（`dist/`）建议也提交，原因：(1) 没有构建环境的消费者（如设计师）可以直接引用产物；(2) 产物 diff 是发现 Token 变更的最直观方式。如果你觉得产物文件太多，至少提交 CSS 变量文件。

**Q7：如何处理暗色模式（Dark Mode）？**

在 Token 中为每个语义 Token 定义亮色和暗色两套值，通过 CSS 媒体查询或 `[data-theme]` 属性切换：

```css
:root {
  --color-semantic-bg: #FFFFFF;      /* 亮色 */
  --color-semantic-text: #18181B;
}
[data-theme="dark"] {
  --color-semantic-bg: #18181B;      /* 暗色 */
  --color-semantic-text: #FAFAFA;
}
```

Style Dictionary 可以在一个配置中同时输出两套主题的 CSS 变量。

**Q8：Token 粒度多细合适？**

经验法则：如果一个值在 3 个以上组件中重复出现，就应该抽象成一个 Token。但如果只有 1 个组件在用，先保持硬编码，等第二个使用时再抽——YAGNI（You Aren't Gonna Need It）。

---

## 实操作业

### 基础练习：完成一套 Token 体系的定义和构建

1. 按照第五节的格式，在项目中创建完整的 `tokens.json`（至少包含颜色、间距、字号、圆角、阴影五类 Token）
2. 按照第六节的配置搭建 Style Dictionary
3. 执行 `style-dictionary build`，确认 `dist/` 目录下生成了 CSS、SCSS、TS 三种产物
4. 写一个简单的 HTML 页面，使用生成的 CSS 变量，验证 Token 生效

### 进阶练习：集成 Tailwind CSS + Token，实现暗色模式

1. 在 Tailwind 项目中配置第七节的 Token 映射
2. 扩展 `tokens.json`，为关键语义 Token 添加暗色模式值
3. 配置 Style Dictionary 输出两套 CSS 变量（`:root` 和 `[data-theme="dark"]`）
4. 实现主题切换按钮：点击后在亮色/暗色之间切换，所有使用 Token 的组件自动跟随

### 挑战练习：建立 Figma ↔ 代码 Token 同步流水线

1. 在 Figma 中安装 Token Studio 插件，创建一套完整的 Token（或导入你定义的 `tokens.json`）
2. 从 Token Studio 导出 DTCG 格式的 JSON，验证它能直接作为 Style Dictionary 的源文件
3. 编写 GitHub Action：当 `tokens/*.json` 发生变更时，自动运行 `style-dictionary build`，并在 PR 中评论产物 diff
4. 扩展产物输出，增加 Android（XML）和 iOS（Swift）格式的 Token 文件

---

<!-- atlas-task:start -->
## Atlas 项目任务

- 项目起点：[Atlas 贯穿项目](../../projects/atlas/README.md)
- 阶段目标：[L5 里程碑](../../projects/atlas/milestones/L5.md)
- 本课任务：按 L5 里程碑在 Atlas 中建立“Design Tokens 与 DTCG 规范”的可量化基线、改进方案、前后证据和长期治理规则。
- 起始验证：在 `前端学习路线` 目录运行 `npm run atlas:test`。
- 自动检查：为本课新增或修改的行为补充测试；无法自动化的浏览器行为必须保留截图、Network、Performance 或无障碍树证据。

### 项目验收

- [ ] 正常路径可以从统一入口复现
- [ ] 空值、错误或权限边界至少覆盖一项
- [ ] 相关自动测试通过，且没有删除既有断言
- [ ] 记录一个“现象—原因—验证—结论”
<!-- atlas-task:end -->

---

## 本节小结

Design Tokens 不是"把颜色常量放到 JSON 里"这么简单。它的核心价值在于三点：

1. **单源真理**：一套值，多端消费。改一个文件，所有平台同步
2. **分层语义**：Global → Alias → Component 三层，从"颜料"到"用途"到"组件专用"逐级收敛。设计师只需关心语义层，开发者只需关心组件层
3. **自动化**：通过 Style Dictionary 将 Token 定义自动转换为各平台产物，消除手工翻译的错误和不一致

从架构视角看，Token 体系是设计系统的地基。地基不稳，之上建的组件库和页面模式就会不断出现"这里颜色怎么和设计稿不一样"的问题。先花半天建好 Token 体系，后面组件库的开发效率会成倍提升。

<!-- course-nav:start -->
---

[上一篇：02-RUM 性能监控与埋点](../04-可观测性/02-RUM性能监控与埋点.md) · [课程地图](../../README.md) · [下一篇：02-组件库搭建与 Storybook](./02-组件库搭建与Storybook.md)
<!-- course-nav:end -->
