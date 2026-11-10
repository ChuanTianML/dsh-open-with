// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { adoptStyles } from '../src/client/styles.ts'

afterEach(() => { document.getElementById('dsh-open-with-styles')?.remove() })

it('withdraws its owned stylesheet while a duplicate installer leaves ownership intact', () => {
  const dispose = adoptStyles()
  const duplicate = adoptStyles()
  expect(document.querySelectorAll('#dsh-open-with-styles')).toHaveLength(1)
  duplicate()
  expect(document.getElementById('dsh-open-with-styles')).not.toBeNull()
  dispose()
  expect(document.getElementById('dsh-open-with-styles')).toBeNull()
})
