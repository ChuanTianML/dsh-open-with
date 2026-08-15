// @vitest-environment jsdom
import { act, cleanup, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { createOpenWithFeedback } from '../src/client/feedback.tsx'

afterEach(() => {
  cleanup()
  document.body.replaceChildren()
})

describe('the persistent open-with feedback host', () => {
  it('announces repeated launch failures outside the Workspace menu and disposes cleanly', async () => {
    const feedback = createOpenWithFeedback(document)
    act(() => { feedback.showError('Could not open: first failure') })
    expect((await screen.findByRole('alert')).textContent).toContain('first failure')

    act(() => { feedback.showError('Could not open: second failure') })
    expect((await screen.findByRole('alert')).textContent).toContain('second failure')
    expect(document.querySelectorAll('[data-dsh-open-with-feedback]')).toHaveLength(1)

    act(() => { feedback.dispose() })
    expect(screen.queryByRole('alert')).toBeNull()
    expect(document.querySelector('[data-dsh-open-with-feedback]')).toBeNull()
  })
})
