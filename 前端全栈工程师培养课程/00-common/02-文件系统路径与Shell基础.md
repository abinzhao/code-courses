# 02-文件系统路径与 Shell 基础

## 目标

完成本知识单元后，学员应能在头脑中建立一棵清晰的“文件树”，并把命令行操作准确对应到树上的移动、查找与修改，而不是机械背诵命令拼写。

学员应能够：

1. 画出一棵目录树，解释文件、目录、根目录、家目录之间的层级与包含关系。
2. 针对给定目录树，准确写出目标文件的绝对路径与多种相对路径，正确使用 `.` 与 `..`。
3. 区分“当前工作目录”和“脚本文件所在目录”，并预测脚本中相对路径会被解析成什么。
4. 使用 `pwd`、`ls`、`cd`、`tree`、`cat`、`less`、`mkdir`、`touch`、`cp`、`mv`、`rm` 完成文件整理，并能说明每条命令影响的对象。
5. 使用通配符批量选择文件，在执行删除前先用只读命令验证匹配范围，养成删除安全习惯。
6. 使用 Node.js 观察 `process.cwd()` 与 `import.meta.url`，并用 `node:path` 的 `join`、`resolve`、`basename`、`dirname`、`extname` 完成跨平台路径拼接与拆解。

本单元只建立文件系统与 Shell 的基础操作模型。进程、端口、管道、退出码将在《03-命令行进程端口与脚本自动化》中展开；权限位、可执行位和环境变量将在后续知识单元中讲解。

## 技术栈

本单元不使用前端框架、后端框架、数据库或第三方 npm 包，所有 Node.js 示例只使用内置模块。

| 工具或环境 | 用途 | 学习要求 |
|---|---|---|
| 终端模拟器（macOS Terminal、iTerm2 或 Linux 终端） | 打开命令行会话 | 能打开、关闭、识别提示符中的当前位置 |
| Shell（`zsh` 或 `bash` 当前稳定版） | 解释并执行命令 | 能区分命令、选项、参数 |
| Node.js 当前 LTS 版本 | 运行观察路径的 JavaScript | 能运行 `.mjs` 脚本并读懂输出 |
| `node:path`、`node:url`、`node:process` | 路径处理与位置观察 | 能用内置 API 替代手写路径拼接 |
| `tree`（可选） | 树形查看目录 | 未安装时能用 `find` 或逐层 `ls` 替代 |
| VS Code 或任意文本编辑器 | 查看与编辑文本文件 | 能区分“编辑器里的资源管理器”和真实目录树 |

课程命令以 macOS 和常见 Linux 环境为主：

- macOS 自 10.15 起默认 Shell 为 `zsh`；多数 Linux 发行版默认 `bash`。两者在本单元命令上的表现基本一致。
- Windows 学员请在 WSL2（Ubuntu 当前 LTS 版本）中完成本单元；原生 PowerShell 与命令提示符不作为主线。
- 路径示例统一使用类 Unix 风格的 `/` 分隔符；Windows 的 `\` 作为跨平台知识点讲解。
- `<名称>` 形式表示需要替换的占位参数，例如 `<项目目录>`，不要原样输入尖括号。
- `tree` 在 macOS 上可能默认未安装；它只是辅助工具，不是必须项。

开始前检查环境：

```bash
node -v
echo "$SHELL"
pwd
```

预期观察：

- `node -v` 输出当前安装的 Node.js 版本号，例如以 `v20` 或 `v22` 开头，表示环境就绪。
- `echo "$SHELL` 输出 Shell 程序路径，例如 `/bin/zsh` 或 `/bin/bash`。
- `pwd` 输出当前所在目录的绝对路径，这是后续所有相对路径的起点。

可选检查：

```bash
tree --version
```

- 已安装时输出版本号；提示命令不存在时，不影响本单元学习，可暂时跳过所有 `tree` 命令，改用 `ls`。

版本号不是本单元考点。关键是确认工具存在，并能把输出与文件树对应起来。

## 详细的理论知识讲解和示例伪代码

### 1. 文件与目录的心智模型

#### 1.1 文件：一段有名字的字节

文件是磁盘上一段被命名的字节序列。对操作系统来说，一个文件的内容本质上就是一串字节；至于这串字节是源代码、图片还是视频，取决于读取它的程序如何解释。

文本文件与二进制文件的区别不在于存储方式，而在于解释方式：

- 文本文件中的字节按字符编码（通常是 UTF-8）解释成文字，例如 `index.html`、`app.mjs`。
- 二进制文件按特定格式解释，例如 PNG 图片有固定的文件头和压缩结构。
- 用文本编辑器强行打开二进制文件，通常会看到乱码，因为字节被错误地当成了文字。

与 Web 的关系：

- 浏览器加载的 HTML、CSS、JavaScript 都是服务器上的文本文件。
- 图片、字体、视频是按各自格式解释的二进制文件。
- `package.json`、日志文件、构建产物也全部以文件形式存在。

从字节视角看一个文本文件：

```text
文件名: hello.txt
字节序列: 104 101 108 108 111
解释方式: UTF-8 文本
看到的内容: hello
```

常见误解：

> 把文件扩展名从 `.txt` 改成 `.js`，文件就“变成”了程序。

扩展名只是名字的一部分，是给人和工具看的提示，文件内容没有任何变化。系统是否把它当程序执行，取决于用什么运行时打开它，而不是扩展名本身。

#### 1.2 目录：记录条目名单的特殊文件

目录（也叫文件夹）可以理解为一张“名单”，名单中每一条记录一个名字与一个文件对象的对应关系。

- 在目录中新建文件，相当于在名单里增加一条记录。
- 删除文件，相当于把这条记录从名单中划掉。
- 目录本身也可以被另一个目录收录，因此目录之间可以层层嵌套。

