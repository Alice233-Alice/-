import {fetch as undiciFetch, EnvHttpProxyAgent} from 'undici';

let proxyAgent: EnvHttpProxyAgent | undefined;
export async function request(url: string | URL, options: any = {}): Promise<any> {
  proxyAgent ||= new EnvHttpProxyAgent();
  return undiciFetch(url, {...options, dispatcher:proxyAgent, redirect:'error'});
}

