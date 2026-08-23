import { describe, expect, it } from 'vitest'
import {
  editorEnvironment,
  editorSpawnOptions,
  isCredentialEnvironmentName,
} from '../src/runtime.ts'

describe('editor process environment', () => {
  it('removes Host credentials while preserving desktop and development state', () => {
    expect(editorEnvironment({
      PATH: '/usr/bin',
      HOME: '/home/me',
      DISPLAY: ':0',
      WAYLAND_DISPLAY: 'wayland-0',
      SSH_AUTH_SOCK: '/tmp/agent.sock',
      HTTPS_PROXY: 'http://proxy.example',
      DEEPSEEK_API_KEY: 'deepseek-secret',
      MY_SERVICE_ACCESS_TOKEN: 'access-secret',
      INTERNAL_CLIENT_SECRET: 'client-secret',
      BUILD_PASSWORD: 'password-secret',
      RELEASE_TOKEN: 'release-secret',
      DATABASE_URL: 'postgres://user:password@example.test/db',
    })).toEqual({
      PATH: '/usr/bin',
      HOME: '/home/me',
      DISPLAY: ':0',
      WAYLAND_DISPLAY: 'wayland-0',
      SSH_AUTH_SOCK: '/tmp/agent.sock',
      HTTPS_PROXY: 'http://proxy.example',
    })
    expect(isCredentialEnvironmentName('SSH_AUTH_SOCK')).toBe(false)
    expect(isCredentialEnvironmentName('GitHub_Token')).toBe(true)
  })

  it('keeps the first Windows application window visible', () => {
    expect(editorSpawnOptions('win32', { PATH: 'C:\\Windows' })).toMatchObject({
      detached: true,
      stdio: 'ignore',
      windowsHide: false,
      env: { PATH: 'C:\\Windows' },
    })
    expect(editorSpawnOptions('darwin', {}).windowsHide).toBe(true)
  })
})
