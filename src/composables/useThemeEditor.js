import { computed, nextTick, onUnmounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useThemeStore } from '../stores/theme'
import { createTheme, deleteTheme, updateTheme } from '../theme/themeApi'
import { getBuiltinTheme, themeTokenList } from '../theme/registry'
import { applyTheme } from '../theme/themeRuntime'
import { advancedTokenGroups, cssValueLooksSafe } from '../theme/tokenSchema'

const tokenMetaMap = advancedTokenGroups
  .flatMap(group => group.tokens.map(token => [token.key, { ...token, groupTitle: group.title }]))
  .reduce((map, [key, meta]) => {
    map[key] = meta
    return map
  }, {})

const stringifyJsonValue = (value) => JSON.stringify(value)

const stripJsoncComments = (content) => {
  let result = ''
  let inString = false
  let inLineComment = false
  let inBlockComment = false
  let escaped = false

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index]
    const next = content[index + 1]

    if (inLineComment) {
      if (char === '\n' || char === '\r') {
        inLineComment = false
        result += char
      }
      continue
    }

    if (inBlockComment) {
      if (char === '*' && next === '/') {
        inBlockComment = false
        index += 1
        continue
      }
      if (char === '\n' || char === '\r') result += char
      continue
    }

    if (inString) {
      result += char
      if (escaped) {
        escaped = false
      } else if (char === '\\') {
        escaped = true
      } else if (char === '"') {
        inString = false
      }
      continue
    }

    if (char === '"') {
      inString = true
      result += char
      continue
    }

    if (char === '/' && next === '/') {
      inLineComment = true
      index += 1
      continue
    }

    if (char === '/' && next === '*') {
      inBlockComment = true
      index += 1
      continue
    }

    result += char
  }

  return result
}

const removeJsonTrailingCommas = (content) => {
  let result = ''
  let inString = false
  let escaped = false

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index]

    if (inString) {
      result += char
      if (escaped) {
        escaped = false
      } else if (char === '\\') {
        escaped = true
      } else if (char === '"') {
        inString = false
      }
      continue
    }

    if (char === '"') {
      inString = true
      result += char
      continue
    }

    if (char === ',') {
      let nextIndex = index + 1
      while (/\s/.test(content[nextIndex] || '')) nextIndex += 1
      if (content[nextIndex] === '}' || content[nextIndex] === ']') continue
    }

    result += char
  }

  return result
}

const parseJsonc = (content) => JSON.parse(removeJsonTrailingCommas(stripJsoncComments(content)))

const buildJsoncTheme = (editor) => {
  const lines = [
    '{',
    '  // 主题名称。可以让 AI 按你的风格重新命名。',
    `  "name": ${stringifyJsonValue(editor.name)},`,
    '',
    '  // 主题模式。light 为亮色，dark 为暗色；通常保持复制来源的模式不变。',
    `  "mode": ${stringifyJsonValue(editor.mode)},`,
    '',
    '  // tokens 是真正会应用到前端的样式变量。注释只给人和 AI 阅读，保存时不会进入数据库。',
    '  "tokens": {'
  ]

  themeTokenList.forEach((key, index) => {
    const meta = tokenMetaMap[key]
    const comma = index === themeTokenList.length - 1 ? '' : ','
    lines.push(`    // ${meta?.groupTitle || '未分组'} / ${meta?.label || key}`)
    if (meta?.placeholder) {
      lines.push(`    // 可写：${meta.placeholder}`)
    }
    lines.push(`    ${stringifyJsonValue(key)}: ${stringifyJsonValue(editor.tokens[key] || '')}${comma}`)
    if (index !== themeTokenList.length - 1) lines.push('')
  })

  lines.push('  }')
  lines.push('}')
  return lines.join('\n')
}

export const useThemeEditor = ({ previewDraft = false, afterApply } = {}) => {
  const themeStore = useThemeStore()
  const loading = ref(false)
  const saving = ref(false)
  const selectedThemeId = ref('')
  const jsonDialogVisible = ref(false)
  const jsonContent = ref('')
  const editMode = ref('simple')
  const dirty = ref(false)
  let autoSaveTimer = null
  let syncingEditor = false

  const editor = reactive({
    id: '',
    name: '',
    mode: 'light',
    builtin: true,
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
    if (syncingEditor || loading.value || jsonDialogVisible.value || editor.builtin) return
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
    const latestTheme = dirty.value ? await saveEditorTheme() : null
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

  const openJsonEditor = () => {
    jsonContent.value = buildJsoncTheme(editor)
    jsonDialogVisible.value = true
  }

  const applyJsonContent = async () => {
    try {
      const parsed = parseJsonc(jsonContent.value)
      if (!parsed.name || !parsed.tokens) {
        throw new Error('JSONC 必须包含 name 和 tokens')
      }
      const parsedMode = parsed.mode === 'dark' ? 'dark' : parsed.mode === 'light' ? 'light' : editor.mode
      Object.entries(parsed.tokens).forEach(([key, value]) => {
        if (!themeTokenList.includes(key)) {
          throw new Error(`不支持的令牌：${key}`)
        }
        if (!cssValueLooksSafe(String(value))) {
          throw new Error(`令牌值不安全：${key}`)
        }
      })
      editor.name = parsed.name
      editor.mode = parsedMode
      editor.tokens = normalizeEditorTokens(parsedMode, parsed.tokens)
      editor.builtin = false
      dirty.value = true
      if (editor.id && themes.value.some(theme => theme.id === editor.id && theme.builtin)) {
        editor.id = ''
      }
      previewEditorTheme()
      await saveEditorTheme({ showMessage: true })
      jsonDialogVisible.value = false
    } catch (error) {
      ElMessage.error(error.message || 'JSONC 解析失败')
    }
  }

  watch(
    () => [editor.name, editor.mode, JSON.stringify(editor.tokens)],
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
    jsonDialogVisible,
    jsonContent,
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
    openJsonEditor,
    applyJsonContent
  }
}