一个目录条目的简化模型：

```text
目录 /home/student/project 的名单
├── 名字: index.js      → 指向文件对象 A
├── 名字: package.json  → 指向文件对象 B
└── 名字: src           → 指向目录对象 C
```

常见误解：

> 删除文件就一定会把磁盘上的数据立刻抹掉。

删除动作首先移除的是目录名单中的记录。操作系统在确认没有任何条目再指向该文件对象后，才会回收其占用的磁盘空间。入门阶段只需知道“删名单”和“抹数据”是两个层次，不必深究底层实现。

#### 1.3 目录树与唯一的根

所有目录层层嵌套，整体构成一棵倒置的树：

- 类 Unix 系统只有一个最顶层目录，称为根目录，写作 `/`。
- 根目录下可以有文件和子目录，子目录继续向下嵌套。
- 从根目录出发，沿唯一一条路径向下，总能到达树中的任意文件。

一个典型 Web 项目的目录树：

```text
web-app/
├── index.html
├── package.json
├── src/
│   ├── main.js
│   └── components/
│       └── Button.js
└── assets/
    └── logo.png
```

与 Web 的关系：日常所说的“项目根目录”，就是项目这棵子树最顶端的目录。许多工具默认在当前工作目录寻找 `package.json`，所以 `npm run dev` 通常必须在项目根目录执行，否则工具找不到项目配置。

#### 1.4 点开头的隐藏文件

在类 Unix 系统中，以 `.` 开头的文件和目录默认不会在普通 `ls` 列表中显示，称为隐藏文件。这不是安全保护，只是一种“默认不打扰”的显示约定。

Web 项目中常见的隐藏文件：

```text
.gitignore        # Git 忽略规则
.editorconfig     # 编辑器风格约定
.env              # 本地环境变量文件，不能提交真实密钥
.vscode/          # VS Code 工作区配置
```

需要看到它们时，使用 `ls -a`（`a` 是 all 的意思）。

常见误解：

> 隐藏文件是被系统加密保护的重要文件。

隐藏只是显示层面的约定，任何程序仍可正常读取。把敏感信息放进点开头的文件并不会自动获得保护，真正的防护来自权限管理和不提交到代码仓库。

#### 1.5 文件元数据

除了内容，每个文件还附带一组描述性信息，称为元数据。常用元数据包括：

| 元数据 | 含义 | Web 场景 |
|---|---|---|
| 大小 | 内容占用的字节数 | 判断日志、图片是否过大 |
| 修改时间（mtime） | 内容最后一次被修改的时间 | 构建工具据此判断缓存是否有效 |
| 状态变更时间（ctime） | 元数据最后一次变化的时间 | 排查文件被改动的时间点 |
| 所有者与权限 | 谁拥有、谁能读写执行 | 静态文件服务器的访问控制基础 |

使用 `ls -l` 可以看到大部分元数据：

```text
-rw-r--r--@ 1 student  staff   482  10  9 10:00 index.html
└──┬───┘       └──┬───┘  └─┬─┘ └──────┬──────┘ └────┬────┘
权限位          所有者    大小      修改日期      文件名
```

权限位的具体含义不在本单元展开，后续单元会专门讲解。本单元只需能在列表中定位大小、修改时间和文件名。

### 2. 路径：在目录树中定位

#### 2.1 路径是一串逐级下降的名字

要在目录树中找到某个文件，需要给出“从某个起点出发，依次经过哪些目录”的序列，这就是路径。路径由多个名字用分隔符连接而成：

```text
src/components/Button.js
 │       │           └── 文件名
 │       └── 先进入 components 目录
 └── 先进入 src 目录
```

路径只描述经过的层级，本身不复制或移动任何文件。

#### 2.2 绝对路径：从根目录出发

绝对路径从文件系统的根目录 `/` 开始，因此对同一个文件，绝对路径在整台机器上只有一个答案，与你当前站在哪个目录无关。

```text
/home/student/web-app/src/components/Button.js
└─┬─┘
  以 / 开头，说明从根目录开始
```

macOS 上用户项目常见的绝对路径形如 `/Users/student/web-app/src/main.js`；Linux 上形如 `/home/student/web-app/src/main.js`。

绝对路径的优点是无歧义；缺点是换一台机器、换一个用户名就会失效，所以不应写进需要共享的项目脚本。

#### 2.3 相对路径：从当前位置出发

相对路径不以 `/` 开头，它的起点是“当前所在目录”。同一个文件，从不同目录出发会得到不同的相对路径。

假设当前在 `web-app/` 目录：

```text
src/main.js             # 指向 web-app/src/main.js
package.json            # 指向 web-app/package.json
assets/logo.png         # 指向 web-app/assets/logo.png
```

以 `./` 开头表示“从当前目录开始”，`./src/main.js` 与 `src/main.js` 含义相同，显式写出 `./` 能让人一眼看出这是相对路径。

#### 2.4 `.` 与 `..`

路径中有两个特殊名字：

- `.`（一个点）表示当前目录本身。
- `..`（两个点）表示当前目录的上一级，即父目录。

以下面的目录树为例，假设当前位于 `src/components/`：

```text
web-app/
├── index.html
└── src/
    ├── main.js
    └── components/       # 当前在这里
        └── Button.js
```

路径推导练习：

```text
./Button.js                  # 当前目录下的 Button.js
../main.js                   # 回到 src/，再找 main.js
../../index.html             # 回到 src/，再回到 web-app/，找 index.html
```

`..` 可以连续使用，每出现一次就向上回退一级。把路径念成“下钻”和“回退”的动作，比死记字符串更可靠。

#### 2.5 家目录与 `~`

