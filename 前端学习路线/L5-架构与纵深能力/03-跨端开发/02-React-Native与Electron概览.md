# React Native 与 Electron 概览

## 学习目标

- 理解跨端开发的三种核心范式及其适用场景
- 掌握 React Native 的 Bridge/JSI 架构及与 React Web 的差异
- 掌握 Electron 的进程模型、IPC 通信和安全最佳实践
- 了解 Tauri 的技术路线，能根据项目需求做选型决策
- 完成一个简单的 Electron 桌面应用实战

---

## 内容讲解

### 一、跨端开发的三种范式

跨端开发并非"用一种方式解决所有问题"——不同范式对应不同的技术路线和取舍：

| 范式 | 代表方案 | 渲染方式 | UI 体验 | 原生能力 | 包体积 |
|------|---------|---------|---------|---------|--------|
| **Web 容器** | Cordova, Ionic | WebView 渲染 | 较差，不如原生流畅 | 通过插件桥接 | 小 |
| **原生渲染** | React Native, Weex | JavaScript 驱动原生控件 | 接近原生 | 好，JS ↔ Native 双向通信 | 中 |
| **自绘引擎** | Flutter | Skia 自绘，不依赖平台控件 | 高度一致，可控 | 好，Dart ↔ Native FFI | 大 |
| **混合桌面** | Electron, Tauri | Chromium（Electron）/ 系统 WebView（Tauri）| Web 体验 | 完整 Node.js/Rust API | 大 / 小 |

**决策思路**：

```
你的项目需要什么？
├── 移动端为主
│   ├── 极致性能 + UI 一致性 → Flutter
│   └── 复用 React 经验 + 快速迭代 → React Native
├── 桌面端为主
│   ├── 团队是 Web 前端 + 不在意包体积 → Electron
│   ├── 在意包体积和内存 → Tauri
│   └── 需要系统级性能和原生 UI → Swift/Kotlin 原生
└── 轻量跨平台 + 快速验证 → Taro（小程序）/ Capacitor（移动 Web 壳）
```

### 二、React Native 核心架构

#### 旧架构：Bridge 模式

```
┌─────────────────────────────────────────────────────┐
│  JavaScript 线程                                      │
│  ┌──────────────┐  ┌──────────────┐                  │
│  │ React 组件树  │  │ 业务逻辑      │                  │
│  └──────┬───────┘  └──────────────┘                  │
│         │ 序列化为 JSON                                │
│         ▼                                             │
│  ┌──────────────────────┐                            │
│  │      Bridge          │  ← 异步、批量、单通道         │
│  │  (消息队列 + 序列化)   │     JSON 序列化是性能瓶颈      │
│  └──────────┬───────────┘                            │
│             │ 反序列化                                 │
│             ▼                                         │
│  ┌──────────────────────────────────┐                │
│  │  原生线程 (Main Thread / Shadow)  │                │
│  │  ┌──────────┐  ┌──────────────┐  │                │
│  │  │ 布局计算   │  │ 原生控件渲染  │  │                │
│  │  │(Yoga 引擎)│  │(UIView/View) │  │                │
│  │  └──────────┘  └──────────────┘  │                │
│  └──────────────────────────────────┘                │
└─────────────────────────────────────────────────────┘
```

**Bridge 的痛点**：
- 所有通信必须经过 Bridge 序列化为 JSON → 大量数据传输时卡顿（如列表快速滚动）
- JS 和 Native 运行在不同线程，无法直接互相调用
- 启动时需加载整个 JS bundle 并初始化 Bridge

#### 新架构（React Native 0.68+）：JSI + Fabric + TurboModules

```
┌──────────────────────────────┐
│     JavaScript 线程           │
│  ┌────────────┐              │
│  │ React 组件  │              │
│  └─────┬──────┘              │
│        │ JSI (C++ 接口)       │
│        │ 直接调用，零序列化    │
│        ▼                     │
│  ┌────────────┐              │
│  │   JSI      │ ◄── C++ 层   │
│  └─────┬──────┘              │
│        │                     │
├────────┼─────────────────────┤
│        │   Native 线程        │
│        ▼                     │
│  ┌────────────┐              │
│  │ Fabric     │  新渲染引擎   │
│  │ TurboModules│ 按需加载     │
│  └────────────┘              │
└──────────────────────────────┘
```

