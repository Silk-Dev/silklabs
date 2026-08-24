import { describe, it, expect } from "vitest"
import { sanitizeRichText } from "./sanitize"

describe("sanitizeRichText", () => {
  it("keeps allowed Tiptap StarterKit output", () => {
    const html = '<h2>Origin</h2><p>We <strong>ship</strong> <em>fast</em>.</p><ul><li>one</li></ul><blockquote>quote</blockquote>'
    expect(sanitizeRichText(html)).toBe(html)
  })

  it("strips script tags and their content", () => {
    expect(sanitizeRichText("<p>ok</p><script>alert(1)</script>")).toBe("<p>ok</p>")
    expect(sanitizeRichText('<script src="https://evil.example/x.js"></script>')).toBe("")
  })

  it("strips inline event handlers", () => {
    expect(sanitizeRichText('<p onclick="alert(1)">hello</p>')).toBe("<p>hello</p>")
  })

  it("strips disallowed elements like img and iframe but keeps text", () => {
    expect(sanitizeRichText('<p>a</p><img src="https://x/y.png">')).toBe("<p>a</p>")
    expect(sanitizeRichText("<iframe></iframe><p>b</p>")).toBe("<p>b</p>")
  })

  it("only allows http(s)/mailto hrefs and forces safe rel", () => {
    const out = sanitizeRichText('<a href="https://example.com" target="_blank">x</a>')
    expect(out).toContain('href="https://example.com"')
    expect(out).toContain("noopener")
    expect(sanitizeRichText('<a href="javascript:alert(1)">x</a>')).not.toContain("javascript:")
  })
})