每个用户都有一个专属的家目录（home directory），用于存放个人文件：

- macOS：`/Users/<用户名>`
- Linux：`/home/<用户名>`

Shell 提供 `~` 作为家目录的简写：

```bash
cd ~
cd ~/projects/web-app
```

需要特别注意：`~` 是 Shell 在执行命令前进行的文本替换，它本身不是真实存在的目录名。因此在 Node.js 的文件 API 中直接写 `~/notes.txt` 不会生效，因为 Node 不会替你展开 `~`，它会老老实实地去找一个名为 `~` 的目录。

#### 2.6 文件名大小写

不同操作系统对文件名大小写的处理不同：

- Linux 通常大小写敏感，`Button.js` 与 `button.js` 是两个不同文件。
- Windows 与部分 macOS 文件系统默认大小写不敏感，二者被视为同一个文件。

这会直接导致“在我电脑上能跑，在 CI 上失败”的典型问题：

```js
// 文件实际叫 Logo.png，代码却写成
import logo from './logo.png';
```

在大小写不敏感的本机可以找到文件；部署到大小写敏感的 Linux CI 时会报模块找不到。统一的文件名大小写习惯（例如组件文件统一大驼峰）是团队规范的一部分。

常见误解：

> 路径问题在我电脑上验证通过，就可以放心提交。

跨平台差异必须靠规范和工具兜底，而不是靠“在每台电脑上都试一遍”。

### 3. 跨平台路径规则

#### 3.1 分隔符：`/` 与 `\`

不同系统表示层级的分隔符不同：

| 系统 | 分隔符 | 示例 |
|---|---|---|
| macOS / Linux | `/` | `src/components/Button.js` |
| Windows | `\`（多数场景也接受 `/`） | `src\components\Button.js` |

在 JavaScript 字符串中，`\` 是转义字符，因此一个反斜杠需要写成两个：

```js
// 不推荐：手写 Windows 风格路径，既难读又不跨平台
const bad = 'src\\components\\Button.js';

// 推荐：交给 path 模块按当前平台生成
import path from 'node:path';
const good = path.join('src', 'components', 'Button.js');
```

#### 3.2 Windows 的盘符与“多个根”

类 Unix 系统只有一个根 `/`；Windows 则每个盘符各有一个根，例如 `C:\`、`D:\`。这意味着“绝对路径”的概念在 Windows 上必须连同盘符一起理解。

好消息是：Web 项目中的 URL 永远使用 `/`，与操作系统无关：

```text
file:///home/student/web-app/index.html
https://example.com/assets/logo.png
```

因此在处理 HTTP 路径时不要使用 `\`，在处理本地文件时则优先使用 `node:path` 按平台生成。

#### 3.3 文件名与命令行中的其他差异

跨平台协作还需要注意：

- Windows 保留了一些特殊设备名，文件名不应使用 `CON`、`PRN`、`NUL` 等。
- 文件名中包含空格时，命令行里必须加引号，否则会被拆成多个参数。
- 换行符在 Windows 上默认是 CRLF，在 macOS/Linux 上是 LF，跨平台项目通常通过编辑器配置统一为 LF。

带空格路径的正确写法：

```bash
ls "my project/src"
cd ~/Documents/"学习 笔记"
```

不加引号时，Shell 会把 `my project/src` 当成两个独立参数，命令通常报错。

#### 3.4 结论：拼接路径只做一次决策

跨平台路径处理的核心原则是：

```text
不要手写分隔符；
入口处把路径片段交给 node:path；
需要跨系统传递（URL、配置）时统一使用 /。
```

这样无论项目在 macOS、Linux 还是 Windows 上运行，路径代码都不需要修改。

### 4. 工作目录与脚本目录

#### 4.1 当前工作目录

每个进程启动时都会被赋予一个“当前工作目录”（current working directory，缩写 cwd）。在 Shell 中，它就是提示符所在的位置，可用 `pwd` 查看。

相对路径的解析起点正是当前工作目录。你在哪个目录下执行命令，命令中的相对路径就从哪里算起。

#### 4.2 脚本文件所在目录

脚本目录指脚本文件自身在磁盘上的位置。例如：

```text
/home/student/web-app/scripts/run.js
                        └───────┬──────┘
                          脚本所在目录
```

脚本目录是文件的固定属性，而工作目录是执行时的临时位置，两者没有必然相等的关系。

#### 4.3 用 Node 观察两个位置

创建 `scripts/show-paths.mjs`：

```js
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const scriptFile = fileURLToPath(import.meta.url);

console.log('当前工作目录 process.cwd():', process.cwd());
console.log('脚本文件绝对路径:', scriptFile);
console.log('脚本所在目录:', path.dirname(scriptFile));
```

从项目根目录运行：

```bash
node scripts/show-paths.mjs
```

预期输出（用户名与路径按实际机器显示）：

```text
当前工作目录 process.cwd(): /home/student/web-app
脚本文件绝对路径: /home/student/web-app/scripts/show-paths.mjs
脚本所在目录: /home/student/web-app/scripts
```

再退到家目录运行同一个脚本：

```bash
cd ~
node web-app/scripts/show-paths.mjs
```

预期变化：脚本文件路径不变，但 `process.cwd()` 变成了家目录 `/home/student`。这直观证明了两个位置相互独立。

#### 4.4 相对路径到底相对谁

Node.js 文件读写 API 中的相对路径，相对的是当前工作目录，而不是脚本文件。

假设项目结构如下：

```text
web-app/
├── data.json
└── scripts/
    └── read-data.js
```

`read-data.js` 中写：

```js
import fs from 'node:fs/promises';