**新架构核心改进**：

| 组件 | 作用 | 优势 |
|------|------|------|
| **JSI** (JavaScript Interface) | C++ 层直接暴露 Native 方法给 JS | 无 Bridge，同步调用，零序列化开销 |
| **Fabric** | 新的 UI 渲染引擎 | 优先级调度、并发渲染 |
| **TurboModules** | 原生模块按需懒加载 | 减少启动时间 |
| **CodeGen** | 静态类型生成 | JS 和 C++ 间的类型安全 |

> **避坑提示**：新架构默认在 RN 0.76+ 启用。迁移旧项目时需确保所有第三方原生库支持 TurboModules，否则会崩溃。可暂时关闭：`newArchEnabled: false`。

### 三、React Native 与 React Web 的异同

```tsx
// React Native 组件示例
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ScrollView, TextInput,
  Image, SafeAreaView
} from 'react-native';

const ProductList = () => {
  const [data, setData] = useState([]);

  // ✅ React 生态完全可用：useState, useEffect, useContext...
  useEffect(() => { fetchProducts().then(setData); }, []);

  // ❌ 不能用的 Web API：document, window, localStorage, CSS 动画
  // ✅ 替代品：Dimensions, AsyncStorage, Animated API, LayoutAnimation

  return (
    <SafeAreaView style={styles.container}>
      {/* View = div，但 flexDirection 默认 column（Web 默认 row） */}
      <View style={styles.header}>
        <Text style={styles.title}>商品列表</Text>
      </View>

      {/* FlatList = 高性能虚拟列表，自带下拉刷新和无限滚动 */}
      <FlatList
        data={data}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('Detail', { id: item.id })}
          >
            <Image source={{ uri: item.image }} style={styles.image} />
            <Text style={styles.name}>{item.name}</Text>
            {/* 所有文本必须放在 <Text> 内，否则崩溃 */}
            <Text style={styles.price}>¥{item.price}</Text>
          </TouchableOpacity>
        )}
        onRefresh={fetchProducts}      // 下拉刷新
        refreshing={loading}
        onEndReached={loadMore}        // 触底加载
        onEndReachedThreshold={0.5}
      />
    </SafeAreaView>
  );
};

// StyleSheet.create 不是 CSS，是 JS 对象，
// 只支持 flexbox 布局，不支持 grid、float、display
const styles = StyleSheet.create({
  container: {
    flex: 1,                     // 占满父容器（相当于 height: 100%）
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',               // 颜色没有简写，必须用完整字符串或数字
  },
  card: {
    margin: 8,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,             // 无单位，数字即逻辑像素
    // React Native 默认有 shadow，iOS 用 shadowColor 等属性
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,                // Android 阴影
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 4,
  },
  name: { fontSize: 16, marginTop: 8 },
  price: { fontSize: 14, color: '#e53e3e', marginTop: 4 },
});
```

**核心差异对照表**：

| 维度 | React Web | React Native |
|------|-----------|-------------|
| 基础组件 | `<div>`, `<span>`, `<img>` | `<View>`, `<Text>`, `<Image>` |
| 样式 | CSS / CSS-in-JS | `StyleSheet.create()`（JS 对象） |
| 布局 | Flexbox + Grid + Float + ... | 仅 Flexbox（且默认方向是 column） |
| 导航 | React Router | `@react-navigation/native` |
| 列表 | 任意实现 | 必须用 `FlatList` / `SectionList` 保证性能 |
| 动画 | CSS Transition / Animation | `Animated.parallel()` / `LayoutAnimation` |
| 存储 | `localStorage` | `AsyncStorage`（异步，社区库） |
| 网络 | `fetch`（同源策略） | `fetch`（无跨域限制，但需配置 ATS on iOS） |
| 调试 | Chrome DevTools | Flipper / React DevTools + 摇一摇菜单 |

> **避坑提示**：在 RN 中，文本不能直接放在 `<View>` 下，必须包裹在 `<Text>` 中，否则会直接红屏崩溃。这是新手最容易踩的坑。

