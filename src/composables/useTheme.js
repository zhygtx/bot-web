import { ref } from 'vue'

const STORAGE_KEY = 'generalbot-theme'
const DARK_CLASS = 'dark'
const isDark = ref(false)

const getPreferredTheme = () => {
  if (typeof window === 'undefined') return false
  const storedTheme = window.localStorage.getItem(STORAGE_KEY)
  if (storedTheme === 'dark') return true
  if (storedTheme === 'light') return false
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches || false
}

const applyTheme = (dark) => {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle(DARK_CLASS, dark)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
}

export const initTheme = () => {
  isDark.value = getPreferredTheme()
  applyTheme(isDark.value)
}

export const useTheme = () => {
  const setTheme = (dark) => {
    isDark.value = dark
    applyTheme(dark)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light')
    }
  }

  const toggleTheme = () => {
    setTheme(!isDark.value)
  }

  return {
    isDark,
    setTheme,
    toggleTheme
  }
}
