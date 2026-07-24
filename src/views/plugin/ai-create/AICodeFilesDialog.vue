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
  activeFile: { type: Object, default: null }
})

const emit = defineEmits([
  'update:modelValue',
  'select-file',
  'update-file-content',
  'copy'
])

const editorHost = ref(null)
const editor = shallowRef(null)
let applyingExternalValue = false
let monacoApi = null

// 文件树可见性
const treeVisible = ref(true)

const selectedName = computed(() => {
  const path = props.activeFile?.filePath || ''
  return path.split('/').pop() || '未选择文件'
})

const language = computed(() => {
  const path = props.activeFile?.filePath || ''
  if (path.endsWith('.xml') || path.endsWith('.pom')) return 'xml'
  if (path.endsWith('.json')) return 'json'
  if (path.endsWith('.yml') || path.endsWith('.yaml')) return 'yaml'
  if (path.endsWith('.properties')) return 'properties'
  return 'java'
})

const editorTheme = computed(() => isDark.value ? 'vs-dark' : 'vs')

const createEditor = async () => {
  await nextTick()
  if (!editorHost.value || editor.value) return
  monacoApi = monacoApi || await import('monaco-editor')
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
}

const disposeEditor = () => {
  if (editor.value) {
    editor.value.dispose()
    editor.value = null
  }
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

watch(isDark, dark => {
  if (editor.value && monacoApi) {
    monacoApi.editor.setTheme(dark ? 'vs-dark' : 'vs')
  }
})

watch(() => props.modelValue, visible => {
  if (visible) {
    createEditor()
  } else {
    disposeEditor()
  }
})

watch(() => [props.activeFile?.filePath, props.activeFile?.content], syncEditor, { flush: 'post' })

// 文件树切换后重新布局编辑器
watch(treeVisible, () => {
  nextTick(() => editor.value?.layout())
})

onBeforeUnmount(() => {
  disposeEditor()
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
          <span>{{ files.length }} 个文件</span>
        </div>
        <el-button :icon="CopyDocument" text :disabled="!activeFile" @click="emit('copy')">复制当前文件</el-button>
      </div>
    </template>

    <div class="code-dialog-layout">
      <!-- 文件树区域 -->
      <aside v-show="treeVisible" class="code-file-tree">
        <AIFileTree
          :file-tree="fileTree"
          :active-file-path="activeFilePath"
          @select-file="emit('select-file', $event)"
        />
        <el-empty v-if="!files.length" description="暂无文件" />
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
            <span>{{ activeFile?.filePath || '选择左侧文件查看内容' }}</span>
          </div>
        </div>
        <div v-show="activeFile" ref="editorHost" class="monaco-host"></div>
        <el-empty v-if="!activeFile" description="暂无可查看的代码文件" />
      </main>
    </div>
  </el-dialog>
</template>
