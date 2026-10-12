# 02 — 缓存策略与 CDN

<!-- course-meta:start -->
> **课程元数据**
> - 层级：L0 Web 基石
> - 先修：[01 — HTTP 协议与版本演进](./01-HTTP协议与版本演进.md)
> - 建议用时：90-150 分钟
> - 技术基线：2026-10，详见[技术基线与来源](../../技术基线与来源.md)
> - 一手资料：[HTTP Semantics](https://httpwg.org/specs/rfc9110.html)
> - 完成要求：运行示例、完成至少基础作业、提交验证记录
<!-- course-meta:end -->

## 学习目标

- 理解浏览器缓存的两种核心机制：强缓存和协商缓存
- 能说出 Expires、Cache-Control、Last-Modified、ETag 各自的用途和优先级
- 能画出"浏览器决定是否使用缓存"的完整决策流程图
- 理解 CDN 是怎么加速网站访问的
- 掌握静态资源"文件指纹 + 长缓存"这一黄金策略
- 会配置 Nginx / Web 服务器的缓存策略

---

## 内容讲解

### 一、为什么需要缓存？

先看一个场景：你访问淘宝首页，页面加载了 100+ 个文件（CSS、JS、图片、字体）。如果每次刷新都要重新下载这 100 多个文件，总共 5MB，在一个 4G 网络下需要约 10 秒。

但如果浏览器把这些文件缓存到本地，第二次打开时直接用缓存，加载时间可能只需 1 秒。

> **类比**：你去图书馆借书。如果每次都要从仓库调货（从服务器下载），又慢又费事。但如果你自己有一个小书架（浏览器缓存），把借过的书放在书架上，下次要看直接拿，就快多了。只不过要确保——书架上的书还是最新版本。

---

### 二、强缓存：不需要问服务器

**强缓存**的意思是：浏览器在缓存有效期内，直接使用本地缓存，连请求都不发给服务器。

强缓存由两个响应头控制（只用一个就够了）：

#### 2.1 Expires（HTTP/1.0，老一辈）

```
Expires: Mon, 12 Oct 2026 10:00:00 GMT
```

服务器告诉浏览器："这份资源在 10 月 12 日上午 10 点之前都有效，直接用缓存。"

**问题**：Expires 用的是服务器时间，如果用户的电脑时间不准（快了或慢了），缓存策略就失效了。所以现在基本被 Cache-Control 取代。

#### 2.2 Cache-Control（HTTP/1.1，现代方案）

```
Cache-Control: max-age=3600
```

`max-age` 的单位是**秒**。`3600` 表示这份资源在下载后的 3600 秒（1 小时）内有效。它用的是相对时间，完美解决了 Expires 的时间同步问题。

Cache-Control 有几个关键指令：

| 指令 | 含义 |
|---|---|
| `max-age=秒数` | 缓存的有效期（相对时间），最常用 |
| `no-cache` | **不要直接使用缓存**，每次都要去服务器验证一下（走协商缓存） |
| `no-store` | **完全不缓存**，每次都要重新下载（用于敏感数据，如银行余额） |
| `public` | 可以被任何中间节点缓存（浏览器、CDN、代理服务器） |
| `private` | 只能被浏览器缓存，CDN 和代理不能缓存（用于用户个人数据） |
| `must-revalidate` | 缓存过期后必须去服务器验证，不能直接使用过期缓存 |
| `immutable` | 资源永远不变，即使用户按了刷新按钮也不去验证（配合文件指纹使用） |

> **`no-cache` 的命名陷阱**：`no-cache` 不是说"不缓存"，而是说"不要直接用缓存，先问问我"。真正"不缓存"的是 `no-store`。这是 HTTP 规范中最容易误解的命名之一。

**多个指令可以组合使用**：

```
Cache-Control: public, max-age=31536000, immutable
```

这表示：所有人都可以缓存，缓存有效期一年，并且资源永远不变，不需要验证。

---

### 三、协商缓存：去问服务器"我的缓存还能用吗？"

强缓存过期后，浏览器不会直接重新下载——它会带着验证信息去问服务器："我这有一份 10 月 1 号的版本，还能不能用？"

服务器检查后：
- 如果资源没变：返回 **304 Not Modified**（响应体为空，省钱）
- 如果资源变了：返回 **200 OK** + 新资源内容

协商缓存有两种验证方式：

#### 3.1 Last-Modified / If-Modified-Since（基于时间）

**第一次请求**：
```
服务器响应头 → Last-Modified: Mon, 09 Oct 2026 08:00:00 GMT
```

浏览器记下这个时间。下次请求同一资源时：
```
浏览器请求头 → If-Modified-Since: Mon, 09 Oct 2026 08:00:00 GMT
```

服务器对比文件的最后修改时间：
- 如果文件没被修改过 → 返回 `304 Not Modified`
- 如果文件修改过 → 返回 `200 OK` + 新文件 + 新的 `Last-Modified`

**局限性**：
1. 时间是秒级精度，如果文件在 1 秒内改了多次，只能感知到 1 次
2. 如果文件内容没变，只是 `touch` 了一下（更新了修改时间），也会触发重新下载

#### 3.2 ETag / If-None-Match（基于内容哈希——更精确）

ETag 是服务器为资源生成的一个"指纹"（通常是内容哈希值）。只要内容变了，指纹就变了。

**第一次请求**：
```
服务器响应头 → ETag: "abc123def456"
```

**第二次请求**：
```
浏览器请求头 → If-None-Match: "abc123def456"
```

服务器对比 ETag：
- 匹配 → 返回 `304 Not Modified`
- 不匹配 → 返回 `200 OK` + 新内容 + 新的 `ETag`

> **ETag 比 Last-Modified 更精确**，因为它是基于内容而非时间的。生产环境中两者通常同时使用，ETag 优先级更高。

---

### 四、完整的浏览器缓存决策流程

浏览器决定是否使用缓存，是一层一层判断的。以下是完整流程图：

```
浏览器要请求一个资源
        │
        ▼
  ┌─────────────────┐
  │ 缓存中是否有匹配  │
  │ 的副本？         │
  └────┬────────┬───┘
       │否      │是
       ▼        ▼
  直接发送请求  ┌──────────────────┐
             │ Cache-Control:    │
             │ no-store?         │
             └──┬───────────┬───┘
                │是         │否
                ▼           ▼
           不缓存，     ┌──────────────┐
           直接请求     │ 检查强缓存     │
                       │ 是否过期？     │
                       └──┬───────┬───┘
                          │未过期  │已过期 / no-cache
                          ▼        ▼
                      ┌────────┐ ┌──────────────────┐
                      │ 直接使用│ │ 发送条件请求       │
                      │ 缓存   │ │ (带 If-None-Match │
                      │ (200)  │ │  或 If-Modified-  │
                      └────────┘ │  Since 头)        │
                                 └────────┬─────────┘
                                          ▼
                                   ┌──────────────┐
                                   │ 服务器返回    │
                                   │ 304 还是 200？│
                                   └──┬───────┬───┘
                                      │304    │200
                                      ▼       ▼
                                  ┌───────┐ ┌──────────┐
                                  │ 使用   │ │ 使用新资源 │
                                  │ 本地   │ │ 并更新缓存 │
                                  │ 缓存   │ │            │
                                  └───────┘ └──────────┘
```

> **一句口诀**：先看强缓存有没有过期 → 没过期直接拿；过期了带 ETag 去问服务器 → 304 继续用旧的，200 下载新的。

---

### 五、CDN：让资源就近送达

#### 5.1 CDN 的工作原理

CDN（Content Delivery Network，内容分发网络）就是把你的静态资源（CSS、JS、图片、视频）提前分发到全球各地的边缘节点上。用户访问时，自动从离他最近的节点获取资源。

```
没有 CDN：                         有了 CDN：
                     北京用户                          北京用户
                        │                                │
                        │ 横跨半个中国                     │ 就近访问
                        │                                ▼
                        ▼                         ┌──────────┐
上海用户 ──→ 源站（上海）                          │ 北京 CDN │
                        ▲                         └──────────┘
                        │                                
深圳用户                 │                         上海用户
  └── 也很远 ──────────┘                                │
                                                        ▼
  延迟：100-300ms                               ┌──────────┐
                                                 │ 上海 CDN │
                                                 └──────────┘
                                                        
                                                 延迟：10-30ms
```

> **类比**：CDN 就像连锁便利店。以前你买东西只能去郊区的总仓库（源站），来回两小时。现在每个小区楼下都有便利店（CDN 节点），下楼就能买到，来回五分钟。

#### 5.2 CDN 的加速原理

1. **物理距离缩短**：北京用户从北京节点拿数据，而不是从上海的源站
2. **带宽分流**：源站的压力被分摊到数百个 CDN 节点
3. **智能路由**：CDN 会选择最优的网络路径

#### 5.3 CDN 的使用方式

通常只需把静态资源的域名指向 CDN 服务商：
- 将 `cdn.example.com` 的 DNS CNAME 记录指向 CDN 厂商提供的地址
- CDN 节点第一次没有资源时会回源拉取，之后就不再回源

---

### 六、静态资源缓存黄金策略：文件指纹 + 长缓存

这是前端性能优化的核心手段，理解它你就掌握了缓存精髓。

#### 问题

你有一个 `app.js`，缓存了一年。现在改了一行代码，重新发布。已经缓存了旧版 `app.js` 的用户怎么办？一年内他们都不会请求新文件。

#### 解决方案：文件指纹（File Fingerprint / Hash）

在文件名中嵌入内容的哈希值：

```
app.a1b2c3d4.js    ← 第一次发布
app.e5f6g7h8.js    ← 修改后重新发布，哈希变了，文件名变了
```

文件名变了，对浏览器来说就是一个**全新的资源**，不存在缓存问题。

#### 完整策略

```nginx
# Nginx 配置示例 — 静态资源缓存策略
# 此配置放在 server 或 location 块中

# 1. HTML 文件：不缓存（或短缓存）
#    HTML 中引用了 JS/CSS 的链接，必须保证 HTML 是最新的
location / {
    add_header Cache-Control "no-cache, must-revalidate";
    # no-cache: 每次都要验证（走协商缓存，304 响应体为空的优势还在）
    # must-revalidate: 过期后必须重新验证
}

# 2. 带哈希的静态资源：永久缓存
#    文件名变了就是新文件，旧文件永远不会变
location ~* \.(js|css|woff2?|ttf)$ {
    # 匹配包含哈希的文件名，如 app.a1b2c3d4.js
    # 文件名不包含哈希的资源也走这个规则，但通过 expires 控制
}

# 或者更精确地：
location ~* \.[a-f0-9]{8,}\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?)$ {
    # 文件名中包含 8 位或以上十六进制哈希（如 app.a1b2c3d4.js）
    add_header Cache-Control "public, max-age=31536000, immutable";
    # public:     CDN 也可以缓存
    # max-age:    31536000 秒 = 365 天
    # immutable:  资源绝对不会变，浏览器刷新时也不验证
}

# 3. 图片等媒体资源：长缓存
location ~* \.(png|jpg|jpeg|gif|svg|ico|webp|avif)$ {
    add_header Cache-Control "public, max-age=2592000";
    # 2592000 秒 = 30 天
}
```

> **核心思想**：凡是文件名带哈希的，内容一变文件名就变，所以可以直接给永久缓存。HTML 是入口文件，需要及时更新，所以给短缓存或不缓存。

#### 现代前端工具链自动完成

Webpack、Vite 等构建工具已经自动帮你做了文件指纹：

```javascript
// vite.config.js — Vite 中的配置示例
export default {
  build: {
    rollupOptions: {
      output: {
        // JS 文件：带哈希
        entryFileNames: 'assets/[name].[hash].js',
        // CSS 文件：带哈希
        assetFileNames: 'assets/[name].[hash][extname]',
        // 第三方库单独打包
        manualChunks: {
          vendor: ['react', 'react-dom']
        }
      }
    }
  }
}
```

构建后的输出目录：
```
dist/
├── index.html                          ← 不缓存，每次请求都要最新
├── assets/
│   ├── index.a1b2c3d4.js              ← 永久缓存
│   ├── index.e5f6g7h8.css             ← 永久缓存
│   ├── vendor.11223344.js             ← 永久缓存（第三方库）
│   └── logo.99887766.png              ← 永久缓存
```

---

### 七、实战：配置一个合理的静态资源缓存策略

这里用 Nginx 配置做一个完整的示例，你可以直接参考这个模板：

```nginx
server {
    listen 80;
    server_name www.example.com;

    # 根路径：HTML 页面采用协商缓存
    location / {
        # 浏览器端：每次都要验证
        add_header Cache-Control "no-cache, must-revalidate" always;
        # CDN 端：不缓存 HTML
        add_header X-Cache-Status $upstream_cache_status;
    }

    # 带哈希的 JS/CSS/字体：永久缓存
    location ~* \.[a-f0-9]{8,}\.(js|css|woff2?)$ {
        # 缓存 365 天，不可变
        add_header Cache-Control "public, max-age=31536000, immutable" always;
        # 允许跨域（如果 CDN 域名和主站不同）
        add_header Access-Control-Allow-Origin "*";
    }

    # 图片：30 天缓存
    location ~* \.(png|jpg|jpeg|gif|svg|ico|webp)$ {
        add_header Cache-Control "public, max-age=2592000" always;
    }
}
```

#### 验证方式

配置部署后，用 curl 验证响应头：

```bash
# 验证 HTML 的缓存策略
curl -I https://www.example.com/index.html
# 预期看到：Cache-Control: no-cache, must-revalidate

# 验证带哈希 JS 文件的缓存策略
curl -I https://www.example.com/assets/index.a1b2c3d4.js
# 预期看到：Cache-Control: public, max-age=31536000, immutable
```

在 Chrome Network 面板中，观察 Size 列：
- `(memory cache)` — 从内存缓存中直接读取（最快）
- `(disk cache)` — 从磁盘缓存中读取
- `304` — 走协商缓存，服务器确认未修改
- 具体数字（如 `245 kB`）— 实际下载的大小

---

## 常见问题

**Q1：强缓存和协商缓存的区别是什么？**

强缓存（Expires / Cache-Control）在有效期内**不发送请求**，直接拿本地缓存。协商缓存（Last-Modified / ETag）一定会**发送请求**到服务器，只是可能只返回 304 不带响应体。

**Q2：Ctrl+F5（强制刷新）和普通 F5 有什么区别？**

- 普通 F5：浏览器会带上 `Cache-Control: max-age=0` 请求头，对于强缓存过期的资源走协商缓存
- Ctrl+F5：浏览器会带上 `Cache-Control: no-cache` 和 `Pragma: no-cache`，强制跳过所有缓存，全部重新下载

**Q3：ETag 和 Last-Modified 同时存在时，哪个优先级更高？**

ETag。HTTP 规范规定，如果两者同时存在，浏览器优先使用 `If-None-Match`（ETag 的验证头），忽略 `If-Modified-Since`。ETag 基于内容而非时间，精确度更高。

**Q4：Cache-Control: no-cache 到底缓存不缓存？**

缓存！`no-cache` 的意思是"可以使用缓存，但必须先找服务器验证"。它实际上允许浏览器缓存，只是每次使用前必须发一个验证请求（304 响应）。真正完全不缓存的是 `no-store`。

**Q5：CDN 缓存和浏览器缓存有什么区别？**

浏览器缓存存在用户本地，只服务一个用户。CDN 缓存在边缘节点上，可以服务该节点覆盖的所有用户——一个用户请求过，其他用户也能享受加速。CDN 也遵循 Cache-Control 头。

**Q6：用 CDN 后，怎么保证用户看到的是最新内容？**

CDN 刷新有两种方式：① 主动刷新（Purge）：更新文件后调用 CDN 的 API 清除缓存，CDN 下次请求会回源拉取新文件。② 文件指纹：因为新文件有新的文件名（新 URL），CDN 节点不存在就会自动回源，这是最优雅的方式。

**Q7：为什么 HTML 不建议强缓存？**

HTML 是入口文件，里面引用了 JS/CSS 的链接。如果你缓存了旧 HTML，即使服务器上的 JS 已经更新（新哈希文件名），用户也看不到，因为他们拿到的 HTML 里还是旧的引用。

---

## 实操作业

### 练习一：缓存对比实验（新手）

打开 Chrome Network 面板：
1. 访问 `https://www.example.com`，记录哪些资源走了 `(disk cache)`
2. 按 F5 刷新，观察 Size 列的变化——哪些变成了 304？
3. 按 Ctrl+F5（Mac 上 Cmd+Shift+R）强制刷新，所有资源都是多少 KB？
4. 用文字描述三种刷新方式下的缓存行为差异

### 练习二：配置 Nginx 缓存策略（进阶）

1. 在本地搭建一个简单的 Nginx 静态文件服务
2. 放入一个 `index.html`、一个 `app.[hash].js`、一张 `logo.png`
3. 按本节模板配置不同的缓存策略
4. 用 `curl -I` 验证每种资源的 Cache-Control 响应头是否符合预期
5. 改一下 `app.js` 的内容（模拟更新），说明为什么文件名需要改变

### 练习三：分析实际网站的缓存策略（进阶）

找一个你常用的网站（如掘金、GitHub、B站），在 Network 面板中：
1. 找到它的 JS 文件名，是否包含哈希？
2. 查看它的 Cache-Control 响应头，JS 缓存了多久？
3. 查看 HTML 的缓存策略
4. 写一段 200 字的分析，说明这个网站的缓存策略好在哪里，有什么可以改进的

---

<!-- atlas-task:start -->
## Atlas 项目任务

- 项目起点：[Atlas 贯穿项目](../../projects/atlas/README.md)
- 阶段目标：[L0 里程碑](../../projects/atlas/milestones/L0.md)
- 本课任务：在 Atlas 中构造与“缓存策略与 CDN”相关的可观察场景，使用 DevTools 或请求日志记录现象、时间线和结论。
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

- 强缓存（Cache-Control: max-age）在有效期内不发送请求
- 协商缓存（ETag / Last-Modified）每次都会发请求，但可能只返回 304
- `no-cache` = 缓存，但每次要验证；`no-store` = 完全不缓存
- CDN 把资源分发到全球边缘节点，用户就近获取，大幅加速
- 黄金策略：HTML 短缓存 + 带哈希的静态资源永久缓存（文件指纹）
- 文件指纹让"永久缓存"成为可能——文件名变了就是新资源

<!-- course-nav:start -->
---

[上一篇：01 — HTTP 协议与版本演进](./01-HTTP协议与版本演进.md) · [课程地图](../../README.md) · [下一篇：03 — DNS、TCP、TLS 握手过程](./03-DNS-TCP-TLS握手过程.md)
<!-- course-nav:end -->
