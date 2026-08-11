import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useThemePreviewStore = defineStore('themePreview', () => {
  const active = ref(false)
  const sourceTheme = ref(null)

  const startPreview = (theme) => {
    sourceTheme.value = {
      ...theme,
      customCss: theme.customCss || '',
      tokens: { ...(theme.tokens || {}) }
    }
    active.value = true
  }

  const finishPreview = () => {
    active.value = false
    sourceTheme.value = null
  }

  return {
    active,
    sourceTheme,
    startPreview,
    finishPreview
  }
})
