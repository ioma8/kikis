import DOMPurify from 'dompurify'

const STORED_HTML_PATTERN =
  /<\/?(?:p|br|strong|b|em|i|u|s|ul|ol|li|a|img|blockquote|code|pre|h[1-6]|hr)\b/i
const URL_PATTERN = /(?:https?:\/\/|www\.)[^\s<]+/gi
const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'ul',
  'ol',
  'li',
  'div',
  'label',
  'span',
  'input',
  'a',
  'img',
  'blockquote',
  'code',
  'pre',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
]
const ALLOWED_ATTR = [
  'href',
  'src',
  'alt',
  'title',
  'width',
  'height',
  'target',
  'rel',
  'type',
  'checked',
  'data-type',
  'data-checked',
  'aria-label',
]

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function trimUrlPunctuation(value: string) {
  const trailing = value.match(/[),.!?;:'"\]]+$/)?.[0] ?? ''
  return {
    url: trailing ? value.slice(0, -trailing.length) : value,
    trailing,
  }
}

export function linkifyPlainText(value: string) {
  let result = ''
  let cursor = 0

  for (const match of value.matchAll(URL_PATTERN)) {
    const start = match.index ?? 0
    const rawMatch = match[0]
    const { url, trailing } = trimUrlPunctuation(rawMatch)
    const href = url.startsWith('www.') ? `https://${url}` : url
    result += escapeHtml(value.slice(cursor, start))
    result += `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer nofollow">${escapeHtml(url)}</a>${escapeHtml(trailing)}`
    cursor = start + rawMatch.length
  }

  return result + escapeHtml(value.slice(cursor))
}

export function sanitizeDescriptionHtml(value: string) {
  return DOMPurify.sanitize(value, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: true,
    RETURN_TRUSTED_TYPE: false,
  })
}

export function descriptionToEditorHtml(value: string) {
  if (!value.trim()) return '<p></p>'
  if (STORED_HTML_PATTERN.test(value)) return sanitizeDescriptionHtml(value)
  return `<p>${linkifyPlainText(value).replaceAll('\n', '<br>')}</p>`
}

export function descriptionToPlainText(value: string) {
  if (!STORED_HTML_PATTERN.test(value)) return value

  const sanitized = sanitizeDescriptionHtml(value)
    .replace(/<br\s*\/?>(?=\S)/gi, '<br>\n')
    .replace(/<\/(?:p|li|blockquote|pre|h[1-6])>/gi, '$&\n')

  if (typeof DOMParser === 'undefined') {
    return sanitized.replace(/<[^>]+>/g, '')
  }

  const document = new DOMParser().parseFromString(sanitized, 'text/html')
  return document.body.textContent ?? ''
}

export function getDescriptionExcerpt(value: string, maxLength = 140) {
  const text = descriptionToPlainText(value).replace(/\s+/g, ' ').trim()
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength - 1).trimEnd()}…`
}
