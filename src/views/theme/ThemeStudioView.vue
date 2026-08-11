<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, DocumentCopy, Refresh, Select, Upload } from '@element-plus/icons-vue'
import { useThemeStore } from '../../stores/theme'
import { createTheme, deleteTheme, updateTheme } from '../../theme/themeApi'
import { getBuiltinTheme, themeTokenList } from '../../theme/registry'
import {
  backgroundTokenGroups,
  colorTokenGroups,
  cssValueLooksSafe,
  predefinedThemeColors,
  shadowTokenGroups,
  shapeTokenGroups
} from '../../theme/tokenSchema'

const themeStore = useThemeStore()
const loading = ref(false)
const saving = ref(false)
const selectedThemeId = ref('')
const jsonDialogVisible = ref(false)
const jsonContent = ref('')
const editMode = ref('simple')

const editor = reactive({
  id: '',
  name: '',
  mode: 'light',
  builtin: true,
  tokens: {}
})

const themes = computed(() => themeStore.themes)
const selectedTheme = computed(() => themes.value.find(theme => theme.id === selectedThemeId.value) || themeStore.currentTheme)
const canSave = computed(() => !editor.builtin)
const complexTokenGroups = computed(() => [
  ...colorTokenGroups,
  ...backgroundTokenGroups,
  ...shadowTokenGroups,
  ...shapeTokenGroups
])

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

