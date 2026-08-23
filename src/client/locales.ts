/** `open-with` locale namespace: workspace editor-launcher copy. */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'header.open': '打开',
  'menu.openInEditor': '在 {editor} 中打开',
  'menu.openInEditor.aria': '在 {editor} 中打开 {name}',
  'menu.openUnavailable.aria': '{editor} 无法用于打开 {name}：{hint}',
  'menu.openWith.aria': '选择打开 {name} 的方式',
  'menu.loading': '正在检测打开方式…',
  'menu.catalogFailed': '无法加载打开方式',
  'menu.openFailed': '打开失败：{message}',
  'menu.refresh': '重新检测编辑器',
  'menu.refreshing': '正在重新检测…',
  'menu.refreshFailed': '重新检测失败：{message}',
  'menu.unavailable': '不可用',
} satisfies Record<string, string>

/** The `open-with` namespace key union. */
export type OpenWithKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'header.open': 'Open',
  'menu.openInEditor': 'Open in {editor}',
  'menu.openInEditor.aria': 'Open {name} in {editor}',
  'menu.openUnavailable.aria': '{editor} cannot open {name}: {hint}',
  'menu.openWith.aria': 'Choose how to open {name}',
  'menu.loading': 'Detecting ways to open…',
  'menu.catalogFailed': 'Open-with targets unavailable',
  'menu.openFailed': 'Could not open: {message}',
  'menu.refresh': 'Refresh editors',
  'menu.refreshing': 'Refreshing editors…',
  'menu.refreshFailed': 'Could not refresh: {message}',
  'menu.unavailable': 'Unavailable',
} satisfies Record<OpenWithKey, string>

/** Locale namespace id registered under ctx.locale. */
export const NS = 'open-with'

/** Fill one dictionary template's named placeholders. */
export function fmt(template: string, params: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => params[key] ?? `{${key}}`)
}
