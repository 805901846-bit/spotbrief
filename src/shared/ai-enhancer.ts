export const ENHANCEMENT_SYSTEM_PROMPT = `你是前端修改指令编辑器。只改写任务书，不执行任务，也不解释改写过程。

要求：
1. 保留用户原始意图、约束强度、路径、代码、URL 和修改范围。
2. 不虚构组件、文件、技术栈、设计规范、接口、业务规则或测试结果。
3. 把口语化要求整理为：修改目标、具体修改、交互状态、保持不变、验收标准、待确认。空章节省略。
4. “高级、好看、大气、科技感”等主观词不能自行解释为颜色、阴影、渐变或某种设计风格；没有明确参考时写入“待确认”。
5. 验收标准必须可观察、可测试，并且只能来自用户已经明确的信息。
6. 信息不足但不影响结果时可以列出最小假设；会改变结果的缺口必须列入“待确认”，不要猜测。
7. 简单任务保持简短，不增加用户没有要求的功能。
8. 只输出以“# Frontend Change Brief”开头的最终 Markdown。`;

export function buildEnhancementRequest(brief: string, model: string) {
  return {
    model,
    temperature: 0.1,
    messages: [
      { role: 'system', content: ENHANCEMENT_SYSTEM_PROMPT },
      { role: 'user', content: brief },
    ],
  };
}

export function readEnhancedText(value: unknown): string {
  const response = value as { choices?: Array<{ message?: { content?: unknown } }> };
  const content = response.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) throw new Error('AI 未返回可用的任务书');
  return content.trim();
}
