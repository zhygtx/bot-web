<script setup>
import { Document, Folder } from '@element-plus/icons-vue'

defineProps({
  generatedFiles: { type: Array, default: () => [] },
  fileTree: { type: Array, default: () => [] },
  activeFilePath: { type: String, default: '' },
  totalCodeLines: { type: Number, default: 0 },
  publishForm: { type: Object, required: true }
})

const emit = defineEmits(['select-file'])
</script>

<template>
  <aside class="side-stack">
    <section class="panel files-panel">
      <div class="panel-header compact">
        <h2>生成的文件（{{ generatedFiles.length }}）</h2>
        <span>{{ totalCodeLines }} 行</span>
      </div>
      <el-tree
        class="file-tree"
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
      <el-empty v-if="!generatedFiles.length" description="暂无文件" />
    </section>

    <section class="panel publish-panel">
      <div class="panel-header compact">
        <h2>发布信息</h2>
      </div>
      <div class="publish-form">
        <el-input v-model="publishForm.name" placeholder="插件名称" />
        <el-input v-model="publishForm.description" type="textarea" :rows="3" resize="none" placeholder="插件描述" />
        <div class="publish-row">
          <el-input v-model="publishForm.version" placeholder="版本号" />
          <el-switch v-model="publishForm.isPublic" active-text="公开" inactive-text="私有" />
        </div>
        <el-input v-model="publishForm.changelog" type="textarea" :rows="3" resize="none" placeholder="版本变更说明" />
      </div>
    </section>
  </aside>
</template>
