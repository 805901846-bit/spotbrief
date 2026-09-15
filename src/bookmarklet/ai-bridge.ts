export interface AiBridgeConfig { url: string; token: string }
export function requestAiEnhancement(brief:string,config?:AiBridgeConfig):Promise<string>{
  if(!config?.url||!config.token)return Promise.reject(new Error('当前书签没有 AI 设置，请返回 PatchBrief 安装页重新保存并安装书签。'));
  const requestId=crypto.randomUUID();
  return new Promise((resolve,reject)=>{let popup:Window|null=null;const timeout=window.setTimeout(()=>finish(new Error('AI 设置页响应超时，请确认弹出窗口没有被拦截。')),30000);
    function finish(error?:Error,result?:string){clearTimeout(timeout);window.removeEventListener('message',receive);popup?.close();error?reject(error):resolve(result||'')}
    function receive(event:MessageEvent){if(event.source!==popup||event.origin!==new URL(config!.url).origin)return;const data=event.data as{type?:string;requestId?:string;result?:string;error?:string};if(data.type==='patchbrief-ai-ready')popup?.postMessage({type:'patchbrief-ai-enhance',requestId,token:config!.token,brief},event.origin);if(data.type==='patchbrief-ai-result'&&data.requestId===requestId)data.error?finish(new Error(data.error)):finish(undefined,data.result)}
    window.addEventListener('message',receive);popup=window.open(`${config.url}#patchbrief-ai-bridge`,'patchbrief-ai-bridge','popup,width=520,height=680');if(!popup)finish(new Error('浏览器拦截了 AI 设置窗口，请允许此网页打开弹出窗口。'));
  });
}
