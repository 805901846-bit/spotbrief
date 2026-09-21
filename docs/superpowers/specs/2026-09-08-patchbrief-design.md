# SpotBrief Design Specification

## Product intent

SpotBrief（视觉修改任务书）是一款完全在浏览器本地运行的开源前端协作工具。用户通过 GitHub Pages 安装页将 Bookmarklet 拖入书签栏，在普通网页或 localhost 页面中选择元素、补充修改要求与相关代码，并导出结构化 Frontend Change Brief。产品不读取本地源码、不自动修改代码、不要求登录或后端，也不上传页面数据。

首版以 Chromium（Chrome、Edge）为完整功能基线。Firefox 与 Safari 保证启动、选择、编辑、生成和销毁等核心流程可用；截图、剪贴板等受浏览器能力或权限影响的功能提供明确降级。

## Delivery model

项目采用 GitHub 仓库、GitHub Pages 安装页和自包含 JavaScript Bookmarklet。TypeScript 源码按职责拆分，esbuild 将运行时打包、压缩为单个 IIFE，并内联 Shadow DOM 面板样式。构建脚本编码并按需分割 payload；安装页从自身目录使用版本参数加载 payload，验证 HTTP 状态、内容类型与重组结果后才为可拖动按钮设置 `javascript:` URL。

默认交付单体、自包含 Bookmarklet。只有完整 URL 超过构建设定的安全长度时，构建器才输出明确警告并启用多段 payload 组装；安装完成后的 Bookmarklet 不依赖 CDN、第三方 API 或远程运行时代码。

未编码运行时以 180 KB 为目标预算，超过 250 KB 时构建输出显著警告。项目不引入 UI 框架、DOM 转图片库或其他大型运行时依赖。

## Runtime architecture

### Lifecycle

入口检查 `window.__PATCHBRIEF__`：已有实例时调用 `open()` 并恢复检查状态，不重复注入。首次启动创建 Shadow DOM 宿主、面板、悬停 Overlay、选中 Overlay、状态容器和统一清理注册表，然后加载仅包含 SpotBrief 偏好的设置并进入检查模式。

全局只暴露 `window.__PATCHBRIEF__`，接口为 `open()`、`pause()`、`resume()`、`destroy()` 和 `version`。`destroy()` 取消事件监听、MutationObserver、定时器、animation frame、媒体轨道和临时对象 URL，移除宿主与 Overlay，并删除全局控制对象，不永久修改目标页面。

### State and identity

元素身份由 `WeakMap<Element, string>` 延迟分配，不扫描或标记整棵 DOM。运行时选区记录保留 Element 引用及展示快照，导出前转换成不含 Element 的纯数据。选区变化保存到有限历史栈，支持撤销、清空和切换选择。

元素仍连接文档时继续使用；被移除后卡片显示“目标已失效”，仍允许填写说明或删除，但不尝试对断开节点重新生成几何信息。动态新增元素通过事件命中即时解析，无需初始化扫描。

### Inspector and target resolution

指针移动由 `requestAnimationFrame` 合并，每帧只处理最后坐标。事件优先读取 `composedPath()`，过滤 SpotBrief 自身 UI、隐藏或近零尺寸元素、透明元素及 script/style/meta/link/template/noscript。

`resolveTarget()` 优先交互控件、媒体、标题、列表项、表格单元格、有效 role、直接文本元素和具有多个可见子项的布局容器。交互元素内部的 span 或图标提升至所属控件，但当已选大区域后点击内部更具体元素时允许向下细化。

普通点击替换选区；Shift 点击切换多选；再次点击已选元素取消该目标。点击检查期间阻止原页面点击默认行为和传播。方向键从主目标选择父元素、第一个有意义子元素、前一个或后一个有意义兄弟。输入、textarea、select 和 contenteditable 聚焦时不劫持普通快捷键。

Esc 有选区时清空，无选区时切换暂停；Ctrl/Cmd+Z 撤销；Ctrl/Cmd+Enter 生成；预览开启时 Ctrl/Cmd+C 复制任务书。滚动、尺寸变化、选区变化及面板形态变化通过节流重新定位固定 Overlay。

### Selector, semantics, context, and privacy

Selector 流水线依次尝试唯一稳定的 `data-testid`、`data-test`、`data-cy`、`data-qa`、ID、`aria-label`、name、title、语义 class、稳定祖先组合和 `nth-of-type`。每个候选均使用 `document.querySelectorAll(candidate).length === 1` 验证。UUID、长哈希、React 自动 ID、CSS Modules、CSS-in-JS、Tailwind 工具类、随机值和超长属性被过滤；超过长度上限或无法可靠唯一定位时省略 Selector。

