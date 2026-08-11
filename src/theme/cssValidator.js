const MAX_CSS_LENGTH = 64 * 1024

const FORBIDDEN_PATTERN = /(?:@import|@charset|@namespace|@(?:-moz-)?document|@font-face|url\s*\(|expression\s*\(|javascript:|behavior\s*:|-moz-binding|progid\s*:)/i

export const validateCss = (css) => {
  const normalized = String(css || '').trim()
  if (!normalized) return { valid: true }
  if (normalized.length > MAX_CSS_LENGTH) {
    return { valid: false, message: '自定义 CSS 不能超过 64KB' }
  }
  for (const char of normalized) {
    if (char.charCodeAt(0) < 0x20 && char !== '\n' && char !== '\r' && char !== '\t') {
      return { valid: false, message: '自定义 CSS 包含非法控制字符' }
    }
  }

  let scanned
  try {
    scanned = stripCommentsAndStrings(normalized)
  } catch (error) {
    return { valid: false, message: error.message }
  }
  const balanceError = validateBalancedDelimiters(scanned)
  if (balanceError) return { valid: false, message: balanceError }

  const match = scanned.match(FORBIDDEN_PATTERN)
  if (match) {
    return { valid: false, message: `自定义 CSS 包含不允许的内容：${match[0]}` }
  }
  return { valid: true }
}

const stripCommentsAndStrings = (css) => {
  let filtered = ''
  let index = 0
  while (index < css.length) {
    const current = css[index]
    if (current === '/' && css[index + 1] === '*') {
      const end = css.indexOf('*/', index + 2)
      if (end < 0) throw new Error('自定义 CSS 注释未闭合')
      index = end + 2
      continue
    }
    if (current === '\'' || current === '"') {
      const end = findStringEnd(css, index)
      if (end < 0) throw new Error('自定义 CSS 字符串未闭合')
      index = end + 1
      continue
    }
    if (current === '\\') {
      const result = appendNormalizedEscape(css, index)
      filtered += result.value
      index = result.nextIndex
      continue
    }
    filtered += current
    index += 1
  }
  return filtered
}

const findStringEnd = (css, start) => {
  const quote = css[start]
  let index = start + 1
  while (index < css.length) {
    const current = css[index]
    if (current === '\\') {
      index += 2
      continue
    }
    if (current === quote) return index
    index += 1
  }
  return -1
}

const appendNormalizedEscape = (css, index) => {
  if (index + 1 >= css.length) throw new Error('自定义 CSS 转义不完整')
  const escaped = css[index + 1]
  if (isHexDigit(escaped)) {
    let end = index + 2
    let codePoint = hexValue(escaped)
    while (end < css.length && end - index - 1 < 6 && isHexDigit(css[end])) end += 1
    for (let cursor = index + 2; cursor < end; cursor += 1) {
      codePoint = codePoint * 16 + hexValue(css[cursor])
    }
    if (end < css.length && /[ \t\n\r]/.test(css[end])) end += 1
    return { value: String.fromCodePoint(Math.min(codePoint, 0x10ffff)), nextIndex: end }
  }
  return { value: escaped, nextIndex: index + 2 }
}

const isHexDigit = (char) => /[0-9a-f]/i.test(char)

const hexValue = (char) => {
  if (char >= '0' && char <= '9') return char.charCodeAt(0) - 48
  if (char >= 'a' && char <= 'f') return char.charCodeAt(0) - 87
  return char.charCodeAt(0) - 55
}

const validateBalancedDelimiters = (css) => {
  const stack = []
  const closeMap = { '{': '}', '(': ')', '[': ']' }
  for (const char of css) {
    if (closeMap[char]) {
      stack.push(closeMap[char])
      continue
    }
    if (char === '}' || char === ')' || char === ']') {
      if (stack.pop() !== char) return '自定义 CSS 括号未闭合或顺序错误'
    }
  }
  return stack.length ? '自定义 CSS 括号未闭合' : null
}
