import {fetch as undiciFetch, EnvHttpProxyAgent} from 'undici';
import {HttpsProxyAgent} from 'https-proxy-agent';
import type {ClientOptions} from 'ws';

let proxyAgent: EnvHttpProxyAgent | undefined;
export async function request(url: string | URL, options: any = {}): Promise<any> {
  proxyAgent ||= new EnvHttpProxyAgent();
  return undiciFetch(url, {...options, dispatcher:proxyAgent, redirect:'error'});
}
export function websocketOptions(url: string, headers: Record<string,string>): ClientOptions {
  const hostname = new URL(url).hostname;
  const noProxy = (process.env.NO_PROXY || process.env.no_proxy || '').split(',').map(s => s.trim()).filter(Boolean);
  const bypass = ['127.0.0.1','localhost','[::1]'].includes(hostname) || noProxy.some(s => s === '*' || hostname === s || hostname.endsWith(s.startsWith('.') ? s : '.' + s));
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy;
  return {headers, followRedirects:false, ...(proxy && !bypass ? {agent:new HttpsProxyAgent(proxy)} : {}), handshakeTimeout:30000, maxPayload:64*1024*1024};
}
