// 每条对应原有课程的三档作业。只维护答案与可观察验收，不生成题目或通用套话。
export const guidance = {
  '01-开发环境-终端与项目目录.md': [
    'mkdir -p frontend-labs/lesson-01 后进入目录；README 记录 pwd、文件列表与 node/npm/pnpm 版本。重新开终端按记录定位；不存在的目录应报错，不悄悄创建到其他位置。',
    '分别记录两种终端的 PATH 与 which 输出；从 PATH 左到右找到实际执行文件。版本不同先定位 Shell 初始化文件或版本管理器，不重复安装来掩盖问题。',
    '第二个服务应出现 EADDRINUSE。按端口查 PID 并核对启动命令，只停止自己的实验进程；改端口后用浏览器请求证明两个恢复方案均成立。',
  ],
  '02-第一个HTML-CSS-JavaScript页面.md': [
    '用 h1、button 和状态文本节点；click 中更新计数并用 textContent 显示。连续点击两次应显示 2；Tab 后 Enter/Space 同样有效，320px 无溢出。',
    '数组保存稳定 ID、标题与 completed，增删改后统一渲染。添加两条并完成一条应显示 1/2；删除全部显示空态；输入 HTML 字符串仍是文本。',
    '一次只注入一种故障：404 看 Network、语法/选择器错误看 Console、交互语义看无障碍树、溢出看盒模型。修复后重复相同操作并证明症状消失。',
  ],
  '03-本地服务器与浏览器调试.md': [
    '通过 http://127.0.0.1 访问；记录 document、stylesheet、script 的 URL/MIME/状态与 Initiator。JS 返回 text/html 即使状态 200 也应判为资源契约错误。',
    '404 对照请求路径与磁盘文件；样式不生效看匹配规则；异常断点查看变量；端口冲突看服务端输出。每次恢复后确认页面和请求同时正常。',
    '报告给出完整入口、最短操作和可重复环境；把事实与推断分开。让另一终端按报告复现，不能只交一张没有 URL 和步骤的截图。',
  ],
  '01-浏览器架构与多进程模型.md': [
    '记录标签、frame、PID 和进程类型，而不是把标签数当进程数。关闭标签后可能仍有共享进程；依据 PID 与站点归属解释观察值。',
    '500ms 有界阻塞后页面应恢复；比较另一页的响应并记录是否共享进程。扩展宿主、UI 与渲染进程的隔离粒度不同，不能据此保证编辑器绝不卡死。',
    '只停止独立测试资料内的练习渲染任务；列出受影响页面与共同 PID。重新加载恢复，结合站点隔离解释结果，不终止日常浏览器进程。',
  ],
  '02-DOM-CSSOM-渲染树构建.md': [
    '记录脚本执行、DOMContentLoaded、load 与资源 Timing；外部样式可阻塞后续经典脚本。只增加 CSS 行数未必产生可测延迟，可在本地服务给响应加有界延迟。',
    '经典 defer 按文档顺序执行且在 DOMContentLoaded 前；async 就绪即执行，不保证相互顺序。反复改变下载延迟，检查访问 h1 时是否已经完成解析。',
    '延迟插入 stylesheet 更容易观察未样式化内容；body 末尾的 link 不保证一定产生 FOUC。用 trace 证明首次绘制与样式生效时刻，未出现也记录条件。',
  ],
  '03-布局-绘制-合成流水线.md': [
    '记录 Layers 中实际合成原因、大小与绘制情况；fixed 不保证总被提升。合成层与 CSS 层叠上下文不是同一个概念，不能用其中一个代替另一个的证据。',
    '相同元素数和动画时长分别测 left 与 transform；预期前者更易触发布局。以 trace 的 Layout/Paint/Composite 为准，首次栅格化仍可能绘制。',
    '从少量粒子开始加到 50 个；对比 frame、布局耗时和图层内存。will-change 只在需要时启用，设备模拟不等于真机性能；不预设 transform 版必然最优。',
  ],
  '04-重排重绘与性能影响.md': [
    '读写交错后读取尺寸容易强制布局；把所有读操作移到写操作前再录制。报告调用栈、次数和耗时，不能仅根据 FPS 平均值判根因。',
    '每次重置样式并单独测试 width、color、transform 与尺寸读取；区分触发失效和立即同步布局。没有脏布局时读 offsetWidth 未必产生新的 Layout。',
    '保持筛选数据相同，比较全量重建、批量插入和窗口渲染。Fragment 不保证大幅提速；rAF 是帧内合并而非时间防抖。恶意标题按文本显示，旧查询不覆盖新查询。',
  ],
  '01-语义化标签体系.md': [
    '页头 header、导航 nav+a、正文 main+article、侧栏 aside、页脚 footer；标题用 h1/h2，日期用 time datetime。布局 class 可保留；无障碍树应出现可命名区域。',
    '用一个 main 包含三篇 article，details 内首个 summary 提供名称。Tab 能展开折叠并进入链接；视觉容器需要时可用 div，不为了禁用 div 滥用 section。',
    '逐站记录 landmark、可访问名称、标题和键盘路径。多个 main 需检查是否只有一个可见主内容；标题问题按内容层级判断，不能把机械跳级当唯一判据。',
  ],
  '02-表单验证与约束.md': [
    'required、pattern、minlength/maxlength、type=email/url、min/max 组合约束；两次密码变化都重新 setCustomValidity，匹配时清空消息。空年龄应允许，0 和 121 拒绝。',
    '字段 touched 后才展示错误；novalidate 关闭原生弹框后仍在提交时 checkValidity 并聚焦首错。密码从不匹配改为匹配后，旧自定义错误必须消失。',
    '强度函数返回等级与中文解释，分别测 123456、abc123、Abc123!x；强度条不只靠颜色。规则是练习策略，不作为生产密码安全评估的完整替代。',
  ],
  '03-ARIA与可访问性实践.md': [
    '导航用真实 href 的 a；搜索用 button 和 aria-label，装饰图标隐藏于无障碍树。Tab、Enter、Space 与浏览器打开新标签行为都应按元素语义工作。',
    '打开时记住触发点、移入焦点，关闭还原；背景用 inert 阻止交互并正确管理 aria-hidden。Tab/Shift+Tab 循环且 Esc 关闭；无焦点元素时聚焦 dialog。',
    '逐项记录可访问名称、键盘阻塞和对比度；自动报告之外手工走主旅程。提交至少三个有元素定位和修复建议的问题，不用 Lighthouse 分数代替完整审计。',
  ],
  '00-CSS选择器-层叠-继承与单位.md': [
    '先比较来源/重要性/层，再比较特异性和顺序；同层同特异性后声明胜出。逐条预测与 Computed 对照，important 的层顺序和普通声明相反。',
    '声明 layer 次序，用低特异性 class 和语义变量暴露主题覆盖。主题切换后所有按钮颜色一致，工具层只覆盖其职责，组件不依赖 ID 或 important。',
    '把 margin-left/right 换为 margin-inline，检查导航与图标。方向箭头可镜像，品牌/照片通常不镜像；长英文和阿拉伯文均不能撑破布局。',
  ],
  '01-盒模型与视觉格式化模型.md': [
    'content-box 外宽为 200+40+10=250px；border-box 外宽 200px、内容宽 150px，不计 margin。用 getBoundingClientRect 和 Computed 核对。',
    'flow-root 包住浮动并隔离父子外边距折叠；两栏明确浮动和剩余块的宽度。分别去掉 flow-root 证明父高或间距变化，不能只看最终截图。',
    '切换 BFC 前后记录元素矩形与父子间距；offsetTop 受 offsetParent 影响，最好同时记录 getBoundingClientRect。兄弟 margin 折叠不能靠父 BFC 一概消除。',
  ],
  '02-Flexbox完整指南.md': [
    '用 flex、菜单组与操作组的 auto margin 分配空闲空间；若要求菜单几何中心，左右组不等宽时需另设对称区域。长 Logo/菜单下检查缩窄策略。',
    'flex-wrap 与 flex:1 1 280px 控制换行，卡片内部 column 且按钮 margin-top:auto。320px 只能一列，“至少三列”仅适用于有足够空间的容器。',
    '根容器有明确高度，消息区 flex:1、min-height:0、overflow:auto；气泡用 margin-inline-start/end:auto。长消息不挤走输入框，键盘焦点可进入滚动区。',
  ],
  '03-Grid完整指南.md': [
    '用 repeat(n,minmax(0,1fr)) 在断点切换 4/3/2 列，图片 aspect-ratio:1 和 object-fit:cover。长标题与图片加载前后不改变预定格子宽度。',
    '特色文章 span 2 列/行，小屏重置 span 为 1；视觉排序保持阅读顺序。测试 1、2、7 篇文章和长内容，不让空轨道造成横向滚动。',
    '同一 DOM 的 header/main/aside/footer 切换 template-areas；所有命名区域必须形成矩形。视觉改变后 Tab 顺序仍按 DOM，应与使用旅程一致。',
  ],
  '04-层叠上下文与z-index.md': [
    '先画层叠上下文树再比较同级 z-index；普通 static 元素不生效，但 flex/grid item 有例外。子节点的大 z-index 不能越过低层级父上下文。',
    '统一 overlay 根和层级变量，每次打开分配顺序；避免祖先 overflow 裁剪，可用 portal 或 top layer。关闭顶层后还原焦点并核对背景不能误点。',
    '明确 A 与 D 是可比较的同级上下文且 A 排在 D 下方，才有 C 无法越过 D 的结论。移出 A 或改变 A 层级会改变结果；Layers 不等价于层叠树。',
  ],
  '05-排版-颜色-图片与基础动画.md': [
    '正文限制合理行宽、行高和字体回退；pre 可局部滚动，链接有可辨识样式。200% 缩放和长代码下正文无整体横向滚动，不能固定高度截断文字。',
    'srcset 描述真实资源宽度，sizes 匹配 CSS 布局；记录 currentSrc、DPR 和缓存条件。切窄后可能保留较大缓存图，不把它直接当选择规则失效。',
    '同设备相同轨迹测 left/transform，记录布局与合成成本；reduced-motion 直接进入终态。不能把 transform 视为无栅格化、无内存代价的承诺。',
  ],
  '01-媒体查询与容器查询.md': [
    '默认窄屏样式，min-width:768px 展开导航。767/768px 逐点验证；只展示图标的静态练习需清楚标记，实际导航按钮还必须实现展开交互。',
    '在外层设 container-type:inline-size，卡片用 @container(min-width:400px)。同视口把组件放入 300/600px 两容器，应同时出现上下与左右两种布局。',
    '系统主题通过 prefers-color-scheme 改变量，reduced-motion 覆盖初始 opacity 和动画。禁用动画后内容立即可见，不能停在透明起始状态。',
  ],
  '02-CSS变量与@layer.md': [
    '在 :root 定义语义颜色、间距和圆角；卡片 var(--token,fallback) 引用。删除某个变量后回退生效，单改 token 能影响所有消费者。',
    '先声明 reset,base,components,utilities；普通 utilities 后层覆盖 components，普通未分层声明优先。再用 important 实验层序反转，记录规则来源。',
    '用 :has(select option[value="dark"]:checked) 等选择变量组；不支持 :has 时提供默认可读主题。键盘改变 select 后三套颜色均更新，不能只改变背景。',
  ],
  '03-移动优先与适配策略.md': [
    '先写 320px，min-width:768px 展开链接；44px 为练习触控目标。若汉堡为交互按钮须有名称和展开状态；横向滚动与键盘操作均检查。',
    'picture 的 source media 负责裁切方案，srcset/sizes 负责分辨率；用本地实际图片且注明尺寸。639/640/1024px、不同 DPR 和长标题逐一验证。',
    '用 fluid grid、clamp 与逻辑尺寸适配，安全区使用 env；交互反馈不依赖 hover。减少动画、深色模式、200% 缩放与 1920px 行宽均有记录。',
  ],
  '01-HTTP协议与版本演进.md': [
    '先用方法、状态码和 Content-Type 判断请求语义，区分 204 无正文、304 复用缓存与 4xx/5xx。保留完整头部来源，不把状态码等同于业务成功。',
    'Network 记录实际 method、路径、请求/响应头与 Queueing/TTFB/Download；TTFB 包含网络与服务端等成本，不能直接称为服务器计算时间。',
    'Protocol 列核对 h2/h3/http1.1；在隔离资料的无敏感请求上导出日志。多路复用共享连接，但拥塞与队头阻塞机制不同；未协商 h3 不等于浏览器不支持。',
  ],
  '02-缓存策略与CDN.md': [
    '对照 fresh、stale、ETag 与 revalidation 的含义解释 200/304/from cache；no-cache 允许存储但要求验证，no-store 才是不存储指令。',
    '哈希 JS/CSS 长缓存，HTML 每次验证；curl -I 核对头，带 If-None-Match 核对 304。修改内容要产生新文件名并让 HTML 引用新路径。',
    '逐类记录缓存头、哈希、Vary 与用户数据范围。不能把 CDN HIT 等同于浏览器缓存；登录数据需检查 private/no-store，分析建议不能仅按缓存时长大小排序。',
  ],
  '03-DNS-TCP-TLS握手过程.md': [
    '画出解析、连接、TLS 与 HTTP 顺序；HTTP/3 使用 QUIC 而非 TCP。证书验证与加密作用分开解释，连接复用时部分步骤不会重新发生。',
    '同页面冷/热条件重复测量；DNS 缓存、连接复用和会话恢复会让 Timing 某段缺失。缺失不等于零成本，国内/国外标签不能代替实际网络证据。',
    'preconnect 指向实际关键来源并匹配 crossorigin，dns-prefetch 仅预解析。对比相同条件的连接 Timing 与首屏，过多预连接也可能浪费资源。',
  ],
  '01-Elements与Styles调试.md': [
    '记录实际元素而非假定一定是 nav；Computed 测宽高和四层盒模型。页面缩放、border-box 与继承规则写入记录，工具内修改刷新后通常消失。',
    '按未匹配、被覆盖、失效声明和盒模型逐项定位。每改一条规则先预测结果；回源文件后刷新验证，不能把 DevTools 临时修改作为已交付代码。',
    '记录字体、间距、shadow 和 hover 来源，用自己的练习页复现同类布局。强制 :hover 时同时检查键盘焦点；色值需连同对比度和背景一起解释。',
  ],
  '02-Network面板与性能分析.md': [
    '区分资源大小与传输大小、DOMContentLoaded 与 load；Network 保留重载记录。缓存或压缩使大小不同，不能把所有请求字节相加当内存占用。',
    '固定网络/CPU 设置录制；Bottom-up/Call tree 找主要耗时，长任务看总时长和调用栈。Lighthouse 是实验条件结果，与主线程 trace 互相印证。',
    '每次只改一个瓶颈，相同条件重复测并报告分布。分数未升也保留数据；成功条件应包括具体资源/延迟改善和正常功能未回归。',
  ],
  '03-Sources断点调试与性能面板.md': [
    'Console 的 $$ 是 DevTools 工具，不是网页标准 API；复制成脚本时用 querySelectorAll。console.timeEnd 名称匹配；表格仅输出练习页非敏感字段。',
    '在异常点暂停，检查数据结构、变量作用域、调用栈和事件入口；只修违反契约的那一处。重试/重复点击仍可用，不能通过 catch 吞掉错误消除红字。',
    '图片 snippet 输出 currentSrc/alt/尺寸，资源 snippet 读取 PerformanceEntry。恢复临时边框；跨源资源详细 Timing 受 Timing-Allow-Origin 限制。',
  ],
  '00-控制流-数组-对象与常用内置对象.md': [
    'filter 取已发布，reduce 统计，Set 去重标签，toSorted 或复制后 sort，find 按 ID 查询。空数组返回空结果；冻结原数组后运行证明没有原地修改。',
    '索引用 Map 且明确重复 ID 拒绝或覆盖策略；筛选组合先规定标签 AND/OR。测试大小写、空 keyword、未知 status 与缺失字段，禁止依赖偶然 truthy 值。',
    '内部存 ISO 时间点，用 Intl.DateTimeFormat 指定 locale/timeZone；按该时区年月日分组。夏令时日不总长 24 小时，非法日期返回明确错误。',
  ],
  '01-变量-类型-运算符.md': [
    'const PI=3.14；允许重赋值的名字用一次 let 声明；age 放块内并只在有效作用域访问。var 重复声明本身合法但容易误用，let 重复声明是语法错误。',
    '返回 {text:strings.reduce((sql,part,i)=>sql+part+(i<values.length?`$${i+1}`:""),""),values}。单引号保留在 values；SQL 标识符不能使用值占位符，必须另设白名单。',
    '按表达式上下文依次为 ""、"[object Object]"、"[object Object]"、2、1、NaN、2、"53"、true、1。单独在 Console 输入 {}+[] 可能把 {} 解析为代码块，必须说明语境。',
  ],
  '02-函数-作用域-闭包.md': [
    '表达式 const multiply=function(a,b){return a*b}；箭头 const multiply=(a,b)=>a*b。调用声明可早于定义，表达式不能在初始化前调用；箭头没有自身 this/arguments。',
    '闭包保存 called 和 result；首次成功后后续返回同一 result，并用 apply 保留 this。明确首次抛错是否允许重试，异步场景保存 Promise 防止并发重复执行。',
    '返回 x=>fns.reduceRight((value,fn)=>fn(value),x)。compose()(x) 返回 x；多参数首函数或异步 compose 需要另定契约，不把同步一元版说成支持所有函数。',
  ],
  '03-this绑定与call-apply-bind.md': [
    '成员调用 this 为接收者，call/apply/bind 显式绑定；箭头继承定义时 this。提取方法后无接收者，在严格模式 this 为 undefined，读取 this.name 会抛错。',
    'logPerson 用普通函数读取 this，分别 call(alice)/apply(bob)。bind 返回新函数且不会立刻调用；箭头版不能用 call 改变词法 this。',
    '外层普通函数保存本次 this/args，timer 内 fn.apply(context,args)。虚拟计时验证最后一次参数和接收者、节流首尾策略；提供 cancel 后不能继续触发。',
  ],
  '04-原型链与继承.md': [
    '实例指向构造函数 prototype，再到父 prototype、Object.prototype、null；构造函数自身也是对象。分别验证 Object.getPrototypeOf(实例) 与构造函数，不混淆两条链。',
    '$ 保存节点集合，addClass/removeClass 放共享 prototype，return this 支持链式调用。两个实例的方法应严格相等；空集合调用不报错，类名按 classList 规则处理。',
    'Child.prototype=Object.create(Parent.prototype)，恢复 constructor，Object.setPrototypeOf(Child,Parent) 继承静态方法。经典模拟无法完整等价于内建 class/私有字段语义，必须标明边界。',
  ],
  '05-ES2022-2026新特性速查.md': [
    '用 at(-1)、Object.hasOwn、?? 等时逐项核对语义。?? 只替换 null/undefined，不能把 0/false/"" 当缺失；hasOwn 在空原型对象上仍可用。',
    '权限用 Set.has，required.difference(userPermissions) 求缺失。测试空集合和未知权限；上线前检测 Set 新方法能力，客户端权限计算不能替代服务端授权。',
    'DateAdapter 输出指定时区小时，再 groupBy 上午/下午/晚上。测 UTC 跨日、非法时间与无 Temporal 的运行时；分组结果缺失的键应允许不存在。',
  ],
  '06-DOM事件与事件委托.md': [
    'createElement/textContent 生成节点，稳定 ID 连接数组与 DOM。标题 "<img>" 显示原文；删除不存在的 ID 不误删最后一项。',
    '从 event.target.closest("[data-action]") 定位动作，再检查容器 contains 与行 ID。图标/文字/新行共用监听；容器外或未知动作不执行特权操作。',
    'tablist/tab/tabpanel、aria-selected 与 roving tabindex 同步；Home/End 与方向键按方向处理。移除控件统一清理监听；鼠标切换后键盘焦点仍在选中 tab。',
  ],
  '07-Fetch-表单与浏览器存储.md': [
    'URLSearchParams 编码 keyword/page，检查 response.ok 与 MIME 后解析 JSON；signal 传入 fetch。分别测 401、500、HTML 响应、坏 JSON 与取消，取消不伪装成服务器失败。',
    'schema 版本与字段校验后才恢复；坏 JSON/未知版本走默认值或明确迁移。storage 事件只通知其他文档，同页需自行更新；拒绝存储时仍可继续临时使用。',
    'IndexedDB 保存 operationId、articleId、最终意图与状态；同文章收藏/取消合并，但已发送操作不能随意删除。重复同步由服务端幂等，失败可重试且不无限循环。',
  ],
  '08-错误处理与调试.md': [
    '区分校验、认证、服务故障、协议解析、用户取消与存储失败。取消静默结束 loading，401 引导登录，配额失败提示导出；不将错误文本直接渲染为 HTML。',
    '错误对象保留 cause/status/requestId，序列化采用字段白名单。向用户给稳定提示，日志不含 Cookie、Token、密码和完整请求体；未知异常返回通用信息。',
    '令旧请求延迟长于新请求稳定复现；序号守卫决定是否写 UI，AbortController 节省工作但不能单独保证所有后续回调停止。取消后 loading 不能覆盖新请求状态。',
  ],
  '01-事件循环与任务队列.md': [
    '先列同步输出，再逐步排微任务和定时器；Promise 回调与 queueMicrotask 按排入顺序处理。把实际代码在指定浏览器执行，嵌套微任务也在本次检查点耗尽。',
    '首次日志排一个 queueMicrotask，后续只入缓冲；flush 拿出当前批次后清空调度标志。同步三条日志一次输出，flush 中新增日志不丢失也不无限递归。',
    '用自己的任务模型显示栈/任务/微任务变化，单步执行与事件记录一致。它是教学模拟，不能声称浏览器真实暴露内部队列；给无限微任务场景设置步数上限。',
  ],
  '02-Promise链与错误处理.md': [
    '每层 then 返回下一步 Promise，末尾 catch 分类、finally 清 loading。登录失败时不获取资料；渲染错误也进入错误路径，不能漏 return 造成提前完成。',
    'Promise.resolve 接受普通值/thenable；按索引存结果，计数归零 resolve，首个拒绝 reject。空输入立刻 resolve([])，完成顺序不同仍保持输入顺序。',
    'limit 为正整数，启动有限 worker，完成后取下一索引。延迟夹具证明峰值不超 limit、结果顺序稳定；明确 fail-fast 或收集错误政策，失败时不能永久卡住。',
  ],
  '03-async-await原理与实践.md': [
    '每次 await 的依赖与原 then 链一致；独立请求才并行。catch 内有恢复或重新抛出，finally 管理 loading；不能捕获后返回 undefined 冒充成功。',
    'sleep 返回计时 Promise；重试只针对可恢复且可安全重放的操作，有次数上限与退避。最后一次失败抛原始原因，取消时清定时器并立即结束。',
    '队列分 pending/running，稳定优先级与 FIFO，完成或拒绝都释放槽。验证 concurrency 上限、任务抛错继续推进、空队列 idle 与等待任务取消。',
  ],
  '04-AbortController与并发控制.md': [
    '设 controller 与 timer，finally 清 timer，保留原有 signal 的取消。区分 timeout 与用户取消；HTTP 500 不等于 fetch 网络拒绝，仍需 response.ok 检查。',
    '切 Tab 时 abort 旧请求并递增序号；返回前核对当前 Tab/序号。A 慢 B 快时只显示 B，卸载后不更新，错误和 loading 都遵循同一守卫。',
    '每个分片有 ID/大小/摘要和重试状态，暂停停止新调度，取消 abort 在途请求。恢复先核对服务端清单，重复片幂等，最终合并由服务端重新验证完整文件。',
  ],
  '01-迭代器与生成器.md': [
    'Symbol.iterator 返回新的遍历器或 generator，沿 next 指针 yield value。空链表输出 []，两次独立遍历互不影响，提前 break 不破坏链表。',
    '用 [a,b]=[b,a+b] 惰性推进，take 单独消费且限制 n。按题目约定起始 0/1；大整数超安全范围时改 BigInt，不能把溢出当正确结果。',
    '异步 generator 在每次 yield 前 await 一行；消费者 for await 过滤。正常 EOF、解析失败、提前 break 都关闭底层 reader；不能预先把全部日志读入内存。',
  ],
  '02-Proxy与Reflect.md': [
    'set 中核对 key/type 后 Reflect.set 并返回布尔值；非法 port 应抛出或返回失败且原值不变。未知字段与删除策略明确，不能把字符串 "3000" 自动当 number。',
    '依赖用 WeakMap→Map→Set 收集；重新运行前清旧依赖，stop 后不再触发。computed 缓存按失效标记刷新，数组 length/索引和批处理要有专项边界测试。',
    '缓存方法名+参数并保留 this；对象参数按身份还是内容须先定规则。设置大小上限，原对象变更需失效策略；相同参数命中次数通过计算计数证明。',
  ],
  '03-内存管理与垃圾回收.md': [
    '有界创建 10 秒后停 timer；快照查看全局数组的 retained path。清引用后允许 GC 再比较，单次 heap 下降或未下降都不足以证明完整修复。',
    '注册 heldValue 不得反向强引用被追踪对象；unregister 用 token。FinalizationRegistry 回调时机不保证，不能作为关闭文件、释放连接或必需日志的唯一机制。',
    'WeakMap 记录 {value,expiresAt}，get 时检查并删除过期项；用可注入时钟测试边界。WeakMap 不可枚举，不能提供真实全量 size 或定时扫描所有键。',
  ],
  '04-Web-Workers与多线程.md': [
    'worker 接收 jobId/n，主线程匹配结果；约束 n 和任务数，显示 loading/error/cancel。计算中按钮仍响应，worker 异常或 terminate 后 UI 恢复。',
    '从小数据开始，线程数和总字节设上限，TypedArray buffer 转移前记录所有权。合并后与单线程排序结果一致，报告复制/合并成本，不保证核心越多越快。',
    'Worker 算摘要，服务端确认已存在的分片，上传有限并发并最多重试三次。摘要只能识别内容不能授予文件访问；取消/断网/重启后进度正确恢复。',
  ],
  '01-基础类型与类型推断.md': [
    '定义 CartItem 与 cart:CartItem[]，参数明确 number/string。价格/数量运行时检查有限非负值；编译拒绝错类型并不保证网络 JSON 合法。',
    '判别联合 switch 覆盖所有状态，default 将值赋给 never。新增一个状态应导致类型失败；状态存在与允许转换是两回事，还需测试非法转换。',
    'JSON 先作 unknown，apiFetch<T> 接收 validator 才能返回已验证 T。单靠泛型不能自动证明 JSON 类型；坏结构、非 JSON 与 HTTP 错误均须拒绝。',
  ],
  '02-接口-类型别名-泛型.md': [
    '必填与可选字段分开，debug 默认值在运行代码赋值；interface 不会初始化对象。用 satisfies 检查示例配置，错字段/缺字段应编译失败。',
    'pick<T,K extends keyof T> 遍历 keys 拷贝选中键；返回 Pick<T,K>。空键返回 {}，原对象不改，编译拒绝未知键；类型断言只限已证明的构造内部。',
    '为 2-5 段函数提供泛型重载，前输出连接后输入。合法管道推断最终类型，插入不兼容函数编译失败；同步版不默认支持 Promise。',
  ],
  '03-条件类型与模板字面量类型.md': [
    'mapped type 将每字段关联 Validator<Fields[K]>。age 的验证器接收 number；字符串规则用于 age 时应编译失败，运行时校验仍须单独实现。',
    '模板字面量匹配固定路径结构并 infer 每段，结果 userId/postId 为 string。非法或额外路径段按规则返回 never；编译期路径解析不替代 URL 运行解析。',
    '先保留函数可调用，再递归对象/数组并添加 readonly。嵌套赋值应编译失败；Date/Map/Set 需明确特殊策略，类型只约束使用方式，不会冻结对象。',
  ],
  '04-工具类型与类型体操.md': [
    'Partial 表示覆盖配置，Pick/Omit 限制字段，Required/Readonly 表达不同契约。构造最终配置还要合并默认值；optional 不代表字段永远存在。',
    '对元素类型分布判断是否数组并提取其元素，实现只展平一层。分别断言 number|number[]、string[][]、空 tuple；类型转换不负责实际执行 flat。',
    'keySelector 返回 K extends PropertyKey，结果用 Partial<Record<K,T[]>>。没出现的 key 必须可能 undefined；Object.groupBy 返回空原型对象，不能假定有 hasOwnProperty。',
  ],
  '05-tsconfig配置与工程化集成.md': [
    'strict=true，module/moduleResolution 与实际 Node 或 bundler 匹配，构建目录独立。tsc --noEmit 先检查，再实际运行输出；emit 成功不代表能解析运行时模块。',
    '类型层按点路径递归索引并传播 undefined，运行时 get 保留默认值语义。未知路径编译拒绝或返回明确 fallback，深度设边界避免类型递归爆炸。',
    'hook 调用整个项目 typecheck，不能把暂存文件名传给 tsc 绕开 tsconfig。CI 使用锁文件并保留独立类型 job；故意错类型时失败，修复后通过。',
  ],
  '01-ESM规范与动态导入.md': [
    '每文件显式 export/import，HTML 只有 type=module 入口；通过本地 HTTP 加载。删除一个导出应出现明确模块错误，模块默认严格模式且不泄露到 window。',
    '登记 key→import 函数，缓存进行中的 Promise，失败后允许重试。相同 key 并发只加载一次，未知 key 拒绝；动态模块路径不能直接接受用户任意输入。',
    '记录首屏和一次实际操作触发的 chunk 请求、Initiator、缓存头。开发服务器模块数不等于生产 chunk 数；观察结论只适用于所录版本与路径。',
  ],
  '02-CommonJS与互操作性.md': [
    'date/filter/logger 各 module.exports，入口 require 相对路径。至少一个直接导出函数；验证依赖方得到函数而非误写 exports=fn 后的空对象。',
    'type=module 中 .js 为 ESM，.cjs 为 CJS，createRequire(import.meta.url) 提供同步 require。显式文件后缀和默认/具名互操作实际运行验证。',
    'exports 按 import/require/types 指向真实产物，npm pack 后独立消费者安装。CJS 与 ESM 都实际调用，未公开深层路径拒绝，不能只测试仓库源码相对路径。',
  ],
  '03-pnpm与Monorepo入门.md': [
    'workspace 配 apps/*、packages/*，依赖使用 workspace:*；根统一安装。改 shared 后两个消费者测试都变化，不能借提升依赖隐式访问未声明的包。',
    '配置/纯业务/UI/应用按职责拆包，消费者只走 exports。禁止 ../shared/src 逃逸；独立 pack 安装暴露缺产物与漏依赖。',
    '基于 Git 变更构建反向依赖集合，共享配置变化触发全部相关消费者。测试新文件、删除包和基线 SHA 缺失时的保守全量回退，不只按目录过滤。',
  ],
  '01-JSX-组件-Props-State.md': [
    'setCount(c=>Math.max(0,Math.min(99,c+delta)))，重置为 0。测试 0 减一、99 加一和快速连点；不能只把边界按钮变灰而让状态函数仍越界。',
    '每项稳定 ID、priority 与 createdAt，筛选派生而不修改原列表。新增高/中各一条后筛选高仅一条；价格或日期格式不要在 state 重复存派生值。',
    '编辑草稿与已保存内容分离，Enter/blur 提交、Esc 回滚，并避免 Enter 后 blur 重复提交。开始编辑聚焦 input，结束返回对应按钮；空标题有错误提示。',
  ],
  '02-Hooks核心-useState-useEffect.md': [
    'effect 创建 interval 并返回 clearInterval；状态从新 Date 读取真实时间。卸载再挂载只有一个有效 timer；后台节流后恢复不能按 tick 次数累加误报时间。',
    '500ms timer 清理，请求采用 signal 或序号守卫；query 更新时旧结果与旧 finally 都不可覆盖新状态。慢旧请求、快新请求、卸载与失败分别验证。',
    '监听、计时和请求 Hook 各有清理；useInterval 的最新 callback 与调度周期分开管理。依赖改变重订阅，卸载后无监听/timer，泛型请求另做运行时数据校验。',
  ],
  '03-进阶Hooks-useReducer-useMemo-useCallback.md': [
    'reducer 对 add/like/delete 返回新对象，ID 定位且未知 action/ID 有规则。点赞只改变目标项；reducer 不请求网络、不写存储、不生成不稳定外部副作用。',
    '输入立即更新，deferred query 控制昂贵筛选，memo 只缓存纯计算。Profiler 证明成本减少；useDeferredValue 不减少网络请求数，虚拟化需独立实现。',
    'combineReducers 将 action 分发到各 reducer，中间件 next 组成固定链；日志只在外层记录。测试顺序、错误和前后状态，教学实现不等同完整 Redux 生态。',
  ],
  '04-Server-Components与Server-Actions.md': [
    '服务端读取本地 JSON，点赞交互拆为 use client 子组件，仅传可序列化 props。检查客户端 bundle 无文件系统模块或服务端秘密，列表失败有恢复入口。',
    'Server Action 在服务端校验输入与身份，useActionState 使用 previousState/formData 签名；useFormStatus 在表单子树内。空留言不写入，成功后排序与缓存一致。',
    '临时 ID 标记 pending，服务器返回稳定 ID 后对账，失败移除并保留草稿。并发成功次序不同也不重复；乐观 UI 不替代服务端幂等。',
  ],
  '05-并发渲染与Suspense.md': [
    'lazy 在模块顶层定义，fallback 保留卡片尺寸，并用 ErrorBoundary 处理导入失败。Suspense 等待组件代码，不自动等待 img 下载。',
    'Promise 由缓存/数据层稳定提供，不能每次 render 新建；Tab 切换用 transition 并分别设 Suspense。测试慢响应、失败与快速切换，旧 Tab 数据不串入新 Tab。',
    '给三个稳定 Promise 设 1/2/3s 延迟并独立边界，记录各块出现时间。客户端渐进显示属于教学模拟，真实 SSR streaming 还需服务端 HTML 流证据。',
  ],
  '06-Ref-Context-性能优化.md': [
    '非受控 input 用 ref 或 FormData 读值；memo 的 props 保持稳定。主题 Context 消费者仍会更新，不能保证所有输入不渲染；Profiler 核对实际消费者边界。',
    '窗口范围与 overscan 控制 DOM，观察尾部 sentinel 加下一页，request key 防重复。测试最后页、网络失败和滚动位置恢复，聚焦行不能被回收而丢焦点。',
    '固定数据/设备记录实际交互，先定位重渲染与昂贵计算。逐项改进并对比 actualDuration 分布；一次 render 次数下降不能证明用户延迟一定改善。',
  ],
  '01-模板语法与响应式基础.md': [
    '商品数量保存于 ref 数组，computed 求单价×数量合计，数量最小 0。增减后总价正确，删除全部出现空态；金额用整数分避免浮点误差。',
    'computed 派生标签筛选，selectedIds 用稳定 ID；删除只操作选中行。隐藏面板 v-show 保留状态，切换筛选后不误删未选中数据。',
    'WeakMap 保存 target/key 的 effect 集合，读取 track、写入 trigger；ref 用 getter/setter。分支切换需清旧依赖、stop 停副作用；不要声称简化版完整等价 Vue。',
  ],
  '02-Composition-API与script-setup.md': [
    'Props 初始值复制成表单草稿，提交 emit 新对象；defineModel 明确类型。编辑不直接改父数据，取消不污染原值，姓名/邮箱/角色均有合法值验证。',
    '拖拽以 ID 排序，选择集合独立于展示顺序；watch 只持久化必要数据。刷新后顺序恢复，删除已选项同步移除 ID，并提供键盘排序替代。',
    'provide 统一通知动作和列表，Teleport 放 DOM 容器，按 ID 管 timer。四类通知有文本语义，卸载清 timer，移除通知后旧 timer 不影响其他条目。',
  ],
  '03-计算属性-侦听器-生命周期.md': [
    'computed 分别定义字符/行/段落规则，watch 处理保存副作用；空内容边界明确。1000/1001 字触发预期提示，旧保存结束不能覆盖新草稿状态。',
    '历史保留最多 10 份不可变快照，内容相同不新增；恢复后 nextTick 再滚动。卸载清插件与监听，恢复旧版本不会意外触发重复历史条目。',
    '明确 debounced ref 是延迟更新目标值，源值仍即时；watch 调度并清旧 timer。用假时钟验证首尾策略、delay 改变及卸载，不用 console 日志代替断言。',
  ],
  '04-组件通信与插槽.md': [
    '用判别联合区分 text/image/file，事件带稳定消息 ID；actions 插槽可替换。缺头像回退，HTML 消息按文本渲染，未知类型在类型检查/运行校验被发现。',
    'visible 单一状态源，插槽 close 发出更新事件；方向控制 transform。开关、Esc、背景点击、焦点返回与 reduced-motion 均测试，动画结束不能重复关闭。',
    'provide 注入 readonly 响应式权限与动作，行读取而不改权限。切只读后所有操作同步禁用；服务端仍检查资源权限，隐藏按钮不等于访问控制。',
  ],
  '01-组合模式与Render-Props.md': [
    'Card 只负责壳与 slots，用户/商品/文章内容由消费者组合。用三个实例证明无类型分支膨胀；默认插槽为空仍保持合法结构与可访问名称。',
    'ListManager 管状态/分页，render props 输出 UI；异步结果按请求序号处理。空列表、失败重试、刷新和末页各有测试，重复加载不新增重复 ID。',
    'SearchPanel 保存 query/filter/sort 并暴露状态与动作，不理解订单/用户业务字段。两个消费者独立运行，改变筛选重置分页，不能共享意外全局状态。',
  ],
  '02-受控与非受控组件.md': [
    '字段 state 单一来源，实时校验与提交校验共用纯函数。长度练习规则不是生产密码政策；复制请求绕过 disabled 时服务端也拒绝非法数据。',
    '用 value!==undefined 判断受控，不能用 truthy；内部值只在非受控时更新。测试空字符串、父值更新、defaultValue 初值以及受控模式切换的警告/策略。',
    '纯函数管理 values/errors/touched，适配层订阅与更新；字段规则在核心执行。React/Vue 运行同一组输入断言，异步校验旧结果不得覆盖新输入。',
  ],
  '03-Compound-Components模式.md': [
    '根保存展开 ID 集合，Header 用 button+aria-expanded/controls，Panel ID 唯一。单开与多开切换正确；子组件脱离根容器应给明确错误。',
    '根 Context/provide 共享选中路径，子菜单独立展开；hover 同时提供键盘/click 路径。深层 Item 正确高亮祖先，Esc 与方向键不把焦点留在隐藏项。',
    'Form.Item 挂载注册、卸载注销字段，Submit 读取 submitting。重复字段 ID 拒绝，异步校验按版本对账；两表单同页互不串值。',
  ],
  '04-高阶组件与自定义Hooks.md': [
    '把行为抽 Hook/composable，渲染仍由组件负责，保留同一权限契约。比较重构前后允许/拒绝状态；代码更短不是唯一成功标准。',
    '上次请求结束后才排下一次 timer，stop/卸载取消 timer 与在途工作。慢请求下峰值并发为 1，一次失败后按规则继续，更新 interval 不创建双循环。',
    'in-flight Map 缓存进行中的 Promise，finally 清理；B 的 key 依赖 A 成功数据。测试两个消费者共用请求、A 失败不发 B、用户变化清除旧依赖结果。',
  ],
  '01-状态提升与Context注入.md': [
    '状态与动作 Context 分开能减少只消费动作组件更新，数量消费者还需独立值/selector。三个通知按 ID 计时移除；未读数变化有测试，不假定普通 Context 有字段级订阅。',
    '角色派生 UI 权限，权限 Context 与表单局部状态分离。切 viewer/editor/admin 核对行为；消费权限的组件必然可能更新，不要求所有组件绝对零重渲染。',
    '用同一通知与角色用例比较：React 订阅 Context value，Vue 对读取的响应式字段跟踪。记录实际 render/effect，而不是只比较语法或行数。',
  ],
  '02-Zustand实战指南.md': [
    '按 ID 去重收藏，persist 加版本/校验，action 给 devtools 名称。刷新恢复，坏数据回退，退出账号清用户范围收藏；LocalStorage 不保存秘密。',
    '金额用整数分，优惠按最大满足门槛取一个，数量范围校验；auth/cart 明确订阅。100/200 门槛、角色变化和注销后折扣即时正确。',
    'selector 返回稳定值或 shallow 比较，记录 unrelated update 是否触发消费者。手写 selector 仅是实验；相等比较不能隐藏实际变化或无限制造新快照。',
  ],
  '03-Pinia实战指南.md': [
    'state 保存 todos，getter 派生筛选/未完成数，action 更新。持久化带 schema 与错误恢复；删除和切完成后数量一致，不直接解构丢失响应性。',
    '列表与编辑草稿分开，批量操作按 ID，删除二次确认。服务端拒绝不污染列表，重试保留输入；$subscribe 日志脱敏，卸载停止不必要订阅。',
    '插件注入 lastUpdated，undo/redo 保存有限快照并排除恢复操作再次入栈。新修改清 redo，跨 store 快照粒度明确，持久化与撤销不能互相无限触发。',
  ],
  '04-服务端状态与TanStack-Query.md': [
    'queryKey 工厂区分列表参数和详情 ID，mutation 成功 invalidate；乐观删除先取消查询并保存快照。失败恢复正确项，不能用一份旧列表覆盖其他并发成功。',
    'queryKey 包含 debounce 后关键词，getNextPageParam 依据服务端 cursor。切关键词清相应列表位置，末页停止，断网重试不重复条目。',
    '两框架共用 API/key 工厂和同样失败用例；Vue Query 的响应式 key 与 React 重新渲染传 key 分开解释。乐观对账契约应一致，不以框架差异忽略并发。',
  ],
  '01-React-Router-数据加载与嵌套路由.md': [
    '布局用 Outlet，列表/详情用稳定 ID 查找，NavLink 活跃状态明确。直接刷新详情、未知 ID 和父路径均测试；生产服务器需 history fallback。',
    '演示身份只用虚构数据，登录回跳限定同源相对路径；localStorage 不算真实认证。action 写完后 revalidate loader，过期身份与损坏存储不能循环重定向。',
    'loader 接收 request.signal、检查 HTTP 状态、失败交 errorElement；面包屑来自匹配路由。详情 404/断网、编辑独立布局和快速导航取消均可复现。',
  ],
  '02-Vue-Router-导航守卫与懒加载.md': [
    'Hash 模式刷新无需 history rewrite，组件用动态 import。route.params.id 是字符串，先解析校验；非法 ID 显示 404 而不是空白。',
    'beforeEach 排除登录页避免死循环；afterEach 更新 title，未保存离开需确认。参数更新时防止旧请求回填，取消离开保留草稿。',
    'meta.roles 控制 UI，服务端授权另行完成；named view 的 key 与布局匹配。30 分钟过期用实际时间判定，坏存储清理，测试角色拒绝与 1/100/101 边界。',
  ],
  '01-Vite-核心原理与配置.md': [
    'resolve.alias 与 TS paths 对齐，server.port=3333；代理明确是否去掉 /api 前缀。浏览器请求 /api/posts 得到 JSON；代理只用于开发不自动进入生产。',
    '同锁文件与相同缓存条件比较 SWC，Less 注入仅变量避免重复 CSS。Vite 会自动发现预构建依赖，include 用于实际未发现项，不预设 lodash-es 一定有瀑布。',
    'transform 使用 AST 或明确限制教学正则的输入范围，返回 source map。字符串/comment 中的 console.log 不应误改，生产关闭插件，行号由实际源位置计算。',
  ],
  '02-Rspack与Webpack对比.md': [
    'React/TS 转译、SCSS loaders、HTML 与 devServer 逐项配置；类型检查独立执行。HMR 保留状态，资源路径与代理正常，缺依赖应在干净安装暴露。',
    '相同入口/代码/优化配置和硬件测多次冷构建、热更新与 gzip 体积。报中位数和差异，清缓存方式一致，不能把 devServer 启动当完整生产构建。',
    '先列真实 loader/plugin 兼容清单，选择一个路由切片迁移。对比产物、source map、动态 chunk 与测试；保留回退入口，未验证插件标明未知。',
  ],
  '03-资源处理与代码分割.md': [
    '使用本地真实图片与字体，CSS Modules 限定作用域；SVG 组件需要对应转换插件。生产 preview 核对 base 路径、MIME、字体加载与资源哈希，不只看 dist 文件存在。',
    'chunk 策略按实际构建器配置，路由 lazy 才使首屏延迟下载。记录总字节/首屏字节/请求数；vendor 拆分可能增加请求，不把分包数当优化结果。',
    '比较 ESM/CJS 与 sideEffects 声明，副作用模块必须列入保留项。验证 CSS/全局注册仍生效；sideEffects:false 是发布者承诺，误声明会删除必需行为。',
  ],
  '04-环境变量与多环境构建.md': [
    'env.ts 统一解析公开配置，DEV/PROD 表示构建模式相关标志。故意缺 URL 时构建或启动给明确错误；浏览器 bundle 中不能出现私密 API Key。',
    'mode 与 NODE_ENV 分开，staging 也可能是生产优化构建；遍历实际 mode 输出不同目录。类型检查失败中止脚本，逐个 preview 验证地址与面板开关。',
    '同镜像在启动时生成白名单 public config JSON/JS，并正确 JSON 编码值；避免任意 sed 改 minified bundle。两个容器地址不同，注入值含引号仍合法且不执行代码。',
  ],
  '01-ESLint-Flat-Config配置.md': [
    'Flat Config 分 files 指定 browser/node globals，prefer-const 只要求不再赋值的 let 改 const。用独立违规夹具证明 no-console warn 与错误规则退出行为。',
    '按依赖兼容表迁移 parser/plugins，保留有语义价值的规则。逐个修真实问题再运行 lint，不能删规则或仅升级版本来宣称迁移成功。',
    '共享配置按数组导出，应用按 files 追加覆盖；React exhaustive-deps 不应为活动页整体关闭。制造两个项目不同规则夹具，根递归 lint 能定位正确包。',
  ],
  '02-Prettier-Husky-自动化.md': [
    '配置统一 Prettier，保存格式化与 CLI --check 一致。只给本次练习文件格式化，第二次运行无变化；Windows/macOS 快捷键按编辑器环境调整。',
    'lint-staged 只处理暂存文件，typecheck 按整个项目运行；hook 与 commitlint 在隔离练习仓库验证。错误提交被阻断，修复后通过，CI 仍独立检查。',
    '共享包只包含配置、声明必要 peer deps，两个消费者干净安装。使用说明给真实 scripts 和常见失败修复；CI 不依赖编辑器插件或本机全局工具。',
  ],
  '01-分支策略与工作流.md': [
    '在自己的练习仓库分两个逻辑 commit，PR 审阅后 squash；可用本地 bare remote 模拟。查看最终 main 内容与日志，删除分支前确认已合入。',
    '两个 clone 从同一基线改同一行，A 先入主线，B rebase 后处理冲突。保留双方业务意图并运行行为验证，不能用整文件 ours/theirs 草率覆盖。',
    '每周两次发布可选短分支 GitHub Flow/主干开发，依据 review 与回滚能力说明。保护项包括 required checks、review、禁止强推；规范说明紧急修复与失败发布。',
  ],
  '02-合并-变基与冲突解决.md': [
    '先建基线 commit 再建五个练习 commit，确保 HEAD~5 存在。用 pick/fixup/squash/reword 整成三项；比较最终树内容保持一致，仅历史改变。',
    '同步新的 formatDate 签名并修改所有调用，同时保留 formatCurrency。运行两函数的正常与边界验证；rebase 当前补丁的语境与 merge 不同，仔细读冲突。',
    '只在隔离仓库实验；操作前记录 SHA 或 backup branch。reflog 找本地引用并创建恢复分支核对内容；它不能保证恢复未提交文件或已被清理对象。',
  ],
  '01-Vitest单元测试实战.md': [
    '先规定空串、maxLen 与缩略号是否计入长度；至少五例分别覆盖三函数。camelToKebab 的连续大写与 Unicode 策略明确，错误参数不能产生静默奇怪字符串。',
    'mock 网络依赖但断言实际 URL、响应映射与错误 cause；每例清 mock。状态 500 与网络拒绝分别测试，不能只断言 mock 被调用而忽略返回契约。',
    'Emitter 用 Map/Set 管监听，once 在调用前注销避免重入重复；emit 可取快照防回调删订阅干扰。覆盖 off 不存在/重复注册/异常策略，故意破坏 once 后至少一例失败。',
  ],
  '02-组件测试与Testing-Library.md': [
    '按 role/name 找按钮并 userEvent 操作，断言显示值；本练习允许负数，与其他限制计数器契约分开。重复操作和重置测试不读组件内部 state。',
    '可控 Promise 保持 loading，再 resolve []/数据或 reject；findBy 等待结果。测试失败重试与旧查询返回，不能固定 sleep 猜异步何时结束。',
    '以用户步骤测试前进/返回、校验与提交，手机用虚构测试值。返回后输入保留，非法步骤不能绕过验证，提交中重复点击只发送一次。',
  ],
  '03-Playwright-E2E测试.md': [
    '优先本地 Todo，role/label 定位添加、完成、删除。断言 DOM 状态和列表计数；每例清数据，不能依赖公开站点写入或上个测试结果。',
    'route 只 mock API，页面行为真实执行；搜索与分页断言请求参数和渲染。失败保留 trace，截图是辅助证据，不能用截图替代行为断言。',
    '三个 spec 独立准备测试身份或使用明确 fixture，不跨 spec 假定顺序。登录态只用于授权范围，修改后重新读取确认持久化，退出后资源访问被拒绝。',
  ],
  '04-测试策略与覆盖率.md': [
    '日期函数覆盖闰年、时区、夏令时、周起始与非法输入；纯函数无需 UI E2E。覆盖率帮助找未执行分支，加入错误实现或变异验证测试是否真能发现问题。',
    '借阅系统按规则/组件/API/旅程分层；库存并发与权限在集成层，关键借还链在 E2E。比例按风险与成本决定，多项目浏览器配置以真实目标为准。',
    'required/minLength/pattern/compose 每轮先红再绿；正则 global 的 lastIndex 不能让重复校验不一致。100% 分支仍可能漏输入组合，注入错误并确认失败。',
  ],
  '01-GitHub-Actions入门.md': [
    'PR 触发、最小 contents:read、受支持 Node、明确 pnpm 与 frozen-lockfile。lint 成功才 build；先在本地运行同命令，远端未执行时保持待验证。',
    'Node22/24 matrix，缓存 keyed by lockfile/工具版本，concurrency 按 PR 分组。故意测试失败应阻断依赖 build；缓存不能掩盖依赖不完整。',
    '构建产物上传/下载使用同一 artifact 名称，预览任务仅持有最小凭据。fork PR 不得到部署 secrets，不使用提权触发器执行不可信代码；评论步骤需额外权限。',
  ],
  '02-构建-测试-部署自动化.md': [
    '预览链接关联 commit SHA 与构建产物；预览身份/数据与生产隔离。验证页面实际版本与关键旅程，部署成功状态不等于产品运行正常。',
    'production job 受 environment 审批与质量 jobs 控制；通知仅给脱敏错误与日志链接。失败不继续发布，回滚目标是已验证产物；未授权不执行实际远端发布。',
    'Playwright 安装匹配版本浏览器及系统依赖，chromium/firefox matrix 用独立数据。失败时总上传 trace/screenshot，故意失败后可回放且恢复通过。',
  ],
  '01-App-Router与文件约定.md': [
    'layout/page/loading/not-found 按路由边界放置，await params，读取响应检查状态。未知 id 调 notFound；列表慢响应显示骨架，服务端失败不泄漏堆栈。',
    '路由组不增加 URL，独立布局避免地址冲突；@stats 是命名 slot 并提供 default。软导航与硬刷新均检查，不能只测已保留的 slot 状态。',
    '完整 photo 路由与拦截 modal 共存；(.)/(..) 按路由 segment 而非磁盘层数选择。软点击弹窗、刷新独立页、关闭/后退恢复画廊，直接访问也正确。',
  ],
  '02-SSR-ISR-PPR渲染策略.md': [
    'await cookies 的请求依赖会影响动态行为；new Date 本身不保证每次请求重算。用生产 build 与重复请求核对渲染/缓存策略，构建符号以当前版本图例为准。',
    '在固定缓存配置下记录生成时间、revalidate 与请求时刻；开发模式不能作为 ISR 证据。刷新 action 验证权限，失效不总意味着下一时刻立即同步重建。',
    '三个异步 server component 独立 Suspense，记录 HTML chunk 到达与 DOM 出现顺序。100ms 是模拟数据延迟不是端到端 SLA，代理缓冲可能影响流式可见性。',
  ],
  '03-Server-Actions与数据变更.md': [
    'action 验证输入/身份，返回可序列化 state，useActionState(previousState,formData) 匹配签名。成功 revalidatePath，空留言无写入，错误保留表单值。',
    '每表单子树 useFormStatus，乐观删除按 ID 对账，失败回滚。编辑 ID 单一来源；并发其他成功不能被旧快照覆盖，服务端资源授权不可省略。',
    '校验 page/pageSize/keyword 并限制成本，查询宜用 GET/loader，练习 Action 保留明确契约。删除后重新取权威页，不本地乱借下一页；快速搜索只接纳最新结果。',
  ],
  '04-Proxy与Route-Handlers.md': [
    'Route Handler 按 GET/POST/PUT/DELETE 校验内容与 ID，内存数据仅教学用。日志字段白名单，await params；404/405/422 与正常响应都有验证。',
    '密码用慢哈希，JWT 验签并检查 exp/iss/aud，creatorId 取当前身份。最终 Handler 再鉴权授权；一分钟后拒绝，他人 ID 拒绝，不能仅依赖 Proxy 存在 token。',
    '共享限流原子更新，定义存储失败政策；rewrite 保持原方法/正文，避免循环。并发多实例验证总窗口限额，v1/v2 消费者得到不同契约。',
  ],
  '01-Node.js运行时与内置模块.md': [
    '先 readdir/stat 形成源→目标清单，拒绝重名与非预期文件，dry-run 先展示。不存在目录友好失败；只在虚构夹具上执行，部分失败要给已完成列表。',
    'AES-GCM 每次随机 nonce，保存版本/nonce/tag/ciphertext；无密钥时拒绝或安全创建本地测试密钥文件，绝不打印密钥。篡改 tag/ciphertext 解密失败且不产生明文输出。',
    '任务池限制进程数，以参数数组调用工具而非 shell 拼接；先检测工具与输出冲突。子进程错误/超时有结果，主进程不会把部分成功标成全部成功。',
  ],
  '02-Stream-API与缓冲.md': [
    '若 readline 按行解析，先明确只支持不含引号/嵌入换行的简化 CSV；完整 CSV 用成熟 parser。处理 chunk 跨行、空文件、末行无换行，pipeline 失败清临时输出。',
    '目标是固定本地上游，过滤 hop-by-hop 头、传状态/MIME，客户端断开时取消上游。慢上下游有背压和超时；不能开放任意 URL 形成 SSRF/开放代理。',
    '解码器跨 chunk 保留半行，解析后对象模式过滤，聚合有时间窗口/内存上限。坏行策略明确；结果按分钟排序，流中异常拒绝 pipeline 而非吞掉。',
  ],
  '03-Worker-Threads与集群.md': [
    '使用虚构普通字符串计算摘要演示并行，按索引汇总顺序；SHA-256 不用于密码存储。空行/坏输入与 worker 退出有明确失败，线程数和总量受限。',
    'cluster 进程与线程池共享总 CPU/队列预算；校验 n 且上限有界。队列满返回 429/503，客户端取消释放任务，不能每请求新建 worker 或无界排队。',
    '上传校验内容/体积，任务 ID 绑定身份，状态与结果需跨进程共享。重启、任务失败、未知/他人 ID 和结果清理均验证；进程内 Map 不能代表多实例可靠任务状态。',
  ],
  '01-RESTful设计规范.md': [
    '以资源/方法/状态码描述 Todo API，POST 创建返回 201/Location；统一稳定错误码和 requestId。每端点明确身份与资源权限，不把所有错误包成 200。',
    '筛选参数白名单，排序加唯一 ID 打破平局，cursor 绑定排序与筛选。并发插入后遍历不重复；坏 cursor/非法排序拒绝，cursor 不自动提供快照一致性。',
    '新增必填字段是破坏变更，新增可选响应字段通常兼容但严格旧消费者需验证。v1 保留期限与 v2 双读/双写窗口明确，记录消费者迁移与回滚标准。',
  ],
  '02-tRPC端到端类型安全.md': [
    'context/root/messages router 与适配器版本匹配，Zod 验证字段，调用方推断契约。空内容/超长作者失败无写入；类型共享不能替代运行时校验。',
    'JWT 需验签/过期/发行者与受众，ctx.user 由可信身份构造；protectedProcedure 和资源策略分层。别人留言不能删除，客户端 authorId 被忽略或拒绝。',
    '数据库约束建立用户/帖子/评论关系，分页排序加稳定键。注册慢哈希、事务与授权齐全；乐观新增使用临时 ID 对账，失败恢复，SQLite 差异单独记录。',
  ],
  '03-数据校验与错误处理.md': [
    '字段与对象 refine 分别处理局部/跨字段规则；邮箱域名规范化后比较。onBlur 提示与服务端同规则，密码日志不回显，合法修改后旧错误消失。',
    'withErrorHandler 捕获已知类别映射状态，未知返回通用 500+requestId；上下文构造异常也需捕获。日志只取白名单且保留 cause，响应无堆栈/秘密。',
    '前端错误采集脱敏 URL/用户标识，后端未捕获异常告警后优雅退出而非继续运行。聚合保留次数与首末时间；禁止收集完整环境变量或请求头。',
  ],
  '01-PostgreSQL核心概念.md': [
    'movies 用主键与 rating/year 检查约束，虚构 seed 固定可重放；WHERE 筛科幻/年份，再 ORDER BY rating DESC,id。按导演 GROUP BY 统计，空值行为明确。',
    '评论与标签先各自聚合再 join，避免多对多乘积让评论数重复。递归 CTE 明确根/深度/环路策略；无评论文章也应保留。',
    '订单与明细分表，金额整数分或 numeric，明细保存下单快照；多分类用连接表，地址按用户绑定。外键与唯一约束保护不变量，索引依据实际查询。',
  ],
  '02-Prisma-ORM实战.md': [
    'schema 与运行时配置匹配已锁 Prisma 版本，生成 client 后操作 todos。userId 外键与必填约束明确；空库迁移、创建、查询、更新和删除都实际验证。',
    'likes(userId,postId) 唯一防重复，标签查询先定频度规则；全文检索参数通过 tagged $queryRaw。搜索恶意输入不改变 SQL 结构，不能拼接 SQL 字符串。',
    '请求先鉴权/校验/资源授权再调用数据层，slug/id 统一；分页上限固定。测试 401/403/404/422/500 与重复写，不能仅返回 ORM 原始对象。',
  ],
  '03-迁移-事务与索引.md': [
    '生成迁移后读 SQL 检查关联表、约束与数据影响；在隔离空库重放并检查 status。迁移文件由工具生成，已应用迁移不事后手改。',
    '点赞唯一约束+同事务计数，重复点赞不再次累加；注销与定时发布分批需状态机/幂等。并发和中途失败验证不变量，不把大删除包进无限长事务。',
    '先小 seed 再按资源预算扩到 50 万，EXPLAIN(ANALYZE,BUFFERS) 用隔离测试库。相同数据与冷热条件测索引前后，记录写入/存储成本，倍数只报告实际结果。',
  ],
  '01-Docker容器化部署.md': [
    'Dockerfile 安装锁定依赖、构建、非 root 启动；dockerignore 排除秘密与本机产物。镜像实际启动检查页面/API，不能仅证明 build 完成。',
    '多阶段复制 standalone、static/public，Compose 服务用内部 DNS 而非 localhost。readiness 等 DB 可用，持久卷重启数据保留；Redis 故障有明确降级。',
    '开发 watch 与生产镜像分离，CI 发布同一已验证 artifact；buildx 检查目标架构。只在自己环境演练，rollback 与持久数据兼容不能靠重建镜像保证。',
  ],
  '02-Vercel-Cloudflare部署.md': [
    '预览 commit/URL 与生产区分，构建日志核对框架适配和运行时。实际访问公开页与 API；远端未执行只完成配置时标记待验证。',
    'Secret 放服务端环境，公开变量单独列；域名用实际控制的测试子域名。故障仅放预览版本，回滚后检查版本、数据与安全头，不能破坏真实生产来演示。',
    'static export 只承载静态功能，动态 API 另用 Workers/Pages Functions；D1 与 PostgreSQL 差异记录。迁移、授权、读写和错误真实执行，平台未开通不能宣称上线通过。',
  ],
  '03-Nginx-域名与HTTPS.md': [
    '本地高端口 proxy_pass 到真实应用，nginx -t 先检查；hash 静态资源长缓存，HTML/认证页面不同策略。刷新嵌套路由与请求头透传均验证。',
    '用受支持 OS/Node，最小开放端口与 HTTPS；证书续期、反代和安全头逐项 curl 验证。扫描只针对自有域名，评级不能代替应用授权与补丁管理。',
    '四个应用用明确端口 3001-3004，upstream 指向它们，限流返回 429。Brotli 收益实测，日志脱敏；systemd Restart 演练仅隔离服务，重启后检查恢复。',
  ],
  '01-认证授权与RBAC.md': [
    '矩阵包含主体角色/租户/资源归属/状态/动作；默认拒绝，跨租户一律拒绝再评角色。自己草稿可编辑、他人草稿不可编辑的反例必须在服务端执行。',
    '纯策略函数接收已验证身份与资源；表驱动覆盖允许与拒绝，管理员也不能跨租户。未知状态/缺字段默认拒绝，测试不能只覆盖合法组合。',
    '登录轮换 session ID、刷新 token 单次轮换与撤销记录；权限变化即时失效或说明有界窗口。退出/过期/重复刷新/多设备和 CSRF 都验证，前端删 token 不算服务端注销。',
  ],
  '02-限流-幂等与优雅关闭.md': [
    '按端点风险选主体/IP/租户 key，声明窗口/突发/Retry-After 与共享存储。登录与导出预算不同；代理 IP 来源可信，存储失败政策明确。',
    '唯一键+请求摘要原子占位，在同一事务提交业务与可重放结果；同 key 不同 body 返回 409。并发同 body 只写一次，处理中/超时恢复不永久锁死。',
    'SIGTERM 先 readiness=false，撤流后停止接新连接并 drain，期限后强制关闭。listen 已关闭时新请求可能连接失败，503 需关闭前入口明确响应；日志和 DB 在最后关闭。',
  ],
  '03-结构化日志-追踪-健康检查与备份恢复.md': [
    '登录/搜索/发布/审核各事件名，字段包含 requestId/结果/耗时与脱敏主体。禁止密码/token/完整查询文本，保留期限与权限明确，异常有稳定错误类别。',
    '生成或验证 requestId，传播 W3C traceparent；live 看进程，ready 看关键依赖与关闭状态。DB 停止 readiness 失败但 liveness 不必失败，避免无谓重启。',
    '普通 pg_dump 是逻辑快照，不直接支持任意时间点恢复；PITR 需基础备份+连续 WAL。隔离目标恢复后对账关键表与旅程，RPO/RTO 用实际时刻计算。',
  ],
  '01-Core-Web-Vitals深度解析.md': [
    '分开 CrUX/RUM 的 INP 与实验 TBT；记录 P75、设备、窗口和样本。TBT 不能直接当 INP，Performance 定位 LCP 元素和其下载/渲染阶段。',
    '同设备网络重复基线，先处理最大的实际瓶颈再测。预算写具体指标/资源上限与测量条件，分数提高之外还要验证功能和无障碍。',
    'web-vitals 数据附 metric.id、路由、版本/设备和采样信息；按样本算 P75，告警有最小样本门槛。无交互可能无 INP，缺测不记为 0。',
  ],
  '02-代码分割与懒加载策略.md': [
    '四路由静态导入改顶层 lazy；魔法 chunk 注释仅对应构建器有效。生产 preview 检查进入路由才下载 chunk，导入失败有 ErrorBoundary。',
    '按实际入口体积划分 vendor，图表按需加载，prefetch 有网络/用户意图条件。记录首屏与后续跳转代价，不保证固定三级 vendor 最优。',
    '数据相同分别测全量/虚拟/虚拟+图片策略；窗口按高度算范围而非固定渲染 50 条。双重图片懒加载可能无收益，结论由 trace、内存与可访问性共同决定。',
  ],
  '03-资源预加载与缓存优化.md': [
    '哈希资源 immutable，HTML no-cache；记录 200/304/缓存命中实际情况。改 JS 必须更新哈希引用，匿名图片长期缓存需明确 URL 版本政策。',
    '只缓存公开 GET，用户工作台不进共享缓存；离线回退注明更新时间。SW 新版 waiting→提示→激活，刷新保留草稿，旧缓存清理不删未同步数据。',
    '以真实图片/字体内容优化并保留许可，字体子集不能缺字。preload 只给关键资源，记录 currentSrc 与瀑布；“减少50%”是目标不是无条件通过指标。',
  ],
  '04-渲染性能与动画优化.md': [
    '逐属性重置后录制，width 更易 Layout、color 更易 Paint、transform/opacity 可合成。实际提升/栅格化受条件影响，以 trace 而非属性名称断言。',
    'First 测旧矩形，更新 DOM 后 Last，再 inverse transform，动画到 identity。批量读写减少强制布局，打乱后焦点与阅读顺序正确，减少动画时直达终态。',
    '给数据/图表固定有界频率，rAF 批量视觉写入，隐藏页停止工作。逐项启用优化比较 CPU/内存/帧稳定性，will-change 清理；Canvas 不保证总优于 SVG。',
  ],
  '01-XSS防御与CSP策略.md': [
    '在本地靶场记录来源→sink→执行 marker；普通文本用 textContent，富文本用合适净化，URL 单独校验 scheme。escapeHtml 只对应 HTML 文本上下文，不覆盖 JS/CSS/URL。',
    '先 Report-Only 收集并分类违规，nonce 每响应随机且不信任用户提供。强制后正常脚本工作、注入脚本失败；无 48h 真实采集不得写成已观察。',
    '用实际浏览器 marker 回归 DOM/存储/反射 XSS；ZAP baseline 被动扫描不等于自动覆盖主动 XSS。每个危险 sink 有理由与控制，报告拒绝/执行两种证据。',
  ],
  '02-CSRF与认证安全.md': [
    '用虚构余额/偏好，服务端 token+Origin 校验，两个本地来源发请求。不同端口跨源但可能同站，不能用它证明 SameSite 跨站；记录 Cookie/Origin 与状态变化。',
    '慢哈希、验签、短访问 token、轮换 refresh 与撤销记录；前端刷新 single-flight。多个 401 只刷新一次，失败清状态，登出后 refresh 拒绝，不能假定已签 access token 自动撤销。',
    '画登录/刷新/退出数据流，逐风险映射控制/成本/复测。PKCE 防授权码截获但不独立解决 XSS/CSRF；升级后旧会话迁移与失效窗口明确。',
  ],
  '03-供应链安全与依赖审计.md': [
    'audit 与依赖树保存脱敏结果，npm explain/ls 追溯传递来源，核对锁文件。零告警不等于无风险；提交属于个人练习仓库流程，不自动替他人推送。',
    '更新 PR 跑消费者/类型/构建回归，SRI 与固定内容/hash/crossorigin 一致。高风险按可达性和利用前提评估，不能盲目 audit fix --force 升主版本。',
    '多工具结果归一 advisory/版本/路径并追踪修复时长；定时报告只新增变化。registry 凭据最小范围、短寿命且不进日志，恶意行为告警需人工证据确认。',
  ],
  '01-微信小程序开发.md': [
    '页面 data 保存 Todo，setData 仅更新必要字段，storage 版本与错误恢复明确。添加/完成/删除刷新后一致，触控删除需防止误触且有可发现按钮。',
    '按已锁 Taro 主版本建立商品/详情/购物车，金额整数分、分页稳定 ID；双端编译不算兼容通过，实际开发者工具/真机分别测。',
    '从小量到1000条有界测量，分包与预加载按实际路由；Skyline 支持范围明确。记录首屏/setData/内存，未用真机不能声称设备优化有效。',
  ],
  '02-React-Native与Electron概览.md': [
    'renderer 不接 fs，preload 仅暴露 open/save/list 的窄方法，主进程校验来源与路径。异步文件操作、拒绝覆盖和坏文件恢复测试，不能暴露任意 IPC。',
    'desktopCapturer 在正确进程/API 中调用，截图权限由用户授予；快捷键失败提供按钮。拒权、取消与多屏尺寸处理，退出注销快捷键，剪贴板只写用户选择结果。',
    '共用纯数据/校验契约，导航/权限/文件/桥接平台适配。选一个真实安装测体积/启动/内存，另两个方案标估计，不把构建大小当运行内存。',
  ],
  '01-错误监控与Sentry.md': [
    '在隔离项目故意触发有界错误，核对 event/breadcrumb/tags/release；先脱敏再发送。SDK 初始化与 framework 错误边界按锁定版本配置，未开通平台标未验证。',
    'release SHA 与上传 map/产物一致，验证错误反解到源行，再确保公开产物不含 map。上传 token 只在 CI，告警实际触发记录，删除本地 map 不是反解成功的证据。',
    '事件/日志/旅程与业务指标关联，定义 P0/P1/P2 影响与响应责任。采样与噪声控制明确；只有异常事件不能计算业务成功率，需总请求/旅程分母。',
  ],
  '02-RUM性能监控与埋点.md': [
    'web-vitals 采集并发送本地接收端；sendBeacon 返回 true 仅排队成功，要核对服务端实际记录。Synthetic 与本地采样不是同一人群，INP 缺测不填零。',
    '包装 fetch/XHR 保持原语义并只采白名单耗时，卸载还原；FCP 不等于业务白屏结束。去重 metric.id，明确 PV/UV/错误率分母，拒绝敏感 URL 参数。',
    '管道按 metric/路由/设备/版本聚合分位数，原始样本与聚合规则可追溯。30天基线需真实采集；mock 看板仅证明计算/查询链，不证明生产告警阈值合理。',
  ],
  '01-Design-Tokens与DTCG规范.md': [
    'tokens 使用 $type/$value 与语义别名，Style Dictionary 版本/transform 配置匹配。构建 CSS/SCSS/TS 并在页面验证，未知别名/循环引用导致明确失败。',
    '原始值与语义值分离，主题输出同名变量不同取值，Tailwind 映射按锁定版本。亮暗主题全组件切换，焦点/错误/disabled 对比度不能遗漏。',
    '导出格式与工具支持核对后再构建，CI 展示 token 与产物差异。平台颜色/字体格式分别适配，不能把 JSON 直接复制为 Swift/XML；手工改生成文件不可持续。',
  ],
  '02-组件库搭建与Storybook.md': [
    'Button 语义 button，loading 保留名称且防重复点击；library 输出与 exports/type 声明一致。独立消费者验证 ESM/CJS/.d.ts，源码 Story 可运行不代表包可安装。',
    'Modal/Select 测焦点/键盘与关闭，changeset 按真实 API 变化计版本。version 后 changelog 与包版本一致，破坏变更不能用 patch 掩盖。',
    '主题 token 覆盖全部状态，a11y 自动检查加人工键盘。先 pack 独立安装，registry/Storybook 发布需个人授权资源；CI 测试失败不进入发布阶段。',
  ],
  '01-技术选型决策框架.md': [
    'ADR 写约束、选择、真实备选和收益/代价，保存不可变编号与索引。读者能追溯为何当时合理；已取代决策加链接，不重写历史假装从未选错。',
    '权重先依据项目约束确定，再用实测/官方支持/成本证据评分。敏感性分析看权重改变是否换赢家；真实反馈不可伪造，无访谈标待验证。',
    '流程按影响范围与可逆性分级，评审时限有责任人。禁用项给上下文理由与复审条件，不能用统一三个月窗口替代风险/回滚成本判断。',
  ],
  '02-技术债识别与治理.md': [
    '静态工具结果先核对动态导入/别名/生成路径误报，再按影响×频率×风险排。每条债给文件、现象、证据与解决成本，不能把全部 lint 警告当架构债。',
    '选择可独立验证的2-3项，先设行为/性能基线，再小切片治理。20% 是预算示例，按实际容量确定；报告缺陷/交付周期改善，不只行数下降。',
    '看板保持责任/期限/状态与复查，避免评分公式制造虚假精确。季度比较相同口径数据，未运行三个月不能写成熟治理成果，完成项要有代码/测量证据。',
  ],
  '03-RFC方案编写指南.md': [
    '事后 RFC 区分当时已知与后来事实，写动机、非目标、方案、备选和验证。不要把已完成选择改写为唯一可能方案；给出可证伪的完成标准。',
    '真实评审者/截止/Blocker 与修订关联，Approved 由实际治理流程决定。没有评审就标 Draft/待评审，不能自己伪造同意；关键未知有实验计划。',
    '按影响/不可逆成本确定何时要 RFC，状态/角色/截止与升级路径明确。以一次真实小方案试运行，评估返工和响应时长，未采集三个月不写长期趋势。',
  ],
  '01-SLI-SLO错误预算与事故响应.md': [
    '每旅程给成功/总事件、窗口、数据源与目标，排除无效请求规则统一。搜索成功不是 HTTP200，保存需持久化；分母为0时标无数据。',
    '允许坏事件=总事件×(1-SLO)，剩余预算=允许坏事件-实际坏事件；燃烧率=实际错误率/(1-SLO)。1h/6h 分别计算，同一发布版本关联，有最小样本。',
    '在本地/隔离环境注入20%失败，记告警、角色、缓解与恢复时刻。回滚后验证真实旅程与数据，复盘行动有负责人/期限/验证，通知按实际授权执行。',
  ],
  '02-威胁建模与安全验证.md': [
    '标浏览器、API、DB、队列与备份边界，数据流含认证/敏感字段。不能只画组件框；登录和草稿分别列主体、资产与被信任输入。',
    '每条流按 STRIDE 评估，可不适用但需理由；威胁映射控制/证据/残余风险。身份认证不能代替资源授权，日志也有篡改和泄露风险。',
    '权限、secret、依赖、CSP、上传与 DAST 门禁各有失败夹具；扫描结果人工分类。故意取消授权控制后测试失败，恢复后正常与拒绝路径都通过。',
  ],
  '03-国际化-PWA与可访问性自动化.md': [
    'locale 路由白名单、message ID 与 fallback，Intl 指定 locale/timeZone；记用户选择但不覆盖 URL 明确语言。缺 key/未知语言/日期跨日均测试。',
    '缓存公开文章带版本与更新时间，更新提示后安全刷新；敏感工作台绕过共享缓存。注销清用户范围数据但不丢未同步草稿，离线失败有可操作回退。',
    'CI 检查缺 key、RTL、axe 与键盘流程，SW 新旧版本用真实浏览器演练。自动扫描通过不等于屏幕阅读器通过；冲突返回409并保留两份草稿。',
  ],
};