语义 Locator 的名称来源依次为 aria-label、关联 label、title、placeholder、alt、可见文本和 name，并映射为 button、heading、link、textbox、img 等可读角色。区域信息从最近的 dialog、form、nav、main、section、article、aside、header、footer、table cell、list item 或标题推导。

视觉摘要只保留尺寸、布局模式、flex/grid、边框与圆角、显著背景与文字颜色、字号、阴影、定位、overflow、gap 和对齐等有判别力的非默认信息。

局部 HTML 在克隆节点上清理。清理器移除脚本、样式、noscript、内联事件、`data-patchbrief-*`、表单实际值，以及名称或内容涉及 token、cookie、authorization、secret、session、csrf、API key 的数据和高熵长串。密码输入只输出 `<input type="password">`。运行时不读取 cookie、localStorage/sessionStorage 内容、React props 或网络请求；localStorage 适配器只访问 SpotBrief 自身键。

### Iframe and Shadow DOM

开放 Shadow Root 通过 composed path 选择内部元素；关闭 Shadow Root 只能选择宿主。同源 iframe 在可访问其 document 时记录 frame 上下文并支持内部命中；跨域 iframe 只允许选择 iframe 元素本身，并在卡片中说明安全边界。

## Workbench interaction design

工具采用“任务书工作台”视觉语言：温暖浅米色纸张、深墨色文字、琥珀橙强调色、细边框和轻纸层阴影。禁止使用典型 AI 渐变、聊天气泡、大片玻璃拟态、DevTools 风格或黑白浮动菜单。

桌面端面板固定于右侧，标准宽度 380 px，可折叠和最小化；窄屏改为不超过视口宽度、最高约 55vh 的底部抽屉，关键生成按钮保持可见。全部面板 UI 位于 Shadow DOM。页面顶层 Overlay 使用 `patchbrief-` 命名、`position: fixed`、极高 z-index 和 `pointer-events: none`，不改变布局。悬停为低饱和琥珀轮廓与语义标签；锁定目标使用更明确的橙色实线和编号。

顶栏提供状态、暂停/恢复、最小化、设置和关闭。四步导航为选择目标、描述修改、补充代码、生成任务书，但不强制线性填写。目标卡片显示序号、可读名称、标签、文本摘要、Selector、Locator、区域、尺寸、失效状态、删除按钮和元素说明。

表单包括全局修改目标、相关代码、修改约束、预期结果。代码区支持 TSX、JSX、TypeScript、JavaScript、Vue、HTML、CSS、SCSS、Other，使用等宽多行输入、保留缩进、显示字符数并可清空。快捷约束与自由文本约束合并去重。

所有界面文字、反馈、错误和快捷键提示来自统一的简体中文/英文词典，默认跟随浏览器语言并可切换。

## Draft, output, and persistence

内存中的 `BriefDraft` 包含版本、页面 URL/route/query/title/viewport、选择目标、全局请求、相关代码、约束、预期结果和可选截图元数据。生成前重新计算每个仍连接目标的 Selector、Locator、区域、视觉与尺寸。

生成器输出 `# Frontend Change Brief`，依次包含非空的修改目标、页面上下文、选中目标、相关代码、修改约束、预期结果和执行要求。Locator 已完整含有文本时不重复当前文本；不可靠 Selector 不输出；无代码不输出代码章节；无用户约束时加入安全默认约束；URL 拆分为 route 与压缩 query。

没有选择元素或没有填写全局修改目标时，生成器展示可操作确认提示，允许用户补充，也允许在确认后生成仅含现有上下文的任务书。代码或任务书超过软上限时警告但不截断、不丢弃。

预览在面板内切换为完整文档视图，保留草稿，支持返回、复制 Markdown、下载 Markdown、复制 JSON和字符数显示。Clipboard API 失败时使用隐藏 textarea 与 `execCommand('copy')`；再次失败则选中文本并指示手动复制。下载使用临时 Blob URL 并立即清理。

默认仅持久化语言、面板位置/折叠状态、默认约束、是否包含 HTML/视觉摘要和截图提示。代码、选区、网页文本、请求、截图和历史默认不保存。可选“记住当前草稿”必须由用户主动开启，并可清除；localStorage 不可用时退回内存并提示。

## Screenshot strategy

截图为非阻塞可选能力。用户主动点击后，能力层检查 Screen Capture API 并请求用户选择当前标签页；授权后临时隐藏面板和 Overlay，从捕获视频帧按所选元素联合 bounding box 与缩放比例裁切。完成后停止媒体轨道并恢复 UI。

支持时尝试复制 PNG，否则提供下载 PNG；文件名写入任务书。浏览器不支持、权限失败或用户取消时均保留主流程，其中取消只显示轻量提示。产品不宣称无权限截图，也不使用 html2canvas。

