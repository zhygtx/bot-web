<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { DocumentCopy, View } from '@element-plus/icons-vue'
import { useThemeEditor } from '../../composables/useThemeEditor'
import { useThemePreviewStore } from '../../stores/themePreview'
import ThemeEditorPanel from './ThemeEditorPanel.vue'

const router = useRouter()
const themePreviewStore = useThemePreviewStore()

const {
  loading,
  saving,
  selectedThemeId,
  jsonDialogVisible,
  jsonContent,
  editMode,
  editor,
  themes,
  activeLabel,
  loadThemes,
  selectTheme,
  applySelectedTheme,
  copySelectedTheme,
  deleteCustomTheme,
  openJsonEditor,
  applyJsonContent
} = useThemeEditor()

const startLivePreview = () => {
  themePreviewStore.startPreview({
    id: editor.id,
    name: editor.name,
    mode: editor.mode,
    builtin: editor.builtin,
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

    <main class="theme-preview-panel">
      <div class="preview-panel-heading">
        <div>
          <div class="theme-section-title">简要预览</div>
          <div class="theme-section-subtitle">快速查看统计页、卡片、按钮、图表和侧边栏 token 的组合效果</div>
        </div>
        <el-button type="primary" :icon="View" @click="startLivePreview">实时预览</el-button>
      </div>
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
      <ThemeEditorPanel
        v-model:edit-mode="editMode"
        :editor="editor"
        :saving="saving"
        @apply="applySelectedTheme"
        @delete="deleteCustomTheme"
        @open-json="openJsonEditor"
      />
    </aside>

    <el-dialog v-model="jsonDialogVisible" title="高级 JSON" width="720px">
      <el-input v-model="jsonContent" type="textarea" :rows="18" class="theme-json-editor" />
      <template #footer>
        <el-button @click="jsonDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="applyJsonContent">应用并保存</el-button>
      </template>
    </el-dialog>

  </div>
</template>
