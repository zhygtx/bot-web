import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { builtinThemes, cloneTheme, getBuiltinTheme } from '../theme/registry'
import { fetchCurrentTheme, fetchThemeList, switchTheme } from '../theme/themeApi'
import { applyTheme, cacheThemeSnapshot, normalizeTheme, readCachedThemeSnapshot } from '../theme/themeRuntime'

const DEFAULT_THEME_IDS = {
  light: 'default-light',
  dark: 'default-dark'
}

export const useThemeStore = defineStore('theme', () => {
  const currentTheme = ref(readCachedThemeSnapshot() || cloneTheme(getBuiltinTheme()))
  const themes = ref(builtinThemes.map(cloneTheme))
  const activeThemeIds = ref({ ...DEFAULT_THEME_IDS })
  const loading = ref(false)

  const isDark = computed(() => currentTheme.value.mode === 'dark')
  const currentThemeId = computed(() => currentTheme.value.id)

  const normalizeMode = (mode) => mode === 'dark' ? 'dark' : 'light'

  const defaultThemeIdForMode = (mode) => DEFAULT_THEME_IDS[normalizeMode(mode)]

  const normalizeActiveThemeIds = (ids = {}) => ({
    light: ids.light || DEFAULT_THEME_IDS.light,
    dark: ids.dark || DEFAULT_THEME_IDS.dark
  })

  const findThemeById = (themeId) => themes.value.find(theme => theme.id === themeId)

  const findActiveThemeForMode = (mode) => {
    const normalizedMode = normalizeMode(mode)
    const activeThemeId = activeThemeIds.value[normalizedMode] || defaultThemeIdForMode(normalizedMode)
    const activeTheme = findThemeById(activeThemeId)
    if (activeTheme?.mode === normalizedMode) return activeTheme
    return cloneTheme(getBuiltinTheme(defaultThemeIdForMode(normalizedMode)))
  }

  const setLocalTheme = (theme) => {
    const nextTheme = normalizeTheme(theme)
    currentTheme.value = nextTheme
    applyTheme(nextTheme)
    cacheThemeSnapshot(nextTheme)
  }

  const loadCurrentTheme = async (mode = currentTheme.value.mode) => {
    if (!localStorage.getItem('token')) {
      setLocalTheme(currentTheme.value)
      return currentTheme.value
    }
    loading.value = true
    try {
      const response = await fetchCurrentTheme(normalizeMode(mode))
      const nextTheme = normalizeTheme(response.data)
      activeThemeIds.value = {
        ...activeThemeIds.value,
        [nextTheme.mode]: nextTheme.id
      }
      setLocalTheme(nextTheme)
      return currentTheme.value
    } finally {
      loading.value = false
    }
  }

  const loadThemeList = async () => {
    const response = await fetchThemeList()
    themes.value = (response.data?.themes || builtinThemes.map(cloneTheme)).map(normalizeTheme)
    activeThemeIds.value = normalizeActiveThemeIds(response.data?.activeThemeIds)
    setLocalTheme(findActiveThemeForMode(currentTheme.value.mode))
    return themes.value
  }

  const setCurrentTheme = async (theme) => {
    const nextTheme = normalizeTheme(theme)
    if (!localStorage.getItem('token')) {
      activeThemeIds.value = {
        ...activeThemeIds.value,
        [nextTheme.mode]: nextTheme.id
      }
      setLocalTheme(nextTheme)
      return currentTheme.value
    }
    const type = theme.builtin ? 'BUILTIN' : 'CUSTOM'
    const response = await switchTheme({ type, themeKey: theme.id })
    const appliedTheme = normalizeTheme(response.data)
    activeThemeIds.value = {
      ...activeThemeIds.value,
      [appliedTheme.mode]: appliedTheme.id
    }
    setLocalTheme(appliedTheme)
    return currentTheme.value
  }

  const applyActiveThemeForMode = async (mode) => {
    const normalizedMode = normalizeMode(mode)
    if (localStorage.getItem('token')) {
      await loadThemeList()
    }
    const next = findActiveThemeForMode(normalizedMode)
    setLocalTheme(next)
    return currentTheme.value
  }

  const toggleTheme = async () => {
    const nextMode = currentTheme.value.mode === 'dark' ? 'light' : 'dark'
    return applyActiveThemeForMode(nextMode)
  }

  return {
    currentTheme,
    currentThemeId,
    activeThemeIds,
    themes,
    loading,
    isDark,
    setLocalTheme,
    loadCurrentTheme,
    loadThemeList,
    applyActiveThemeForMode,
    setCurrentTheme,
    toggleTheme
  }
})
