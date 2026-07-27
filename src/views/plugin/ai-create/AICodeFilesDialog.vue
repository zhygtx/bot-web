<script setup>
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { CopyDocument, Fold, Expand } from '@element-plus/icons-vue'
import { useTheme } from '../../../composables/useTheme'
import AIFileTree from './AIFileTree.vue'

// Monaco worker 配置：使用 Vite ?worker 导入 ESM worker
// 注意：monaco-editor 0.56 的 exports 把 "./*" 映射到 "./esm/vs/*.js"，
// 所以导入路径不能带 "esm/vs/" 前缀，否则会被双重映射导致路径错误
import editorWorker from 'monaco-editor/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/language/json/json.worker?worker'
import cssWorker from 'monaco-editor/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/language/html/html.worker?worker'
import tsWorker from 'monaco-editor/language/typescript/ts.worker?worker'

self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === 'json') return new jsonWorker()
    if (label === 'css' || label === 'scss' || label === 'less') return new cssWorker()
    if (label === 'html' || label === 'handlebars' || label === 'razor') return new htmlWorker()
    if (label === 'typescript' || label === 'javascript') return new tsWorker()
    return new editorWorker()
  }
}

const { isDark } = useTheme()

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  files: { type: Array, default: () => [] },
  fileTree: { type: Array, default: () => [] },
  activeFilePath: { type: String, default: '' },
  activeFile: { type: Object, default: null },
  diffFileTree: { type: Array, default: () => [] },
  activeDiffFile: { type: Object, default: null },
  diffStats: { type: Object, default: () => ({}) }
})

const emit = defineEmits([
  'update:modelValue',
  'select-file',
  'update-file-content',
  'copy'
])

const editorHost = ref(null)
const editor = shallowRef(null)
const diffEditorHost = ref(null)
const diffEditor = shallowRef(null)
let diffOriginalModel = null
let diffModifiedModel = null
let applyingExternalValue = false
let monacoApi = null
// 创建锁：防止 watch(modelValue) 和 @opened 同时触发 createEditor 导致重复创建
let isCreating = false
let isCreatingDiff = false

// 文件树可见性
const treeVisible = ref(true)

// 视图模式：code = 查看代码，diff = 查看代码变更
const viewMode = ref('code')

const selectedName = computed(() => {
  const path = (viewMode.value === 'diff' ? props.activeDiffFile?.filePath : props.activeFile?.filePath) || ''
  return path.split('/').pop() || '未选择文件'
})

const language = computed(() => {
  const path = (viewMode.value === 'diff' ? props.activeDiffFile?.filePath : props.activeFile?.filePath) || ''
  if (path.endsWith('.xml') || path.endsWith('.pom')) return 'xml'
  if (path.endsWith('.json')) return 'json'
  if (path.endsWith('.yml') || path.endsWith('.yaml')) return 'yaml'
  if (path.endsWith('.properties')) return 'properties'
  return 'java'
})

const diffSummaryText = computed(() => {
  const s = props.diffStats
  if (!s || !s.total) return '暂无变更'
  const parts = []
  if (s.modified) parts.push(`${s.modified} 修改`)
  if (s.added) parts.push(`${s.added} 新增`)
  if (s.deleted) parts.push(`${s.deleted} 删除`)
  return parts.length ? parts.join(' · ') : '无变更'
})

const editorTheme = computed(() => isDark.value ? 'vs-dark' : 'vs')

const createEditor = async () => {
  // 加锁防止重入（watch 和 @opened 可能同时触发）
  if (isCreating || editor.value) return
  if (!editorHost.value) return
  isCreating = true
  try {
    await nextTick()
    if (editor.value || !editorHost.value) return
    monacoApi = monacoApi || await import('monaco-editor')
    if (editor.value) return
    editor.value = monacoApi.editor.create(editorHost.value, {
      value: props.activeFile?.content || '',
      language: language.value,
      theme: editorTheme.value,
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 14,
      lineHeight: 20,
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      readOnly: true,
      renderLineHighlight: 'line',
      smoothScrolling: true,
      cursorBlinking: 'smooth',
      padding: { top: 8 }
    })
    // 延迟触发 layout 确保容器尺寸已计算完成
    setTimeout(() => editor.value?.layout(), 100)
  } finally {
    isCreating = false
  }
}

const disposeEditor = () => {
  if (editor.value) {
    editor.value.dispose()
    editor.value = null
  }
  // 清理容器残留属性，避免下次创建时报 "Element already has context attribute"
  if (editorHost.value) {
    editorHost.value.removeAttribute('data-context')
    editorHost.value.innerHTML = ''
  }
  isCreating = false
}

const syncEditor = () => {
  if (!editor.value) return
  applyingExternalValue = true
  if (editor.value.getValue() !== (props.activeFile?.content || '')) {
    editor.value.setValue(props.activeFile?.content || '')
  }
  monacoApi?.editor.setModelLanguage(editor.value.getModel(), language.value)
  applyingExternalValue = false
}

const createDiffEditor = async () => {
  if (isCreatingDiff || diffEditor.value) return
  if (!diffEditorHost.value) return
  isCreatingDiff = true
  try {
    await nextTick()
    if (diffEditor.value || !diffEditorHost.value) return
    monacoApi = monacoApi || await import('monaco-editor')
    if (diffEditor.value) return
    diffEditor.value = monacoApi.editor.createDiffEditor(diffEditorHost.value, {
      theme: editorTheme.value,
      automaticLayout: true,
      readOnly: true,
      renderSideBySide: true,
      minimap: { enabled: false },
      fontSize: 14,
      lineHeight: 20,
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      padding: { top: 8 }
    })
    syncDiffEditor()
    setTimeout(() => diffEditor.value?.layout(), 100)
  } finally {
    isCreatingDiff = false
  }
}

