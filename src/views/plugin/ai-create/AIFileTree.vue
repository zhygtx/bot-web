<script setup>
import { ref, watch } from 'vue'
import { Document, Folder, FolderOpened } from '@element-plus/icons-vue'

defineOptions({ name: 'AIFileTree' })

const props = defineProps({
  fileTree: { type: Array, default: () => [] },
  activeFilePath: { type: String, default: '' }
})

const emit = defineEmits(['select-file'])

// 展开状态：存储已展开的节点 id
const expandedKeys = ref(new Set())

// 初始化时展开所有节点
watch(() => props.fileTree, (tree) => {
  expandedKeys.value.clear()
  const collectKeys = (nodes) => {
    nodes.forEach(node => {
      if (node.children?.length) {
        expandedKeys.value.add(node.id)
        collectKeys(node.children)
      }
    })
  }
  collectKeys(tree)
}, { immediate: true })

const toggleExpand = (node) => {
  if (node.children?.length) {
    if (expandedKeys.value.has(node.id)) {
      expandedKeys.value.delete(node.id)
    } else {
      expandedKeys.value.add(node.id)
    }
  } else {
    // 叶子节点：选中文件
    emit('select-file', node)
  }
}

const isExpanded = (node) => expandedKeys.value.has(node.id)
const isActive = (node) => node.path === props.activeFilePath
</script>

<template>
  <div class="ai-file-tree">
    <div v-for="node in fileTree" :key="node.id" class="tree-item-wrapper">
      <div
        class="tree-item"
        :class="{ active: isActive(node) }"
        @click="toggleExpand(node)"
      >
        <span class="tree-item-icon">
          <el-icon v-if="node.leaf"><Document /></el-icon>
          <el-icon v-else-if="isExpanded(node)"><FolderOpened /></el-icon>
          <el-icon v-else><Folder /></el-icon>
        </span>
        <span class="tree-item-label">{{ node.label }}</span>
      </div>
      <div v-if="node.children?.length && isExpanded(node)" class="tree-children">
        <AIFileTree
          :file-tree="node.children"
          :active-file-path="activeFilePath"
          @select-file="emit('select-file', $event)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.ai-file-tree {
  width: 100%;
}

.tree-item-wrapper {
  width: 100%;
}

.tree-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  cursor: pointer;
  user-select: none;
  color: var(--app-text-soft, #8b949e);
  font-size: 13px;
  transition: background 0.15s ease;
}

.tree-item:hover {
  background: rgba(139, 148, 158, 0.08);
}

.tree-item.active {
  background: rgba(64, 158, 255, 0.12);
  color: var(--app-primary, #409eff);
  font-weight: 500;
}

.tree-item-icon {
  display: inline-flex;
  font-size: 14px;
  flex-shrink: 0;
}

.tree-item-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.tree-children {
  padding-left: 16px;
}
</style>
