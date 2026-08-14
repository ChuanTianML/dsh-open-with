/** Persistent browser feedback for launch failures that outlives a closing menu. */
import { IconWarningOutline16, Toast } from '@deepseek-ai/dsh-client-ui-primitives'
import { createRoot } from 'react-dom/client'

/** Imperative feedback surface shared by native and compatibility menu rows. */
export interface OpenWithFeedback {
  showError: (text: string) => void
  dispose: () => void
}

/** Mount a transient Toast host directly under the document body. */
export function createOpenWithFeedback(document: Document): OpenWithFeedback {
  const mount = document.createElement('div')
  mount.setAttribute('data-dsh-open-with-feedback', '')
  document.body.appendChild(mount)
  const root = createRoot(mount)
  let sequence = 0
  let disposed = false

  return {
    showError(text) {
      if (disposed) return
      sequence += 1
      const ownSequence = sequence
      root.render(
        <Toast
          key={ownSequence}
          text={text}
          icon={<IconWarningOutline16 />}
          onDone={() => {
            if (!disposed && ownSequence === sequence) root.render(null)
          }}
        />,
      )
    },
    dispose() {
      if (disposed) return
      disposed = true
      root.unmount()
      mount.remove()
    },
  }
}
