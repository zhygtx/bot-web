<script setup>
import { ref, reactive, computed, onMounted } from "vue"
import { useRouter } from "vue-router"
import { ElMessage, ElMessageBox } from "element-plus"
import { Edit, Delete, Plus, User, Cpu, Monitor, CopyDocument } from "@element-plus/icons-vue"
import request from "../../utils/request"

const router = useRouter()

const loading = ref(false)

const userInfo = ref({ account: "", name: "", email: "" })
const botInfo = ref({ id: "", name: "", botQQ: null, isOnline: false, token: "", pathSuffix: "" })
const containerInfo = ref({ port: null, token: "" })
const currentHost = ref("localhost")

const hasBot = computed(() => !!botInfo.value.id)
const hasDocker = computed(() => !!containerInfo.value.port)

const botDialogVisible = ref(false)
const botDialogTitle = computed(() => botInfo.value.id ? "编辑机器人信息" : "添加机器人信息")
const botForm = reactive({ botQQ: null })
const botFormRef = ref(null)
const botRules = {
  botQQ: [
    { required: true, message: "请输入机器人QQ", trigger: "blur" },
    { pattern: /^[0-9]+$/, message: "机器人QQ必须是数字", trigger: "blur" }
  ]
}

const dockerDialogVisible = ref(false)
const dockerCreateLoading = ref(false)
const dockerForm = reactive({ napcatToken: "" })
const dockerFormRef = ref(null)
const dockerRules = {
  napcatToken: [
    { required: true, message: "请输入napcat token", trigger: "blur" },
    { min: 10, message: "token长度不能少于10个字符", trigger: "blur" }
  ]
}

onMounted(() => {
  if (typeof window !== "undefined") {
    currentHost.value = window.location.hostname || "localhost"
  }
  loadAll()
})

const loadAll = async () => {
  loading.value = true
  await Promise.all([getUserInfo(), getBotInfo(), getContainerInfo()])
  loading.value = false
}

const getUserInfo = async () => {
  try {
    const response = await request({ url: "/user/info", method: "get" })
    if (response.data) {
      userInfo.value = {
        account: response.data.account || "",
        name: response.data.name || "",
        email: response.data.email || ""
      }
    }
  } catch (e) { console.error("获取用户信息失败:", e) }
}

const getBotInfo = async () => {
  try {
    const response = await request({ url: "/bot", method: "get" })
    const data = response.data || {}
    botInfo.value = {
      id: data.id || "",
      name: data.name || "",
      botQQ: data.botQQ || null,
      isOnline: data.online || data.isOnline || false,
      token: data.token || "",
      pathSuffix: data.pathSuffix || ""
    }
  } catch (e) {
    console.error("获取机器人信息失败:", e)
    botInfo.value = { id: "", name: "", botQQ: null, isOnline: false, token: "", pathSuffix: "" }
  }
}

const getContainerInfo = async () => {
  try {
    const response = await request({ url: "/docker", method: "get" })
    if (response.data && response.data.port) {
      containerInfo.value = { port: response.data.port, token: response.data.token || "" }
    } else {
      containerInfo.value = { port: null, token: "" }
    }
  } catch (e) {
    console.error("获取容器信息失败:", e)
    containerInfo.value = { port: null, token: "" }
  }
}

const openBotDialog = () => {
  if (botInfo.value.id) {
    botForm.botQQ = botInfo.value.botQQ
  } else {
    botForm.botQQ = null
  }
  botDialogVisible.value = true
}

const submitBot = async () => {
  if (!botFormRef.value) return
  const valid = await botFormRef.value.validate()
  if (!valid) return

  try {
    if (botInfo.value.id) {
      await request({ url: "/bot", method: "put", data: { id: botInfo.value.id, name: botInfo.value.name || "", botQQ: botForm.botQQ } })
    } else {
      await request({ url: "/bot", method: "post", params: { name: botInfo.value.name || "", botQQ: botForm.botQQ } })
    }
    botDialogVisible.value = false
    await getBotInfo()
    await getContainerInfo()
  } catch (error) {
    throw error
  }
}

