import { describe, expect, it } from 'vitest';
import { generateBriefMarkdown } from '../../src/bookmarklet/prompt';
import type { BriefDraft } from '../../src/bookmarklet/types';

const draft: BriefDraft = { version: '0.1.0', page: { url: 'https://example.com/orders?id=1', route: '/orders', query: 'id=1', viewport: { width: 1280, height: 720, devicePixelRatio: 2 } }, selections: [{ index: 1, label: '删除订单', tag: 'button', locator: 'button "删除订单"', selector: '#delete', note: '危险样式' }], request: '调整删除按钮', constraints: [] };
describe('brief output', () => {
  it('outputs targets and defaults while omitting empty code', () => {
    const text = generateBriefMarkdown(draft);
    expect(text).toContain('# Frontend Change Brief');
    expect(text).toContain('### 目标 1');
    expect(text).toContain('危险样式');
    expect(text).toContain('不要安装新依赖');
    expect(text).not.toContain('## 相关代码');
    expect(text).not.toContain('## 截图');
  });
  it('includes screenshot metadata without embedding image bytes', () => {
    const text = generateBriefMarkdown({ ...draft, screenshot: { filename: 'patchbrief-screenshot.png', description: '用户手动选择的页面区域' } });
    expect(text).toContain('## 截图');
    expect(text).toContain('patchbrief-screenshot.png');
    expect(text).toContain('用户手动选择的页面区域');
    expect(text).not.toContain('data:image');
  });
  it('includes a screenshot instruction and ignores the legacy expected result', () => {
    const text = generateBriefMarkdown({ ...draft, screenshot: { filename: 'capture.png', description: '重点修改左侧卡片间距' }, expectedResult: '旧版预期结果' });
    expect(text).toContain('- 说明：重点修改左侧卡片间距');
    expect(text).not.toContain('## 预期结果');
    expect(text).not.toContain('旧版预期结果');
  });

  it('omits an empty screenshot description', () => {
    const text = generateBriefMarkdown({ ...draft, screenshot: { filename: 'capture.png', description: '' } });
    expect(text).toContain('- 文件名：capture.png');
    expect(text).not.toContain('- 说明：');
  });
  it('turns subjective wording into a clarification brief instead of inventing a style', () => {
    const text = generateBriefMarkdown({ ...draft, request: '这个按钮高级一点' });

    expect(text).toContain('## 待确认');
    expect(text).toContain('“高级一点”属于主观描述');
    expect(text).toContain('不要自行指定颜色、阴影、渐变或视觉风格');
  });
});
