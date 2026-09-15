import { describe, expect, it } from 'vitest';
import { analyzeInstruction } from '../../src/bookmarklet/instruction-analysis';

describe('instruction ambiguity analysis', () => {
  it('flags subjective visual language as requiring clarification', () => {
    const result = analyzeInstruction('这个按钮高级一点');

    expect(result.canExecuteDirectly).toBe(false);
    expect(result.ambiguousTerms).toContain('高级一点');
    expect(result.missingInformation).toContain('希望达到的具体视觉风格或参考对象');
  });

  it('allows concrete visual instructions to proceed', () => {
    const result = analyzeInstruction('把按钮改成红色描边，悬停时显示浅红色背景');

    expect(result.canExecuteDirectly).toBe(true);
    expect(result.ambiguousTerms).toEqual([]);
  });
});
