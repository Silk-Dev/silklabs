import sanitizeHtml from "sanitize-html"

/**
 * Allowlist for owner-authored campaign story HTML (Tiptap StarterKit output).
 * Applied server-side before any rich-text HTML reaches dangerouslySetInnerHTML.
 * Fail-closed: anything not on the allowlist is stripped or escaped.
 */
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    // Tiptap StarterKit surface used by the story editor
    "p", "br", "strong", "em", "s", "code", "pre",
    "h2", "h3",
    "ul", "ol", "li",
    "blockquote", "hr",
    "a",
  ],
  allowedAttributes: {
    a: ["href", "rel", "target"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  // No iframes, no img (cover image is a dedicated field), no style/class attributes.
  allowProtocolRelative: false,
  transformTags: {
    // Force external links to be safe
    a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer nofollow" }),
  },
}

export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html, OPTIONS)
}