// 相对路径：相对执行时的工作目录
const text = await fs.readFile('data.json', 'utf8');
console.log(text);
```

在 `web-app/` 下运行 `node scripts/read-data.js` 可以成功；但在 `web-app/scripts/` 下运行 `node read-data.js` 会报错，因为此时工作目录是 `scripts/`，那里并没有 `data.json`。

常见误解：

> 脚本里写的相对路径，理所当然相对脚本文件。

这是初学者最常踩的坑。相对路径相对工作目录，这是操作系统层面的统一规则，对 Shell 命令和 Node.js 程序都成立。

#### 4.5 稳定定位“脚本旁边的文件”

要读取与脚本放在一起的文件，应先求出脚本自身所在目录，再用 `path.join` 拼接：

```js
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.join(here, 'data.json');

const text = await fs.readFile(dataPath, 'utf8');
console.log(text);
```

这样无论从哪个目录启动脚本，`dataPath` 都稳定指向 `scripts/data.json`（或与脚本同级的任意文件），不再受工作目录影响。

### 5. 符号链接：文件系统中的“别名”

#### 5.1 符号链接是什么

符号链接（symbolic link，也称软链接）是一种特殊文件，它的内容是另一个路径。访问符号链接时，系统会自动顺着它指向目标路径。

创建命令的概念形式：

```bash
ln -s <目标路径> <链接名>
```

可以把它理解为文件系统层面的“别名”或“指针”：链接本身很小，真正的数据仍存放在目标位置。

#### 5.2 符号链接的表现

执行下面一组命令：

```bash
mkdir -p demo/real
echo "hello" > demo/real/note.txt
ln -s real/note.txt demo/link.txt
ls -l demo
```

预期在列表中看到箭头，标明链接指向：

```text
lrwxr-xr-x  1 student  staff  12 10  9 10:00 link.txt -> real/note.txt
drwxr-xr-x  3 student  staff  96 10  9 10:00 real
```

通过链接读取文件时看到的是目标内容：

```bash
cat demo/link.txt
```

预期输出 `hello`。删除链接 `rm demo/link.txt` 只删除这个指针，不会删除目标文件 `real/note.txt`。

#### 5.3 Web 工程中的符号链接

符号链接在前端工程中无处不在，最典型的是 `node_modules/.bin`：

```text
node_modules/.bin/vite -> ../vite/bin/vite.js
```

执行 `npx vite` 或通过 `package.json` scripts 调用 `vite` 时，实际是顺着这个链接找到真正包内的可执行文件。

其他常见场景：

- `pnpm` 把包统一存放在内容寻址存储中，再用硬链接和符号链接接入各项目的 `node_modules`，以此节省磁盘空间。
- Monorepo 中工作区包之间通过链接互相引用，修改一个包能立刻被另一个包看到。
- 部署时常用链接在“当前版本”和“历史版本目录”之间切换，实现快速回滚。

#### 5.4 常见误解

> Windows 桌面快捷方式和符号链接是同一个东西。

两者概念相似但处于不同层面：Windows 的 `.lnk` 快捷方式本质上是一个普通文件，主要由图形界面识别；符号链接是文件系统层面的机制，命令行程序会自动跟随。另外，当目标被删除或移动后，符号链接会变成“断链”，系统不会自动修复它。

### 6. Shell：终端、Shell 与内核

#### 6.1 终端模拟器

终端模拟器是那个图形窗口程序，例如 macOS 的“终端”、iTerm2，或 Linux 上的 GNOME Terminal。它只负责两件事：

- 把键盘输入传给 Shell；
- 把 Shell 输出的字符显示在屏幕上。

终端本身不理解命令含义，它是一个输入输出界面。

#### 6.2 Shell：命令解释器

Shell 是运行在终端中的程序，是真正的“命令解释器”。常见实现有 `bash` 和 `zsh`。它的工作循环是：

```text
1. 在提示符处等待用户输入一行文本
2. 解析这行文本：哪部分是命令、选项、参数
3. 找到并启动对应程序（或执行内建命令）
4. 等待程序结束
5. 显示输出，重新给出提示符，回到第 1 步
```

#### 6.3 内核

内核是操作系统的核心，负责管理进程、内存、磁盘和硬件。普通程序不能直接操作硬件，而是通过“系统调用”向内核提出请求，例如读取文件、创建进程。

#### 6.4 三者协作关系

```text
键盘输入
   ↓
终端模拟器（负责显示与输入）
   ↓
Shell（解析命令：命令 + 选项 + 参数）
   ↓ 请求系统调用
内核（创建进程、读取磁盘、分配资源）
   ↓
