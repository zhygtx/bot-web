<script setup>
import { ArrowLeft, Collection, Delete, Right, UploadFilled } from '@element-plus/icons-vue'
import { useAIPluginCreate } from '../../composables/plugin/useAIPluginCreate'
import AIConversationPanel from './ai-create/AIConversationPanel.vue'
import AICodePanel from './ai-create/AICodePanel.vue'
import AISidePanel from './ai-create/AISidePanel.vue'
import './ai-create/AIPluginCreateView.css'

const vm = useAIPluginCreate()
</script>

<template>
  <div class="ai-plugin-page" v-loading="vm.historyLoading.value">
    <div class="ai-topbar">
      <div class="breadcrumb-title">
        <el-button :icon="ArrowLeft" text class="back-btn" @click="vm.goBack" />
        <span>AI 自动生成插件</span>
        <el-icon><Right /></el-icon>
        <strong>{{ vm.isUpdateMode.value ? '更新插件' : '新建插件' }}</strong>
      </div>
      <div class="topbar-actions">
        <el-tag v-if="vm.reviewBadge.value" :type="vm.reviewBadge.value.type" effect="plain">
          {{ vm.reviewBadge.value.text }}
        </el-tag>
        <el-button :icon="Delete" @click="vm.deleteDraft">删除草稿</el-button>
        <el-button :icon="Collection" :disabled="!vm.hasGeneratedCode.value" @click="vm.saveDraftManually">保存草稿</el-button>
        <el-button
          type="primary"
          :icon="UploadFilled"
          :disabled="!vm.canCompile.value"
          :loading="vm.compileLoading.value"
          class="compile-button"
          @click="vm.confirmCompile"
        >
          <span class="compile-label" :class="{ rolling: vm.compileLoading.value }">
            {{ vm.compileButtonText.value }}
          </span>
        </el-button>
      </div>
    </div>

    <div class="workspace-grid">
      <AIConversationPanel
        v-model:chat-scroll-ref="vm.chatScrollRef.value"
        :chat-messages="vm.chatMessages.value"
        :chat-input="vm.chatInput.value"
        :conversation-id="vm.conversationId.value"
        :short-conversation-id="vm.shortConversationId.value"
        :generation-loading="vm.generationLoading.value"
        :current-round="vm.currentRound.value"
        @update:chat-input="vm.chatInput.value = $event"
        @send="vm.sendPrompt"
        @undo="vm.undoToBeforeRound"
        @delete-round="vm.deleteFromRound"
        @regenerate="vm.regenerateRound"
      />

      <AICodePanel
        :active-tab="vm.activeTab.value"
        :active-file="vm.activeFile.value"
        :selected-file-name="vm.selectedFileName.value"
        :code-line-count="vm.codeLineCount.value"
        :diff-lines="vm.diffLines.value"
        :review-visible="vm.reviewVisible.value"
        :review-result="vm.reviewResult.value"
        :review-issues="vm.reviewIssues.value"
        :review-passed="vm.reviewPassed.value"
        :highlight-line="vm.highlightLine"
        @update:active-tab="vm.activeTab.value = $event"
        @copy="vm.copyCurrentCode"
      />

      <AISidePanel
        :generated-files="vm.generatedFiles.value"
        :file-tree="vm.fileTree.value"
        :active-file-path="vm.activeFilePath.value"
        :total-code-lines="vm.totalCodeLines.value"
        :publish-form="vm.publishForm.value"
        @select-file="vm.selectTreeNode"
      />
    </div>
  </div>
</template>