### 四、Expo 托管开发流程

Expo 是 React Native 的上层封装，提供托管构建、OTA 更新和大量预置原生模块。

```
Expo 分层架构：
┌─────────────────────────┐
│   Expo Go（开发预览 App）  │
│   Expo SDK（相机/地图/推送）│
│   React Native           │
│   iOS / Android 原生      │
└─────────────────────────┘
```

**Expo 托管(Managed) vs 裸工作流(Bare)**：

| 维度 | Managed | Bare |
|------|---------|------|
| 原生代码 | 不暴露，纯 JS/TS 开发 | 可写原生模块（.m / .java / .kt） |
| 启动 | `npx create-expo-app` | `npx create-expo-app --template bare-minimum` |
| 构建 | EAS Build（云端） | 本地 Xcode / Android Studio |
| 适用 | 90% 的 App，快速原型 | 需要自定义原生功能 |
| 限制 | 不能用不兼容的原生库 | 无限制 |

```bash
# Expo 快速上手
npx create-expo-app@latest my-app --template blank-typescript
cd my-app
npx expo start            # 启动开发服务器，扫码预览
```

> **避坑提示**：Expo Managed 不能使用 `react-native link` 和不兼容的原生模块。如果已有的 RN 库用了原生代码（如 react-native-maps），需切换到 Bare 工作流或找 Expo SDK 替代。

### 五、Electron 核心架构

Electron 将 Chromium 和 Node.js 打包在一起，每个窗口是一个独立的渲染进程。

```
┌─────────────────────────────────────────────────┐
│              Electron App                        │
│                                                  │
│  ┌─────────────────────┐                        │
│  │    主进程 (Main)      │  ← 唯一的、Node.js 环境  │
│  │                      │                        │
│  │  - 创建窗口           │                        │
│  │  - 系统菜单/Tray      │                        │
│  │  - 文件系统操作        │                        │
│  │  - 自动更新           │                        │
│  │  - ipcMain 监听       │                        │
│  └──────┬───────────────┘                        │
│         │ IPC (ipcMain ↔ ipcRenderer)            │
│         │ 或通过 contextBridge                    │
│  ┌──────┴───────────────┐                        │
│  │  渲染进程 (Renderer)   │  ← 多个、Chromium 环境   │
│  │  ┌─────────────────┐ │                        │
│  │  │  HTML/CSS/JS     │ │  ← 不能直接访问 Node.js │
│  │  │  React/Vue/Angular│ │    不能调用 fs、process │
│  │  └────────┬────────┘ │                        │
│  │           │ Preload   │  ← 安全的暴露接口        │
│  │  ┌────────┴────────┐ │                        │
│  │  │ preload.js       │ │  contextBridge 暴露    │
│  │  │ (有Node.js权限)   │ │  有限 API 给渲染进程      │
│  │  └─────────────────┘ │                        │
│  └──────────────────────┘                        │
└─────────────────────────────────────────────────┘
```

### 六、Electron 进程间通信

```javascript
// ==================== main.js（主进程） ====================
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // 安全关键
      nodeIntegration: false,   // 必须 false：禁止渲染进程访问 Node.js
      contextIsolation: true,   // 必须 true：隔离预加载脚本和网页上下文
      sandbox: true,            // macOS 沙箱
    },
  });

  // 开发环境加载 Vite dev server，生产环境加载打包后的文件
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

// 监听渲染进程发来的消息
ipcMain.handle('dialog:openFile', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: '文本文件', extensions: ['txt', 'md'] }],
  });
  return result.filePaths; // 返回值自动返回给渲染进程
});

ipcMain.handle('fs:readFile', async (event, filePath) => {
  // ⚠️ 注意：应校验 filePath 的合法性，避免路径遍历攻击
  const fs = require('fs');
  return fs.readFileSync(filePath, 'utf-8');
});

app.whenReady().then(createWindow);
```

