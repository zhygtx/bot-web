<script setup>
import { nextTick, ref, watch } from 'vue'
import { CircleCheck, CopyDocument, Warning } from '@element-plus/icons-vue'

const props = defineProps({
  activeTab: { type: String, required: true },
  activeFile: { type: Object, default: null },
  selectedFileName: { type: String, default: '未选择文件' },
  codeLineCount: { type: Number, default: 0 },
  diffLines: { type: Array, default: () => [] },
  reviewVisible: { type: Boolean, default: false },
  reviewResult: { type: Object, default: null },
  reviewIssues: { type: Array, default: () => [] },
  reviewPassed: { type: Boolean, default: true },
  highlightLine: { type: Function, required: true }
})

const emit = defineEmits(['update:activeTab', 'copy'])
const codeScrollRef = ref(null)

const scrollCodeToBottom = async () => {
  await nextTick()
  const wrap = codeScrollRef.value?.wrapRef
  if (wrap) wrap.scrollTop = wrap.scrollHeight
}

watch(
  () => [props.activeTab, props.activeFile?.filePath, props.activeFile?.content?.length],
  () => {
    if (props.activeTab === 'code') scrollCodeToBottom()
  },
  { flush: 'post' }
)
</script>

<template>
  <main class="panel code-panel">
    <div class="code-header">
      <el-tabs :model-value="activeTab" class="preview-tabs" @update:model-value="emit('update:activeTab', $event)">
        <el-tab-pane label="代码预览" name="code" />
        <el-tab-pane label="代码变更" name="diff" />
        <el-tab-pane v-if="reviewVisible && reviewResult" label="审查结果" name="review" />
      </el-tabs>
      <div class="code-tools">
        <span v-if="activeFile" class="file-path">{{ activeFile.filePath }}</span>
        <el-button :icon="CopyDocument" text :disabled="!activeFile" @click="emit('copy')" />
      </div>
    </div>

    <div v-if="activeTab === 'code'" class="code-body">
      <div v-if="activeFile" class="code-window">
        <div class="code-window-title">
          <span>{{ selectedFileName }}</span>
          <span>共 {{ codeLineCount }} 行</span>
        </div>
        <el-scrollbar ref="codeScrollRef" class="code-scroll">
          <div class="code-line" v-for="(line, index) in activeFile.content.split('\n')" :key="index">
            <span class="line-number">{{ index + 1 }}</span>
            <pre><span
              v-for="(token, tokenIndex) in highlightLine(line)"
              :key="tokenIndex"
              :class="`token-${token.type}`"
            >{{ token.text }}</span></pre>
          </div>
        </el-scrollbar>
      </div>
      <el-empty v-else description="暂无代码" />
    </div>

    <div v-else-if="activeTab === 'diff'" class="code-body">
      <div v-if="activeFile" class="code-window">
        <div class="code-window-title">
          <span>{{ selectedFileName }}</span>
          <span>与上一轮比较</span>
        </div>
        <el-scrollbar class="code-scroll">
          <div v-for="line in diffLines" :key="line.id" class="diff-line" :class="line.type">
            <pre>{{ line.text }}</pre>
          </div>
        </el-scrollbar>
      </div>
      <el-empty v-else description="暂无变更" />
    </div>

    <div v-else class="review-body">
      <div class="review-summary" :class="{ passed: reviewPassed, failed: !reviewPassed }">
        <el-icon><CircleCheck v-if="reviewPassed" /><Warning v-else /></el-icon>
        <div>
          <h3>{{ reviewResult?.summary || '审查完成' }}</h3>
          <p>{{ reviewIssues.length ? `发现 ${reviewIssues.length} 个问题` : '当前没有问题列表' }}</p>
        </div>
      </div>
      <div v-if="reviewIssues.length" class="issue-list">
        <div v-for="(issue, index) in reviewIssues" :key="index" class="issue-item">
          <el-tag :type="issue.severity === 'high' ? 'danger' : issue.severity === 'medium' ? 'warning' : 'info'" size="small">
            {{ issue.severity || 'low' }}
          </el-tag>
          <div>
            <strong>{{ issue.file }}{{ issue.line ? `:${issue.line}` : '' }}</strong>
            <p>{{ issue.message }}</p>
            <span>{{ issue.suggestion }}</span>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>
