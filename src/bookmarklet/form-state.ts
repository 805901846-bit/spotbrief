export const SAFE_DEFAULT_CONSTRAINTS = [
  '不要安装新依赖',
  '不修改无关文件',
  '保持响应式兼容',
  '保持可访问性',
  '修改后运行检查',
] as const;

export interface FormState {
  request: string;
  constraints: string[];
  screenshotNote: string;
  aiOptimize: boolean;
}

export function createFormState(savedDefaults?: string[], aiConfigured = false): FormState {
  return {
    request: '',
    constraints: savedDefaults?.length ? [...savedDefaults] : [...SAFE_DEFAULT_CONSTRAINTS],
    screenshotNote: '',
    aiOptimize: aiConfigured,
  };
}
