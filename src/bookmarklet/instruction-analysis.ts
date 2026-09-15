export interface InstructionAnalysis {
  canExecuteDirectly: boolean;
  ambiguousTerms: string[];
  missingInformation: string[];
}

const subjectiveTerms = ['高级一点', '高级', '好看一点', '好看', '大气一点', '大气', '精致一点', '精致', '优化一下', '更有质感', '科技感'];

export function analyzeInstruction(input: string): InstructionAnalysis {
  const ambiguousTerms = subjectiveTerms.filter((term, index) => input.includes(term) && !subjectiveTerms.slice(0, index).some(parent => parent.includes(term) && input.includes(parent)));
  return {
    canExecuteDirectly: ambiguousTerms.length === 0,
    ambiguousTerms,
    missingInformation: ambiguousTerms.length ? ['希望达到的具体视觉风格或参考对象'] : [],
  };
}
