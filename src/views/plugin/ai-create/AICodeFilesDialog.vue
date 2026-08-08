<script setup>
import { computed, ref, watch } from 'vue'
import { CopyDocument, Fold, Expand } from '@element-plus/icons-vue'
import AIFileTree from './AIFileTree.vue'
import HighlightCode from '../../../components/common/HighlightCode.vue'
import CodeDiffView from '../../../components/plugin/ai-create/CodeDiffView.vue'

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

// 关闭弹窗时回到代码视图，避免下次打开直接停留在变更页
watch(() => props.modelValue, visible => {
  if (!visible) viewMode.value = 'code'
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

      <!-- 代码展示区域 -->
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
        <HighlightCode
          v-show="viewMode === 'code' && activeFile"
          :content="activeFile?.content"
          :language="language"
          class="code-view-host"
        />
        <!-- 变更视图 -->
        <CodeDiffView
          v-show="viewMode === 'diff' && activeDiffFile"
          :file="activeDiffFile"
          :language="language"
          class="code-view-host"
        />
        <el-empty v-if="viewMode === 'code' && !activeFile" description="暂无可查看的代码文件" />
        <el-empty v-if="viewMode === 'diff' && !activeDiffFile" description="暂无代码变更" />
      </main>
    </div>
  </el-dialog>
</template>
