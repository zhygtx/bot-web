import { cloneTheme, getBuiltinTheme, themeTokenList } from './registry'
import { cssValueLooksSafe } from './tokenSchema'

export const THEME_CACHE_KEY = 'generalbot-theme-snapshot'
const USER_THEME_CSS_ID = 'generalbot-user-theme-css'
const TOKEN_STYLE_ID = 'generalbot-theme-tokens'

const DARK_CLASS = 'dark'
let themeCssObserver = null

export const normalizeTheme = (theme) => {
  if (!theme || !theme.id || !theme.mode || !theme.tokens) {
    return cloneTheme(getBuiltinTheme())
  }
  if (theme.builtin) {
    return cloneTheme(getBuiltinTheme(theme.id))
  }
  const baseTheme = cloneTheme(getBuiltinTheme(theme.mode === 'dark' ? 'default-dark' : 'default-light'))
  const tokens = { ...baseTheme.tokens }
  themeTokenList.forEach((key) => {
    if (typeof theme.tokens[key] === 'string' && cssValueLooksSafe(theme.tokens[key])) {
      tokens[key] = theme.tokens[key]
    }
  })
  return {
    ...theme,
    customCss: typeof theme.customCss === 'string' ? theme.customCss : '',
    tokens
  }
}

export const applyTheme = (theme) => {
  if (typeof document === 'undefined') return
  const nextTheme = normalizeTheme(theme)
  const root = document.documentElement
  const isDark = nextTheme.mode === 'dark'

  root.classList.toggle(DARK_CLASS, isDark)
  root.dataset.themeId = nextTheme.id
  root.dataset.themeMode = nextTheme.mode
  root.dataset.themeBuiltin = String(!!nextTheme.builtin)
  root.style.colorScheme = nextTheme.mode

  Object.keys(nextTheme.tokens).forEach(name => root.style.removeProperty(name))
  applyTokenStyle(nextTheme.tokens)
  applyCustomCss(nextTheme.customCss)
}

const applyTokenStyle = (tokens) => {
  if (typeof document === 'undefined') return
  let style = document.getElementById(TOKEN_STYLE_ID)
  if (!style) {
    style = document.createElement('style')
    style.id = TOKEN_STYLE_ID
    document.head.appendChild(style)
  }
  const lines = Object.entries(tokens).map(([name, value]) => `  ${name}: ${value};`)
  style.textContent = `:root {\n${lines.join('\n')}\n}`

  const userStyle = document.getElementById(USER_THEME_CSS_ID)
  if (userStyle) {
    document.head.insertBefore(style, userStyle)
  }
}

const applyCustomCss = (css) => {
  const existing = document.getElementById(USER_THEME_CSS_ID)
  if (!css) {
    existing?.remove()
    return
  }
  let style = existing
  if (!style) {
    style = document.createElement('style')
    style.id = USER_THEME_CSS_ID
    document.head.appendChild(style)
  }
  style.textContent = css
  setupThemeCssObserver()
  moveThemeCssToEnd()
}

const setupThemeCssObserver = () => {
  if (themeCssObserver || typeof MutationObserver === 'undefined') return
  themeCssObserver = new MutationObserver(moveThemeCssToEnd)
  themeCssObserver.observe(document.head, { childList: true })
}

const moveThemeCssToEnd = () => {
  const style = document.getElementById(USER_THEME_CSS_ID)
  if (!style) return
  const head = document.head
  if (head.lastElementChild !== style) head.appendChild(style)
}

export const cacheThemeSnapshot = (theme) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(THEME_CACHE_KEY, JSON.stringify(normalizeTheme(theme)))
}

export const readCachedThemeSnapshot = () => {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(THEME_CACHE_KEY)
  if (!raw) return null
  try {
    return normalizeTheme(JSON.parse(raw))
  } catch {
    window.localStorage.removeItem(THEME_CACHE_KEY)
    return null
  }
}

export const applyInitialTheme = () => {
  const cached = readCachedThemeSnapshot()
  if (cached) {
    applyTheme(cached)
    return cached
  }
  const preferredDark = typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
  const theme = cloneTheme(getBuiltinTheme(preferredDark ? 'default-dark' : 'default-light'))
  applyTheme(theme)
  return theme
}

export const getThemeToken = (name, fallback = '') => {
  if (typeof document === 'undefined') return fallback
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}

export const extractCssColor = (value, fallback = '#409eff') => {
  const text = String(value || '').trim()
  const colorMatch = text.match(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]+\)|hsla?\([^)]+\)/)
  return colorMatch ? colorMatch[0] : text || fallback
}
