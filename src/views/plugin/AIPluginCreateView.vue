<script setup>
import { computed, ref, watch } from 'vue'
import {
  ArrowLeft,
  CopyDocument,
  Finished,
  FolderOpened,
  Loading,
  Setting
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useAIPluginCreate } from '../../composables/plugin/useAIPluginCreate'
import AIConversationPanel from './ai-create/AIConversationPanel.vue'
import AICodeFilesDialog from './ai-create/AICodeFilesDialog.vue'
import AIPublishSettingsDialog from './ai-create/AIPublishSettingsDialog.vue'
import './ai-create/AIPluginCreateView.css'

const vm = useAIPluginCreate()
const codeDialogVisible = ref(false)
const publishDialogVisible = ref(false)
const conversationPanelRef = ref(null)
const compileReviewFailedVisible = ref(false)

// review 未通过时自动弹窗
watch(() => vm.compileReviewFailed.value, value => {
  compileReviewFailedVisible.value = value != null
})

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

// 审核问题列表（统一转成数组）
const reviewIssues = computed(() => {
  const data = vm.compileReviewFailed.value
  if (Array.isArray(data)) return data
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
})

// severity → tag type 映射
const severityTagType = severity => {
  const s = String(severity || '').toLowerCase()
  if (s === 'high') return 'danger'
  if (s === 'medium') return 'warning'
  if (s === 'low') return 'info'
  return 'info'
}

// 复制审核内容（格式化文本）
const copyReviewContent = async () => {
  const text = reviewIssues.value
    .map((issue, index) => {
      const severity = (issue.severity || 'unknown').toUpperCase()
      const file = issue.file || ''
      const line = issue.line != null ? `:${issue.line}` : ''
      const message = issue.message || ''
      const suggestion = issue.suggestion || ''
      return `[${index + 1}] [${severity}] ${file}${line}\n问题: ${message}\n建议: ${suggestion}`
    })
    .join('\n\n')
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('已复制审核内容')
  } catch {
    ElMessage.error('复制失败')
  }
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
        <el-button :icon="Setting" :disabled="vm.compileLoading.value" @click="publishDialogVisible = true">发布设置</el-button>
        <el-button :icon="FolderOpened" :disabled="!vm.canViewCode.value || vm.compileLoading.value" :loading="vm.codeLoading.value" @click="handleViewCode">
          查看代码文件
        </el-button>
        <el-button
          type="primary"
          class="compile-button"
          :class="{ loading: vm.compileLoading.value }"
          :icon="vm.compileLoading.value ? Loading : Finished"
          :disabled="vm.generationLoading.value || vm.compileLoading.value"
          @click="vm.confirmCompile"
        >
          <span :key="vm.compileTextTick.value" class="compile-button-text">{{ vm.compileButtonText.value }}</span>
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
        :compile-loading="vm.compileLoading.value"
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
      :diff-file-tree="vm.diffFileTree.value"
      :active-diff-file="vm.activeDiffFile.value"
      :diff-stats="vm.diffStats.value"
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

    <el-dialog
      v-model="compileReviewFailedVisible"
      title="代码审核未通过"
      width="720px"
      align-center
    >
      <div class="review-issues-header">
        <span class="review-issues-summary">共 {{ reviewIssues.length }} 项问题</span>
        <el-button :icon="CopyDocument" size="small" @click="copyReviewContent">复制</el-button>
      </div>
      <div class="review-issues-list">
        <div v-for="(issue, index) in reviewIssues" :key="index" class="review-issue-card">
          <div class="review-issue-head">
            <el-tag :type="severityTagType(issue.severity)" size="small" effect="dark">
              {{ (issue.severity || 'unknown').toUpperCase() }}
            </el-tag>
            <span class="review-issue-location">{{ issue.file }}{{ issue.line != null ? ':' + issue.line : '' }}</span>
          </div>
          <div class="review-issue-message">{{ issue.message }}</div>
          <div v-if="issue.suggestion" class="review-issue-suggestion">
            <span class="review-issue-suggestion-label">建议</span>
            <span class="review-issue-suggestion-text">{{ issue.suggestion }}</span>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button type="primary" @click="compileReviewFailedVisible = false">知道了</el-button>
      </template>
    </el-dialog>
  </div>
</template>
