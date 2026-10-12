# 02-组件库搭建与 Storybook

## 学习目标

- 掌握组件库设计的四项核心原则：一致 API、可组合、可访问、可主题化
- 能使用 Vite library mode 搭建支持 ESM + CJS 双输出的组件库工程
- 理解组件 Props 设计原则：最小化、类型安全、合理默认值、组合优于配置
- 掌握 Storybook 8.x 的安装、Story 编写、交互测试和自动文档生成
- 使用 Changesets 管理组件库的语义化版本和 CHANGELOG
- 能从零搭建一个包含 5+ 组件的小型组件库并输出完整文档

---

## 内容讲解

### 一、组件库的设计原则

在开始写代码之前，先明确组件库的四条核心原则。它们不是教条，而是减少你日后返工的经验浓缩。

#### 1.1 一致 API（Consistent API）

组件库中所有组件的使用方式应该遵循相同的模式。用户学会 Button 就自然会用 Input：

```tsx
// ✅ 一致：所有组件共享相同的模式
<Button variant="primary" size="md" disabled>
  提交
</Button>
<Input variant="outline" size="md" disabled placeholder="请输入" />
<Select variant="outline" size="md" disabled options={items} />

// ❌ 不一致：每个组件一套命名，用户每次都要查文档
<Button type="primary" dimension="medium" isDisabled />
<Input appearance="bordered" height="medium" disabled />
```

一致性体现在：
- **命名一致**：`variant` 而不是 `type`/`appearance`/`style` 混用
- **值域一致**：`size` 的统一枚举 `'sm' | 'md' | 'lg'`
- **行为一致**：`onChange` 在所有表单组件中触发时机相同、参数签名相同

#### 1.2 可组合（Composable）

组件应该像乐高积木，通过组合而不是 `props` 堆砌来实现复杂 UI：

```tsx
// ❌ 不可组合：用 50 个 props 控制一切
<Card
  title="用户信息"
  subtitle="基本信息"
  image="avatar.jpg"
  footerText="查看详情"
  footerLink="/user/123"
  onFooterClick={handler}
  showDivider
  // ... 还有 43 个 props
/>

// ✅ 可组合：用复合组件模式，各子组件独立控制
<Card>
  <Card.Image src="avatar.jpg" alt="用户头像" />
  <Card.Header>
    <Card.Title>用户信息</Card.Title>
    <Card.Subtitle>基本信息</Card.Subtitle>
  </Card.Header>
  <Card.Body>
    <p>这里是卡片内容，完全自由控制</p>
  </Card.Body>
  <Card.Divider />
  <Card.Footer>
    <Button variant="link" onClick={handler}>查看详情</Button>
  </Card.Footer>
</Card>
```

复合组件的本质是**把渲染控制权还给使用者**，而不是把一切封装在组件内部。

#### 1.3 可访问（Accessible）

你的组件库可能被用于银行、政府或企业内部系统——这些场景下 WCAG 无障碍标准不是可选项。核心要求：

- 所有交互元素可通过键盘操作（Tab / Enter / Escape / 方向键）
- 屏幕阅读器能正确朗读（ARIA 属性、语义化 HTML）
- 足够的颜色对比度（正文 4.5:1，大文字 3:1）
- Focus 态可见且合理（不要偷偷 `outline: none`）

```tsx
// ❌ 不可访问：div 冒充 button，键盘无法聚焦
<div onClick={handler} className="btn">点击</div>

// ✅ 可访问：原生 button + 语义化 + ARIA
<button
  onClick={handler}
  disabled={isLoading}
  aria-busy={isLoading}
  aria-label={isLoading ? '正在提交' : '提交表单'}
>
  {isLoading ? <Spinner /> : '提交'}
</button>
```

#### 1.4 可主题化（Themeable）

组件本身不写死颜色和尺寸，而是消费 Design Token（见前一讲）。实现方式：

```tsx
// 组件不直接写 color: #6366F1，而是引用 CSS 变量
// Button.css
.btn-primary {
  background: var(--color-semantic-brand);       // ← Token，不是硬编码
  color: var(--color-semantic-text-inverse);
  padding: var(--spacing-2) var(--spacing-4);
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-sm);
}
```

这样换主题只需要换一套 CSS 变量值，所有组件自动跟随。

---

### 二、组件库的工程化搭建

#### 2.1 Vite library mode 配置

Vite 的 library mode 是搭建组件库工程的首选方案——零配置起步、HMR 极快、天然支持 TypeScript。

```bash
# 使用 Vite 模板初始化
npm create vite@latest my-ui -- --template react-ts
cd my-ui
npm install
```

