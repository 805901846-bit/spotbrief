export const SAFE_DEFAULT_CONSTRAINTS = [
  '不要安装新依赖',
  '不修改无关文件',
  '保持响应式兼容',
  '保持可访问性',
  '修改后运行检查',
] as const;

export interface FormState {
  request: string;
  code: string;
  language: string;
  constraints: string[];
  screenshotNote: string;
  codeOpen: boolean;
  constraintsOpen: boolean;
  aiOptimize: boolean;
}

export function createFormState(savedDefaults?: string[]): FormState {
  return {
    request: '',
    code: '',
    language: 'TSX',
    constraints: savedDefaults?.length ? [...savedDefaults] : [...SAFE_DEFAULT_CONSTRAINTS],
    screenshotNote: '',
    codeOpen: false,
    constraintsOpen: false,
    aiOptimize: false,
  };
}
