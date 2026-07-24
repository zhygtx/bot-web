<script setup>
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { CopyDocument, Document, Folder } from '@element-plus/icons-vue'

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

const createEditor = async () => {
  await nextTick()
  if (!editorHost.value || editor.value) return
  monacoApi = monacoApi || await import('monaco-editor')
  editor.value = monacoApi.editor.create(editorHost.value, {
    value: props.activeFile?.content || '',
    language: language.value,
    theme: 'vs-dark',
    automaticLayout: true,
    minimap: { enabled: false },
    fontSize: 13,
    lineHeight: 21,
    scrollBeyondLastLine: false,
    wordWrap: 'on'
  })
  editor.value.onDidChangeModelContent(() => {
    if (applyingExternalValue || !props.activeFile?.filePath) return
    emit('update-file-content', props.activeFile.filePath, editor.value.getValue())
  })
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

watch(() => props.modelValue, visible => {
  if (visible) createEditor()
})

watch(() => [props.activeFile?.filePath, props.activeFile?.content], syncEditor, { flush: 'post' })

onBeforeUnmount(() => {
  editor.value?.dispose()
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
      <aside class="code-file-tree">
        <el-tree
          :data="fileTree"
          node-key="id"
          default-expand-all
          :expand-on-click-node="false"
          @node-click="emit('select-file', $event)"
        >
          <template #default="{ node, data }">
            <span class="tree-node" :class="{ active: data.path === activeFilePath }">
              <el-icon><Document v-if="data.leaf" /><Folder v-else /></el-icon>
              <span>{{ node.label }}</span>
            </span>
          </template>
        </el-tree>
        <el-empty v-if="!files.length" description="暂无文件" />
      </aside>

      <main class="code-editor-pane">
        <div class="code-editor-header">
          <strong>{{ selectedName }}</strong>
          <span>{{ activeFile?.filePath || '选择左侧文件查看内容' }}</span>
        </div>
        <div v-show="activeFile" ref="editorHost" class="monaco-host"></div>
        <el-empty v-if="!activeFile" description="暂无可查看的代码文件" />
      </main>
    </div>
  </el-dialog>
</template>
