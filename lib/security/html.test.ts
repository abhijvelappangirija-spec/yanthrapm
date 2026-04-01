import { describe, expect, it } from 'vitest'

import { sanitizeGeneratedHtml } from '@/lib/security/html'

describe('sanitizeGeneratedHtml', () => {
  it('strips script tags and keeps safe structure', () => {
    const raw = `<html><body><h1>Title</h1><script>alert('xss')</script><p>OK</p></body></html>`
    const out = sanitizeGeneratedHtml(raw)
    expect(out.toLowerCase()).not.toContain('<script')
    expect(out).toContain('Title')
    expect(out).toContain('OK')
  })

  it('removes iframe embeds', () => {
    const raw = `<html><body><iframe src="https://evil"></iframe><p>Safe</p></body></html>`
    const out = sanitizeGeneratedHtml(raw)
    expect(out.toLowerCase()).not.toContain('iframe')
    expect(out).toContain('Safe')
  })

  it('drops inline event handler attributes from preserved tags', () => {
    const raw = `<html><body><p onclick="alert(1)">Hello</p></body></html>`
    const out = sanitizeGeneratedHtml(raw)
    expect(out.toLowerCase()).not.toContain('onclick')
    expect(out).toContain('Hello')
  })

  it('preserves section and article wrappers used in BRD output', () => {
    const raw = `<html><body><section><h2>Scope</h2><p>In</p></section><article><p>A</p></article></body></html>`
    const out = sanitizeGeneratedHtml(raw)
    expect(out.toLowerCase()).toContain('<section>')
    expect(out.toLowerCase()).toContain('<article>')
    expect(out).toContain('Scope')
  })
})