```typescript
// vite.config.ts —— 组件库模式的核心配置
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';         // 自动生成 .d.ts 类型声明文件

export default defineConfig({
  plugins: [
    react(),
    // dts 插件：从 TypeScript 源码生成类型声明文件（.d.ts）
    // 这是组件库必需的能力——让使用者获得 IDE 自动补全
    dts({
      insertTypesEntry: true,                // 在 package.json 自动插入 types 字段
      include: ['src/lib'],                  // 只处理 lib 目录下的组件源码
      outDir: 'dist/types',                  // 类型声明输出目录
    }),
  ],
  build: {
    // lib 模式配置
    lib: {
      // 入口文件：组件库的 Barrel Export
      entry: resolve(__dirname, 'src/lib/index.ts'),
      // UMD 全局变量名（通过 <script> 标签引入时使用）
      name: 'MyUI',
      // 输出格式：ES Module 供现代打包器使用，CJS 兼容旧工具链
      formats: ['es', 'cjs'],
      // 各格式输出文件的命名规则：[format] 会被替换为 'es' 或 'cjs'
      fileName: (format) => `my-ui.${format}.js`,
    },
    rollupOptions: {
      // 关键：将 React 和 ReactDOM 声明为 external（不打进组件库）
      // 否则使用者项目中会有两份 React 实例，导致 hooks 报错
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      output: {
        // 为 external 依赖指定全局变量名（UMD 格式需要）
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'jsxRuntime',
        },
      },
    },
    // 输出目录
    outDir: 'dist',
  },
});
```

#### 2.2 package.json 入口配置

```json
{
  "name": "my-ui",
  "version": "0.0.1",
  "type": "module",
  // 多入口：不同环境使用不同的产物
  "main": "./dist/my-ui.cjs.js",      // CJS 入口（Node.js require()）
  "module": "./dist/my-ui.es.js",     // ESM 入口（打包器 import）
  "types": "./dist/types/index.d.ts", // TypeScript 类型声明入口
  // exports 字段：精确控制各路径的解析（Node.js 12.7+ 支持的现代方案）
  "exports": {
    ".": {
      "types": "./dist/types/index.d.ts",
      "import": "./dist/my-ui.es.js",
      "require": "./dist/my-ui.cjs.js"
    },
    // 支持按需导入样式
    "./styles.css": "./dist/styles.css"
  },
  "files": ["dist"],
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  }
}
```

#### 2.3 组件库的目录结构

```
my-ui/
├── src/
│   ├── lib/                  # 组件库源码（打包入口在这里）
│   │   ├── index.ts          # Barrel Export：统一导出所有组件
│   │   ├── Button/
│   │   │   ├── Button.tsx     # 组件实现
│   │   │   ├── Button.css    # 组件样式
│   │   │   ├── Button.stories.tsx  # Storybook 用例
│   │   │   └── index.ts      # 重新导出（缩短导入路径）
│   │   ├── Input/
│   │   ├── Select/
│   │   ├── Modal/
│   │   └── Card/
│   ├── App.tsx               # 本地开发预览页（不打包进库）
│   └── main.tsx
├── index.html                # 开发预览的 HTML
├── vite.config.ts
├── package.json
├── tsconfig.json
└── .storybook/               # Storybook 配置
```

---

### 三、组件的 Props 设计原则

#### 3.1 最小化：只暴露必要的

每个 Props 都是有成本的——你维护它、写文档、保证向后兼容。只暴露真正需要外部控制的：

```typescript
// ❌ Props 过多：使用了 flag 几乎永远不会被外部改变
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'danger';
  size: 'sm' | 'md' | 'lg';
  loading: boolean;
  disabled: boolean;
  fullWidth: boolean;
  // 这三个是内部实现细节，不该暴露
  hoverBgColor: string;     // ❌ 使用者不需要感知 hover 背景色
  activeScale: number;       // ❌ 内部动画参数
  rippleEffect: boolean;     // ❌ 没有第二个值的选择
}

// ✅ Props 最小化：只暴露有真实选择场景的
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'danger';
  size: 'sm' | 'md' | 'lg';
  loading?: boolean;          // 异步操作时展示 loading 态
  disabled?: boolean;
  fullWidth?: boolean;
}
```

#### 3.2 类型安全

用 TypeScript 的判别联合类型防止非法状态组合：

```typescript
// ❌ 类型不严格：variant 为 'link' 时 size 不应该存在（链接按钮通常不限尺寸）
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'link';
  size?: 'sm' | 'md' | 'lg';     // link 下 size 无意义但 TS 不会报错
  href?: string;                   // 非 link 变体不需要 href
}

// ✅ 判别联合类型：每种 variant 有自己合法的 props 子集
type ButtonProps =
  | {
      variant: 'primary' | 'secondary';
      size?: 'sm' | 'md' | 'lg';
      loading?: boolean;
    }
  | {
      variant: 'link';
      href: string;               // link 必须提供 href
      // size 不存在——TS 会阻止使用
    };
```

