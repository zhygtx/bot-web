import { defaultDarkTheme } from './presets/defaultDark'
import { defaultLightTheme } from './presets/defaultLight'

export const builtinThemes = [defaultLightTheme, defaultDarkTheme]

export const builtinThemeMap = builtinThemes.reduce((map, theme) => {
  map[theme.id] = theme
  return map
}, {})

export const defaultThemeId = defaultLightTheme.id

export const getBuiltinTheme = (themeId) => builtinThemeMap[themeId] || builtinThemeMap[defaultThemeId]

export const cloneTheme = (theme) => ({
  ...theme,
  customCss: theme.customCss || '',
  tokens: { ...theme.tokens }
})

export const themeTokenList = Object.keys(defaultLightTheme.tokens)
