# SpotBrief 品牌迁移设计

日期：2026-09-15

## 目标

将产品公开名称从 SpotBrief 更新为 SpotBrief，并把版本升级到 `0.2.0`。此次迁移覆盖用户可见界面、安装入口、项目元数据和对外文档，同时保留旧版内部标识以兼容已经保存的设置及旧书签实例。

## 对外品牌

以下位置统一显示 SpotBrief：

- GitHub Pages 安装页标题、页头、安装按钮、引导文案、图片替代文本、FAQ、页脚和 AI 设置说明。
- Bookmarklet 工作台品牌标题、截图文件名、Markdown 下载文件名和用户可见错误提示。
- `package.json` 包名、描述和 README 项目名称。
- CONTRIBUTING、SECURITY、NOTICE、LICENSE 版权主体及面向用户的说明。
- 零基础指南、产品功能记录、架构图和面试材料。
- 预览 SVG 中的品牌文字。
- 构建日志、manifest 版本和构建验证中的对外文件命名。

任务书标题 `# Frontend Change Brief` 保持不变，因为它是输出文档类型，而非品牌名称。

## 内部兼容标识

以下内部标识在 `0.2.0` 中继续保留：

- `window.__PATCHBRIEF__`
- `window.__PATCHBRIEF_AI_BRIDGE__`
- `patchbrief:preferences`
- `patchbrief:ai-settings`
- `patchbrief:ai-pairing-token`
- `patchbrief-ai-*` 消息协议
- `patchbrief-` CSS class、DOM id、data 属性和运行时文件名

保留原因：旧设置可以继续读取；旧书签和新书签使用同一个全局控制对象，不会重复注入；现有测试、选择器和宿主页面隔离规则不需要危险迁移。

界面和文档不得把这些内部兼容标识解释为当前产品名称。开发文档需要注明它们是历史兼容接口。

## 版本与安装

- `VERSION`、`package.json`、安装页、payload manifest 和缓存参数统一升级为 `0.2.0`。
- 安装按钮显示 `SpotBrief`，生成的新书签包含 `0.2.0` 运行时代码。
- 已安装的旧书签不会自动更新；用户需要从新安装页重新拖动 SpotBrief 按钮。
- 如果旧 SpotBrief 实例已经在当前页面运行，点击新 SpotBrief 书签会通过兼容控制对象聚焦现有实例，不重复注入。
- 下一次刷新页面后再点击新书签，面板显示 SpotBrief。

## 文件命名

用户直接下载或看到的文件采用 `spotbrief-*`：

- Markdown：`spotbrief-{timestamp}.md`
- 截图：`spotbrief-screenshot-{timestamp}.png`
- 构建输出中的书签文本文件：`spotbrief-bookmarklet.txt`

为降低部署迁移风险，`dist/patchbrief.runtime.js` 在 `0.2.0` 继续作为内部构建产物保留。安装页通过 payload 加载完整书签，不直接要求用户理解此文件名。构建验证同时检查新的书签文本文件和兼容运行时文件。

## 文档处理

- 当前有效文档全部使用 SpotBrief 作为产品名称。
- 历史设计与实施计划也同步更新标题和正文，避免求职展示时出现两个品牌。
- 文件路径中包含 `SpotBrief` 的当前指南、面试材料和架构产物重命名为 `SpotBrief`。
- Git 历史提交信息不改写。
- 若文档必须解释迁移，可写“SpotBrief（原 SpotBrief）”，只在迁移说明中出现一次。

## 测试与验收

- 单元测试验证 `VERSION === '0.2.0'`。
- 安装页 E2E 验证标题、页头和可拖动按钮均显示 SpotBrief，页面不再出现面向用户的 SpotBrief 品牌文案。
- Bookmarklet E2E 验证面板显示 SpotBrief，截图及 Markdown 下载名以 `spotbrief-` 开头。
- 兼容测试验证旧 localStorage 键仍可读取，`window.__PATCHBRIEF__` 仍承担重复启动保护。
- 构建验证检查 manifest 为 `0.2.0`、新书签文本文件存在、最终 URL 以 `javascript:` 开头且运行时不超过体积预算。
- README、指南、架构图和面试材料中不得残留作为产品名称使用的 SpotBrief；允许源码兼容标识和迁移说明出现旧名称。

## 不在本次范围

- 清除或迁移旧 localStorage 键。
- 改写 Git 历史。
- 改变任务书结构或现有产品功能。
- 注册域名、创建 GitHub 仓库或发布公网网站。
- 在 `0.2.0` 删除旧全局对象、DOM 命名空间或消息协议。