#### 3.3 合理默认值

默认值应该覆盖 80% 的使用场景，让最常见用法零配置：

```tsx
// Button 组件 —— 大部分场景只需要 variant + children
<Button variant="primary">提交</Button>
//          ↑        ↑
//      variant 有默认值    children 必须传

// 实现中的默认值设置
function Button({
  variant = 'primary',       // 默认主按钮（最常用）
  size = 'md',               // 默认中等尺寸（最常用）
  loading = false,           // 默认非 loading（最常用）
  disabled = false,          // 默认不禁用（最常用）
  fullWidth = false,         // 默认不是全宽（最常用）
  children,
}: ButtonProps) { /* ... */ }
```

"80% 场景零配置，剩余 20% 场景可配置"——这是好的 API 设计的标准。

#### 3.4 组合优于配置

如果组件有三个以上互斥的行为分支，考虑拆成子组件而不是用 Props 分支：

```tsx
// ❌ 配置驱动：Card 的 Props 不断膨胀
<Card layout="horizontal" imagePosition="left" showFooter showDivider
      titleSize="lg" imageAspectRatio="16/9" />

// ✅ 组合驱动：使用者自己排列
<Card>
  <Card.Image src="..." aspectRatio="16/9" />
  <Card.Body>
    <Card.Title size="lg">标题</Card.Title>
    <Card.Description>描述</Card.Description>
  </Card.Body>
  <Card.Divider />
  <Card.Footer>底部操作</Card.Footer>
</Card>
```

---

### 四、Storybook 的安装和配置

#### 4.1 安装

```bash
# 在组件库项目中安装 Storybook 8.x
npx storybook@latest init

# 这个命令会：
# 1. 检测你的项目框架（检测到 Vite + React）
# 2. 安装 @storybook/react-vite 及相关依赖
# 3. 创建 .storybook/ 配置目录
# 4. 创建 src/stories/ 示例用例
# 5. 在 package.json 添加 storybook 和 build-storybook 脚本
```

#### 4.2 核心配置文件

```typescript
// .storybook/main.ts —— Storybook 主配置
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  // stories 路径：Storybook 会扫描匹配的文件作为用例
  stories: ['../src/lib/**/*.stories.@(ts|tsx)'],
  
  // addons：扩展开启的能力
  addons: [
    '@storybook/addon-essentials',    // 核心插件包（含 controls、actions、docs、viewport 等）
    '@storybook/addon-interactions',  // 交互测试（play function）
    '@storybook/addon-a11y',          // 无障碍检查
    '@storybook/addon-themes',        // 主题切换
  ],
  
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  
  docs: {
    // autodocs：自动为每个组件生成文档页面
    autodocs: 'tag',  // 只有标记了 tags: ['autodocs'] 的 Story 才会生成文档页
  },
};

export default config;
```

```typescript
// .storybook/preview.ts —— 全局配置（装饰器、参数、全局样式）
import type { Preview } from '@storybook/react';
import '../src/lib/styles/global.css';  // 导入 Token 生成的 CSS 变量

const preview: Preview = {
  // 全局参数：所有 Story 共享的默认配置
  parameters: {
    // controls 配置
    controls: {
      matchers: {
        color: /(background|color)$/i,   // 匹配 background/color 结尾的 prop → 显示颜色选择器
        date: /Date$/i,                  // 匹配 Date 结尾 → 显示日期选择器
      },
    },
    // 背景色切换
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#FFFFFF' },
        { name: 'dark', value: '#18181B' },
      ],
    },
    // 视口适配
    viewport: {
      viewports: {
        mobile: { name: 'Mobile', styles: { width: '375px', height: '667px' } },
        tablet: { name: 'Tablet', styles: { width: '768px', height: '1024px' } },
        desktop: { name: 'Desktop', styles: { width: '1280px', height: '800px' } },
      },
    },
  },

  // 全局装饰器：包裹每一个 Story
  decorators: [
    (Story) => (
      <div style={{ padding: '24px', fontFamily: 'Inter, sans-serif' }}>
        <Story />
      </div>
    ),
  ],
};

export default preview;
```

#### 4.3 启动

```bash
npm run storybook          # 启动开发服务器（默认 http://localhost:6006）
npm run build-storybook    # 构建为静态站点（可用于部署文档站）
```

---

### 五、编写 Story

#### 5.1 基础 Story

