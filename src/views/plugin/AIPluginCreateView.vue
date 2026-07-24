<script setup>
import { ref } from 'vue'
import {
  ArrowLeft,
  Finished,
  FolderOpened,
  Setting
} from '@element-plus/icons-vue'
import { useAIPluginCreate } from '../../composables/plugin/useAIPluginCreate'
import AIConversationPanel from './ai-create/AIConversationPanel.vue'
import AICodeFilesDialog from './ai-create/AICodeFilesDialog.vue'
import AIPublishSettingsDialog from './ai-create/AIPublishSettingsDialog.vue'
import './ai-create/AIPluginCreateView.css'

const vm = useAIPluginCreate()
const codeDialogVisible = ref(false)
const publishDialogVisible = ref(false)
const conversationPanelRef = ref(null)

// 将子组件的 chatScrollRef 同步到 composable
const syncScrollRef = () => {
  if (conversationPanelRef.value?.chatScrollRef) {
    vm.chatScrollRef.value = conversationPanelRef.value.chatScrollRef
  }
}

// 点击"查看代码文件"：先按最后一条消息 ID 查询代码，再打开弹窗
const handleViewCode = async () => {
  const ok = await vm.openCodeDialog()
  if (ok) codeDialogVisible.value = true
}

// 更新发布配置：调用接口成功后关闭弹窗
const handlePublishConfirm = async () => {
  const ok = await vm.updatePublishSettings()
  if (ok) publishDialogVisible.value = false
}

// 取消：直接关闭弹窗
const handlePublishCancel = () => {
  publishDialogVisible.value = false
}
</script>

<template>
  <div class="ai-plugin-page" v-loading="vm.historyLoading.value">
    <header class="ai-workbench-topbar">
      <div class="title-cluster">
        <el-button :icon="ArrowLeft" text class="icon-btn" @click="vm.goBack" />
        <div>
          <h1>AI 写插件</h1>
          <span>{{ vm.isUpdateMode.value ? '更新已有插件' : '生成新的工作流插件' }}</span>
        </div>
      </div>

      <div class="topbar-actions">
        <el-button :icon="Setting" @click="publishDialogVisible = true">发布设置</el-button>
        <el-button :icon="FolderOpened" :disabled="!vm.canViewCode.value" :loading="vm.codeLoading.value" @click="handleViewCode">
          查看代码文件
        </el-button>
        <el-button
          type="primary"
          :icon="Finished"
          :disabled="vm.generationLoading.value"
          @click="vm.confirmCompile"
        >
          编译并发布 TODO
        </el-button>
      </div>
    </header>

    <main class="ai-workbench-main">
      <AIConversationPanel
        ref="conversationPanelRef"
        :chat-messages="vm.chatMessages.value"
        :chat-input="vm.chatInput.value"
        :conversation-id="vm.conversationId.value"
        :generation-loading="vm.generationLoading.value"
        :current-round="vm.currentRound.value"
        @vue:mounted="syncScrollRef"
        @update:chat-input="vm.chatInput.value = $event"
        @send="vm.sendPrompt"
        @cancel="vm.cancelGeneration"
        @undo="vm.undoToBeforeRound"
      />
    </main>

    <AICodeFilesDialog
      v-model="codeDialogVisible"
      :files="vm.visibleFiles.value"
      :file-tree="vm.fileTree.value"
      :active-file-path="vm.activeFilePath.value"
      :active-file="vm.activeFile.value"
      @select-file="vm.selectTreeNode"
      @copy="vm.copyCurrentCode"
      @update-file-content="vm.updateFileContent"
    />

    <AIPublishSettingsDialog
      v-model="publishDialogVisible"
      :publish-form="vm.publishForm.value"
      :saving="vm.publishSaving.value"
      @confirm="handlePublishConfirm"
      @cancel="handlePublishCancel"
    />
  </div>
</template>
