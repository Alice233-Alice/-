export type Json = Record<string, any>;
export type ProviderType = 'vertex' | 'responses' | 'chat-completions';
export interface ModelMetadata {displayName?:string;contextWindow?:number;maxOutputTokens?:number;imageInput?:boolean;}
export interface ProviderDraft {id?:string;label:string;type:ProviderType;models:string[];baseUrl?:string;project?:string;location?:string;apiKey?:string;clearKey?:boolean;serviceAccountJson?:string;headers?:{name:string;value?:string;remove?:boolean}[];modelMetadata?:Record<string,ModelMetadata>;reasoning?:Record<string,string>;}
export interface ProviderView extends Omit<ProviderDraft,'apiKey'|'clearKey'|'serviceAccountJson'|'headers'> {id:string;enabled:boolean;hasKey:boolean;hasCredentials:boolean;headerNames:string[];}
export interface ModelView {id:string;label:string;providerId:string;efforts:string[];imageInput:boolean;}
export interface Attachment {id:string;name:string;kind:'image'|'file'|'selection';path?:string;text?:string;}
export interface ChatItem {id:string;type:string;role?:string;text?:string;status?:string;command?:string;cwd?:string;changes?:Json[];raw?:Json;}
export interface ThreadView {id:string;name:string;preview:string;updatedAt?:number;archived?:boolean;}
export interface PendingRequest {id:string|number;method:string;params:Json;}
export interface UiState {providers:ProviderView[];models:ModelView[];threads:ThreadView[];items:ChatItem[];attachments:Attachment[];pending:PendingRequest[];threadId:string|null;model:string;effort:string;busy:boolean;engineStatus:string;workspace:string;permissions:'workspace-write'|'read-only';usage?:Json;}
export type UiAction={action:string;requestId?:string;[key:string]:any};
