import { describe, expect, it } from 'vitest';
import { buildEnhancementRequest, readEnhancedText } from '../../src/shared/ai-enhancer';

describe('AI enhancement protocol', () => {
  it('builds a bounded frontend rewrite request', () => {
    const request = buildEnhancementRequest('# Frontend Change Brief\n\n高级一点', 'small-model');

    expect(request.model).toBe('small-model');
    expect(request.messages[0]?.content).toContain('不虚构');
    expect(request.messages[0]?.content).toContain('待确认');
    expect(request.messages[1]?.content).toContain('高级一点');
  });

  it('reads the rewritten prompt from a chat completion response', () => {
    expect(readEnhancedText({ choices: [{ message: { content: '优化后的任务书' } }] })).toBe('优化后的任务书');
  });

  it('rejects empty or malformed responses', () => {
    expect(() => readEnhancedText({ choices: [] })).toThrow('AI 未返回可用的任务书');
  });
});