const deleteBot = async () => {
  if (hasDocker.value) {
    ElMessage.warning("请先删除Docker容器后再删除机器人信息")
    return
  }
  try {
    await ElMessageBox.confirm("确定要删除机器人信息吗？", "删除确认", {
      confirmButtonText: "确定", cancelButtonText: "取消", type: "warning"
    })
    await request({ url: "/bot", method: "delete", params: { botQQ: botInfo.value.botQQ } })
    localStorage.removeItem("botQQ")
    botInfo.value = { id: "", name: "", botQQ: null, isOnline: false, token: "", pathSuffix: "" }
    containerInfo.value = { port: null, token: "" }
  } catch (error) {
    if (error !== "cancel") {
      console.error("删除机器人信息失败:", error)
      throw error
    }
  }
}

const openDockerDialog = () => {
  dockerForm.napcatToken = ""
  dockerDialogVisible.value = true
}

const createContainer = async () => {
  if (!dockerFormRef.value) return
  const valid = await dockerFormRef.value.validate()
  if (!valid) return

  try {
    dockerCreateLoading.value = true
    const response = await request({
      url: "/docker", method: "post",
      params: { napcatToken: dockerForm.napcatToken, botQQ: botInfo.value.botQQ }
    })
    containerInfo.value.port = response.data
    containerInfo.value.token = dockerForm.napcatToken
    dockerDialogVisible.value = false
    dockerForm.napcatToken = ""
    await getContainerInfo()
  } catch (error) {
    console.error("创建容器失败:", error)
    throw error
  } finally {
    dockerCreateLoading.value = false
  }
}

const deleteContainer = async () => {
  try {
    await ElMessageBox.confirm("确定要删除该容器吗？", "提示", {
      confirmButtonText: "确定", cancelButtonText: "取消", type: "warning"
    })
    await request({ url: "/docker", method: "delete", params: { botQQ: botInfo.value.botQQ }, timeout: 30000 })
    containerInfo.value = { port: null, token: "" }
  } catch (error) {
    if (error !== "cancel") {
      console.error("删除容器失败:", error)
      throw error
    }
  } finally {
    await getContainerInfo()
  }
}

const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success("已复制到剪贴板")
  } catch {
    ElMessage.error("复制失败")
  }
}

const handleLogout = async () => {
  try {
    await ElMessageBox.confirm("确定要退出登录吗？", "退出确认", {
      confirmButtonText: "确定", cancelButtonText: "取消", type: "warning"
    })
    await request({ url: "/user/logout", method: "post", params: { userId: userInfo.account } })
    localStorage.removeItem("token")
    router.push("/login")
  } catch (error) {
    if (error !== "cancel") {
      console.error("退出登录失败:", error)
    }
  }
}
</script>