## Install page

安装页延续纸张工作台设计，包含中英文切换、三步安装、书签栏开启说明、静态交互演示、仓库链接、隐私声明、支持范围、版本、FAQ 和“书签已准备好”状态。仓库链接优先读取构建环境中的 `PATCHBRIEF_REPOSITORY_URL`；未配置且运行于 `*.github.io` 时，从当前主机名与首段路径推导 `github.com/{owner}/{repository}`，从而不硬编码 GitHub 用户名。其他部署环境无法可靠推导时隐藏链接并显示配置说明。

加载 payload 时带版本参数，检查响应状态、拒绝 HTML 错误页、校验分块顺序和摘要，并确认重组 URL 以 `javascript:` 开头。就绪前按钮使用不可拖动的 disabled 状态且不设置 `#` href；失败时显示原因和重试动作。

`public/preview.svg` 提供原创可替换预览图。演示场景完全使用本地静态资源，不请求第三方内容。

## Failure behavior

内部浏览器页面、商店和新标签页通常禁止执行 Bookmarklet，安装页与 FAQ 明确说明。运行时可处理的失败均提供下一步操作，包括 payload、剪贴板、截图、失效节点、Selector 缺失、超大 DOM、频繁重绘、iframe、Shadow DOM、高 z-index、CSS 污染、缺失必填上下文、超长输入、存储不可用和重复启动。

性能保护包括按帧命中、节流几何更新、限定选择历史、限定文本/HTML采集范围、避免 DOM 全量扫描以及在持续高频变化时降低 Overlay 更新频率。错误边界保护面板渲染和生成流程，单一目标失效不会使整个工具崩溃。

## Source layout

- `src/bookmarklet/`：生命周期、状态、检查器、目标解析、选择、上下文、Selector、清理、提示词、剪贴板、截图、设置、快捷键、国际化和销毁。
- `src/panel/`：Shadow DOM 面板、渲染、事件委托和内联样式源。
- `src/install-page/`：安装页文档、脚本与样式。
- `tests/unit/`：纯逻辑和 jsdom 行为测试。
- `tests/e2e/`：Chromium 完整流程及 Firefox/WebKit 核心兼容测试。
- `tests/fixtures/`：基础、仪表盘、动态 DOM、侵入样式和 iframe 场景。
- `scripts/`：构建、Bookmarklet 编码/分块和 dist 验证。
- `public/`：favicon 和原创预览 SVG。
- `.github/workflows/`：测试与 Pages 部署。

## Testing and release verification

Vitest 单元测试覆盖稳定/唯一 Selector、不稳定 class、文本截断、query 压缩、敏感字段与 HTML 清理、语义 Locator、任务书生成、空字段省略、多元素、中英文词典和截图裁切纯函数。

Playwright Chromium 覆盖启动、悬停、点击、Shift 多选、父子/兄弟导航、删除、元素说明、全局要求、代码、约束、生成、复制反馈、暂停恢复、动态元素、滚动定位、样式双向隔离和完整销毁。Firefox/WebKit 覆盖核心启动、选择、生成、销毁和样式隔离。系统屏幕授权不在 CI 中伪造，改由可注入媒体适配器验证成功、取消和失败路径。

`npm run verify` 检查 IIFE 可解析、payload 可重组、Bookmarklet 前缀、安装页资源、GitHub Pages 子目录相对路径、无硬编码用户名、无测试代码、无绝对源码路径及体积预算。`dist/` 是可直接上传的 Pages artifact。

`test.yml` 在 push/PR 执行依赖安装、类型检查、单测、构建、dist 验证和可行的 Playwright 测试。`deploy-pages.yml` 在 main 更新时使用最小权限重新检查、构建、上传并部署 Pages artifact，不包含密钥。

## Documentation and licensing

README 包含产品预览、安装与使用、快捷键、示例输出、隐私、支持范围、已知限制、开发/构建/测试和 Pages 部署。CONTRIBUTING、SECURITY、MIT LICENSE 和 NOTICE 一并提供。实现为原创代码，无第三方运行时依赖或参考项目代码复制；NOTICE 记录项目版权与该事实。

## Acceptance boundary

完成定义为：依赖可重复安装，TypeScript、单元测试、构建、dist 验证及可运行的 Playwright 套件均有新鲜结果；安装页可加载并生成可拖动书签；普通网页上的核心选择与任务书流程完整；销毁无残留；数据不上传；文档与实际行为一致。

浏览器内部页面、跨域 iframe 内部、关闭 Shadow Root、系统截图授权及目标页面 CSP/Bookmarklet 策略属于浏览器安全边界，项目提供诚实说明与降级，不承诺绕过。