```javascript
// ==================== preload.js（预加载脚本） ====================
const { contextBridge, ipcRenderer } = require('electron');

// contextBridge 安全地暴露有限 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 调用主进程打开文件选择对话框
  openFile: () => ipcRenderer.invoke('dialog:openFile'),

  // 读取文件内容
  readFile: (filePath) => ipcRenderer.invoke('fs:readFile', filePath),

  // 单向消息：渲染进程通知主进程
  setTitle: (title) => ipcRenderer.send('set-title', title),

  // 监听主进程推送的消息
  onUpdateCounter: (callback) => {
    ipcRenderer.on('update-counter', (_event, value) => callback(value));
  },

  // 获取应用版本（静态数据可直接暴露）
  appVersion: process.env.npm_package_version,
});
```

```tsx
// ==================== App.tsx（渲染进程，React） ====================
import { useState } from 'react';

// 声明 window.electronAPI 的类型（避免 TypeScript 报错）
declare global {
  interface Window {
    electronAPI: {
      openFile: () => Promise<string[]>;
      readFile: (path: string) => Promise<string>;
      setTitle: (title: string) => void;
      onUpdateCounter: (cb: (count: number) => void) => void;
      appVersion: string;
    };
  }
}

function App() {
  const [content, setContent] = useState('');

  const handleOpenFile = async () => {
    // 调用 preload 暴露的 API，间接访问主进程能力
    const [filePath] = await window.electronAPI.openFile();
    if (filePath) {
      const text = await window.electronAPI.readFile(filePath);
      setContent(text);
    }
  };

  return (
    <div>
      <h1>Electron 桌面应用 v{window.electronAPI.appVersion}</h1>
      <button onClick={handleOpenFile}>打开文件</button>
      <pre>{content}</pre>
    </div>
  );
}
```

> **避坑提示**：绝不能直接 `contextBridge.exposeInMainWorld('node', { fs: require('fs') })`，这等于把整个 Node.js 能力暴露给网页，任何 XSS 攻击都能直接操作文件系统。

### 七、Electron 安全最佳实践

Electron 的安全问题是跨端方案中最突出的——因为它内置了完整的 Node.js 和 Chromium：

| 配置项 | 安全值 | 风险 | 说明 |
|--------|--------|------|------|
| `nodeIntegration` | `false` | 🔴 致命 | 如果为 true，渲染进程中 `require('fs')` 可读取任意文件 |
| `contextIsolation` | `true` | 🔴 致命 | 隔离 preload 和网页的 JS 上下文，防止原型链污染 |
| `sandbox` | `true` | 🟡 高 | macOS 沙箱限制进程能力，但某些 Native 模块不兼容 |
| `webSecurity` | `true`（默认） | 🟡 高 | 关闭后允许跨域请求，XSS 风险极大 |
| `allowRunningInsecureContent` | `false`（默认） | 🟡 中 | 允许 HTTPS 页面加载 HTTP 资源 |
| `remote` 模块 | 禁用（Electron 14+） | 🔴 致命 | 允许渲染进程直接调用主进程模块，已废弃 |

**安全架构原则**：

1. **最小权限**：preload 只暴露渲染进程真正需要的 API，一个都不多给
2. **输入校验**：主进程中所有来自渲染进程的路径、参数都必须校验
3. **CSP 头**：设置 `Content-Security-Policy` 限制脚本来源
4. **自动更新**：必须集成 `electron-updater`，确保用户始终运行最新安全补丁
5. **外链隔离**：如果加载外部 URL，必须用 `<webview>` 标签并设置 `sandbox` 属性

```javascript
// 额外安全配置示例
mainWindow = new BrowserWindow({
  webPreferences: {
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: true,
    webSecurity: true,
    // 禁止在页面中创建新的 BrowserWindow
    nativeWindowOpen: false,
    // 禁止远程内容（开发环境需要关闭）
    allowRunningInsecureContent: false,
  },
});

// 设置 CSP 头
session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
  callback({
    responseHeaders: {
      ...details.responseHeaders,
      'Content-Security-Policy': [
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'",
      ],
    },
  });
});
```

### 八、Tauri 简介与对比

Tauri 用 Rust 替代 Node.js 作为后端，用系统 WebView 替代 Chromium：

