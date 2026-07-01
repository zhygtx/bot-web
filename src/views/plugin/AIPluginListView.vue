<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ChatLineRound, Clock, MagicStick, Plus, Refresh, Tickets } from '@element-plus/icons-vue'
import request from '../../utils/request'

const router = useRouter()

const conversations = ref([])
const loading = ref(false)
const pageNum = ref(1)
const pageSize = ref(10)

const total = computed(() => {
  const loadedTotal = (pageNum.value - 1) * pageSize.value + conversations.value.length
  return conversations.value.length === pageSize.value ? loadedTotal + 1 : loadedTotal
})

const loadConversations = async () => {
  loading.value = true
  try {
    const response = await request({
      url: '/ai-plugin/list',
      method: 'get',
      params: {
        pageNum: pageNum.value,
        pageSize: pageSize.value
      },
      timeout: 30000
    })
    conversations.value = Array.isArray(response.data) ? response.data : []
  } finally {
    loading.value = false
  }
}

const openConversation = conversation => {
  if (!conversation.conversationId) return
  router.push({
    path: '/plugin/ai-create',
    query: { conversationId: conversation.conversationId }
  })
}

const createConversation = () => {
  router.push('/plugin/ai-create')
}

const handlePageChange = page => {
  pageNum.value = page
  loadConversations()
}

const handleSizeChange = size => {
  pageSize.value = size
  pageNum.value = 1
  loadConversations()
}

const formatStatus = status => {
  const map = {
    DRAFT: { label: '历史草稿', type: 'info' },
    CURRENT: { label: '当前版本', type: 'success' },
    PUBLISHED: { label: '已发布', type: 'primary' }
  }
  return map[status] || { label: status || '未知', type: 'info' }
}

const formatTime = value => {
  if (!value) return '未知'
  return String(value).replace('T', ' ')
}

const shortId = value => {
  if (!value) return '未生成'
  return value.length > 18 ? `${value.slice(0, 8)}...${value.slice(-6)}` : value
}

onMounted(loadConversations)
</script>

<template>
  <div class="ai-list-page">
    <div class="ai-list-toolbar">
      <div class="toolbar-title">
        <el-icon><MagicStick /></el-icon>
        <span>AI 生成插件</span>
      </div>
      <div class="toolbar-actions">
        <el-button :icon="Refresh" :loading="loading" @click="loadConversations">刷新</el-button>
        <el-button type="primary" :icon="Plus" @click="createConversation">新建生成</el-button>
      </div>
    </div>

    <div class="ai-list-content" v-loading="loading" element-loading-text="加载中...">
      <el-row :gutter="16">
        <el-col
          v-for="conversation in conversations"
          :key="conversation.conversationId"
          :xs="24"
          :sm="12"
          :lg="8"
          :xl="6"
        >
          <el-card class="conversation-card" @click="openConversation(conversation)">
            <div class="card-header">
              <div class="card-title">
                <el-icon><ChatLineRound /></el-icon>
                <strong>{{ conversation.pluginName || '未发布插件' }}</strong>
              </div>
              <el-tag :type="formatStatus(conversation.status).type" effect="plain">
                {{ formatStatus(conversation.status).label }}
              </el-tag>
            </div>

            <div class="card-meta">
              <div>
                <span>会话</span>
                <code>{{ shortId(conversation.conversationId) }}</code>
              </div>
              <div>
                <span>插件</span>
                <code>{{ shortId(conversation.pluginId) }}</code>
              </div>
            </div>

            <div class="card-footer">
              <span>
                <el-icon><Tickets /></el-icon>
                {{ conversation.pluginId ? '关联插件' : '新建草稿' }}
              </span>
              <span>
                <el-icon><Clock /></el-icon>
                {{ formatTime(conversation.updateTime || conversation.createTime) }}
              </span>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <el-empty v-if="!loading && conversations.length === 0" description="暂无 AI 生成记录">
        <el-button type="primary" :icon="Plus" @click="createConversation">新建生成</el-button>
      </el-empty>
    </div>

    <div class="pagination" v-if="total > 0">
      <el-pagination
        v-model:current-page="pageNum"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 30]"
        layout="sizes, prev, pager, next"
        :total="total"
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </div>
  </div>
</template>

<style scoped>
.ai-list-page {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.ai-list-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px;
  margin-bottom: 20px;
  background: var(--app-panel-bg);
  border: 1px solid var(--app-border-soft);
  border-radius: 8px;
  flex-wrap: wrap;
}

.toolbar-title,
.toolbar-actions,
.card-title,
.card-footer span {
  display: flex;
  align-items: center;
}

.toolbar-title {
  gap: 8px;
  font-size: 16px;
  font-weight: 700;
  color: var(--app-text);
}

.toolbar-actions {
  gap: 10px;
}

.ai-list-content {
  flex: 1;
  min-height: 260px;
  overflow-y: auto;
  overflow-x: hidden;
}

.conversation-card {
  height: 220px;
  margin-bottom: 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.conversation-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.12);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 18px;
}

.card-title {
  min-width: 0;
  gap: 8px;
  color: var(--app-text);
}

.card-title strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 16px;
}

.card-meta {
  display: grid;
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--app-border-soft);
  border-radius: 8px;
  background: var(--app-bg-muted);
}

.card-meta div {
  display: grid;
  grid-template-columns: 42px 1fr;
  gap: 8px;
  align-items: center;
}

.card-meta span,
.card-footer {
  color: var(--app-text-muted);
  font-size: 12px;
}

.card-meta code {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: Consolas, Monaco, monospace;
  color: var(--app-text-soft);
}

.card-footer {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 18px;
}

.card-footer span {
  min-width: 0;
  gap: 5px;
}

.card-footer span:last-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pagination {
  display: flex;
  justify-content: center;
  padding-top: 18px;
}
</style>