结果沿原路返回，显示在终端上
```

#### 6.5 命令结构

一条命令通常由三部分组成：

```text
ls  -l  src
└┬┘ └┬┘ └┬┘
命令  选项  参数
```

- 命令：要执行的程序，例如 `ls`。
- 选项：调整行为的开关。短选项以一个短横线开头，例如 `-l`、`-a`，可合并写成 `-la`；长选项以两个短横线开头，例如 `--all`。
- 参数：命令作用的对象，例如目录名或文件名。

选项和参数的数量都可以是零个、一个或多个，具体由命令决定。

#### 6.6 内建命令与外部程序

并非所有“命令”都是独立程序：

- `cd` 是 Shell 的内建命令，它改变的是 Shell 进程自己的当前目录。
- `ls` 通常是磁盘上的独立程序（例如 `/bin/ls`），Shell 每次会启动它。

可以用下面的命令验证：

```bash
type cd
type ls
which ls
```

预期：`type cd` 显示它是 Shell 内建命令；`type ls` 与 `which ls` 显示 `ls` 程序所在路径。

常见误解：

> 终端和 Shell 是同一个东西，关掉窗口只是隐藏了程序。

终端是窗口，Shell 是其中的解释器进程。关闭终端窗口时，其中启动的前台进程通常会随之收到终止信号而退出，这就是为什么直接关窗口会导致本地开发服务器停止。

### 7. 基础文件命令

#### 7.1 确认位置：`pwd`

`pwd`（print working directory）输出当前工作目录的绝对路径：

```bash
pwd
```

预期输出形如 `/home/student/web-app`。执行任何可能改动文件的命令前，先 `pwd` 确认站位，是最重要的操作习惯。

#### 7.2 列出内容：`ls`

```bash
ls            # 只列出当前目录下的非隐藏条目
ls -l         # 长格式，显示权限、大小、修改时间等
ls -a         # 连同点开头的隐藏条目一起列出
ls -la src    # 列出 src 目录内容，组合使用 -l 和 -a
```

`ls -l` 首列第一个字符表示条目类型：`-` 是普通文件，`d` 是目录，`l` 是符号链接。

#### 7.3 切换目录：`cd`

```bash
cd src              # 进入当前目录下的 src
cd ..               # 回到上一级
cd ~                # 回到家目录
cd -                # 回到上一次所在目录
cd                  # 不带参数时通常回到家目录
```

因为 `cd` 改变的是 Shell 自身状态，所以它只影响当前终端窗口，不会改变其他窗口或其他程序。

#### 7.4 树形查看：`tree`

```bash
tree                # 递归显示整棵子树
tree -L 2           # 只显示两层，层级过多时很有用
tree src            # 只看 src 这棵子树
```

未安装 `tree` 时，可用 `ls -R` 或逐层 `ls` 完成同样的观察。

#### 7.5 阅读文件：`cat` 与 `less`

`cat` 把文件内容一次性全部输出，适合小文件：

```bash
cat package.json
```

`less` 是分页查看器，适合长文件：

```bash
less README.md
```

在 `less` 中常用按键：

| 按键 | 作用 |
|---|---|
| `j` / `k` 或方向键 | 向下 / 向上滚动 |
| 空格 | 翻页 |
| `/词` 然后回车 | 向后搜索“词” |
| `n` | 跳到下一个匹配 |
| `q` | 退出 |

不要对超大日志文件直接 `cat`，成千上万行会瞬间刷满终端；应使用 `less` 或后续单元讲的 `head`、`tail`。

#### 7.6 创建：`mkdir` 与 `touch`

```bash
mkdir src                       # 创建单个目录
mkdir -p src/components/ui      # 一次性创建多层目录，已存在也不报错
touch README.md                 # 文件不存在则创建空文件
touch src/main.js               # 常配合路径在指定目录建文件
```

`touch` 的本职是更新文件时间戳；当文件不存在时创建空文件只是它的附带效果，因此不要用它创建有内容的脚本。

#### 7.7 复制：`cp`

```bash
cp a.txt b.txt            # 复制文件，b.txt 存在会被覆盖
cp -r src backup          # 递归复制整个目录
cp a.txt docs/            # 保留原名复制到 docs 目录下
```

目标文件已存在时，`cp` 通常直接覆盖而不提示。重要文件复制前应先用 `ls` 确认目标位置，避免覆盖。

#### 7.8 移动与改名：`mv`

```bash
mv old.txt new.txt        # 改名
mv note.txt docs/         # 移动到 docs 目录
mv src/a.js src/b.js      # 在同一目录内改名
```

`mv` 在同一文件系统内移动时只调整目录名单，不复制内容，因此即使文件很大也几乎瞬间完成。

#### 7.9 删除：`rm` 与安全规则

`rm`（remove）用于删除文件或目录：

```bash
rm note.txt           # 删除单个文件
rm -r old-dir         # 递归删除目录及其全部内容
rm -f stale.txt       # 文件不存在也不报错（force）
rm -rf build          # -r 与 -f 组合，常用于清理构建目录
```

`rm` 删除后不进入回收站，难以恢复，因此必须把它当成“立即生效”的操作。下面是必须遵守的安全习惯：

1. 删除前先 `pwd` 确认当前目录，再用 `ls` 查看将被删除的对象。
2. 使用通配符删除时，先把 `rm` 换成 `ls` 执行一遍，确认匹配范围。
3. 变量可能为空时，不要直接拼接危险路径：

```bash
# 风险：若 TARGET_DIR 未设置或为空，会变成 rm -rf /*
rm -rf "$TARGET_DIR"/*

# 更稳妥：先判断变量非空，再删除其内部内容
[ -n "$TARGET_DIR" ] && rm -rf "$TARGET_DIR"/*
```

4. 不对根目录、家目录、系统目录使用 `rm -rf`，也不为了“省事”加上管理员权限。
5. 不确定命令含义时，先执行 `man rm` 阅读手册，或在练习目录中用无害文件试验。

#### 7.10 通配符

通配符让一条命令匹配一批文件，由 Shell 在命令执行前展开：

| 通配符 | 含义 | 示例 |
|---|---|---|
| `*` | 任意数量的任意字符 | `*.js` 匹配所有 js 文件 |
| `?` | 恰好一个任意字符 | `a?.txt` 匹配 `a1.txt`、`ab.txt` |
| `[abc]` | 括号中的任意一个字符 | `file[12].log` |
| `[0-9]` | 范围内的一个字符 | `img-[0-9].png` |

安全操作流程：

```bash
ls temp-*.log          # 第一步：只用 ls 查看会匹配哪些文件
rm temp-*.log          # 第二步：确认无误后再删除
```

常见误解：

> `*` 会匹配目录里所有文件，包括 `.gitignore` 这种点开头的文件。

默认情况下 `*` 不匹配以 `.` 开头的隐藏条目，这恰恰是防止误删配置文件的一道天然保护。另外要牢记，通配符是 Shell 的能力，不是 `rm`、`ls` 的能力。

### 8. 用 node:path 处理路径

#### 8.1 为什么需要 path 模块

手写路径拼接会同时面对分隔符、多余斜杠、盘符、空片段等问题。`node:path` 是 Node.js 内置模块，它按程序当前运行的平台规则处理路径，无需安装任何依赖。

#### 8.2 `path.join`：拼接片段

`join` 把多个片段用当前平台的分隔符连起来，并规范化多余的分隔符与 `.`、`..`：

```js
import path from 'node:path';

path.join('src', 'components', 'Button.js');
// macOS/Linux: 'src/components/Button.js'

path.join('web-app', '.', 'src', '..', 'package.json');
// 'web-app/package.json'（. 与 .. 被正常折叠）
```

`join` 只做拼接与折叠，不会凭空补出绝对路径；如果所有片段都是相对的，结果仍以相对形式返回。

#### 8.3 `path.resolve`：解析成绝对路径

`resolve` 从右向左处理片段，遇到一个绝对片段就停止；若拼完仍不是绝对路径，则用当前工作目录补全：

```js
// 假设当前工作目录是 /home/student/web-app
path.resolve('src', 'main.js');
// '/home/student/web-app/src/main.js'

path.resolve('/etc', 'hosts');
// '/etc/hosts'（遇到绝对片段 /etc，工作目录被忽略）
```

`join` 与 `resolve` 的关键区别：`join` 保证“简单拼接”，可能返回相对路径；`resolve` 一定返回绝对路径，并在必要时引入工作目录。

#### 8.4 `basename`、`dirname`、`extname`：拆解路径

```js
const file = '/home/student/web-app/src/main.js';

path.basename(file);   // 'main.js'        最后一段：文件名
path.dirname(file);    // '/home/student/web-app/src'  除最后一段外的目录
path.extname(file);    // '.js'            扩展名（含点）
path.basename(file, '.js');  // 'main'     第二参数可去掉指定扩展名
```

对于 `archive.tar.gz` 这种双扩展名，`extname` 只返回最后一段 `.gz`；需要按 `.tar.gz` 整体处理时应自行判断，而不是连调两次。

#### 8.5 与 import.meta.url 配合

前面已用到的标准组合，用于定位脚本旁边的资源：

```js
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.join(__dirname, 'config', 'default.json');
```

`import.meta.url` 使用 `file://` URL 形式，必须先用 `fileURLToPath` 转成普通路径，再交给 `path` 处理。

#### 8.6 路径分隔符常量

`path.sep` 返回当前平台的分隔符（`/` 或 `\`），`path.delimiter` 返回环境变量中路径列表的分隔符（`:` 或 `;`）。它们主要用于需要显示或解析平台特定格式的场景。

常见误解：

> 用了 `path.join`，相对路径就自动变成绝对路径了。

只有 `resolve` 会结合工作目录补全绝对路径；`join` 不读取工作目录，结果保持相对性质。需要无歧义路径时应显式使用 `resolve` 或先求脚本目录。

## 课后题

1. 用自己的语言解释文件、目录、根目录的关系。为什么说目录本身也是一种“文件”？
2. 文件扩展名改变了文件的什么、没有改变什么？把 `logo.png` 改名为 `logo.txt` 后，用图片程序还能打开它吗？为什么？
3. 给定目录树（`project/` 下有 `index.html`、`src/main.js`、`src/utils/helper.js`），当前位于 `src/`，请分别写出访问 `index.html`、`main.js`、`helper.js` 的相对路径。
4. 场景分析：你在 `/home/student/project` 下执行 `node src/run.js`，脚本里用 `fs.readFile('data.json')` 读取文件却报“找不到文件”，而 `data.json` 确实存在于项目根目录。请解释原因并给出稳定的修复写法。
5. 场景分析：队友使用 Windows，在共享代码中写了 `fs.readFileSync('src\\utils\\helper.js')`。这段代码在 Linux CI 上可能出现什么问题？应如何改？
6. `~` 代表什么？为什么在 Node.js 中直接写 `fs.readFile('~/notes.txt')` 通常读不到文件？在 Shell 中怎样写才正确？
7. 场景分析：代码中写 `import logo from './logo.png'`，实际文件名为 `Logo.png`。本机运行正常，但 Linux CI 报错。请解释两边差异，并提出团队规范建议。
8. 你想用一条命令删除当前目录下所有 `.log` 文件。删除前应先做什么验证？如果命令是 `rm -rf "$DIR"/*`，而 `DIR` 恰好没有被设置，会发生什么？
9. 请区分终端、Shell、内核三者的职责。为什么关闭终端窗口往往会导致其中运行的开发服务器停止？
10. 场景分析：执行 `ls *.png` 没有任何输出，但目录中确实存在一个名为 `.cover.png` 的图片。为什么没列出来？怎样才能看到它？

## 实践练习题

### 练习 1：目录树速写与路径问答

#### 任务

在命令行中手工创建一棵至少三层深的项目目录树，包含源码目录、资源目录和若干空文件，然后用 `tree`（或 `ls -R`）输出结构，并在 `paths.md` 中回答路径问题。

要求创建的结构：

```text
mini-site/
├── index.html
├── src/
│   ├── main.js
│   └── styles/
│       └── main.css
└── assets/
    └── images/
        └── logo.png
```

#### 步骤约束

1. 全部目录与文件必须通过 `mkdir -p` 与 `touch` 创建，不能用图形界面拖建。
2. 创建完成后执行 `tree mini-site`，把输出保存下来。
3. 在 `paths.md` 中回答：假设当前位于 `mini-site/src/styles/`，分别写出访问 `index.html`、`main.js`、`logo.png` 的相对路径（必须用到 `..`）。
4. 再写出这三个文件各自的绝对路径，机器用户名用 `<用户>` 占位，不写真实用户名。
5. 最后使用一条 `rm -r` 命令删除整个 `mini-site` 练习目录，删除前先用 `ls -d mini-site` 确认目标存在且路径正确。

#### 提交物

- `paths.md`（含目录树输出与全部路径答案）；
- 创建与删除过程中使用的完整命令清单；
- 一段 100 字以内的说明，解释绝对路径与相对路径的起点差异。

#### 验收标准

- 目录树层级与要求一致，且完全通过命令行创建；
- 三个相对路径全部正确，`..` 层级没有多退或少退；
- 绝对路径不包含真实用户名，统一使用占位符；
- 删除操作目标准确，没有误删练习目录以外的内容。

### 练习 2：工作目录侦探

#### 任务

编写 `scripts/show-paths.mjs`，同时输出当前工作目录、脚本绝对路径和脚本所在目录；再编写脚本读取“脚本旁边”的 `sample.txt`，要求无论从哪个目录启动都能成功。

概念伪代码：

```text
输出 process.cwd()
通过 import.meta.url + fileURLToPath 得到脚本文件路径
输出脚本文件路径与 path.dirname 结果

计算脚本目录与 sample.txt 的拼接路径
读取该文件并输出内容
```

#### 步骤约束

1. 项目结构为 `cwd-lab/scripts/show-paths.mjs` 与 `cwd-lab/scripts/sample.txt`，`sample.txt` 中写入一行任意中文文本。
2. 读取 `sample.txt` 必须使用 `path.dirname(fileURLToPath(import.meta.url))` 定位，不允许直接写 `'sample.txt'`。
3. 分别从三个位置运行：`cwd-lab/`、`cwd-lab/scripts/`、家目录（使用指向脚本的相对路径）。
4. 记录三次运行的完整输出，标注哪一项变化、哪一项不变。
5. 把其中一次 `sample.txt` 的读取故意改成直接写文件名 `'sample.txt'`，从家目录运行复现失败，再改回正确写法，记录错误信息。

#### 提交物

- `show-paths.mjs`、`sample.txt`；
- 三次运行的命令与输出记录；
- 一次失败复现的错误信息；
- 100 至 200 字结论：说明相对路径相对谁、为什么脚本目录写法更稳定。

#### 验收标准

- 脚本能从三个不同目录成功读取同一个 `sample.txt`；
- 记录清楚展示 `cwd` 变化而脚本路径不变；
- 失败复现的错误确实由工作目录引起；
- 代码中没有写死任何本机绝对路径。

### 练习 3：安全的文件整理

#### 任务

先生成一批“混乱文件”，再用通配符和 `cp`、`mv`、`rm` 把它们整理归档，全程遵守删除安全流程，并留下操作记录。

需要生成的文件（在 `messy/` 目录下）：

```text
report-a.log  report-b.log  report-c.log
photo-1.jpg   photo-2.jpg
note.txt
```

整理目标：

- 三个 `.log` 文件移动到 `messy/archive/logs/`；
- 两个 `.jpg` 文件复制到 `messy/archive/images/`（原文件保留）；
- 删除 `messy/` 根目录下名为 `temp-backup` 的临时目录（先创建它并放入一个空文件）。

#### 步骤约束

1. 目录使用 `mkdir -p` 创建，空文件使用 `touch` 生成。
2. 每次使用通配符前，先执行带相同通配符的 `ls` 验证匹配范围，并把验证输出记录在案。
3. 移动日志使用 `mv report-*.log archive/logs/`；复制图片使用 `cp photo-*.jpg archive/images/`。
4. 删除临时目录前先 `pwd` 与 `ls -l temp-backup`，再执行 `rm -r temp-backup`；不使用 `sudo`，不使用指向家目录的路径。
5. 整理完成后执行 `tree messy` 或逐层 `ls`，对比整理前后的结构。

#### 提交物

- 完整命令清单（含每一步的验证命令）；
- 整理前与整理后的目录树输出；
- 一份“删除安全确认单”，逐条写明删除前做了哪些确认。

#### 验收标准

- 最终目录结构与目标完全一致，日志被移动、图片被复制；
- 每一次删除或通配符操作前都有只读验证证据；
- 没有删除任何练习目录以外的文件；
- 命令记录可被另一名学员原样复现。

## 阶段验收作业

### 作业名称

文件系统导航与路径可复现实验（fs-nav-lab）

### 作业场景

你需要向导师证明：面对一台不熟悉的机器，你能先“看清文件树”，再准确定位文件，并让脚本在任何目录下都找到它依赖的数据；同时，你对删除操作始终保持克制。所有结论必须来自真实命令输出，而不是凭印象描述。

### 提交物清单

目录结构要求如下：

```text
fs-nav-lab/
├── scripts/
│   ├── show-paths.mjs      # 输出 cwd、脚本路径、脚本目录
│   └── locate-data.mjs     # 稳定读取 data/sample.json
├── data/
│   └── sample.json         # 内含一个 JSON 对象，字段自定
├── evidence/
│   ├── directory-tree.txt  # tree 或 ls -R 的真实输出
│   ├── run-records.md      # 从三个目录运行的记录
│   └── cleanup-log.md      # 删除练习的确认单与前后对比
│   └── paths-quiz.md       # 路径问答（含 . 与 ..）
└── README.md
```

不允许引入第三方依赖。`README.md` 中不得出现真实用户名、真实密钥、本机绝对路径和固定 PID。

### 必做内容

1. **结构观察**：在 `evidence/directory-tree.txt` 中保存整个实验目录的树形输出，并在 `paths-quiz.md` 中完成至少 6 组路径问答，题目要覆盖绝对路径、相对路径、`.` 与 `..`。
2. **位置对比**：运行 `scripts/show-paths.mjs`，分别从 `fs-nav-lab/`、`fs-nav-lab/scripts/` 和家目录启动，完整记录输出，标注变化项与不变项。
3. **稳定读取**：`locate-data.mjs` 使用脚本目录加 `path.join` 的方式读取 `data/sample.json` 并解析打印，要求从三个目录运行全部成功。
4. **安全整理**：在实验目录内创建 `playground/`，生成至少 5 个带通配规律的练习文件，完成移动、复制和一次删除，全过程证据写入 `cleanup-log.md`。
5. **跨平台说明**：在 README 中说明本项目为何不手写 `/` 或 `\`，并给出 Windows 学员使用 WSL2 的操作提示。

### 演示步骤

学员需要在 15 分钟内完成现场演示：

1. 用 `tree` 或逐层 `ls` 介绍实验目录，并在纸上画出对应目录树。
2. 现场回答导师指定的 2 组路径问答（导师可任意指定起点与目标）。
3. 从两个不同目录运行 `show-paths.mjs`，解释哪一项为什么发生变化。
4. 运行 `locate-data.mjs`，解释它为什么不受启动目录影响。
5. 对 `playground/` 现场执行一次“先验证、后删除”的操作，先给出 `ls` 验证再执行 `rm`。
6. 展示 README 中的跨平台与安全说明。

导师可以改变起点目录或要求删除不同文件，验证学员是否真正理解规则，而非背诵固定命令。

### 评分标准

总分 100 分，70 分及以上通过。

| 维度 | 分值 | 满分要求 |
|---|---:|---|
| 文件系统心智模型与路径表达 | 25 | 目录树正确，绝对/相对路径及 `.`、`..` 推导全部准确 |
| 文件命令操作正确性 | 20 | `pwd/ls/cd/mkdir/touch/cp/mv/rm` 使用规范，结果与预期一致 |
| 工作目录与脚本目录辨析 | 20 | 能解释差异，三次运行记录与现象对应 |
| node:path 实际应用 | 15 | `join/resolve/basename/dirname/extname` 使用正确，无手写分隔符 |
| 删除安全与信息脱敏 | 10 | 删除前均有验证，无危险路径，提交物不含真实个人信息 |
| 文档与复盘表达 | 10 | README 可指导他人复现，结论区分事实与推断 |

细分评分规则：

#### 文件系统心智模型与路径表达：25 分

- 文件、目录、根目录关系正确：7 分；
- 绝对路径与相对路径推导正确：10 分；
- `.`、`..`、`~` 使用正确：8 分。

#### 文件命令操作正确性：20 分

- 定位与查看类命令正确：6 分；
- 创建、复制、移动类命令正确：8 分；
- 通配符匹配结果正确：6 分。

#### 工作目录与脚本目录辨析：20 分

- 能用 Node 输出并解释两个位置：8 分；
- 三次运行记录完整：6 分；
- 能解释相对路径解析规则并正确定位脚本旁文件：6 分。

#### node:path 实际应用：15 分

- `join` 与 `resolve` 区分正确：6 分；
- `basename/dirname/extname` 拆解正确：5 分；
- 与 `fileURLToPath` 配合正确：4 分。

#### 删除安全与信息脱敏：10 分

- 删除前先 `pwd` 与 `ls` 验证：4 分；
- 未使用指向根目录或家目录的危险删除：3 分；
- 用户名、绝对路径等信息已脱敏：3 分。

#### 文档与复盘表达：10 分

- README 步骤完整、可复现：5 分；
- 结论清楚区分已观察事实与推断：5 分。

### 强制不通过条件

出现以下任一情况，本次验收不通过；修正后重新验收：

1. 对根目录、家目录或来源不明的变量路径执行 `rm -rf`，或在练习目录以外删除文件。
2. 无法区分当前工作目录与脚本文件所在目录，或认为相对路径天然相对脚本。
3. 脚本只能在某一个固定绝对路径下运行，换到其他目录即失败。
4. 提交内容包含真实密码、令牌（例如形如 `sk-xxxx` 的真实密钥必须替换成占位符）、私钥或真实个人用户名。
5. 只提交截图或口头描述，缺少脚本、命令记录与文字解释。
6. 代码围栏不成对、文件无法正常阅读，或目录结构与提交物清单严重不符。

### 学习目标与验收映射

| 学习目标 | 验收证据 |
|---|---|
| 建立文件、目录、根目录的心智模型 | `directory-tree.txt`、`paths-quiz.md` 与现场画图 |
| 准确使用绝对路径、相对路径、`.` 与 `..` | 路径问答与现场导师抽问 |
| 区分工作目录与脚本目录 | 三次运行 `show-paths.mjs` 的对比记录 |
| 规范使用基础文件命令 | `cleanup-log.md` 中的命令与前后结构对比 |
| 安全使用删除与通配符 | 删除确认单、验证命令输出 |
| 使用 node:path 做跨平台路径处理 | `locate-data.mjs` 源码与三次成功运行记录 |

### 提交前自检

- [ ] 六个学习目标均有对应证据。
- [ ] 所有路径问答均经过命令实际验证，不是凭猜测填写。
- [ ] `show-paths.mjs` 与 `locate-data.mjs` 能从三个不同目录成功运行。
- [ ] 代码中没有手写 `/`、`\` 拼接，也没有本机绝对路径。
- [ ] 每一次删除前都留有 `pwd` 与 `ls` 验证记录。
- [ ] 提交物中的用户名、家目录路径、密钥等信息已全部脱敏。
- [ ] README 能指导另一名零基础学员复现全部实验。
- [ ] 结论中明确区分了已观察事实、合理推断和仍需验证的假设。