```
┌──────────────────────────────────┐
│         Tauri App                │
│                                  │
│  ┌────────────────────┐         │
│  │  Rust 后端 (Core)   │         │
│  │  - 窗口管理         │         │
│  │  - 系统调用         │         │
│  │  - 文件系统         │         │
│  │  - Tauri API       │         │
│  └──────┬─────────────┘         │
│         │ invoke / event         │
│  ┌──────┴─────────────┐         │
│  │  前端 (WebView)     │         │
│  │  - macOS: WKWebView │         │
│  │  - Windows: WebView2│         │
│  │  - Linux: WebKitGTK │         │
│  │  React/Vue/Svelte   │         │
│  └────────────────────┘         │
└──────────────────────────────────┘
```

**Electron vs Tauri 对比**：

| 维度 | Electron | Tauri |
|------|----------|-------|
| 后端语言 | Node.js (JS/TS) | Rust |
| 渲染引擎 | 内置 Chromium（~150MB 起步） | 系统 WebView（几乎 0 增量） |
| 安装包大小 | ≥ 50MB（压缩后） | 1-5MB |
| 内存占用 | ≥ 150MB（每个窗口一个 Chromium） | ~50MB |
| 生态成熟度 | 🔴 极其丰富（npm 全生态） | 🟡 快速增长中 |
| 学习曲线 | 🟢 前端开发者零门槛 | 🟡 需学 Rust 基础 |
| 安全性 | 🟡 配置复杂（大量安全开关） | 🟢 Rust 内存安全 + 最小权限 |
| 自动更新 | `electron-updater` | Tauri updater（内置） |
| 跨平台 | macOS / Windows / Linux | macOS / Windows / Linux + 移动端实验性 |

### 九、选型决策表

| 场景 | 推荐方案 | 理由 |
|------|---------|------|
| macOS + Windows 桌面工具，团队是 Web 前端 | **Electron** | 生态最成熟，npm 无痛复用 |
| 对安装包体积和内存有严格要求 | **Tauri** | 包体积和内存碾压 Electron |
| 团队熟悉 Rust 或愿意投入学习 | **Tauri** | 安全性和性能上限更高 |
| iOS + Android 移动 App | **React Native / Flutter** | 移动端主流跨端方案 |
| 需要桌面 + 移动端代码复用 | **React Native + Electron** | 共享业务逻辑层（hooks/store/utils） |
| 快速原型 / MVP | **Expo (RN) / Electron** | 开发速度最快 |
| 极致性能 + 一致性 UI（移动端） | **Flutter** | 自绘引擎，不依赖平台控件 |
| 小团队做全平台（小程序 + H5 + App） | **Taro + RN 混合** | Taro 覆盖小/H5，RN 覆盖原生 App |

> **避坑提示**：不要迷信"一套代码跑所有平台"。不同平台的交互范式天然不同（桌面有右键菜单、移动端有点击反馈、小程序有授权弹窗），真正可复用的通常是业务逻辑层（hooks、store、utils、API 层），UI 层必须按平台分别适配。

---

## 常见问题

**Q1：React Native 和 Flutter 到底选哪个？**
如果你的团队是 React 技术栈，选 RN，开发效率高且能复用大量 Web 经验。如果追求极致的 UI 一致性和性能（如动画密集型应用），选 Flutter。Flutter 学习成本更高（Dart + Widget 体系），但渲染一致性无可匹敌。

**Q2：Electron 应用太大了怎么办？**
- 使用 `electron-builder` 的 `compression: 'maximum'`
- 移除未使用的 Chromium 组件（如 PDF viewer、speech）
- 评估是否可迁移到 Tauri（包体积直接降 90%）
- 考虑 `nsis-web` 在线安装包（用户下载小型安装器，按需下载资源）

**Q3：React Native WebView 和 React Web 开发有什么区别？**
RN 里的 WebView 就是一个内嵌浏览器，跑的就是标准 HTML/CSS/JS。可以把它当作 RN 中的一个"网页容器组件"，用于展示 Web 内容或移植已有 H5 页面。但性能不如纯原生控件，且不支持部分 RN 原生能力。