const syncEditor = (theme) => {
  editor.id = theme.id
  editor.name = theme.name
  editor.mode = theme.mode
  editor.builtin = theme.builtin
  editor.tokens = normalizeEditorTokens(theme.mode, theme.tokens)
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

const applySelectedTheme = async () => {
  await themeStore.setCurrentTheme(selectedTheme.value)
  ElMessage.success('主题已应用')
}

const copyAsCustomTheme = async () => {
  saving.value = true
  try {
    const response = await createTheme({
      name: `${editor.name} 副本`,
      mode: editor.mode,
      tokens: editor.tokens
    })
    await themeStore.loadThemeList()
    selectedThemeId.value = response.data.id
    syncEditor(response.data)
  } finally {
    saving.value = false
  }
}

const createCustomThemeFromEditor = async () => {
  saving.value = true
  try {
    const response = await createTheme({
      name: editor.name,
      mode: editor.mode,
      tokens: editor.tokens
    })
    await themeStore.loadThemeList()
    selectedThemeId.value = response.data.id
    syncEditor(response.data)
  } finally {
    saving.value = false
  }
}

const saveCustomTheme = async () => {
  if (editor.builtin) {
    await copyAsCustomTheme()
    return
  }
  if (!editor.id) {
    await createCustomThemeFromEditor()
    return
  }
  saving.value = true
  try {
    const wasCurrentTheme = themeStore.currentThemeId === editor.id
    const response = await updateTheme(editor.id, {
      name: editor.name,
      mode: editor.mode,
      tokens: editor.tokens
    })
    await themeStore.loadThemeList()
    selectedThemeId.value = response.data.id
    syncEditor(response.data)
    if (wasCurrentTheme) {
      themeStore.setLocalTheme(response.data)
    }
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

const resetToModeDefault = () => {
  const defaultTheme = getBuiltinTheme(editor.mode === 'dark' ? 'default-dark' : 'default-light')
  editor.tokens = { ...defaultTheme.tokens }
}

const openJsonEditor = () => {
  jsonContent.value = JSON.stringify({
    name: editor.name,
    mode: editor.mode,
    tokens: editor.tokens
  }, null, 2)
  jsonDialogVisible.value = true
}

const applyJsonContent = () => {
  try {
    const parsed = JSON.parse(jsonContent.value)
    if (!parsed.name || !parsed.tokens) {
      throw new Error('JSON 必须包含 name 和 tokens')
    }
    Object.entries(parsed.tokens).forEach(([key, value]) => {
      if (!themeTokenList.includes(key)) {
        throw new Error(`不支持的令牌：${key}`)
      }
      if (!cssValueLooksSafe(String(value))) {
        throw new Error(`令牌值不安全：${key}`)
      }
    })
    editor.name = parsed.name
    editor.tokens = normalizeEditorTokens(editor.mode, parsed.tokens)
    editor.builtin = false
    if (editor.id && themes.value.some(theme => theme.id === editor.id && theme.builtin)) {
      editor.id = ''
    }
    jsonDialogVisible.value = false
  } catch (error) {
    ElMessage.error(error.message || 'JSON 解析失败')
  }
}

onMounted(loadThemes)
</script>

<template>
  <div class="theme-studio" v-loading="loading">
    <aside class="theme-library">
      <div class="theme-section-title">主题列表</div>
      <div class="theme-section-subtitle">选择一个基底，再进行调整</div>
      <el-button type="primary" :icon="DocumentCopy" @click="copyAsCustomTheme" :loading="saving">复制为自定义</el-button>
      <div class="theme-list">
        <button
          v-for="theme in themes"
          :key="theme.id"
          class="theme-list-item"
          :class="{ active: theme.id === selectedThemeId }"
          type="button"
          @click="selectTheme(theme)"
        >
          <span class="theme-swatch" :style="{ background: theme.tokens['--app-primary'] }"></span>
          <span class="theme-list-main">
            <span class="theme-name">{{ theme.name }}</span>
            <span class="theme-meta">{{ theme.builtin ? '系统内置' : '用户自定义' }} · {{ theme.mode }}</span>
          </span>
          <span v-if="activeLabel(theme)" class="theme-current-label">{{ activeLabel(theme) }}</span>
        </button>
      </div>
    </aside>

    <main class="theme-preview-panel">
      <div class="theme-section-title">实时预览</div>
      <div class="theme-section-subtitle">预览统计页、卡片、按钮、图表和侧边栏 token 的组合效果</div>
      <div class="preview-shell" :style="editor.tokens">
        <div class="preview-sidebar">
          <div class="preview-brand">GeneralBot</div>
          <div class="preview-menu active">数据统计</div>
          <div class="preview-menu">插件管理</div>
          <div class="preview-menu">工作流管理</div>
        </div>
        <div class="preview-page">
          <div class="preview-header">{{ editor.name }}</div>
          <section class="preview-card wide">
            <div class="preview-card-title">我的 BOT</div>
            <div class="preview-card-sub">在线中 · QQ 123456789</div>
            <div class="preview-actions">
              <button>切换主题</button>
              <button class="strong">保存为默认</button>
            </div>
          </section>
          <section class="preview-grid">
            <div class="preview-card"><span>插件总数</span><strong>128</strong></div>
            <div class="preview-card"><span>工作流</span><strong>24</strong></div>
            <div class="preview-card"><span>今日执行</span><strong>1,284</strong></div>
          </section>
          <section class="preview-chart">
            <i v-for="height in [38, 76, 48, 94, 66, 84, 58]" :key="height" :style="{ height: `${height}px` }"></i>
          </section>
        </div>
      </div>
    </main>

    <aside class="theme-editor">
      <div class="editor-header">
        <div>
          <div class="theme-section-title">样式编辑器</div>
          <div class="theme-section-subtitle">{{ editMode === 'simple' ? '常用颜色用颜色选择器快速调整' : '所有样式 token 直接输入 CSS 值' }}</div>
        </div>
      </div>

      <el-form label-position="top" class="theme-form">
        <el-form-item label="主题名称">
          <el-input v-model="editor.name" :disabled="editor.builtin" />
        </el-form-item>
      </el-form>

      <el-segmented
        v-model="editMode"
        class="theme-mode-switch"
        :options="[
          { label: '简要颜色配置', value: 'simple' },
          { label: '复杂样式配置', value: 'advanced' }
        ]"
      />

      <div class="token-groups" v-if="editMode === 'simple'">
        <section v-for="group in colorTokenGroups" :key="group.title" class="token-group">
          <h3>{{ group.title }}</h3>
          <label v-for="item in group.tokens" :key="item.key" class="token-row">
            <span>{{ item.label }}</span>
            <span class="token-color-control">
              <el-color-picker
                v-model="editor.tokens[item.key]"
                :disabled="editor.builtin"
                :predefine="predefinedThemeColors"
                show-alpha
              />
              <span class="token-color-value">{{ editor.tokens[item.key] }}</span>
            </span>
          </label>
        </section>
      </div>

      <div class="token-groups" v-else>
        <section v-for="group in complexTokenGroups" :key="group.title" class="token-group">
          <h3>{{ group.title }}</h3>
          <label v-for="item in group.tokens" :key="item.key" class="token-row token-row-wide">
            <span>{{ item.label }}</span>
            <el-input v-model="editor.tokens[item.key]" :disabled="editor.builtin" />
          </label>
        </section>
      </div>

      <div class="theme-editor-actions">
        <el-button :icon="Select" type="primary" @click="applySelectedTheme">应用</el-button>
        <el-button :icon="DocumentCopy" @click="copyAsCustomTheme" :loading="saving">复制</el-button>
        <el-button :icon="Refresh" @click="resetToModeDefault" :disabled="editor.builtin">重置</el-button>
        <el-button @click="openJsonEditor">高级 JSON</el-button>
        <el-button :icon="Upload" type="success" @click="saveCustomTheme" :loading="saving">{{ canSave ? '保存' : '另存' }}</el-button>
        <el-button :icon="Delete" type="danger" @click="deleteCustomTheme" :disabled="editor.builtin">删除</el-button>
      </div>
    </aside>

    <el-dialog v-model="jsonDialogVisible" title="高级 JSON" width="720px">
      <el-input v-model="jsonContent" type="textarea" :rows="18" class="theme-json-editor" />
      <template #footer>
        <el-button @click="jsonDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="applyJsonContent">应用到编辑器</el-button>
      </template>
    </el-dialog>
  </div>
</template>
