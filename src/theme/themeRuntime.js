import { cloneTheme, getBuiltinTheme, themeTokenList } from './registry'
import { cssValueLooksSafe } from './tokenSchema'

export const THEME_CACHE_KEY = 'generalbot-theme-snapshot'

const DARK_CLASS = 'dark'

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

  Object.entries(nextTheme.tokens).forEach(([name, value]) => {
    root.style.setProperty(name, value)
  })
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
