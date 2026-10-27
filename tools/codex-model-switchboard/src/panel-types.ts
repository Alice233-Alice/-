import type {Provider} from './config.ts';
import type {UsageSnapshot} from './usage.ts';
export type PublicProvider=Omit<Provider,'encryptedKey'|'envKey'> & {hasKey:boolean};
export interface PanelState {enabled:boolean;reloadRequired:boolean;providers:PublicProvider[];usage:UsageSnapshot;}
