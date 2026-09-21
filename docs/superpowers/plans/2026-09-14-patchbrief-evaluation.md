# SpotBrief Evaluation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and run a reproducible paired A/B benchmark that compares natural-language prompts with SpotBrief briefs for real Codex frontend edits.

**Architecture:** A dependency-free Node.js runner loads JSON task manifests, copies immutable starters into isolated temporary Git repositories, invokes `codex exec`, runs hidden graders from outside the agent workspace, and writes JSON/Markdown/HTML reports. Task-specific graders expose one `grade(workspace)` function returning weighted checks; shared scoring and reporting remain generic.

**Tech Stack:** Node.js 20+, ECMAScript modules, built-in `node:test`, Git, Codex CLI, HTML/CSS/JavaScript fixtures.

---

## File map

- `package.json`: validation, test, smoke, full evaluation, and report commands.
- `src/config.mjs`: paths, arms, model, reasoning effort, timeout, and score weights.
- `src/tasks.mjs`: task discovery and strict manifest validation.
- `src/prompts.mjs`: leakage-safe baseline and SpotBrief prompt construction.
- `src/workspace.mjs`: temporary workspace creation and post-run diff capture.
- `src/codex-runner.mjs`: bounded non-interactive CLI execution.
- `src/grader.mjs`: hidden check execution, hard failures, scoring, and status.
- `src/report.mjs`: aggregation plus JSON, Markdown, and standalone HTML output.
- `src/cli.mjs`: validate, smoke, run, and report orchestration.
- `tasks/<id>/task.json`: public prompt, SpotBrief brief, weights, scope, and grader path.
- `tasks/<id>/starter/`: immutable project shown to Codex.
- `graders/<id>.mjs`: hidden deterministic checks unavailable inside agent workspaces.
- `tests/*.test.mjs`: runner unit and integration tests.
- `README.md`: operation, result interpretation, and known limitations.

### Task 1: Project skeleton and manifest contract

**Files:** Create `package.json`, `.gitignore`, `src/config.mjs`, `src/tasks.mjs`, `tests/tasks.test.mjs`.

- [ ] Write `tests/tasks.test.mjs` with a valid temporary manifest and invalid cases for missing ID, wrong audience, missing brief headings, non-100 weights, unsafe path, and duplicate IDs. Import `loadTasks()` and `validateTask()` from `src/tasks.mjs`.
- [ ] Run `node --test tests/tasks.test.mjs`; expect failure because `src/tasks.mjs` does not exist.
- [ ] Implement `validateTask(task, source)` to require `id`, `title`, `audience` in `novice|developer|product-design`, non-empty `naturalPrompt`, SpotBrief headings `# Frontend Change Brief`, `## 修改目标`, `## 选中目标`, `## 修改约束`, `## 预期结果`, six integer weights totaling 100, relative starter/grader paths, allowed paths, and positive timeout. Implement `loadTasks(root)` to discover sorted task directories and reject duplicates.
- [ ] Run the test and `npm run eval:validate`; expect all manifest tests to pass and validation to report zero tasks until fixtures are added.
- [ ] Commit with `git commit -m "feat: add evaluation manifest contract"`.

### Task 2: Prompt isolation contract

**Files:** Create `src/prompts.mjs`, `tests/prompts.test.mjs`.

- [ ] Write tests asserting `buildPrompt(task, 'baseline')` contains the natural request but none of `Selector`, `语义定位`, `局部 HTML`, `视觉摘要`, or the Brief body; assert the `patchbrief` arm contains the unchanged full Brief; assert both arms share identical execution and verification instructions.
- [ ] Run `node --test tests/prompts.test.mjs`; expect module-not-found failure.
- [ ] Implement `buildPrompt()` with a common preamble stating that only files in the current workspace may be changed, no hidden tests are visible, the agent must inspect existing code, implement the request, and run public checks. Append only `task.naturalPrompt` for baseline and `task.brief` for SpotBrief.
- [ ] Run prompt tests; expect both leakage and parity assertions to pass.
- [ ] Commit with `git commit -m "feat: isolate evaluation prompts"`.

### Task 3: Isolated workspace and Codex execution

**Files:** Create `src/workspace.mjs`, `src/codex-runner.mjs`, `tests/workspace.test.mjs`, `tests/codex-runner.test.mjs`.

- [ ] Write workspace tests that copy a starter into a supplied temp root, initialize Git, commit the baseline, reject paths outside the task root, and return a patch after a file edit.
- [ ] Run workspace tests; expect failure because the module is missing.
- [ ] Implement `prepareWorkspace(task, destination)` using `fs.cp`, `git init`, local test-only Git identity, and baseline commit; implement `captureDiff(workspace)` using `git diff --binary HEAD`.
- [ ] Write runner tests using a temporary fake executable: success, non-zero exit, and timeout. Verify stdout, stderr, exit code, duration, and `execution_error` classification.
- [ ] Run runner tests; expect module-not-found failure.
- [ ] Implement `runCodex({cwd,prompt,command,model,reasoning,timeoutMs})` using `spawn`, `codex exec --json --approve-for-me -s workspace-write -C <cwd> -m <model> -c model_reasoning_effort=<reasoning> <prompt>`, bounded timeout, and complete stream capture.
- [ ] Run workspace and runner tests; expect all cases to pass without invoking the real Codex CLI.
- [ ] Commit with `git commit -m "feat: run Codex in isolated workspaces"`.

### Task 4: Deterministic scoring