```tsx
// src/lib/Button/Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

/**
 * Story 的元数据定义
 * Meta<typeof Button> 确保类型安全——Button 的 Props 就是 args 的类型
 */
const meta: Meta<typeof Button> = {
  title: 'Components/Button',         // 左侧导航中的分组路径
  component: Button,                  // 关联的组件
  // tags: ['autodocs'] 会为这个组件自动生成文档页面
  tags: ['autodocs'],
  // argTypes：控制 Controls 面板中各参数的表单类型和描述
  argTypes: {
    variant: {
      control: 'select',                       // 下拉选择器
      options: ['primary', 'secondary', 'danger', 'link'],
      description: '按钮的视觉风格变体',
    },
    size: {
      control: 'radio',                        // 单选按钮组
      options: ['sm', 'md', 'lg'],
      description: '按钮尺寸',
    },
    disabled: {
      control: 'boolean',                      // 布尔开关
      description: '是否禁用（不可点击、视觉灰掉）',
    },
    loading: {
      control: 'boolean',
      description: '是否显示加载态（替换文字为旋转图标）',
    },
    children: {
      control: 'text',                         // 文本输入框
      description: '按钮内容（文字或图标）',
    },
    onClick: {
      // action：点击时在 Actions 面板中记录事件
      action: 'clicked',
      description: '点击回调函数',
    },
  },
  // args：所有 Story 的默认值（可被各 Story 覆盖）
  args: {
    variant: 'primary',
    size: 'md',
    disabled: false,
    loading: false,
    children: '按钮',
  },
};

export default meta;
// StoryObj 类型从 meta 派生，保证 args 类型正确
type Story = StoryObj<typeof meta>;

// ===== 各变体的 Story =====

// Primary：默认主按钮（使用 meta.args 的默认值）
export const Primary: Story = {};

// Secondary：次要按钮（覆盖 variant）
export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: '取消',
  },
};

// Danger：危险按钮
export const Danger: Story = {
  args: {
    variant: 'danger',
    children: '删除',
  },
};

// Link：链接按钮
export const Link: Story = {
  args: {
    variant: 'link',
    children: '查看详情',
  },
};

// Small：小尺寸按钮
export const Small: Story = {
  args: {
    size: 'sm',
    children: '小按钮',
  },
};

// Large：大尺寸按钮
export const Large: Story = {
  args: {
    size: 'lg',
    children: '大按钮',
  },
};

// Loading：加载态
export const Loading: Story = {
  args: {
    loading: true,
    children: '提交中...',
  },
};

// Disabled：禁用态
export const Disabled: Story = {
  args: {
    disabled: true,
    children: '已禁用',
  },
};

// FullWidth：全宽按钮
export const FullWidth: Story = {
  args: {
    fullWidth: true,
    children: '全宽按钮',
  },
  // 使用 decorator 限制展示宽度，体现 fullWidth 效果
  decorators: [
    (Story) => (
      <div style={{ width: '400px', border: '1px dashed #ccc', padding: '16px' }}>
        <Story />
      </div>
    ),
  ],
};
```

#### 5.2 复合组件的 Story（Card 示例）

```tsx
// src/lib/Card/Card.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Card } from './Card';
import { Button } from '../Button';

const meta: Meta<typeof Card> = {
  title: 'Components/Card',
  component: Card,
  tags: ['autodocs'],
  // subcomponents：声明复合组件的子组件，Storybook 会在文档中列出
  subcomponents: {
    'Card.Image': Card.Image,
    'Card.Header': Card.Header,
    'Card.Title': Card.Title,
    'Card.Body': Card.Body,
    'Card.Footer': Card.Footer,
    'Card.Divider': Card.Divider,
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// 基础卡片：展示复合组件的组合方式
export const Default: Story = {
  render: () => (
    <Card style={{ maxWidth: '360px' }}>
      <Card.Image src="https://placehold.co/360x200" alt="示例图片" />
      <Card.Header>
        <Card.Title>组件库设计指南</Card.Title>
        <Card.Subtitle>从零搭建企业级组件库</Card.Subtitle>
      </Card.Header>
      <Card.Body>
        本文介绍如何使用 Vite + React + Storybook 搭建一套企业级组件库……
      </Card.Body>
      <Card.Divider />
      <Card.Footer>
        <Button variant="primary" size="sm">阅读全文</Button>
        <Button variant="secondary" size="sm">收藏</Button>
      </Card.Footer>
    </Card>
  ),
};

// 仅标题的简洁卡片
export const Compact: Story = {
  render: () => (
    <Card style={{ maxWidth: '360px' }}>
      <Card.Body>
        <Card.Title>极简卡片</Card.Title>
        <p>不需要图片、不需要 Footer，最简形式。</p>
      </Card.Body>
    </Card>
  ),
};
```

