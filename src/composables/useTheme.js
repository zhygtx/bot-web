import { computed } from 'vue'
import { useThemeStore } from '../stores/theme'
import { applyInitialTheme } from '../theme/themeRuntime'

export const initTheme = () => {
  applyInitialTheme()
}

export const useTheme = () => {
  const themeStore = useThemeStore()
  const isDark = computed(() => themeStore.isDark)

  const setTheme = async (dark) => {
    await themeStore.applyActiveThemeForMode(dark ? 'dark' : 'light')
  }

  return {
    isDark,
    setTheme,
    toggleTheme: themeStore.toggleTheme
  }
}