**Files:** Create `src/grader.mjs`, `tests/grader.test.mjs`.

- [ ] Write tests using synthetic checks for weighted scoring, required-check failure, hard failure, execution error, scope violation, and score boundaries 49/50/84/85.
- [ ] Run `node --test tests/grader.test.mjs`; expect module-not-found failure.
- [ ] Implement checks shaped as `{id, dimension, passed, required, hardFailure, detail}`. Award each dimension's configured weight in proportion to passed checks. Return `complete` only at 85+ with all required checks and no hard failure; return `partial` for 50–84; otherwise `failed`; execution failures remain `execution_error` and score `null`.
- [ ] Implement shared scope checks by comparing changed paths with `allowedPaths`, plus forbidden checks for changed test files, debug statements, secret markers, and empty diffs.
- [ ] Run grader tests; expect all status and arithmetic assertions to pass.
- [ ] Commit with `git commit -m "feat: add transparent benchmark scoring"`.

### Task 5: Twelve executable fixtures and mutation validation

**Files:** Create `tasks/N01`–`tasks/P02`, `graders/N01.mjs`–`graders/P02.mjs`, `tests/fixtures.test.mjs`.

- [ ] Create one starter per task with `index.html`, `styles.css`, `app.js`, and `check.mjs`. Each starter must run `node check.mjs` without third-party packages and pass before modification.
- [ ] Create each `task.json` from the table in the approved design. Briefs must include stable selector, semantic locator, relevant HTML/code, constraints, and expected results while natural prompts contain only user-visible language.
- [ ] Write one hidden grader per task with at least five checks covering its named functional requirement, regression behavior, scope, code quality, and visual/accessibility requirement.
- [ ] In `tests/fixtures.test.mjs`, load all 12 tasks, confirm starters pass their public checks, apply a deliberately wrong no-op mutation, and assert every hidden grader rejects it through at least one required check.
- [ ] Run `node --test tests/fixtures.test.mjs`; fix only fixture or grader defects until 12 starters pass and 12 wrong mutations fail.
- [ ] Commit with `git commit -m "test: add SpotBrief benchmark tasks"`.

### Task 6: Aggregation and reports

**Files:** Create `src/report.mjs`, `tests/report.test.mjs`.

- [ ] Write tests with paired synthetic results covering wins, ties, losses, missing arms, execution errors, audience segmentation, median, P50/P90 duration, completion-rate lift, and HTML escaping.
- [ ] Run `node --test tests/report.test.mjs`; expect module-not-found failure.
- [ ] Implement `aggregateResults()` and writers for `aggregate.json`, `report.md`, and standalone `report.html`. Exclude execution errors from completion-rate denominators and display them separately. Include per-check evidence and links to local artifacts.
- [ ] Run report tests; expect deterministic snapshots and safe HTML.
- [ ] Commit with `git commit -m "feat: generate paired evaluation reports"`.

### Task 7: CLI orchestration, caching, and SpotBrief contract

**Files:** Create `src/cli.mjs`, `tests/cli.test.mjs`, `tests/patchbrief-contract.test.mjs`, update `package.json`.

- [ ] Write CLI integration tests using a fake Codex command. Verify `validate`, two-task `smoke`, partial-run continuation, input-hash cache reuse, changed-input invalidation, and report rebuild.
- [ ] Run CLI tests; expect failure before orchestration exists.
- [ ] Implement deterministic run IDs, seeded arm order, `results/<run-id>` artifacts, per-execution input hash, resume behavior, concurrency of one, and signal-safe partial report generation.
- [ ] Add SpotBrief contract tests using `PATCHBRIEF_ROOT` with the known local path as default. Verify runtime and README exist, README states the product does not modify source, and all task briefs omit configured sensitive canaries.
- [ ] Run `npm test` and `npm run eval:validate`; expect all unit, integration, fixture, and contract tests to pass.
- [ ] Commit with `git commit -m "feat: orchestrate resumable A/B evaluations"`.

### Task 8: Documentation and dry-run verification

**Files:** Create `README.md`; update `.gitignore` and `package.json`.

- [ ] Document that Codex owns evaluation operation; describe `eval:validate`, `eval:smoke`, `eval`, and `eval:report`; document model/timeout environment variables, result fields, execution-error handling, and usage cost.
- [ ] Run `npm test`, `npm run eval:validate`, and a fake-run smoke command; expect zero failures and three report formats.
- [ ] Run `git diff --check` and inspect `git status --short`; expect no generated results or temporary workspaces tracked.
- [ ] Commit with `git commit -m "docs: explain SpotBrief evaluation workflow"`.

### Task 9: Real smoke A/B and result review

**Files:** Generate ignored `results/<run-id>/`; do not modify source unless the run exposes a verified framework defect.

- [ ] Confirm Codex CLI authentication and record exact CLI/model/reasoning versions in the run manifest.
- [ ] Run `npm run eval:smoke`; expect four real isolated edits: N01 baseline/SpotBrief and D01 baseline/SpotBrief.
- [ ] Re-run `npm run eval:report -- --run <run-id>` and compare aggregate hashes; expect identical scoring output apart from report generation timestamp.
- [ ] Inspect all four diffs, test evidence, and any `review_required` items. Classify framework defects separately from product outcomes.
- [ ] If the smoke set has valid differentiation and no framework defect, run `npm run eval`; otherwise correct the verified framework defect through a new red-green test before rerunning smoke.
- [ ] Commit source-only corrections, never generated benchmark results, then deliver report links and an evidence-based interpretation.