---

### 六、Storybook 的交互测试

`play` function 是 Storybook 8 最强大的特性之一——它在 Story 渲染后自动执行一段测试脚本，模拟用户操作并断言结果。

```bash
npm install -D @storybook/test @storybook/jest
```

```tsx
// src/lib/Modal/Modal.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect, waitFor } from '@storybook/test';
import { Modal } from './Modal';

const meta: Meta<typeof Modal> = {
  title: 'Components/Modal',
  component: Modal,
  tags: ['autodocs'],
  argTypes: {
    open: { control: 'boolean' },
    title: { control: 'text' },
    onClose: { action: 'closed' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 交互测试：打开 Modal → 验证内容可见 → 按 Escape 关闭
 */
export const CloseWithEscape: Story = {
  args: {
    open: true,
    title: '确认删除',
    children: '确定要删除这条记录吗？此操作不可撤销。',
  },
  play: async ({ canvasElement, step }) => {
    // canvasElement 是当前 Story 的渲染根节点
    const canvas = within(canvasElement);

    // step 1：验证 Modal 已打开
    await step('Modal 正确渲染', async () => {
      // findByText 是异步的，会等待元素出现（React 渲染是异步的）
      await expect(canvas.getByText('确认删除')).toBeVisible();
      await expect(
        canvas.getByText('确定要删除这条记录吗？此操作不可撤销。')
      ).toBeVisible();
    });

    // step 2：按 Escape 键关闭 Modal
    await step('按 Escape 键关闭 Modal', async () => {
      await userEvent.keyboard('{Escape}');
    });

    // step 3：验证 Modal 已关闭
    await step('Modal 内容不再可见', async () => {
      // waitFor 等待状态异步更新
      await waitFor(() => {
        expect(canvas.queryByText('确认删除')).not.toBeInTheDocument();
      });
    });
  },
};

/**
 * 交互测试：点击遮罩层关闭
 */
export const CloseWithOverlayClick: Story = {
  args: {
    open: true,
    title: '提示',
    children: '这是一条提示信息',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // 点击遮罩层（Modal 背后的半透明背景）
    // 注意：遮罩层可能在 canvasElement 之外，需要用 document 查询
    const overlay = document.querySelector('[data-testid="modal-overlay"]');
    await userEvent.click(overlay!);
    
    await waitFor(() => {
      expect(canvas.queryByText('提示')).not.toBeInTheDocument();
    });
  },
};
```

交互测试的价值：它不是替代 E2E 测试，而是**组件级的集成测试**——在隔离环境中验证组件的完整交互流程。比单元测试更直观（所见即所得），比 E2E 更快（不启动完整应用）。

---

### 七、自动文档生成

`tags: ['autodocs']` 会为每个组件自动生成文档页，包含：

1. **组件描述**：从 JSDoc 注释或 Story 的 `description` 字段提取
2. **Props 表格**：从 TypeScript 类型自动生成，列出每个 prop 的名称、类型、默认值、描述
3. **所有 Story 的可交互预览**：每个变体都可以在文档页中切换 Controls 面板实时调整参数
4. **代码展示**：Show Code 按钮展示每个 Story 的源码

```tsx
// 增强文档：添加组件级描述
/**
 * Button 是用户触发操作的核心交互组件。
 *
 * ## 使用指南
 * - 每个页面最多一个 Primary 按钮（引导用户的主要操作路径）
 * - 危险操作（删除、清空等）使用 Danger 变体
 * - 加载态使用 loading prop 而非 disabled——避免用户误判"按钮坏了"
 */
const meta: Meta<typeof Button> = { /* ... */ };
```

Storybook 的文档站点可以直接部署为团队的设计系统文档站，取代需要手工维护的组件文档页面。

---

### 八、版本管理与 Changesets

组件库一旦被其他项目依赖，版本管理就成了硬性要求。Changesets 是目前最成熟的 monorepo / 库版本管理方案。

#### 8.1 安装

```bash
npm install -D @changesets/cli
npx changeset init  # 创建 .changeset/ 配置目录
```

#### 8.2 工作流

```bash
# 1. 修改代码后，创建 changeset（描述这个变更）
npx changeset add

# CLI 会交互式询问：
# → 哪些包受影响？（选择你的组件库）
# → 这是什么类型的变更？
#    major: 不兼容的 API 变更（如改了 Button 的默认 variant）
#    minor: 向后兼容的新功能（如新增了 Avatar 组件）
#    patch: 向后兼容的 bug 修复（如修复了 Modal 的 z-index 问题）
# → 变更描述是什么？

# 2. 提交代码 + changeset 文件
git add .
git commit -m "feat: 新增 Avatar 组件"

# 3. 当准备发布时，执行 version 命令
# Changesets 自动计算版本号 + 生成 CHANGELOG
npx changeset version

# 这个命令会：
# - 根据所有 pending 的 changeset 决定下一个版本号
#   （如果有 minor 变更就 bump minor，只有 patch 就 bump patch）
# - 更新 package.json 中的 version 字段
# - 生成/更新 CHANGELOG.md

# 4. 构建并发布
npm run build
npm publish  # 发布到 npm registry
```

