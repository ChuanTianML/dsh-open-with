/** Workspace editor-launcher styles using Harness semantic tokens. */
const STYLE_ID = 'dsh-open-with-styles'

const css = `
.dsh-open-with-event-bridge {
  display: contents;
}
.dsh-open-with-menu {
  display: block;
  width: 100%;
}
.dsh-open-with-row,
.dsh-open-with-split {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 40px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: var(--dsw-alias-label-primary);
}
.dsh-open-with-row,
.dsh-open-with-primary {
  gap: 8px;
  padding: 8px 10px;
  font-size: 14px;
  line-height: 22px;
  text-align: left;
}
.dsh-open-with-primary,
.dsh-open-with-chooser {
  display: flex;
  align-items: center;
  min-height: 40px;
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
}
.dsh-open-with-primary {
  flex: 1;
  min-width: 0;
  border-radius: 10px 0 0 10px;
}
.dsh-open-with-chooser {
  flex: none;
  width: 30px;
  justify-content: center;
  border-radius: 0 10px 10px 0;
  color: var(--dsw-alias-label-tertiary);
}
.dsh-open-with-row:not(:disabled):hover,
.dsh-open-with-primary:not(:disabled):hover,
.dsh-open-with-chooser:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}
.dsh-open-with-row:focus-visible,
.dsh-open-with-primary:focus-visible,
.dsh-open-with-chooser:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary);
  outline-offset: -2px;
}
.dsh-open-with-row:disabled,
.dsh-open-with-primary:disabled {
  cursor: default;
  color: var(--dsw-alias-label-tertiary);
}
.dsh-open-with-row .dsh-open-with-icon,
.dsh-open-with-primary .dsh-open-with-icon {
  display: inline-flex;
  flex: none;
  width: 16px;
  height: 16px;
  align-items: center;
  justify-content: center;
  color: var(--dsw-alias-label-tertiary);
}
.dsh-open-with-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dsh-open-with-label-stack {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-width: 0;
}
.dsh-open-with-hint {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  line-height: 17px;
  color: var(--dsw-alias-label-tertiary);
}
.dsh-open-with-header-split {
  display: inline-flex;
  align-items: center;
  height: 32px;
  overflow: hidden;
  box-sizing: border-box;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 18px;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font-family: var(--dsw-font-family);
  font-size: 13px;
  font-weight: 400;
  line-height: 20px;
}
.dsh-open-with-header-primary,
.dsh-open-with-header-chooser {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  align-self: stretch;
  border: none;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
}
.dsh-open-with-header-primary {
  gap: 4px;
  padding: 5px 9px 5px 12px;
}
.dsh-open-with-header-chooser {
  flex: none;
  width: 30px;
  padding: 0;
  border-left: 1px solid var(--dsw-alias-border-l2);
  color: var(--dsw-alias-label-tertiary);
}
.dsh-open-with-header-primary span,
.dsh-open-with-header-primary svg,
.dsh-open-with-header-chooser svg {
  flex: none;
}
.dsh-open-with-header-primary span {
  white-space: nowrap;
}
.dsh-open-with-header-primary:not(:disabled):hover,
.dsh-open-with-header-chooser:not(:disabled):hover {
  background: var(--dsw-alias-interactive-bg-hover);
}
.dsh-open-with-header-primary:focus-visible,
.dsh-open-with-header-chooser:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary);
  outline-offset: -2px;
}
.dsh-open-with-header-primary:disabled,
.dsh-open-with-header-chooser:disabled {
  color: var(--dsw-alias-label-dimmed);
  cursor: wait;
}
`

/** Inject the launcher stylesheet once; a second call is a no-op. */
export function adoptStyles(): void {
  if (document.getElementById(STYLE_ID) !== null) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = css
  document.head.appendChild(style)
}
