import { computed, nextTick, onUnmounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useThemeStore } from '../stores/theme'
import { createTheme, deleteTheme, updateTheme } from '../theme/themeApi'
import { normalizeCssInput, validateCss } from '../theme/cssValidator'
import { getBuiltinTheme, themeTokenList } from '../theme/registry'
import { themeVariableGroups } from '../theme/themeTokenReference'
import { applyTheme } from '../theme/themeRuntime'
import { cssValueLooksSafe } from '../theme/tokenSchema'

export const useThemeEditor = ({ previewDraft = false, afterApply } = {}) => {
  const themeStore = useThemeStore()
  const loading = ref(false)
  const saving = ref(false)
  const selectedThemeId = ref('')
  const editMode = ref('simple')
  const dirty = ref(false)
  let autoSaveTimer = null
  let syncingEditor = false

  const editor = reactive({
    id: '',
    name: '',
    mode: 'light',
    builtin: true,
    customCss: '',
    tokens: {}
  })

  const themes = computed(() => themeStore.themes)
  const selectedTheme = computed(() => themes.value.find(theme => theme.id === selectedThemeId.value) || themeStore.currentTheme)

  const activeLabel = (theme) => {
    if (themeStore.activeThemeIds[theme.mode] !== theme.id) return ''
    return theme.mode === 'dark' ? '当前暗色' : '当前亮色'
  }

  const normalizeEditorTokens = (mode, tokens) => {
    const baseTheme = getBuiltinTheme(mode === 'dark' ? 'default-dark' : 'default-light')
    const nextTokens = { ...baseTheme.tokens }
    Object.entries(tokens || {}).forEach(([key, value]) => {
      if (themeTokenList.includes(key) && cssValueLooksSafe(String(value))) {
        nextTokens[key] = String(value)
      }
    })
    return nextTokens
  }

  const getEditorThemeSnapshot = () => ({
    id: editor.id || `draft-${editor.mode}`,
    name: editor.name || '未命名主题',
    mode: editor.mode,
    builtin: editor.builtin,
    customCss: editor.customCss || '',
    tokens: { ...editor.tokens }
  })

  const previewEditorTheme = () => {
    if (!previewDraft || syncingEditor) return
    applyTheme(getEditorThemeSnapshot())
  }

  const syncEditor = (theme) => {
    if (!theme) return
    syncingEditor = true
    selectedThemeId.value = theme.id
    editor.id = theme.id
    editor.name = theme.name
    editor.mode = theme.mode
    editor.builtin = theme.builtin
    editor.customCss = theme.customCss || ''
    editor.tokens = normalizeEditorTokens(theme.mode, theme.tokens)
    nextTick(() => {
      syncingEditor = false
      dirty.value = false
      previewEditorTheme()
    })
  }

  const loadThemes = async () => {
    loading.value = true
    try {
      await themeStore.loadThemeList()
      selectedThemeId.value = themeStore.currentThemeId
      syncEditor(selectedTheme.value)
    } finally {
      loading.value = false
    }
  }

  const selectTheme = (theme) => {
    selectedThemeId.value = theme.id
    syncEditor(theme)
  }

  const selectThemeById = (themeId) => {
    const theme = themes.value.find(item => item.id === themeId)
    if (theme) selectTheme(theme)
  }

  const validateEditorForSave = (showMessage = false) => {
    if (!editor.name?.trim()) {
      if (showMessage) ElMessage.error('主题名称不能为空')
      return false
    }
    const invalidToken = Object.entries(editor.tokens || {}).find(([key, value]) => (
      !themeTokenList.includes(key) || !cssValueLooksSafe(String(value))
    ))
    if (invalidToken) {
      if (showMessage) ElMessage.error(`令牌值不安全：${invalidToken[0]}`)
      return false
    }
    const normalizedCss = normalizeCssInput(editor.customCss)
    if (normalizedCss !== editor.customCss) {
      editor.customCss = normalizedCss
    }
    const cssValidation = validateCss(editor.customCss)
    if (!cssValidation.valid) {
      if (showMessage) ElMessage.error(cssValidation.message)
      return false
    }
    return true
  }

  const saveEditorTheme = async ({ showMessage = false } = {}) => {
    if (saving.value || !validateEditorForSave(showMessage)) return null
    saving.value = true
    try {
      const wasCurrentTheme = themeStore.currentThemeId === editor.id
      const themeName = editor.builtin && editor.name === selectedTheme.value.name
        ? `${editor.name} 副本`
        : editor.name
      const payload = {
        name: themeName,
        mode: editor.mode,
        customCss: editor.customCss || '',
        tokens: editor.tokens
      }
      const response = editor.builtin || !editor.id
        ? await createTheme(payload)
        : await updateTheme(editor.id, payload)
      await themeStore.loadThemeList()
      selectedThemeId.value = response.data.id
      syncEditor(response.data)
      if (wasCurrentTheme || previewDraft) {
        themeStore.setLocalTheme(response.data)
      }
      if (showMessage) ElMessage.success('主题已保存')
      dirty.value = false
      return response.data
    } finally {
      saving.value = false
    }
  }

  const scheduleAutoSave = () => {
    if (syncingEditor || loading.value || editor.builtin) return
    dirty.value = true
    previewEditorTheme()
    if (autoSaveTimer) clearTimeout(autoSaveTimer)
    autoSaveTimer = setTimeout(() => {
      saveEditorTheme()
    }, 700)
  }

  const applySelectedTheme = async () => {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer)
      autoSaveTimer = null
    }
    let latestTheme = null
    if (dirty.value) {
      try {
        latestTheme = await saveEditorTheme({ showMessage: true })
      } catch (error) {
        ElMessage.error(error.response?.data?.message || error.message || '主题保存失败')
        return
      }
      if (!latestTheme) return
    }
    const selected = themes.value.find(theme => theme.id === selectedThemeId.value)
    await themeStore.setCurrentTheme(latestTheme || selected || getEditorThemeSnapshot())
    afterApply?.()
    ElMessage.success('主题已应用')
  }

  const copySelectedTheme = async () => {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer)
      autoSaveTimer = null
    }
    if (!validateEditorForSave(true)) return
    saving.value = true
    try {
      const response = await createTheme({
        name: `${editor.name || selectedTheme.value.name} 副本`,
        mode: editor.mode,
        customCss: editor.customCss || '',
        tokens: editor.tokens
      })
      await themeStore.loadThemeList()
      selectedThemeId.value = response.data.id
      syncEditor(response.data)
      ElMessage.success('主题副本已创建')
    } finally {
      saving.value = false
    }
  }

  const deleteCustomTheme = async () => {
    if (editor.builtin) return
    await ElMessageBox.confirm('确定要删除这个自定义主题吗？', '删除主题', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await deleteTheme(editor.id)
    await loadThemes()
  }

  const buildCssTemplate = () => {
    const lines = ['/* GeneralBot 全量主题变量模板 */', '', ':root {', '']
    themeVariableGroups.forEach(group => {
      lines.push(`  /* ===== ${group.title} ===== */`)
      group.tokens.forEach(item => {
        lines.push(`  /* ${item.comment} */`)
        lines.push(`  ${item.key}: ${editor.tokens[item.key] || ''};`)
        lines.push('')
      })
    })
    lines.push('}')
    lines.push('')
    lines.push('/* 常用组件覆盖示例 */')
    lines.push('.el-card {')
    lines.push('  border-radius: 12px;')
    lines.push('}')
    return lines.join('\n')
  }

  const insertCssTemplate = () => {
    editor.customCss = buildCssTemplate()
    dirty.value = true
    previewEditorTheme()
  }

  watch(
    () => [editor.name, editor.mode, editor.customCss, JSON.stringify(editor.tokens)],
    scheduleAutoSave
  )

  onUnmounted(() => {
    if (autoSaveTimer) clearTimeout(autoSaveTimer)
  })

  return {
    themeStore,
    loading,
    saving,
    selectedThemeId,
    selectedTheme,
    editMode,
    dirty,
    editor,
    themes,
    activeLabel,
    loadThemes,
    selectTheme,
    selectThemeById,
    syncEditor,
    applySelectedTheme,
    copySelectedTheme,
    deleteCustomTheme,
    insertCssTemplate
  }
}