<template>
  <div class="settings-view" v-loading="loading" element-loading-text="加载中...">
    <div class="settings-cards">
      <!-- 卡片1: 个人信息 -->
      <el-card class="settings-card">
        <template #header>
          <div class="card-header">
            <div class="card-title">
              <el-icon class="card-icon"><User /></el-icon>
              <span>个人信息</span>
            </div>
            <div class="card-actions">
              <el-button type="danger" size="small" @click="handleLogout">退出登录</el-button>
            </div>
          </div>
        </template>
        <div class="card-body">
          <div class="info-row">
            <span class="info-label">账号</span>
            <span class="info-value">{{ userInfo.account || "-" }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">用户名</span>
            <span class="info-value">{{ userInfo.name || "-" }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">邮箱</span>
            <span class="info-value">{{ userInfo.email || "-" }}</span>
          </div>
        </div>
      </el-card>

      <!-- 卡片2: BOT信息 -->
      <el-card class="settings-card">
        <template #header>
          <div class="card-header">
            <div class="card-title">
              <el-icon class="card-icon"><Cpu /></el-icon>
              <span>BOT信息</span>
              <span v-if="botInfo.id" class="header-status" :class="botInfo.isOnline ? 'online' : 'offline'">
                <span class="status-dot" :class="botInfo.isOnline ? 'online' : 'offline'"></span>
                {{ botInfo.isOnline ? '在线' : '离线' }}
              </span>
            </div>
            <div class="card-actions">
              <el-button
                v-if="!botInfo.id"
                type="primary"
                size="small"
                @click="openBotDialog"
                :icon="Plus"
              >添加</el-button>
              <template v-else>
                <el-tooltip
                  v-if="hasDocker"
                  content="请先删除Docker容器后再编辑机器人信息"
                  placement="top"
                >
                  <span class="disabled-delete-wrapper">
                    <el-button type="primary" size="small" :icon="Edit" disabled>编辑</el-button>
                  </span>
                </el-tooltip>
                <el-button v-else type="primary" size="small" @click="openBotDialog" :icon="Edit">编辑</el-button>
                <el-tooltip
                  v-if="hasDocker"
                  content="请先删除Docker容器后再删除机器人信息"
                  placement="top"
                >
                  <span class="disabled-delete-wrapper">
                    <el-button type="danger" size="small" :icon="Delete" disabled>删除</el-button>
                  </span>
                </el-tooltip>
                <el-button v-else type="danger" size="small" @click="deleteBot" :icon="Delete">删除</el-button>
              </template>
            </div>
          </div>
        </template>
        <div class="card-body" v-if="botInfo.id">
          <div class="info-row">
            <span class="info-label">BOTQQ</span>
            <span class="info-value">{{ botInfo.botQQ || "-" }}</span>
          </div>
          <div class="info-row info-row-credentials">
            <div class="info-credentials">
              <div class="credential-item">
                <span class="credential-label">URL</span>
                <span class="credential-value" :title="botInfo.pathSuffix">{{ botInfo.pathSuffix || "-" }}</span>
                <el-button
                  v-if="botInfo.pathSuffix"
                  :icon="CopyDocument"
                  size="small"
                  text
                  class="copy-btn"
                  @click="copyToClipboard(botInfo.pathSuffix)"
                />
              </div>
              <div class="credential-item">
                <span class="credential-label">Token</span>
                <span class="credential-value" :title="botInfo.token">{{ botInfo.token || "-" }}</span>
                <el-button
                  v-if="botInfo.token"
                  :icon="CopyDocument"
                  size="small"
                  text
                  class="copy-btn"
                  @click="copyToClipboard(botInfo.token)"
                />
              </div>
            </div>
          </div>
        </div>
        <el-empty v-else description="暂无机器人信息" :image-size="60" />
      </el-card>

      <!-- 卡片3: Docker信息 (仅当BOT存在时显示) -->
      <el-card class="settings-card" v-if="hasBot">
        <template #header>
          <div class="card-header">
            <div class="card-title">
              <el-icon class="card-icon"><Monitor /></el-icon>
              <span>Docker信息</span>
            </div>
            <div class="card-actions">
              <el-button
                v-if="!hasDocker"
                type="primary"
                size="small"
                @click="openDockerDialog"
                :icon="Plus"
              >创建</el-button>
              <el-button v-else type="danger" size="small" @click="deleteContainer" :icon="Delete">删除</el-button>
            </div>
          </div>
        </template>
        <div class="card-body" v-if="hasDocker">
          <div class="info-row">
            <span class="info-label">访问端口</span>
            <span class="info-value">
              <span class="port-value">{{ containerInfo.port }}</span>
              <a
                :href="`http://${currentHost}:${containerInfo.port}`"
                target="_blank"
                class="visit-link"
              >访问Napcat UI</a>
            </span>
          </div>
          <div class="info-row">
            <span class="info-label">Napcat Token</span>
            <span class="info-value token-value">{{ containerInfo.token || "-" }}</span>
          </div>
        </div>
        <el-empty v-else description="暂无Docker容器" :image-size="60" />
      </el-card>
    </div>

    <!-- Bot 对话框 -->
    <el-dialog v-model="botDialogVisible" :title="botDialogTitle" width="460px">
      <el-form ref="botFormRef" :model="botForm" :rules="botRules" label-width="100px">
        <el-form-item label="机器人QQ" prop="botQQ">
          <el-input v-model="botForm.botQQ" placeholder="请输入机器人QQ" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="botDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitBot">确定</el-button>
      </template>
    </el-dialog>

    <!-- Docker 对话框 -->
    <el-dialog v-model="dockerDialogVisible" title="创建Docker容器" width="460px">
      <el-form ref="dockerFormRef" :model="dockerForm" :rules="dockerRules" label-width="100px">
        <el-form-item label="Napcat Token" prop="napcatToken">
          <el-input v-model="dockerForm.napcatToken" placeholder="请输入napcat token" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dockerDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="createContainer" :loading="dockerCreateLoading">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.settings-view {
  width: 100%;
}

.settings-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.settings-card {
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  transition: box-shadow 0.3s ease;
}

.settings-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.card-icon {
  font-size: 18px;
  color: #409eff;
}

/* ─── 卡片头部状态标签 ─── */
.header-status {
  display: inline-flex;
  align-items: center;
  font-size: 12px;
  font-weight: 500;
  margin-left: 10px;
  padding: 2px 10px;
  border-radius: 12px;
  gap: 4px;
}

.header-status.online {
  color: #16a34a;
  background: rgba(34, 197, 94, 0.1);
}

.header-status.offline {
  color: #94a3b8;
  background: rgba(148, 163, 184, 0.1);
}

html.dark .header-status.online {
  color: #4ade80;
}
html.dark .header-status.offline {
  color: #64748b;
  background: rgba(100, 116, 139, 0.15);
}

.card-actions {
  display: flex;
  gap: 8px;
}

.disabled-delete-wrapper {
  display: inline-block;
  cursor: not-allowed;
}

.card-body {
  min-height: 60px;
}

.info-row {
  display: flex;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  width: 90px;
  flex-shrink: 0;
  font-size: 13px;
  color: #909399;
}

.info-value {
  flex: 1;
  font-size: 14px;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 10px;
  word-break: break-all;
}

.port-value {
  color: #409eff;
  font-weight: 600;
}

.visit-link {
  display: inline-block;
  padding: 2px 10px;
  background-color: #ecf5ff;
  color: #409eff;
  border-radius: 4px;
  text-decoration: none;
  font-size: 12px;
  border: 1px solid #d9ecff;
  transition: all 0.3s;
}

.visit-link:hover {
  background-color: #409eff;
  color: #fff;
  border-color: #409eff;
}

.token-value {
  font-family: "Monaco", "Menlo", monospace;
  font-size: 12px;
}

/* ─── 连接信息凭证 ─── */
.info-row-credentials {
  padding: 12px 0;
}

.info-credentials {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-left: 0;
}

.credential-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 12px;
  background: #f8fafc;
  border-radius: 6px;
  border: 1px solid #e8ecf1;
}

.credential-label {
  font-size: 11px;
  font-weight: 600;
  color: #8c939d;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  flex-shrink: 0;
  min-width: 40px;
  line-height: 20px;
}

.credential-value {
  font-family: "Monaco", "Menlo", "Consolas", monospace;
  font-size: 12px;
  color: #303133;
  flex: 1;
  min-width: 0;
  word-break: break-all;
  line-height: 1.5;
}

.copy-btn {
  flex-shrink: 0;
  color: #909399;
  padding: 2px 4px;
  border-radius: 4px;
}

.copy-btn:hover {
  color: #409eff;
  background: rgba(64, 158, 255, 0.08);
}

/* ─── 状态指示点 ─── */
.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 6px;
  flex-shrink: 0;
}

