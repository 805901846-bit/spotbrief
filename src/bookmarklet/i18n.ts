import type { Language } from './types';
export const messages = {
  'zh-CN': { select: '选择目标', describe: '描述修改', code: '补充代码', generate: '生成任务书', pause: '暂停', resume: '恢复', close: '关闭', empty: '点击页面元素开始选择', copied: '已复制', copyFailed: '复制失败，请手动选择文本', invalid: '目标已失效' },
  en: { select: 'Select targets', describe: 'Describe change', code: 'Add code', generate: 'Generate brief', pause: 'Pause', resume: 'Resume', close: 'Close', empty: 'Click a page element to select it', copied: 'Copied', copyFailed: 'Copy failed; select the text manually', invalid: 'Target unavailable' },
} as const;
export type MessageKey = keyof typeof messages.en;
export function detectLanguage(value = navigator.language): Language { return value.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en'; }
export function t(language: Language, key: MessageKey): string { return messages[language][key]; }
