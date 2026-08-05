<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { ChatLineRound, Clock, Delete, MagicStick, Plus, Refresh } from '@element-plus/icons-vue'
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

const deleteConversation = async (conversationId) => {
  try {
    await ElMessageBox.confirm('确定要删除这个会话吗？删除后无法恢复。', '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await request({
      url: '/ai-plugin',
      method: 'delete',
      params: { conversationId }
    })

    loadConversations()
  } catch (error) {
    // 用户取消（ElMessageBox 抛出 'cancel'），静默处理
    // 其他错误已由 request.js 响应拦截器统一提示
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

const parseLastCode = conversation => {
  try {
    if (!conversation.lastCode) return {}
    return JSON.parse(conversation.lastCode)
  } catch {
    return {}
  }
}

const formatStatus = status => {
  const map = {
    DRAFT: { label: '草稿', type: 'info' },
    CURRENT: { label: '当前版本', type: 'success' },
    PUBLISHED: { label: '已发布', type: 'primary' },
    PUBLISHED_DRAFT: { label: '已发布·有更新', type: 'warning' }
  }
  return map[status] || { label: status || '未知', type: 'info' }
}

const formatTime = value => {
  if (!value) return '未知'
  return String(value).replace('T', ' ')
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
            <div class="delete-icon-container">
              <el-icon class="delete-icon" @click.stop="deleteConversation(conversation.conversationId)">
                <Delete />
              </el-icon>
            </div>
            <div class="card-header">
              <div class="card-title">
                <el-icon><ChatLineRound /></el-icon>
                <strong>{{ parseLastCode(conversation).pluginName || '未发布插件' }}</strong>
              </div>
              <el-tag :type="formatStatus(conversation.status).type" effect="plain">
                {{ formatStatus(conversation.status).label }}
              </el-tag>
            </div>

            <div class="card-description">
              {{ parseLastCode(conversation).pluginDescription || '暂无描述' }}
            </div>

            <div class="card-footer">
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