const disposeDiffEditor = () => {
  // 先解除编辑器对 model 的引用，再依次 dispose，避免编辑器内部仍持有已释放 model 报错
  if (diffEditor.value) {
    diffEditor.value.setModel(null)
  }
  diffOriginalModel?.dispose()
  diffModifiedModel?.dispose()
  diffOriginalModel = null
  diffModifiedModel = null
  if (diffEditor.value) {
    diffEditor.value.dispose()
    diffEditor.value = null
  }
  if (diffEditorHost.value) {
    diffEditorHost.value.removeAttribute('data-context')
    diffEditorHost.value.innerHTML = ''
  }
  isCreatingDiff = false
}

const syncDiffEditor = () => {
  if (!diffEditor.value || !monacoApi || !props.activeDiffFile) return
  const file = props.activeDiffFile
  const lang = language.value
  // 先解除编辑器对旧 model 的引用，再 dispose，避免 diff 编辑器内部仍持有已释放 model 报错
  const oldOriginal = diffOriginalModel
  const oldModified = diffModifiedModel
  diffOriginalModel = null
  diffModifiedModel = null
  diffEditor.value.setModel(null)
  oldOriginal?.dispose()
  oldModified?.dispose()
  diffOriginalModel = monacoApi.editor.createModel(file.previousContent || '', lang)
  diffModifiedModel = monacoApi.editor.createModel(file.currentContent || '', lang)
  diffEditor.value.setModel({ original: diffOriginalModel, modified: diffModifiedModel })
}

watch(isDark, dark => {
  if (monacoApi) {
    monacoApi.editor.setTheme(dark ? 'vs-dark' : 'vs')
  }
})

watch(() => props.modelValue, visible => {
  if (visible) {
    createEditor()
  } else {
    disposeEditor()
    disposeDiffEditor()
    viewMode.value = 'code'
  }
})

watch(() => [props.activeFile?.filePath, props.activeFile?.content], syncEditor, { flush: 'post' })

// 变更视图下切换文件时同步 diff 编辑器
watch(() => [props.activeDiffFile?.filePath, props.activeDiffFile?.currentContent, props.activeDiffFile?.previousContent], () => {
  if (viewMode.value === 'diff' && diffEditor.value) syncDiffEditor()
}, { flush: 'post' })

// 视图模式切换：创建/布局对应编辑器
watch(viewMode, async mode => {
  if (mode === 'diff') {
    await nextTick()
    await createDiffEditor()
    syncDiffEditor()
    await nextTick()
    diffEditor.value?.layout()
  } else {
    await nextTick()
    editor.value?.layout()
  }
})

// 文件树切换后重新布局编辑器
watch(treeVisible, () => {
  nextTick(() => {
    editor.value?.layout()
    diffEditor.value?.layout()
  })
})

onBeforeUnmount(() => {
  disposeEditor()
  disposeDiffEditor()
})
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    class="code-files-dialog"
    width="min(1180px, 94vw)"
    top="5vh"
    destroy-on-close
    @update:model-value="emit('update:modelValue', $event)"
    @opened="createEditor"
  >
    <template #header>
      <div class="dialog-title-row">
        <div>
          <h2>代码文件</h2>
          <span>{{ viewMode === 'diff' ? diffSummaryText : `${files.length} 个文件` }}</span>
        </div>
        <div class="dialog-header-actions">
          <el-radio-group v-model="viewMode" size="small">
            <el-radio-button value="code">代码</el-radio-button>
            <el-radio-button value="diff">变更</el-radio-button>
          </el-radio-group>
          <el-button :icon="CopyDocument" text :disabled="!activeFile" @click="emit('copy')">复制当前文件</el-button>
        </div>
      </div>
    </template>

    <div class="code-dialog-layout">
      <!-- 文件树区域 -->
      <aside v-show="treeVisible" class="code-file-tree">
        <AIFileTree
          :file-tree="viewMode === 'diff' ? diffFileTree : fileTree"
          :active-file-path="activeFilePath"
          @select-file="emit('select-file', $event)"
        />
        <el-empty v-if="viewMode === 'diff' ? !diffFileTree.length : !files.length" description="暂无文件" />
      </aside>

      <!-- 编辑器区域 -->
      <main class="code-editor-pane">
        <div class="code-editor-header">
          <div class="editor-header-left">
            <button
              class="tree-toggle-btn"
              :title="treeVisible ? '隐藏文件树' : '显示文件树'"
              @click="treeVisible = !treeVisible"
            >
              <el-icon :size="18">
                <Fold v-if="treeVisible" />
                <Expand v-else />
              </el-icon>
            </button>
            <strong>{{ selectedName }}</strong>
            <span>{{ (viewMode === 'diff' ? activeDiffFile?.filePath : activeFile?.filePath) || '选择左侧文件查看内容' }}</span>
          </div>
        </div>
        <!-- 代码视图 -->
        <div v-show="viewMode === 'code' && activeFile" ref="editorHost" class="monaco-host"></div>
        <!-- 变更视图 -->
        <div v-show="viewMode === 'diff' && activeDiffFile" ref="diffEditorHost" class="monaco-host"></div>
        <el-empty v-if="viewMode === 'code' && !activeFile" description="暂无可查看的代码文件" />
        <el-empty v-if="viewMode === 'diff' && !activeDiffFile" description="暂无代码变更" />
      </main>
    </div>
  </el-dialog>
</template>