.status-dot.online {
  background: #22c55e;
  box-shadow: 0 0 6px rgba(34, 197, 94, 0.5);
  animation: status-pulse 2s ease-in-out infinite;
}

.status-dot.offline {
  background: #cbd5e1;
}

html.dark .status-dot.offline {
  background: #4a5568;
}

@keyframes status-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@media (max-width: 1200px) {
  .settings-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 767px) {
  .settings-cards {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .settings-view {
    padding-bottom: 16px;
    overflow-y: auto;
    height: 100%;
  }

  .card-title {
    font-size: 15px;
  }

  .card-icon {
    font-size: 16px;
  }

  .info-label {
    width: 70px;
    font-size: 12px;
  }

  .info-value {
    font-size: 13px;
  }

  .card-actions .el-button {
    font-size: 12px;
    padding: 5px 10px;
  }
}
</style>

<style>
/* ───────── 暗色模式：连接信息凭证 ───────── */
html.dark .credential-item {
  background: rgba(20, 32, 48, 0.7);
  border-color: var(--app-border);
}
html.dark .credential-label {
  color: var(--app-text-muted);
}
html.dark .credential-value {
  color: var(--app-text);
}
html.dark .copy-btn {
  color: var(--app-text-muted);
}
html.dark .copy-btn:hover {
  color: var(--app-primary);
  background: rgba(96, 165, 250, 0.12);
}
</style>