import type { BriefDraft } from './types';
import { analyzeInstruction } from './instruction-analysis';
const defaults = ['不修改无关文件', '不要安装新依赖', '保持响应式兼容', '保持可访问性', '修改后运行检查'];
export function generateBriefMarkdown(draft: BriefDraft): string {
  const analysis = analyzeInstruction([draft.request, ...draft.selections.map(item => item.note || '')].join('\n'));
  const out = ['# Frontend Change Brief', '', '请根据以下页面上下文和修改要求完成前端修改。'];
  if (draft.request.trim()) out.push('', '## 修改目标', '', draft.request.trim());
  out.push('', '## 页面上下文', '', `- 页面：${draft.page.url}`, `- 路由：${draft.page.route}`);
  if (draft.page.query) out.push(`- 查询参数：${draft.page.query}`);
  out.push(`- 视口：${draft.page.viewport.width} × ${draft.page.viewport.height}`, `- 设备像素比：${draft.page.viewport.devicePixelRatio}`);
  if (draft.selections.length) {
    out.push('', '## 选中目标');
    for (const item of draft.selections) {
      out.push('', `### 目标 ${item.index}`, '', `- 元素：${item.label}`, `- 标签：${item.tag}`);
      if (item.selector) out.push(`- Selector：${item.selector}`);
      if (item.locator) out.push(`- 语义定位：${item.locator}`);
      if (item.region) out.push(`- 所在区域：${item.region}`);
      if (item.visual) out.push(`- 当前视觉：${item.visual}`);
      if (item.text && !item.locator?.includes(item.text)) out.push(`- 当前文本：${item.text}`);
      if (item.html) out.push(`- 局部 HTML：${item.html}`);
      if (item.note) out.push(`- 单独说明：${item.note}`);
      if (item.invalid) out.push('- 状态：目标已失效');
    }
  }
  if (draft.relatedCode?.content.trim()) out.push('', '## 相关代码', '', `\`\`\`${draft.relatedCode.language.toLowerCase()}`, draft.relatedCode.content, '```');
  out.push('', '## 修改约束', '', ...(draft.constraints.length ? draft.constraints : defaults).map((x) => `- ${x}`));
  if (draft.screenshot?.filename || draft.screenshot?.description) {
    out.push('', '## 截图', '');
    if (draft.screenshot.filename) out.push(`- 文件名：${draft.screenshot.filename}`);
    if (draft.screenshot.description) out.push(`- 说明：${draft.screenshot.description}`);
  }
  if (!analysis.canExecuteDirectly) {
    out.push('', '## 待确认', '');
    for (const term of analysis.ambiguousTerms) out.push(`- “${term}”属于主观描述，需要补充具体视觉风格、页面内参考对象或可观察的变化。`);
    out.push('- 确认前不要自行指定颜色、阴影、渐变或视觉风格。');
  }
  out.push('', '## 执行要求', '', '1. 先确认应修改的组件、样式和相关文件。', '2. 只修改与本任务直接相关的代码。', '3. 不要修改无关页面。', '4. 保留现有业务逻辑，除非修改目标明确要求改变。', '5. 不要擅自增加依赖。', '6. 如果修改共享组件可能影响其他页面，请先说明风险。', '7. 完成后列出修改文件和修改内容。', '8. 运行适合当前项目的类型检查、Lint 或测试。', '9. 如果缺少必要上下文，请明确指出，不要猜测重要业务逻辑。');
  return `${out.join('\n').trim()}\n`;
}
export const serializeBriefJson = (draft: BriefDraft) => JSON.stringify(draft, null, 2);
