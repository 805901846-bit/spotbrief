export interface AiSettings { apiKey: string; baseUrl: string; model: string }
const settingsKey = 'patchbrief:ai-settings';
const pairingKey = 'patchbrief:ai-pairing-token';
export function loadAiSettings(): AiSettings { try { const value=JSON.parse(localStorage.getItem(settingsKey)||'{}') as Partial<AiSettings>;return{apiKey:value.apiKey||'',baseUrl:(value.baseUrl||'https://api.openai.com/v1').replace(/\/+$/,''),model:value.model||''} } catch { return{apiKey:'',baseUrl:'https://api.openai.com/v1',model:''} } }
export function saveAiSettings(value: AiSettings): void { localStorage.setItem(settingsKey,JSON.stringify({...value,baseUrl:value.baseUrl.replace(/\/+$/,'')})) }
export function getPairingToken(): string { let token=localStorage.getItem(pairingKey);if(!token){token=crypto.randomUUID();localStorage.setItem(pairingKey,token)}return token }
