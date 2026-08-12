<script setup>
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { CopyDocument, Delete, Document, DocumentAdd, Download, Select, Upload, View } from '@element-plus/icons-vue'
import HighlightCode from '../../components/common/HighlightCode.vue'
import CssCodeEditor from '../../components/common/CssCodeEditor.vue'
import { normalizeCssInput, validateCss } from '../../theme/cssValidator'
import { colorTokenGroups, predefinedThemeColors } from '../../theme/tokenSchema'

const props = defineProps({
  editor: {
    type: Object,
    required: true
  },
  editMode: {
    type: String,
    default: 'simple'
  },
  saving: {
    type: Boolean,
    default: false
  },
  showLivePreview: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'update:editMode',
  'apply',
  'delete',
  'insert-css-template',
  'live-preview'
])

const editModeModel = computed({
  get: () => props.editMode,
  set: value => emit('update:editMode', value)
})

const editingDisabled = computed(() => props.editor.builtin)

const styleDialogVisible = ref(false)
const styleLoading = ref(false)
const styleSourceFiles = ref([])
const selectedStyleFile = ref(null)
const selectorGroups = ref([])
const selectorLoading = ref(false)
const importDialogVisible = ref(false)
const importContent = ref('')

const openStyleReference = async () => {
  styleLoading.value = true
  try {
    if (!styleSourceFiles.value.length) {
      const { styleSourceFiles: files } = await import('../../theme/styleSourceReference')
      styleSourceFiles.value = files
    }
    selectedStyleFile.value = styleSourceFiles.value[0]
    styleDialogVisible.value = true
  } finally {
    styleLoading.value = false
  }
}

const loadSelectorGroups = async (event) => {
  if (!event?.target?.open || selectorGroups.value.length) return
  selectorLoading.value = true
  try {
    const { loadSelectorGroups: load } = await import('../../theme/selectorReference')
    selectorGroups.value = await load()
  } finally {
    selectorLoading.value = false
  }
}

const buildStyleExportText = () => styleSourceFiles.value
  .map(file => `/* ===== ${file.name} ===== */\n${file.content}`)
  .join('\n\n')

const copyAllStyles = async () => {
  const text = buildStyleExportText()
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('全部样式已复制')
  } catch (error) {
    ElMessage.error('复制失败，请使用导出文件')
  }
}

const downloadAllStyles = () => {
  const text = buildStyleExportText()
  const blob = new Blob([text], { type: 'text/css;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'generalbot-styles.css'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
  ElMessage.success('全部样式已导出')
}

const openImportOverlay = () => {
  importContent.value = ''
  importDialogVisible.value = true
}

const applyImportOverlay = () => {
  const content = normalizeCssInput(importContent.value)
  const result = validateCss(content)
  if (!result.valid) {
    ElMessage.error(result.message)
    return
  }
  editor.customCss = content
  importDialogVisible.value = false
  ElMessage.success('已填入 CSS 编辑器，将自动保存')
}
</script>

<template>
  <div class="theme-editor-panel">
    <div class="editor-header">
      <div>
        <div class="theme-section-title">样式编辑器</div>
        <div class="theme-section-subtitle">{{ editModeModel === 'simple' ? '常用颜色用颜色选择器快速调整' : 'CSS 直接覆盖所有样式' }}</div>
      </div>
      <el-button
        v-if="showLivePreview"
        type="primary"
        :icon="View"
        size="large"
        @click="emit('live-preview')"
      >
        实时预览
      </el-button>
    </div>

    <el-form label-position="top" class="theme-form">
      <el-form-item label="主题名称">
        <el-input v-model="editor.name" :disabled="editingDisabled" />
      </el-form-item>
    </el-form>

    <el-segmented
      v-model="editModeModel"
      class="theme-mode-switch"
      :options="[
        { label: '简要颜色配置', value: 'simple' },
        { label: 'CSS 高级编辑', value: 'advanced' }
      ]"
    />

    <div class="token-groups" v-if="editModeModel === 'simple'">
      <section v-for="group in colorTokenGroups" :key="group.title" class="token-group">
        <h3>{{ group.title }}</h3>
        <label v-for="item in group.tokens" :key="item.key" class="token-row">
          <span>{{ item.label }}</span>
          <span class="token-color-control">
            <el-color-picker
              v-model="editor.tokens[item.key]"
              :predefine="predefinedThemeColors"
              :disabled="editingDisabled"
              show-alpha
            />
            <span class="token-color-value">{{ editor.tokens[item.key] }}</span>
          </span>
        </label>
      </section>
    </div>

    <div class="token-groups css-editor-panel" v-else>
      <div class="css-editor-toolbar">
        <el-button
          :icon="DocumentAdd"
          size="small"
          :disabled="editingDisabled"
          @click="emit('insert-css-template')"
        >
          载入全量变量模板
        </el-button>
        <el-button size="small" :disabled="editingDisabled" @click="editor.customCss = ''">
          清空
        </el-button>
        <el-button size="small" :icon="Document" :loading="styleLoading" @click="openStyleReference">
          查看全局样式参考
        </el-button>
        <el-button size="small" :icon="Upload" :disabled="editingDisabled" @click="openImportOverlay">
          导入 CSS 覆盖
        </el-button>
      </div>
      <CssCodeEditor
        v-model="editor.customCss"
        class="theme-css-editor"
        :disabled="editingDisabled"
      />
      <details class="selector-reference" @toggle="loadSelectorGroups">
        <summary>常用选择器速查</summary>
        <div v-if="selectorLoading" class="selector-loading">正在加载选择器...</div>
        <section v-for="group in selectorGroups" :key="group.title" class="selector-group">
          <h4>{{ group.title }}</h4>
          <div class="selector-list">
            <code v-for="selector in group.selectors" :key="selector">{{ selector }}</code>
          </div>
        </section>
      </details>
    </div>

    <el-dialog
      v-model="styleDialogVisible"
      title="全局样式参考"
      width="min(1080px, 94vw)"
      top="3vh"
      :append-to-body="true"
    >
      <div class="style-source-actions">
        <el-button size="small" :icon="CopyDocument" @click="copyAllStyles">
          复制全部样式
        </el-button>
        <el-button size="small" :icon="Download" @click="downloadAllStyles">
          导出全部样式
        </el-button>
      </div>
      <div class="style-source-layout">
        <aside class="style-source-files">
          <button
            v-for="file in styleSourceFiles"
            :key="file.name"
            class="style-source-file"
            :class="{ active: selectedStyleFile === file }"
            type="button"
            @click="selectedStyleFile = file"
          >
            {{ file.name }}
          </button>
        </aside>
        <div class="style-source-detail">
          <div class="style-source-guide">{{ selectedStyleFile?.guide }}</div>
          <HighlightCode
            :content="selectedStyleFile?.content"
            language="css"
            class="style-source-content"
          />
        </div>
      </div>
    </el-dialog>

    <el-dialog
      v-model="importDialogVisible"
      title="导入 CSS 覆盖"
      width="min(760px, 92vw)"
      top="8vh"
      :append-to-body="true"
    >
      <CssCodeEditor v-model="importContent" class="import-css-editor" />
      <template #footer>
        <el-button @click="importDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="applyImportOverlay">应用覆盖</el-button>
      </template>
    </el-dialog>

    <div class="theme-editor-actions">
      <el-button :icon="Select" type="primary" @click="emit('apply')" :loading="saving">应用</el-button>
      <el-button :icon="Delete" type="danger" @click="emit('delete')" :disabled="editor.builtin">删除</el-button>
    </div>
  </div>
</template>
