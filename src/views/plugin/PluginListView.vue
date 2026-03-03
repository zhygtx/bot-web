<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElDialog, ElMessageBox } from 'element-plus'
import { User, Clock, Lock, Unlock, Delete } from '@element-plus/icons-vue'
import request from '../../utils/request'
import { PluginInfo } from '../../models'
import PluginCreateView from './PluginCreateView.vue'

const router = useRouter()

// 插件列表
const plugins = ref([])
// 加载状态
const loading = ref(false)
// 分页参数
const pageNum = ref(1)
const pageSize = ref(12)
const total = ref(0)
// 弹窗状态
const dialogVisible = ref(false)
const currentPluginId = ref(null)

// 加载插件列表
const loadPlugins = async () => {
  loading.value = true
  try {
    const response = await request({
      url: '/plugin/findByAuthorId',
      method: 'get',
      params: {
        pageNum: pageNum.value,
        pageSize: pageSize.value
      }
    })
    if (response.code === 200) {
      plugins.value = (response.data.list || []).map(plugin => new PluginInfo(plugin))
      total.value = response.data.total || 0
    } else {
      ElMessage.error(response.message || '加载插件失败')
    }
  } catch (error) {
    ElMessage.error('加载插件失败')
  } finally {
    loading.value = false
  }
}

// 打开新建插件弹窗
const goToCreate = () => {
  currentPluginId.value = null
  dialogVisible.value = true
}

// 跳转到插件详情页
const goToDetail = (pluginId) => {
  router.push(`/plugin/detail/${pluginId}`)
}

// 打开编辑插件弹窗
const goToEdit = (pluginId) => {
  currentPluginId.value = pluginId
  dialogVisible.value = true
}

// 关闭弹窗
const closeDialog = () => {
  dialogVisible.value = false
}

// 弹窗关闭后重新加载插件列表
const handleDialogClose = () => {
  loadPlugins()
}

// 计算上次更新时间距今的天数
const getTimeAgo = (updateTime) => {
  if (!updateTime) return '未知'
  
  const now = new Date()
  const updateDate = new Date(updateTime)
  const diffTime = Math.abs(now - updateDate)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) {
    return '今天'
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

// 分页处理
const handlePageChange = (currentPage) => {
  pageNum.value = currentPage
  loadPlugins()
}

// 删除插件
const deletePlugin = async (pluginId) => {
  try {
    await ElMessageBox.confirm('确定要删除这个插件吗？删除后无法恢复。', '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    const response = await request({
      url: '/plugin',
      method: 'delete',
      params: {
        id: pluginId
      }
    })
    
    if (response.code === 200) {
      ElMessage.success('删除插件成功')
      loadPlugins()
    } else {
      ElMessage.error(response.message || '删除插件失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除插件失败')
    }
  }
}

// 切换插件公开状态
const togglePluginPublic = async (plugin) => {
  try {
    const response = await request({
      url: '/plugin/editPublic',
      method: 'put',
      params: {
        id: plugin.id,
        isPublic: !plugin.isPublic
      }
    })
    
    if (response.code === 200) {
      // 直接更新本地插件状态，无需重新加载整个列表
      plugin.isPublic = !plugin.isPublic
      ElMessage.success(plugin.isPublic ? '插件已设置为公开' : '插件已设置为私有')
    } else {
      ElMessage.error(response.message || '修改插件公开状态失败')
    }
  } catch (error) {
    ElMessage.error('修改插件公开状态失败')
  }
}

// 初始化加载
onMounted(() => {
  loadPlugins()
})
</script>

<template>
  <div class="plugin-view">
    <el-card class="plugin-card">
      <template #header>
        <div class="card-header">
          <h2>插件管理</h2>
          <div class="card-actions">
            <el-button type="primary" @click="goToCreate">新建插件</el-button>
          </div>
        </div>
      </template>
      
      <div class="plugin-content">
        <el-row :gutter="20" type="flex" justify="space-between">
          <el-col :xs="24" :sm="12" :md="8" :lg="6" :xl="6" v-for="plugin in plugins" :key="plugin.id">
            <el-card class="plugin-item-card" @click="goToDetail(plugin.id)">
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
                  {{ plugin.description }}
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
        
        <!-- 空状态 -->
        <el-empty v-if="plugins.length === 0 && !loading" description="暂无插件" />
        
        <!-- 加载状态 -->
        <el-loading v-if="loading" fullscreen text="加载中..." />
        
        <!-- 分页 -->
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
    </el-card>
    
    <!-- 插件创建/编辑弹窗 -->
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

<style scoped>
.plugin-view {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  margin-bottom: 20px;
}

.card-header h2 {
  font-size: 24px;
  margin: 0;
  color: #303133;
  font-weight: bold;
}

.plugin-content {
  flex: 1;
  padding: 0 20px 20px;
  overflow-y: auto;
}

.plugin-item-card {
  margin-bottom: 20px;
  height: 320px; /* 固定高度，确保长宽比一致 */
  border: 1px solid #e6e6e6;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); /* 添加阴影效果 */
  transition: all 0.3s ease;
  cursor: pointer;
  overflow: hidden;
  position: relative; /* 添加相对定位，使删除图标容器的绝对定位相对于卡片 */
}

.plugin-item-card:hover {
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15); /* 增强hover时的阴影效果 */
  transform: translateY(-2px);
}

.plugin-card-content {
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.plugin-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.plugin-name {
  margin: 0;
  font-size: 18px;
  font-weight: bold;
  color: #303133;
  flex: 1;
  margin-right: 10px;
}

.plugin-status {
  flex-shrink: 0;
}

.lock-icon {
  font-size: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.lock-icon:hover {
  transform: scale(1.1);
}

.public-lock {
  color: #67c23a; /* 浅绿色 */
}

.private-lock {
  color: #f56c6c; /* 浅红色 */
}

.delete-icon-container {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 10;
}

.delete-icon {
  font-size: 28px;
  color: #f56c6c;
  cursor: pointer;
  transition: all 0.3s ease;
  opacity: 0;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  padding: 6px;
  box-shadow: 0 0px 0px rgba(0, 0, 0, 0.15);
}

.plugin-item-card:hover .delete-icon {
  opacity: 1;
}

.delete-icon:hover {
  color: #f56c6c;
  transform: scale(1.15);
  background-color: rgba(245, 108, 108, 0.15);
  box-shadow: 0 4px 12px rgba(245, 108, 108, 0.2);
}

.plugin-card-version {
  font-size: 14px;
  color: #606266;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e6e6e6;
}

.plugin-card-description {
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e6e6e6;
  flex: 1;
  overflow: hidden;
}

.plugin-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #909399;
  margin-top: auto;
}

.plugin-card-author,
.plugin-card-time {
  display: flex;
  align-items: center;
}

.footer-icon {
  font-size: 14px;
  margin-right: 4px;
}

.pagination {
  margin-top: 30px;
  display: flex;
  justify-content: center;
}

/* 自定义分页样式 */
:deep(.el-pagination .el-pager li.active) {
  background-color: #409eff;
  color: white;
}

:deep(.el-pagination .el-pager li:hover:not(.disabled)) {
  color: #409eff;
}
</style>