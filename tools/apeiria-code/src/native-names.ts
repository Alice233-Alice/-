/** Namespaced editor registrations for the locally retained native client. Auth enums stay unchanged. */
export const nativeExtensionId = 'ayanami-local.apeiria-code';
export const nativeConfigurationSection = 'apeiriaCode.native';
export const nativeContainerId = 'apeiriaCode';
export const nativeConversationScheme = 'apeiria-code-native';

export function isolateNativeName(value:string):string {
  return value
    .replaceAll('openai.chatgpt',nativeExtensionId)
    .replaceAll('chatgpt.',nativeConfigurationSection+'.')
    .replaceAll('codexSecondaryViewContainer',nativeContainerId)
    .replaceAll('codexViewContainer',nativeContainerId)
    .replaceAll('openai-codex',nativeConversationScheme)
    .replaceAll('codex-rules','apeiria-code-rules');
}

export function restoreNativeName(value:string):string {
  // The two container registrations intentionally share one left sidebar.
  return value
    .replaceAll(nativeExtensionId,'openai.chatgpt')
    .replaceAll(nativeConfigurationSection+'.','chatgpt.')
    .replaceAll(nativeConversationScheme,'openai-codex')
    .replaceAll('apeiria-code-rules','codex-rules');
}