#### 8.3 GitHub Actions 自动发布

```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    # 只有 main 分支的 push 才触发（不含 PR merge）
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      
      # changeset action：自动创建 "Version Packages" PR
      # 当这个 PR 被合并时，自动发布到 npm
      - uses: changesets/action@v1
        with:
          publish: npm run publish-packages
          version: npm run version-packages
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

---

### 九、实战：从零搭建包含 5 个组件的小型组件库

#### 9.1 组件清单

| 组件 | 描述 | 核心实现要点 |
|------|------|-------------|
| **Button** | 按钮 | variant / size / loading / disabled |
| **Input** | 输入框 | 受控/非受控、prefix/suffix 图标、校验状态 |
| **Select** | 下拉选择 | 点击外部关闭、键盘导航、虚拟滚动（可选） |
| **Modal** | 弹窗 | Portal 渲染、Escape 关闭、遮罩点击关闭、body 滚动锁定 |
| **Card** | 卡片 | 复合组件模式（Card.Image / Header / Body / Footer） |

#### 9.2 Button 组件完整实现

```tsx
// src/lib/Button/Button.tsx
import React from 'react';
import './Button.css';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'link';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** 按钮视觉变体，默认 'primary' */
  variant?: ButtonVariant;
  /** 按钮尺寸，默认 'md' */
  size?: ButtonSize;
  /** 是否加载中（显示旋转图标，禁用点击） */
  loading?: boolean;
  /** 是否撑满父容器宽度 */
  fullWidth?: boolean;
}

/**
 * Button 组件 —— 用户操作的核心交互入口
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      disabled,
      children,
      className = '',
      ...rest
    },
    ref
  ) => {
    // 用 BEM 命名法拼接类名：btn（块） + 变体/尺寸/状态（修饰符）
    const classes = [
      'btn',
      `btn--${variant}`,
      `btn--${size}`,
      loading && 'btn--loading',
      fullWidth && 'btn--full-width',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button
        ref={ref}
        className={classes}
        // disabled 或 loading 状态下禁用点击
        disabled={disabled || loading}
        // aria-busy：通知屏幕阅读器"这个按钮正在处理中"
        aria-busy={loading}
        {...rest}
      >
        {loading && <span className="btn__spinner" aria-hidden="true" />}
        <span className={loading ? 'btn__text--loading' : ''}>{children}</span>
      </button>
    );
  }
);

Button.displayName = 'Button';
```

```css
/* src/lib/Button/Button.css */
/* 所有色值使用 CSS 变量（Design Token），不硬编码 */

.btn {
  /* 外观 */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-2, 8px);
  border: 2px solid transparent;
  border-radius: var(--border-radius-md, 8px);
  /* 文字 */
  font-size: var(--font-size-sm, 14px);
  font-weight: var(--font-weight-medium, 500);
  line-height: 1;
  /* 交互 */
  cursor: pointer;
  user-select: none;
  /* 动效 */
  transition: background-color var(--duration-fast, 150ms) ease,
              border-color var(--duration-fast, 150ms) ease,
              opacity var(--duration-fast, 150ms) ease;
}

/* ===== 尺寸变体 ===== */
.btn--sm { padding: 6px 12px; font-size: 12px; }
.btn--md { padding: 8px 16px; }
.btn--lg { padding: 12px 24px; font-size: 16px; }

