import { describe, it, expect, beforeEach } from 'vitest'
import pkg from '../../../package.json'
import { APP_VERSION } from '../version'
import { formatNumber } from '../utils'
import { changeLanguage } from '../i18n'

describe('Dynamic App Version', () => {
  beforeEach(async () => {
    await changeLanguage('en')
  })

  it('matches package.json version dynamically', () => {
    expect(APP_VERSION).toBe(pkg.version)
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/)
  })

  it('formats version digits properly in English and Bengali', async () => {
    expect(formatNumber(APP_VERSION)).toBe(pkg.version)
    await changeLanguage('bn')
    expect(formatNumber(APP_VERSION)).not.toBe(pkg.version)
    await changeLanguage('en')
  })
})
