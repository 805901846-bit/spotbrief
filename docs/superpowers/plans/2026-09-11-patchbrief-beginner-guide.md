# PatchBrief Beginner Guide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 创建一份 Google Chrome 本地使用场景下，零计算机基础用户可以独立照做的 PatchBrief 中文说明书。

**Architecture:** 使用单一 Markdown 文档承载完整操作流程。正文按真实使用顺序组织，第 7 步详细解释选区操作，第 8 步逐项解释表单填写，并通过术语、边界和内容扫描验证说明与产品一致。

**Tech Stack:** Markdown、现有 PatchBrief README 与运行时代码。

---

### Task 1: 编写零基础说明书

**Files:**
- Create: `docs/guides/PatchBrief-零基础使用说明书.md`
- Reference: `README.md`
- Reference: `src/bookmarklet/index.ts`

- [ ] **Step 1: 编写使用前准备和安装步骤**

说明 Chrome 书签栏、本地安装页和 PatchBrief 按钮，并为每个关键动作加入“成功时你会看到”。

- [ ] **Step 2: 详细编写第 7 步选区操作**

覆盖悬停、单击、Shift 多选、再次点击、撤销、清空、Esc、暂停与恢复，并明确输入框中不使用快捷键。

- [ ] **Step 3: 详细编写第 8 步表单填写**

逐项解释元素说明、全局目标、相关代码、语言、快捷约束和预期结果；每项提供可以直接模仿的例子和常见错误。

- [ ] **Step 4: 编写生成、复制、交给 AI 和关闭流程**

说明预览、复制 Markdown、复制 JSON、下载 Markdown、返回修改及关闭工具。

- [ ] **Step 5: 编写常见问题和能力边界**

覆盖本地页面打不开、书签未准备、点击无反应、选错位置、复制失败、内部页面限制和隐私提醒。

### Task 2: 验证说明书

**Files:**
- Verify: `docs/guides/PatchBrief-零基础使用说明书.md`

- [ ] **Step 1: 检查结构完整性**

Run: `rg -n '^## 第 (7|8) 步|成功时你会看到|常见问题|隐私' docs/guides/PatchBrief-零基础使用说明书.md`

Expected: 第 7、8 步、成功提示、常见问题和隐私章节均存在。

- [ ] **Step 2: 检查错误承诺**

Run: `rg -n '自动修改代码|支持所有网页|无权限截图|读取本地源码' docs/guides/PatchBrief-零基础使用说明书.md`

Expected: 这些词只出现在否定或限制说明中。

- [ ] **Step 3: 检查占位符**

Run: `rg -n 'TBD|TODO|待补充|以后再写' docs/guides/PatchBrief-零基础使用说明书.md`

Expected: 无输出。