/* ===== 样式变体 ===== */
.btn--primary {
  background: var(--color-semantic-brand, #6366F1);
  color: #FFFFFF;
}
.btn--primary:hover:not(:disabled) {
  background: var(--color-semantic-brand-hover, #4F46E5);
}

.btn--secondary {
  background: transparent;
  color: var(--color-semantic-brand, #6366F1);
  border-color: var(--color-semantic-brand, #6366F1);
}
.btn--secondary:hover:not(:disabled) {
  background: var(--color-palette-brand-50, #EEF2FF);
}

.btn--danger {
  background: var(--color-semantic-danger, #EF4444);
  color: #FFFFFF;
}
.btn--danger:hover:not(:disabled) {
  background: #DC2626;
}

.btn--link {
  background: transparent;
  color: var(--color-semantic-brand, #6366F1);
  border-color: transparent;
  padding: 0;
  text-decoration: underline;
  text-underline-offset: 2px;
}

/* ===== 状态 ===== */
.btn:disabled { opacity: var(--opacity-disabled, 0.4); cursor: not-allowed; }
.btn--full-width { width: 100%; }

/* ===== loading 态 ===== */
.btn__spinner {
  width: 1em;
  height: 1em;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.btn__text--loading { opacity: 0.7; }
```

#### 9.3 统一导出

```typescript
// src/lib/index.ts —— Barrel Export
export { Button } from './Button';
export type { ButtonProps } from './Button';

export { Input } from './Input';
export type { InputProps } from './Input';

export { Select } from './Select';
export type { SelectProps } from './Select';

export { Modal } from './Modal';
export type { ModalProps } from './Modal';

export { Card } from './Card';
export type { CardProps } from './Card';

// 重新导出子组件类型（使用者需要：import { Card } from 'my-ui'）
export type { CardImageProps, CardHeaderProps, CardBodyProps, CardFooterProps } from './Card';
```

#### 9.4 构建和发布

```bash
# 构建组件库
npm run build

# 产物结构：
# dist/
# ├── my-ui.es.js        ← ESM 格式（供 Vite / Webpack / Next.js 使用）
# ├── my-ui.cjs.js       ← CJS 格式（兼容旧工具链）
# ├── styles.css         ← 组件样式（使用者在入口 import 'my-ui/styles.css'）
# └── types/
#     └── index.d.ts     ← TypeScript 类型声明

# 本地测试：在其他项目中通过 npm link 引用
npm link                  # 在 my-ui 目录执行
cd ../my-app
npm link my-ui            # 在消费项目中链接

# 验证构建产物是否正确
node -e "const m = require('./dist/my-ui.cjs.js'); console.log(Object.keys(m))"
# 输出：[ 'Button', 'Input', 'Select', 'Modal', 'Card' ]
```

#### 9.5 使用示例

```tsx
// 在业务项目中使用组件库
import { Button, Input, Card } from 'my-ui';
import 'my-ui/styles.css';  // 导入组件样式

export default function LoginPage() {
  return (
    <Card style={{ maxWidth: 400, margin: '80px auto' }}>
      <Card.Header>
        <Card.Title>登录</Card.Title>
      </Card.Header>
      <Card.Body>
        <Input label="邮箱" type="email" placeholder="you@example.com" fullWidth />
        <Input label="密码" type="password" placeholder="输入密码" fullWidth />
      </Card.Body>
      <Card.Footer>
        <Button variant="primary" fullWidth>登录</Button>
      </Card.Footer>
    </Card>
  );
}
```

---

## 常见问题

**Q1：组件库用 CSS Modules、CSS-in-JS 还是原子化 CSS？**

三者各有适用场景。CSS Modules 最简单——零运行时、天然隔离、TypeScript 支持良好，适合中小型组件库。CSS-in-JS（如 Styled Components）提供动态样式能力，但运行时有额外体积。原子化 CSS（如 Tailwind）适合应用层，但不适合组件库——它会强制消费者也使用 Tailwind。**推荐 CSS Modules + CSS 变量**，样式隔离靠模块化，主题化靠 Token 变量。

**Q2：React 组件库应该用 forwardRef 吗？**

应该。所有"根元素是原生 DOM 元素"的组件都应该 forwardRef——Button 转发到 `<button>`，Input 转发到 `<input>`。这让使用者能调用 `ref.focus()` 等原生方法。但像 Card、Modal 这类"根元素是 div"的组件，forwardRef 的价值较小，可以按需选择。

**Q3：Storybook 的 play 测试和 React Testing Library 有什么区别？**

前者是 Storybook 内嵌的交互测试，在真实浏览器中运行、所见即所得（Canvas 中能看到测试过程），适合组件交互流验证。后者是 Jest/Vitest 中的单元测试，在 jsdom 模拟环境中运行、速度更快，适合纯逻辑断言。两者不是替代关系——Story 中测试"用户交互后组件状态是否正确"，Testing Library 中测试"边界条件和极端值"。

**Q4：组件库要不要包含 Icon 组件？**

取决于规模。5-10 个图标的组件库可以直接用 SVG inline。超过 20 个图标建议用独立的 icon 包（如 `@my-ui/icons`），原因：(1) 图标更新频率远高于组件，分开发布降低变更影响面；(2) Tree shaking 精确到单个图标，避免用户引入全量图标的体积。

**Q5：Vite library mode 的 external 配置错误导致"Invalid hook call"怎么排查？**

React 要求项目中只有一份 React 实例。如果组件库把 React 打包进去了（没有设 external），消费项目中的 hooks（useState、useEffect 等）会引用两份不同的 React 内部状态。排查方法：在消费项目中执行 `npm ls react`，确认只有一个 React 实例。在组件库的 `vite.config.ts` 中确保 `rollupOptions.external` 包含了 `react`、`react-dom` 和 `react/jsx-runtime`。

**Q6：Changesets 的版本 bump 逻辑是怎样的？**

Changesets 读取 `.changeset/` 目录下所有未消费的 markdown 文件，取其中最高级别的 bump 类型。如果有 3 个 `patch` changeset 和 1 个 `minor` changeset，最终版本会 bump `minor`。如果当前是 `1.0.0`，发布后变成 `1.1.0`。如果有 `major` changeset，无论如何都会 bump `major`（`2.0.0`）。

**Q7：组件库的样式怎么打包？要不要 CSS-in-JS？**

两种主流方式：(1) **独立 CSS 文件**——Vite 配置 `css.modules` 或直接用 PostCSS，构建产物包含 `styles.css`，使用者 `import 'my-ui/styles.css'`。优点：零运行时、可被 CDN 缓存。缺点：需要手动引入。(2) **CSS-in-JS 运行时注入**——`styled-components` 或 `@emotion/react`。优点：动态样式、自动主题。缺点：运行时体积约 12KB gzip。**推荐独立 CSS 文件**——简单、可缓存、没有运行时开销，对于组件库来说收益大于成本。

**Q8：不会写 Story 的组件需要入库吗？**

不需要。如果一个组件只有内部逻辑、没有独立 UI（如自定义 Hook、Context Provider、工具函数），它们不属于组件库的范畴。Story 的存在本身就是一个标准：**如果写不出一个能独立渲染的 Story，这个"组件"就不适合作为公共 API 暴露**。考虑把它移到 `utils/` 或 `hooks/` 目录。

---

## 实操作业

### 基础练习：搭建最小组件库 + Button 组件 + Storybook

1. 用 Vite library mode 初始化一个 React 组件库项目
2. 实现 Button 组件（variant / size / loading / disabled 四个核心 Props）
3. 集成 Storybook，为 Button 编写覆盖 6 个以上变体的 Story
4. 配置 `autodocs`，检查 Storybook 文档页是否自动展示了 Props 表格
5. 构建并验证 `dist/` 产物中包含 ESM、CJS 和 `.d.ts` 文件

### 进阶练习：扩展组件库 + 交互测试 + Changesets

1. 实现 Input、Select、Modal、Card 四个组件（参考第八节的设计原则）
2. 为 Modal 编写交互测试（Escape 关闭、遮罩点击关闭、确认按钮关闭）
3. 为 Select 编写交互测试（展开列表 → 键盘方向键导航 → Enter 选中 → 列表关闭）
4. 初始化 Changesets，为每个组件创建对应的 changeset
5. 运行 `changeset version`，验证 `CHANGELOG.md` 自动生成

### 挑战练习：暗色主题 + 发布到私有 npm + CI 自动部署

1. 基于前一讲的 Design Token，扩展组件库支持暗色模式切换（使用 CSS 变量 + `[data-theme]` 属性）
2. 在 Storybook 中增加 Theme Switcher 工具栏（使用 `@storybook/addon-themes`）
3. 搭建私有 npm registry（Verdaccio 或 GitHub Packages），将组件库发布到私有 registry
4. 配置 GitHub Actions：合并 PR 时自动运行 Storybook 交互测试 → 构建 → 发布
5. 在 Storybook 中集成 `@storybook/addon-a11y`，为每个组件添加无障碍检查，修复检查出的问题

---

## 本节小结

组件库的搭建不是"把组件写出来扔到 npm 上"。从架构视角看，你需要在四个层次上建立能力：

1. **API 设计层**：一致、最小、类型安全的 Props 设计。用户不读文档也能猜出怎么用——这才是好的 API
2. **工程化层**：Vite library mode 的双格式构建（ESM + CJS）、external 依赖隔离、`.d.ts` 自动生成。这些配置直接决定了你发布的是一个"专业的库"还是一个"能用但浑身 bug 的代码包"
3. **文档层**：Storybook 不是锦上添花——它是组件库的说明书。Story 覆盖所有变体和状态，交互测试防止回归，autodocs 让文档和代码永不脱节
4. **版本层**：Changesets 把版本管理从"人工判断改了什么"变成"机器分析改了什么"。每次 `changeset add` 描述的是"对用户意味着什么"，这比 Git commit message 更适合生成 CHANGELOG

最终原则：**组件库的消费者是其他开发者。你要像设计产品一样设计组件库的 API——因为你的 API 就是他们的开发体验。**