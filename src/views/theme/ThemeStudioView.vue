<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { DocumentCopy } from '@element-plus/icons-vue'
import { useThemeEditor } from '../../composables/useThemeEditor'
import { useThemePreviewStore } from '../../stores/themePreview'
import ThemeEditorPanel from './ThemeEditorPanel.vue'

const router = useRouter()
const themePreviewStore = useThemePreviewStore()

const {
  loading,
  saving,
  selectedThemeId,
  editMode,
  editor,
  themes,
  activeLabel,
  loadThemes,
  selectTheme,
  applySelectedTheme,
  copySelectedTheme,
  deleteCustomTheme,
  insertCssTemplate
} = useThemeEditor()

const startLivePreview = () => {
  themePreviewStore.startPreview({
    id: editor.id,
    name: editor.name,
    mode: editor.mode,
    builtin: editor.builtin,
    customCss: editor.customCss || '',
    tokens: { ...editor.tokens }
  })
  router.push('/statistics')
}

onMounted(() => {
  loadThemes()
})
</script>

<template>
  <div class="theme-studio" v-loading="loading">
    <aside class="theme-library">
      <div class="theme-section-title">主题列表</div>
      <div class="theme-section-subtitle">选择一个基底，再进行调整</div>
      <el-button type="primary" :icon="DocumentCopy" @click="copySelectedTheme" :loading="saving">创建主题副本</el-button>
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

    <aside class="theme-editor">
      <ThemeEditorPanel
        v-model:edit-mode="editMode"
        :editor="editor"
        :saving="saving"
        :show-live-preview="true"
        @live-preview="startLivePreview"
        @apply="applySelectedTheme"
        @delete="deleteCustomTheme"
        @insert-css-template="insertCssTemplate"
      />
    </aside>

  </div>
</template>
