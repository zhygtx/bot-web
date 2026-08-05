<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElDialog, ElMessageBox, ElInput, ElSelect, ElOption, ElButton, ElIcon } from 'element-plus'
import { User, Clock, Lock, Unlock, Delete, Filter, Search, Refresh } from '@element-plus/icons-vue'
import request from '../../utils/request'
import { PluginInfo } from '../../models'
import PluginCreateView from './PluginCreateView.vue'

const router = useRouter()

const plugins = ref([])
const loading = ref(false)
const pageNum = ref(1)
const pageSize = ref(12)
const total = ref(0)
const dialogVisible = ref(false)
const currentPluginId = ref(null)

// 多条件筛选
const filters = ref({
  content: '',
  isPublic: 'all'
})

const loadPlugins = async () => {
  loading.value = true
  try {
    const params = {
      pageNum: pageNum.value,
      pageSize: pageSize.value,
      authorId: localStorage.getItem('userId') || ''
    }
    if (filters.value.content) {
      params.content = filters.value.content
    }
    if (filters.value.isPublic === 'true' || filters.value.isPublic === 'false') {
      params.isPublic = filters.value.isPublic === 'true'
    }
    const response = await request({
      url: '/plugin/findPlugins',
      method: 'get',
      params
    })
    if (response.code === 200) {
      plugins.value = (response.data.list || []).map(plugin => new PluginInfo(plugin))
      total.value = response.data.total || 0
    }
  } catch (error) {
    console.error('Error:', error)
  } finally {
    loading.value = false
  }
}

const resetFilters = () => {
  filters.value = { content: '', isPublic: 'all' }
  pageNum.value = 1
  loadPlugins()
}

const handleSearch = () => {
  pageNum.value = 1
  loadPlugins()
}

const goToCreate = () => {
  currentPluginId.value = null
  dialogVisible.value = true
}

const goToDetail = (pluginId, pluginVersionId) => {
  router.push(`/plugin/${pluginId}?versionId=${pluginVersionId}`)
}

const closeDialog = () => {
  dialogVisible.value = false
}

const handleDialogClose = () => {
  loadPlugins()
}

const getTimeAgo = (updateTime) => {
  if (!updateTime) return '未知'
  
  const now = new Date()
  const updateDate = new Date(updateTime)
  const diffTime = Math.abs(now - updateDate)
  
  const diffSeconds = Math.floor(diffTime / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)
  
  if (diffHours < 1) {
    return `${diffMinutes}分钟前`
  } else if (diffHours < 24) {
    return `${diffHours}小时前`
  } else if (diffDays === 1) {
    return '昨天'
  } else if (diffDays < 7) {
    return `${diffDays}天前`
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7)
    return `${weeks}周前`
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30)
    return `${months}个月前`
  } else {
    const years = Math.floor(diffDays / 365)
    return `${years}年前`
  }
}

const handlePageChange = (currentPage) => {
  pageNum.value = currentPage
  loadPlugins()
}

const deletePlugin = async (pluginId) => {
  try {
    await ElMessageBox.confirm('确定要删除这个插件吗？删除后无法恢复。', '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await request({
      url: '/plugin',
      method: 'delete',
      params: {
        id: pluginId
      }
    })
    
    loadPlugins()
  } catch (error) {
    // 用户取消（ElMessageBox 抛出 'cancel'），静默处理
    // 其他错误已由 request.js 响应拦截器统一提示
  }
}

const togglePluginPublic = async (plugin) => {
  try {
    await request({
      url: '/plugin/editPublic',
      method: 'put',
      params: {
        id: plugin.id,
        isPublic: !plugin.isPublic
      }
    })
    
    plugin.isPublic = !plugin.isPublic
  } catch (error) {
    // 错误已由 request.js 响应拦截器统一提示
  }
}

onMounted(() => {
  loadPlugins()
})
</script>

<template>
  <div class="plugin-view">
    <div class="filter-section">
      <div class="filter-item">
        <el-input
          v-model="filters.content"
          placeholder="搜索插件名称或描述"
          class="filter-input"
          @keyup.enter="handleSearch"
        >
          <template #prefix>
            <el-icon class="filter-icon"><Filter /></el-icon>
          </template>
        </el-input>
      </div>
      <div class="filter-item">
        <el-select v-model="filters.isPublic" placeholder="全部" class="filter-select" @change="handleSearch">
          <el-option label="全部" value="all" />
          <el-option label="公开" value="true" />
          <el-option label="私有" value="false" />
        </el-select>
      </div>
      <div class="filter-item filter-actions">
        <el-button :icon="Search" type="primary" @click="handleSearch">搜索</el-button>
        <el-button :icon="Refresh" @click="resetFilters">重置</el-button>
      </div>
      <div class="filter-spacer"></div>
      <div class="filter-item">
        <el-button type="primary" @click="goToCreate">新建插件</el-button>
      </div>
    </div>
    
    <div class="plugin-content">
      <div v-loading="loading" element-loading-text="加载中..." class="content-wrapper">
        <el-row :gutter="20" :justify="'start'">
          <el-col :xs="24" :sm="12" :md="8" :lg="6" :xl="6" v-for="plugin in plugins" :key="plugin.id">
            <el-card class="plugin-item-card" @click="goToDetail(plugin.id, plugin.pluginVersionList?.[0]?.id)">
              <div class="plugin-card-content">
                <div class="plugin-card-header">
                  <h3 class="plugin-name">{{ plugin.name }}</h3>
                  <div class="plugin-status">
                    <el-icon 
                      v-if="plugin.isPublic" 
                      class="lock-icon public-lock"
                      @click.stop="togglePluginPublic(plugin)"
                      title="点击设为私有"
                    >
                      <Unlock />
                    </el-icon>
                    <el-icon 
                      v-else 
                      class="lock-icon private-lock"
                      @click.stop="togglePluginPublic(plugin)"
                      title="点击设为公开"
                    >
                      <Lock />
                    </el-icon>
                  </div>
                </div>
                <div class="delete-icon-container">
                  <el-icon class="delete-icon" @click.stop="deletePlugin(plugin.id)">
                    <Delete />
                  </el-icon>
                </div>
                <div class="plugin-card-version">
                  {{ plugin.latestVersion }}
                </div>
                <div class="plugin-card-description">
                  {{ plugin.description || '暂无描述' }}
                </div>
                <div class="plugin-card-footer">
                  <div class="plugin-card-author">
                    <el-icon class="footer-icon"><User /></el-icon>
                    <span>{{ plugin.authorName || '未知' }}</span>
                  </div>
                  <div class="plugin-card-time">
                    <el-icon class="footer-icon"><Clock /></el-icon>
                    <span>{{ getTimeAgo(plugin.updateTime) }}</span>
                  </div>
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>
        
        <el-empty v-if="plugins.length === 0 && !loading" description="暂无插件" />
        
        <div class="pagination" v-if="total > 0">
          <el-pagination
            v-model:current-page="pageNum"
            v-model:page-size="pageSize"
            :page-sizes="[6, 12, 24]"
            layout="prev, pager, next"
            :total="total"
            @size-change="loadPlugins"
            @current-change="handlePageChange"
          />
        </div>
      </div>
    </div>
    
    <el-dialog
      v-model="dialogVisible"
      :title="currentPluginId ? '编辑插件' : '新建插件'"
      width="800px"
      @close="handleDialogClose"
    >
      <PluginCreateView 
        :plugin-id="currentPluginId"
        @close="closeDialog"
      />
    </el-dialog>
  </div>
</template>