**Q4：Electron 中如何安全地使用 Node.js 模块？**
所有 Node.js 操作都应在主进程中执行，通过 `ipcMain.handle` + `contextBridge` 暴露有限接口给渲染进程。绝对不要让渲染进程直接 `require('fs')` 或 `require('child_process')`。

**Q5：Expo 和 React Native CLI 有什么区别？**
Expo 是官方推荐的 React Native 开发框架，提供托管环境、OTA 更新和预置 SDK。React Native CLI 是底层工具链，需要手动配置原生项目。行业趋势是 90% 的新项目用 Expo 起步，需要自定义原生功能时 eject 到 Bare 工作流。

**Q6：Tauri 比 Electron 好，为什么还有人用 Electron？**
生态和工具链。Electron 有 VS Code、Slack、Discord、Figma 等千万级用户验证，社区插件和调试工具极丰富。如果你的项目需要复杂的原生交互（如屏幕录制、USB 通信、系统代理），Electron 的 npm 生态能让你三天搞定，Tauri 可能要写大量 Rust 代码。

**Q7：跨端方案的导航/路由怎么选？**
- RN：`@react-navigation/native`（官方推荐）
- Electron：前端路由（React Router）+ 无需导航库（单窗口应用居多）
- Taro：内置路由（`Taro.navigateTo`），与小程序对齐
- Flutter：自带 Navigator 2.0 / go_router

**Q8：学习路径是什么？**
如果你是前端开发者，建议的跨端学习顺序：**Taro（小程序）→ Electron（桌面）→ React Native（移动）**。这个顺序学习曲线最平滑，每一步建立在下层基础上。

---

## 实操作业

### 基础练习：Electron 桌面记事本

用 Vite + React + Electron 搭建一个简单的记事本应用：
- 创建新笔记：标题 + 内容（textarea）
- 保存笔记到本地文件系统（主进程 `fs.writeFileSync`）
- 打开已有 `.md` 文件并显示内容
- 文件列表：扫描指定目录下的所有 `.md` 文件
- 所有文件操作必须通过 IPC + contextBridge 安全调用

### 进阶练习：Electron 截图工具

在基础练习上扩展系统级能力：
- 使用 `desktopCapturer` API 获取屏幕源列表
- 显示屏幕预览缩略图，点击选中后截取全屏
- 截取的图片展示在 Canvas 上，支持鼠标拖动选区裁剪
- 使用 `clipboard` API 将裁剪结果复制到剪贴板
- 使用 `globalShortcut` 注册全局快捷键 `Cmd/Ctrl+Shift+4` 触发截图

### 挑战练习：跨平台架构设计与对比

选择一个你熟悉的 Web 应用场景（如任务管理、笔记、记账），完成以下任务：
1. 设计三套技术方案：React Native 移动版、Electron 桌面版、Tauri 桌面版
2. 画出每种方案的架构图（进程模型、数据流、API 层）
3. 列出一个共享的业务逻辑模块（hooks/store/utils），明确哪些代码在三套方案间可复用、哪些必须平台特化
4. 任选一个方案完成 MVP 实现（至少包含列表和详情两个页面）
5. 写一份选型对比报告：包体积、启动速度、开发效率、运行内存 4 个维度的实测数据

---

## 本节小结

跨端开发的核心不在于"学习某个框架"，而在于理解不同方案在**渲染层、通信机制、平台能力**三个维度的取舍：

1. **渲染层**决定了 UI 的一致性和性能上限——WebView 最通用但最慢，原生控件折中，自绘引擎最一致但包体积最大
2. **通信机制**（Bridge → JSI、IPC、FFI）决定了 JS 和平台侧的协作效率——新架构的方向是消除序列化、支持同步调用
3. **平台能力**决定了能做什么——Electron 有完整的 Node.js，Tauri 有 Rust 的安全和性能，RN 依赖社区原生模块

对前端开发者来说，跨端的本质是：**把 Web 技术栈的能力边界从浏览器扩展到操作系统**。Electron 和 React Native 是目前这条路上最成熟的两个分支，Tauri 代表了下一代方向。建议基于实际项目需求而非技术热度做选型——每个方案都有其不可替代的最佳场景。