# Contributing

欢迎提交 issue 和 pull request。开发前运行 `npm ci`，行为修改请先添加会失败的测试，再提交最小实现。PR 应通过 `npm run typecheck`、`npm test`、`npm run build`、`npm run verify` 和相关 Playwright 测试。不要加入运行时网络请求、遥测、账号体系或会采集页面隐私数据的能力。
