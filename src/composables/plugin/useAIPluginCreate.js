import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import request from '../../utils/request'

const DEFAULT_ENTITY_PACKAGE = 'com.example.entity'
const DEFAULT_METHOD_PACKAGE = 'com.example.service'
const LEGACY_DRAFT_KEY = 'ai-plugin-create-draft'
const COMPILE_TEXT_SCROLL_INTERVAL = 1200

const createDemandFormFromRoute = (query = {}) => ({
  entityPackage: query.entityPackage || DEFAULT_ENTITY_PACKAGE,
  methodPackage: query.methodPackage || DEFAULT_METHOD_PACKAGE,
  pluginId: query.pluginId || ''
})

export const useAIPluginCreate = () => {
  const route = useRoute()
  const router = useRouter()

  const generationLoading = ref(false)
  const historyLoading = ref(false)
  const olderMessagesLoading = ref(false)
  const hasOlderMessages = ref(false)
  const reviewVisible = ref(false)
  const activeTab = ref('code')
  const activeFilePath = ref('')
  const conversationId = ref('')
  const currentRound = ref(0)
  const generatedFiles = ref([])
  const displayedFiles = ref([])
  const previousFiles = ref([])
  const codeLoading = ref(false)
  const dependencies = ref([])
  const reviewResult = ref(null)
  const chatScrollRef = ref(null)
  const chatInput = ref('')
  const reviewEnabled = ref(false)
  const webSocketRef = ref(null)

  // 编译相关状态
  // compileLoading：编译进行中，用于禁用聊天输入与发布设置入口
  // compileStatusText：按钮上展示的进度文本（收到新 compile 事件时滚动切换）
  // compileReviewFailed：review 未通过时的 issues 内容（弹窗展示）
  const compileLoading = ref(false)
  const compileStatusText = ref('')
  const compileReviewFailed = ref(null)

  const demandForm = ref(createDemandFormFromRoute(route.query))

  const publishForm = ref({
    name: '',
    description: '',
    version: '1.0.0',
    changelog: 'AI 自动生成',
    isPublic: true
  })

  const chatMessages = ref([])

  // 思考流暂停 500ms 后显示"正在准备调用工具"过渡样式（兜底模型决策空窗）
  let thinkingIdleTimer = null
  const clearThinkingIdleTimer = () => {
    if (thinkingIdleTimer) {
      clearTimeout(thinkingIdleTimer)
      thinkingIdleTimer = null
    }
  }

  // 思考或文本流暂停 500ms 后显示"正在准备调用工具"过渡样式（兜底模型决策空窗）
  const schedulePreparingIdle = (assistantMessageId) => {
    clearThinkingIdleTimer()
    thinkingIdleTimer = setTimeout(() => {
      patchChatMessage(assistantMessageId, { preparing: true })
      thinkingIdleTimer = null
    }, 500)
  }

  const isUpdateMode = computed(() => Boolean(demandForm.value.pluginId))
  const visibleFiles = computed(() => displayedFiles.value.length ? displayedFiles.value : generatedFiles.value)
  const activeFile = computed(() => visibleFiles.value.find(file => file.filePath === activeFilePath.value) || visibleFiles.value[0])
  const codeLineCount = computed(() => activeFile.value?.content?.split('\n').length || 0)
  const reviewIssues = computed(() => Array.isArray(reviewResult.value?.issues) ? reviewResult.value.issues : [])
  const reviewPassed = computed(() => reviewResult.value == null || reviewResult.value.passed === true)
  const shortConversationId = computed(() => {
    if (!conversationId.value) return '未开始'
    return conversationId.value.length > 12 ? `${conversationId.value.slice(0, 8)}...` : conversationId.value
  })
  const selectedFileName = computed(() => {
    const path = activeFile.value?.filePath || ''
    return path.split('/').pop() || '未选择文件'
  })
  const totalCodeLines = computed(() => visibleFiles.value.reduce((sum, file) => sum + (file.content?.split('\n').length || 0), 0))
  const compileButtonText = computed(() => compileLoading.value ? (compileStatusText.value || '准备中...') : '编译并发布')
  const compileButtonTextKey = computed(() => compileButtonText.value)
  // 用于强制触发文本滚动动画：每次文本变化时递增，作为 :key 让 Vue 重新挂载 span
  const compileTextTick = ref(0)
  watch(compileButtonText, () => {
    compileTextTick.value++
  })
  const reviewBadge = computed(() => {
    if (!reviewVisible.value || !reviewResult.value) return null
    return reviewResult.value.passed === false ? { type: 'danger', text: '审查未通过' } : null
  })

  const fileTree = computed(() => buildFileTree(visibleFiles.value))

  // 上一轮 assistant 消息 ID（用于查询上轮代码以展示变更）
  const previousAssistantMessageId = computed(() => {
    const targetRound = currentRound.value - 1
    if (targetRound < 1) return ''
    for (let i = chatMessages.value.length - 1; i >= 0; i--) {
      const msg = chatMessages.value[i]
      if (msg.role === 'assistant' && Number(msg.round) === targetRound && !msg.loading) {
        return msg.id
      }
    }
    return ''
  })

  // 合并当前轮与上轮代码文件，标记每项状态：modified/added/deleted/unchanged
  const diffFiles = computed(() => {
    const currentMap = new Map(visibleFiles.value.map(f => [f.filePath, f.content || '']))
    const previousMap = new Map(previousFiles.value.map(f => [f.filePath, f.content || '']))
    const allPaths = new Set([...currentMap.keys(), ...previousMap.keys()])
    const result = []
    allPaths.forEach(filePath => {
      const inCurrent = currentMap.has(filePath)
      const inPrevious = previousMap.has(filePath)
      const currentContent = currentMap.get(filePath) ?? ''
      const previousContent = previousMap.get(filePath) ?? ''
      let status
      if (inCurrent && !inPrevious) status = 'added'
      else if (!inCurrent && inPrevious) status = 'deleted'
      else if (currentContent !== previousContent) status = 'modified'
      else status = 'unchanged'
      result.push({ filePath, status, currentContent, previousContent })
    })
    return result.sort((a, b) => a.filePath.localeCompare(b.filePath))
  })

  const diffFileTree = computed(() => buildFileTree(diffFiles.value))

  const activeDiffFile = computed(() =>
    diffFiles.value.find(f => f.filePath === activeFilePath.value) || diffFiles.value[0] || null
  )

  const diffStats = computed(() => {
    const stats = { added: 0, modified: 0, deleted: 0, unchanged: 0, total: diffFiles.value.length }
    diffFiles.value.forEach(f => { stats[f.status]++ })
    return stats
  })

  // 最后一条非加载中的 assistant 消息 ID，用于按 messageId 查询代码
  const lastAssistantMessageId = computed(() => {
    for (let i = chatMessages.value.length - 1; i >= 0; i--) {
      const msg = chatMessages.value[i]
      if (msg.role === 'assistant' && !msg.loading) {
        return msg.id
      }
    }
    return ''
  })

  const canViewCode = computed(() => Boolean(lastAssistantMessageId.value) && !generationLoading.value)

  const scrollChatToBottom = async () => {
    await nextTick()
    const el = chatScrollRef.value
    if (el) el.scrollTop = el.scrollHeight
  }

  const clearLegacyDraft = () => {
    localStorage.removeItem(LEGACY_DRAFT_KEY)
  }

  const resetPageState = (query = {}) => {
    clearThinkingIdleTimer()
    try {
      webSocketRef.value?.abort?.()
    } catch (error) {
      // ignore
    }
    generationLoading.value = false
    historyLoading.value = false
    reviewVisible.value = false
    activeTab.value = 'code'
    activeFilePath.value = ''
    conversationId.value = ''
    currentRound.value = 0
    generatedFiles.value = []
    displayedFiles.value = []
    previousFiles.value = []
    dependencies.value = []
    reviewResult.value = null
    chatInput.value = ''
    webSocketRef.value = null
    compileLoading.value = false
    compileStatusText.value = ''
    compileReviewFailed.value = null
    demandForm.value = createDemandFormFromRoute(query)
    publishForm.value = {
      name: '',
      description: '',
      version: '1.0.0',
      changelog: 'AI 自动生成',
      isPublic: true
    }
    chatMessages.value = []
    hasOlderMessages.value = false
    olderMessagesLoading.value = false
  }

  const cancelGeneration = () => {
    clearThinkingIdleTimer()
    if (!webSocketRef.value) return
    try {
      webSocketRef.value.abort?.()
    } catch (error) {
      // ignore
    }
  }

  const sendPrompt = async () => {
    const text = chatInput.value.trim()
    if (!text) {
      ElMessage.warning('请输入插件需求或修改指令')
      return
    }

    const nextRound = currentRound.value + 1
    chatInput.value = ''
    generationLoading.value = true
    reviewVisible.value = false
    chatMessages.value.push({
      id: `user-${nextRound}-${Date.now()}`,
      role: 'user',
      round: nextRound,
      content: text,
      parts: [{ type: 'text', content: text }],
      createTime: formatTime()
    })
    const assistantMessage = createGeneratingMessage(nextRound)
    chatMessages.value.push(assistantMessage)
    await scrollChatToBottom()
    try {
      await sendPromptStream(text, assistantMessage.id)
    } catch (error) {
      const latestMsg = chatMessages.value.find(m => m.id === assistantMessage.id)
      const wasInterrupted = latestMsg?.interrupted === true
      patchChatMessage(assistantMessage.id, {
        error: !wasInterrupted,
        interrupted: wasInterrupted,
        loading: false,
        waitingForBackend: false,
        content: wasInterrupted ? (latestMsg.content || '已取消') : (error.message || 'AI 生成失败'),
        parts: [{ type: 'text', content: wasInterrupted ? (latestMsg.content || '已取消') : (error.message || 'AI 生成失败') }]
      })
    } finally {
      clearThinkingIdleTimer()
      generationLoading.value = false
      scrollChatToBottom()
    }
  }

  const sendPromptStream = async (text, assistantMessageId) => {
    const token = localStorage.getItem('token')
    if (!token) {
      return Promise.reject(new Error('登录状态已失效，请重新登录'))
    }

    displayedFiles.value = []
    activeFilePath.value = ''
    activeTab.value = 'code'

    let rawText = ''
    const controller = new AbortController()
    webSocketRef.value = { abort: () => controller.abort() }

    const baseUrl = import.meta.env.DEV ? 'http://localhost:8080' : '/api'
    const params = new URLSearchParams()
    params.append('message', text)
    if (conversationId.value) params.append('conversationId', conversationId.value)

    let response
    try {
      response = await fetch(`${baseUrl}/ai-plugin/generate?${params}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal
      })
    } catch (error) {
      if (error.name === 'AbortError') {
        return Promise.reject(new Error('已取消生成'))
      }
      return Promise.reject(new Error('SSE 连接异常，AI 生成中断'))
    }

    if (!response.ok) {
      return Promise.reject(new Error(`请求失败 (${response.status})`))
    }

    return new Promise((resolve, reject) => {
      let settled = false
      const finish = callback => {
        if (settled) return
        settled = true
        if (webSocketRef.value) webSocketRef.value = null
        callback()
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      const processChunk = async () => {
        // eventName / eventDataLines 必须跨 chunk 保持状态：
        // SSE 事件可能被 TCP 分片切断（尤其 done 事件含完整消息列表，体积大），
        // event: 行和 data: 行可能分属不同 chunk，若每次 read() 都重置会丢失事件名。
        let eventName = ''
        let eventDataLines = []
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) {
              if (!settled) finish(() => reject(new Error('SSE 连接已关闭，AI 生成中断')))
              return
            }

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              if (line.startsWith('event:')) {
                eventName = line.slice(6).trim()
              } else if (line.startsWith('data:')) {
                eventDataLines.push(line.slice(5))
              } else if (line === '' && eventDataLines.length) {
                const dataStr = eventDataLines.join('\n').trim()
                const parsed = parseSSEEvent(eventName, dataStr)
                eventName = ''
                eventDataLines = []

                if (!parsed) continue
                if (parsed.type === 'delta') {
                  // 统一增量事件：data.type 区分 thinking / text / tool_call
                  const data = parsed.data || {}
                  clearThinkingIdleTimer()
                  if (data.type === 'thinking') {
                    applyAssistantThinkingDelta(assistantMessageId, data)
                  } else if (data.type === 'text') {
                    rawText += data.content || ''
                    applyAssistantTextDelta(assistantMessageId, data)
                    updateStreamingPreview(rawText, assistantMessageId)
                  } else if (data.type === 'tool_call') {
                    applyToolCallEvent(assistantMessageId, data)
                  }
                  patchChatMessage(assistantMessageId, { preparing: false })
                  await scrollChatToBottom()
                } else if (parsed.type === 'message_change') {
                  const progress = String(parsed.data || '').trim()
                  if (!progress) {
                    patchChatMessage(assistantMessageId, { content: '...', hasBackendContent: false, loading: true, waitingForBackend: true })
                  } else {
                    patchChatMessage(assistantMessageId, { progress, content: progress, hasBackendContent: true, loading: false, waitingForBackend: false })
                  }
                } else if (parsed.type === 'done') {
                  clearThinkingIdleTimer()
                  finalizeAssistantMessage(assistantMessageId, parsed.data, text)
                  finish(resolve)
                  return
                } else if (parsed.type === 'cancelled') {
                  clearThinkingIdleTimer()
                  patchChatMessage(assistantMessageId, { interrupted: true, loading: false, waitingForBackend: false })
                  finish(() => reject(new Error('已取消生成')))
                  return
                } else if (parsed.type === 'error') {
                  clearThinkingIdleTimer()
                  finish(() => reject(new Error(parsed.data?.message || 'AI 生成失败')))
                  return
                }
              }
            }
          }
        } catch (error) {
          if (error.name === 'AbortError') return
          if (!settled) finish(() => reject(new Error(`SSE 读取异常: ${error.message}`)))
        }
      }

      processChunk()
    })
  }

  const parseSSEEvent = (eventName, dataStr) => {
    if (!eventName || !dataStr) return null
    try {
      const data = JSON.parse(dataStr)
      return { type: eventName, data }
    } catch (error) {
      // 非 JSON 数据（如 compile 事件的纯文本进度），直接作为字符串返回
      return { type: eventName, data: dataStr }
    }
  }

  const updateStreamingPreview = (rawText, assistantMessageId) => {
    const files = parseStreamingFiles(rawText)
    const currentFilePath = getCurrentStreamingFilePath(rawText, files)

    displayedFiles.value = files
    patchChatMessage(assistantMessageId, { files })
    if (currentFilePath) {
      activeFilePath.value = currentFilePath
      activeTab.value = 'code'
    } else if (!activeFilePath.value && files.length) {
      activeFilePath.value = files[0].filePath
    }
  }

  const applyAssistantTextDelta = (assistantMessageId, data = {}) => {
    const content = data.content || ''
    if (!content) return
    const index = chatMessages.value.findIndex(message => message.id === assistantMessageId)
    if (index < 0) return
    const message = chatMessages.value[index]
    const parts = normalizeMessageParts(message.parts, message.content === '...' ? '' : message.content)
    // 收到正文：自动折叠所有思考 part
    collapseAllThinking(parts)
    // 同类型 part 末尾追加，否则新建
    const last = parts[parts.length - 1]
    if (last?.type === 'text') {
      last.content = `${last.content || ''}${content}`
    } else {
      parts.push({ type: 'text', content })
    }
    const nextContent = parts.filter(part => part.type === 'text').map(part => part.content || '').join('')
    patchChatMessage(assistantMessageId, {
      parts,
      content: nextContent,
      hasBackendContent: true,
      loading: false,
      waitingForBackend: false,
      preparing: false
    })
    schedulePreparingIdle(assistantMessageId)
  }

  const applyAssistantThinkingDelta = (assistantMessageId, data = {}) => {
    const content = data.content || ''
    if (!content) return
    const index = chatMessages.value.findIndex(message => message.id === assistantMessageId)
    if (index < 0) return
    const message = chatMessages.value[index]
    const parts = normalizeMessageParts(message.parts, message.content === '...' ? '' : message.content)
    // 同类型 part 末尾追加，否则新建
    const last = parts[parts.length - 1]
    if (last?.type === 'thinking') {
      last.content = `${last.content || ''}${content}`
      last.expanded = true
      last.streaming = true
    } else {
      parts.push({ type: 'thinking', content, expanded: true, streaming: true, fullExpanded: false })
    }
    const nextContent = parts.filter(part => part.type === 'text').map(part => part.content || '').join('')
    patchChatMessage(assistantMessageId, {
      parts,
      content: nextContent,
      hasBackendContent: true,
      loading: false,
      waitingForBackend: false,
      preparing: false
    })
    schedulePreparingIdle(assistantMessageId)
  }

  const collapseAllThinking = (parts) => {
    parts.forEach(part => {
      if (part?.type === 'thinking') {
        part.expanded = false
        part.streaming = false
      }
    })
  }

  const collapseAllThinkingInMessage = (assistantMessageId) => {
    const index = chatMessages.value.findIndex(message => message.id === assistantMessageId)
    if (index < 0) return
    const message = chatMessages.value[index]
    const parts = normalizeMessageParts(message.parts, message.content === '...' ? '' : message.content)
    collapseAllThinking(parts)
    patchChatMessage(assistantMessageId, { parts })
  }

  const applyToolCallEvent = (assistantMessageId, data = {}) => {
    const name = data.name
    const status = data.status
    const index = chatMessages.value.findIndex(message => message.id === assistantMessageId)
    if (index < 0) return
    const message = chatMessages.value[index]
    const parts = normalizeMessageParts(message.parts, message.content === '...' ? '' : message.content)
    // 收到工具调用：自动折叠所有思考 part
    collapseAllThinking(parts)
    if (status === 'RUNNING') {
      // 开始事件：追加新 tool_call part
      parts.push({ type: 'tool_call', name: name || '工具调用', status: 'RUNNING' })
    } else {
      // 结束事件（SUCCESS/ERROR）：更新最后一个同名 RUNNING part 的状态
      for (let i = parts.length - 1; i >= 0; i--) {
        const part = parts[i]
        if (part.type === 'tool_call' && part.status === 'RUNNING' && (!name || part.name === name)) {
          part.status = status || 'SUCCESS'
          break
        }
      }
    }
    patchChatMessage(assistantMessageId, {
      parts,
      hasBackendContent: true,
      loading: false,
      waitingForBackend: false
    })
  }

  const patchChatMessage = (id, patch) => {
    const index = chatMessages.value.findIndex(message => message.id === id)
    if (index < 0) return
    chatMessages.value[index] = {
      ...chatMessages.value[index],
      ...patch
    }
  }

  const syncPublishInfo = (data, text = '') => {
    const payload = normalizePayload(data || {})
    // 仅在后端明确返回了插件元信息时才更新，避免用用户原始 prompt 填充
    if (payload.pluginName) {
      publishForm.value.name = payload.pluginName
    }
    if (payload.pluginDescription) {
      publishForm.value.description = payload.pluginDescription
    }
    if (payload.version) publishForm.value.version = payload.version
    if (payload.changelog) publishForm.value.changelog = payload.changelog
    if (typeof payload.isPublic === 'boolean') publishForm.value.isPublic = payload.isPublic
  }

  /**
   * done 事件处理：用后端返回的完整 assistant 消息更新当前流式消息。
   * 不再整体替换 chatMessages，只更新本轮消息的 parts/publishInfo。
   * 工具调用信息已嵌入 messageParts 的 tool_call part，无需单独维护 toolCalls 字段。
   * 代码文件不再随消息体返回，改为点击"查看代码文件"时按 messageId 查询。
   */
  const finalizeAssistantMessage = (assistantMessageId, data, userText) => {
    if (!data) return

    // 更新会话 ID 和轮次（首次生成时 conversationId 刚创建）
    if (data.conversationId) conversationId.value = data.conversationId
    if (data.round) currentRound.value = data.round

    // 解析 messageParts（后端返回 JSON 字符串，已内嵌 tool_call part 的 name）
    const parts = normalizeMessageParts(data.messageParts, '')
    const textContent = parts.filter(p => p.type === 'text').map(p => p.content || '').join('')

    // 更新当前流式消息的最终状态，并将 ID 更新为后端消息 ID（用于后续按 messageId 查询代码）
    patchChatMessage(assistantMessageId, {
      id: data.id || assistantMessageId,
      parts,
      content: textContent || '代码生成完毕',
      loading: false,
      waitingForBackend: false,
      hasBackendContent: true,
      preparing: false
    })

    // 更新发布信息
    syncPublishInfo(data, userText)
  }

  const restoreConversationFromMessages = messages => {
    const restoredMessages = mapMessagesToFrontend(messages)
    if (!restoredMessages.length) return
    const sortedMessages = [...(Array.isArray(messages) ? messages : [])]
      .sort((a, b) => (Number(a.round) || 0) - (Number(b.round) || 0))
    const maxRound = sortedMessages.reduce((max, m) => Math.max(max, Number(m.round) || 0), 0)
    const firstMessage = sortedMessages[0]
    const latestRoundMessage = sortedMessages[sortedMessages.length - 1]

    chatMessages.value = restoredMessages
    conversationId.value = firstMessage?.conversationId || conversationId.value
    currentRound.value = maxRound
    demandForm.value.pluginId = firstMessage?.pluginId || demandForm.value.pluginId
    dependencies.value = []
    reviewResult.value = null
    if (latestRoundMessage) syncPublishInfo(latestRoundMessage)
  }

  // 向上滚动加载更早的消息，并保持当前滚动位置不跳动
  const loadOlderMessages = async () => {
    if (!conversationId.value || olderMessagesLoading.value || !hasOlderMessages.value) {
      return
    }
    const earliestRound = chatMessages.value
      .filter(message => message.role === 'user')
      .reduce((min, message) => {
        const round = Number(message.round) || 0
        return round > 0 && (min === 0 || round < min) ? round : min
      }, 0)
    if (!earliestRound) {
      hasOlderMessages.value = false
      return
    }

    olderMessagesLoading.value = true
    const scrollEl = chatScrollRef.value
    const previousScrollHeight = scrollEl?.scrollHeight || 0
    const previousScrollTop = scrollEl?.scrollTop || 0
    try {
      const response = await request({
        url: `/ai-plugin/${conversationId.value}`,
        method: 'get',
        params: { pageSize: 30, beforeRound: earliestRound },
        timeout: 60000
      })
      const data = response.data || {}
      const older = mapMessagesToFrontend(data.messages || [])
      if (older.length) {
        chatMessages.value = [...older, ...chatMessages.value]
      }
      hasOlderMessages.value = data.hasMore === true
      await nextTick()
      if (scrollEl) {
        scrollEl.scrollTop = previousScrollTop + (scrollEl.scrollHeight - previousScrollHeight)
      }
    } finally {
      olderMessagesLoading.value = false
    }
  }

  const undoToBeforeRound = async round => {
    if (!conversationId.value || round !== currentRound.value || round <= 0) {
      return
    }

    const userMessage = [...chatMessages.value].reverse().find(item => item.role === 'user' && item.round === round)
    generationLoading.value = true
    reviewVisible.value = false
    try {
      await request({
        url: '/ai-plugin',
        method: 'post',
        params: { conversationId: conversationId.value, round },
        timeout: 60000
      })
      await loadConversation(conversationId.value, false, false)
      chatInput.value = userMessage?.content || chatInput.value
    } finally {
      generationLoading.value = false
    }
  }

  // 点击"编译并发布"：发起 SSE 编译流程
  const confirmCompile = async () => {
    const messageId = lastAssistantMessageId.value
    if (!messageId) {
      ElMessage.warning('暂无可编译的消息，请先生成代码')
      return
    }
    compileLoading.value = true
    compileStatusText.value = '准备中...'
    compileReviewFailed.value = null
    try {
      await sendCompileStream(messageId)
    } catch (error) {
      ElMessage.error(error?.message || '编译失败')
    } finally {
      compileLoading.value = false
    }
  }

  // 编译 SSE：解析 compile / review_failed / done / error 四类事件
  const sendCompileStream = (messageId) => {
    const token = localStorage.getItem('token')
    if (!token) return Promise.reject(new Error('登录状态已失效，请重新登录'))

    const baseUrl = import.meta.env.DEV ? 'http://localhost:8080' : '/api'
    const params = new URLSearchParams({ messageId })

    return new Promise((resolve, reject) => {
      let settled = false
      const finish = cb => {
        if (settled) return
        settled = true
        cb()
      }

      fetch(`${baseUrl}/ai-plugin/compile?${params}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      }).then(response => {
        if (!response.ok) {
          finish(() => reject(new Error(`请求失败 (${response.status})`)))
          return
        }
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let eventName = ''
        let eventDataLines = []

        const processChunk = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) {
                if (!settled) finish(() => reject(new Error('SSE 连接已关闭，编译中断')))
                return
              }
              buffer += decoder.decode(value, { stream: true })
              const lines = buffer.split('\n')
              buffer = lines.pop() || ''
              for (const line of lines) {
                if (line.startsWith('event:')) {
                  eventName = line.slice(6).trim()
                } else if (line.startsWith('data:')) {
                  eventDataLines.push(line.slice(5))
                } else if (line === '' && eventDataLines.length) {
                  const dataStr = eventDataLines.join('\n').trim()
                  const event = parseSSEEvent(eventName, dataStr)
                  eventName = ''
                  eventDataLines = []
                  if (!event) continue

                  if (event.type === 'compile') {
                    // 收到新的进度文本：直接赋值，由 transition(out-in) 处理滚动切换
                    const text = typeof event.data === 'string' ? event.data : String(event.data || '')
                    compileStatusText.value = text
                  } else if (event.type === 'review_failed') {
                    compileReviewFailed.value = event.data
                    finish(() => resolve())
                    return
                  } else if (event.type === 'done') {
                    finish(() => resolve())
                    return
                  } else if (event.type === 'error') {
                    const msg = (event.data && event.data.message) || '编译失败'
                    finish(() => reject(new Error(msg)))
                    return
                  }
                }
              }
            }
          } catch (error) {
            if (!settled) finish(() => reject(new Error(`SSE 读取异常: ${error.message}`)))
          }
        }
        processChunk()
      }).catch(error => {
        if (!settled) finish(() => reject(new Error(`编译请求异常: ${error.message}`)))
      })
    })
  }

  const updateFileContent = (filePath, content) => {
    const updateList = files => files.map(file => (
      file.filePath === filePath ? { ...file, content } : file
    ))
    if (displayedFiles.value.some(file => file.filePath === filePath)) {
      displayedFiles.value = updateList(displayedFiles.value)
    }
    if (generatedFiles.value.some(file => file.filePath === filePath)) {
      generatedFiles.value = updateList(generatedFiles.value)
    }
  }

  const loadConversation = async (id, showLoading = true) => {
    if (!id) return
    if (showLoading) historyLoading.value = true
    try {
      const response = await request({
        url: `/ai-plugin/${id}`,
        method: 'get',
        params: { pageSize: 30 },
        timeout: 60000
      })
      const data = response.data || {}
      restoreConversationFromMessages(Array.isArray(data) ? data : (data.messages || []))
      hasOlderMessages.value = Array.isArray(data) ? false : data.hasMore === true
    } finally {
      if (showLoading) historyLoading.value = false
      scrollChatToBottom()
    }
  }

  // 按 messageId 查询代码文件列表（纯查询，不管理 loading/错误提示）
  const fetchCodeList = async messageId => {
    if (!messageId) return []
    const response = await request({
      url: `/code/${messageId}`,
      method: 'get',
      timeout: 30000
    })
    return (Array.isArray(response.data) ? response.data : []).map(normalizeGeneratedFile)
  }

  // 按 messageId 查询代码文件列表
  const loadCodeByMessageId = async messageId => {
    if (!messageId) return []
    codeLoading.value = true
    try {
      return await fetchCodeList(messageId)
    } catch (error) {
      ElMessage.error('加载代码文件失败')
      return []
    } finally {
      codeLoading.value = false
    }
  }

  // 点击"查看代码文件"时调用：同时查询当前轮与上一轮的代码，用于代码视图与变更视图
  const openCodeDialog = async () => {
    const messageId = lastAssistantMessageId.value
    if (!messageId) {
      ElMessage.warning('暂无可查看的代码消息')
      return false
    }
    const prevMessageId = previousAssistantMessageId.value
    codeLoading.value = true
    try {
      const [files, prevFiles] = await Promise.all([
        fetchCodeList(messageId),
        prevMessageId ? fetchCodeList(prevMessageId) : Promise.resolve([])
      ])
      if (!files.length) {
        ElMessage.warning('该消息暂无代码文件')
        return false
      }
      generatedFiles.value = files
      displayedFiles.value = files
      previousFiles.value = prevFiles
      activeFilePath.value = files[0].filePath
      return true
    } catch (error) {
      ElMessage.error('加载代码文件失败')
      return false
    } finally {
      codeLoading.value = false
    }
  }

  const publishSaving = ref(false)

  // 更新发布配置（按最后一条 assistant 消息 ID）
  const updatePublishSettings = async () => {
    const messageId = lastAssistantMessageId.value
    if (!messageId) {
      ElMessage.warning('暂无可更新的消息，请先生成代码')
      return false
    }
    publishSaving.value = true
    try {
      await request({
        url: '/ai-plugin',
        method: 'put',
        data: {
          id: messageId,
          pluginName: publishForm.value.name,
          pluginDescription: publishForm.value.description,
          version: publishForm.value.version,
          changelog: publishForm.value.changelog,
          isPublic: publishForm.value.isPublic
        },
        timeout: 30000
      })
      ElMessage.success('更新成功')
      return true
    } catch (error) {
      ElMessage.error(error?.message || '更新失败')
      return false
    } finally {
      publishSaving.value = false
    }
  }

  const loadAIPluginConfig = async () => {
    try {
      const response = await request({
        url: '/ai-plugin/config',
        method: 'get',
        timeout: 30000
      })
      reviewEnabled.value = response.data?.reviewEnabled === true
    } catch (error) {
      reviewEnabled.value = false
    }
  }

  const selectTreeNode = node => {
    if (node.leaf && node.path) activeFilePath.value = node.path
  }

  const copyCurrentCode = async () => {
    if (!activeFile.value?.content) return
    await navigator.clipboard.writeText(activeFile.value.content)
    ElMessage.success('代码已复制')
  }

  const highlightLine = line => tokenizeJavaLine(line)

  const goBack = () => {
    router.push('/plugin/ai-list')
  }

  const initializePageFromRoute = async () => {
    clearLegacyDraft()
    resetPageState(route.query)
    const routeConversationId = route.query.conversationId || ''
    conversationId.value = routeConversationId
    if (routeConversationId) await loadConversation(routeConversationId)
  }

  // AI 生成或编译进行中时，阻止关闭/刷新页面，由浏览器弹出原生确认框
  const handleBeforeUnload = (event) => {
    if (generationLoading.value || compileLoading.value) {
      event.preventDefault()
      event.returnValue = ''
    }
  }

  onMounted(async () => {
    window.addEventListener('beforeunload', handleBeforeUnload)
    loadAIPluginConfig()
    await initializePageFromRoute()
  })

  watch(() => route.fullPath, initializePageFromRoute)

  onBeforeUnmount(() => {
    window.removeEventListener('beforeunload', handleBeforeUnload)
    clearThinkingIdleTimer()
    try {
      webSocketRef.value?.abort?.()
    } catch (error) {
      // ignore
    }
  })

  return {
    generationLoading,
    historyLoading,
    olderMessagesLoading,
    hasOlderMessages,
    reviewVisible,
    activeTab,
    activeFilePath,
    conversationId,
    currentRound,
    generatedFiles,
    visibleFiles,
    codeLoading,
    canViewCode,
    dependencies,
    reviewResult,
    reviewEnabled,
    chatScrollRef,
    chatInput,
    demandForm,
    publishForm,
    chatMessages,
    isUpdateMode,
    activeFile,
    codeLineCount,
    reviewIssues,
    reviewPassed,
    shortConversationId,
    selectedFileName,
    totalCodeLines,
    compileButtonText,
    compileButtonTextKey,
    compileTextTick,
    compileLoading,
    compileStatusText,
    compileReviewFailed,
    reviewBadge,
    fileTree,
    diffFileTree,
    activeDiffFile,
    diffStats,
    sendPrompt,
    cancelGeneration,
    undoToBeforeRound,
    loadOlderMessages,
    confirmCompile,
    updateFileContent,
    selectTreeNode,
    copyCurrentCode,
    highlightLine,
    goBack,
    openCodeDialog,
    publishSaving,
    updatePublishSettings
  }
}

function createGeneratingMessage(round) {
  return {
    id: `assistant-stream-${Date.now()}`,
    role: 'assistant',
    round,
    content: '...',
    createTime: formatTime(),
    files: [],
    dependencies: [],
    progress: '...',
    parts: [],
    reviewResult: null,
    error: false,
    hasBackendContent: false,
    loading: true,
    waitingForBackend: true,
    preparing: false
  }
}

// 一条 AIChatMessage 记录拆成 user + assistant 两条前端消息
function mapMessagesToFrontend(messages) {
  if (!Array.isArray(messages)) return []
  const sortedMessages = [...messages].sort((a, b) => (Number(a.round) || 0) - (Number(b.round) || 0))
  const restoredMessages = []
  sortedMessages.forEach(message => {
    const round = Number(message.round) || 0

    if (message.userMessage != null && message.userMessage !== '') {
      restoredMessages.push({
        id: `${message.id}-user`,
        role: 'user',
        round,
        content: message.userMessage,
        parts: [{ type: 'text', content: message.userMessage }],
        createTime: message.createTime || ''
      })
    }

    if (message.messageParts != null && message.messageParts !== '') {
      const parts = normalizeMessageParts(message.messageParts, '')
      const textContent = parts.filter(p => p.type === 'text').map(p => p.content || '').join('')
      restoredMessages.push({
        id: message.id,
        role: 'assistant',
        round,
        content: textContent || '代码生成完毕',
        parts,
        createTime: message.createTime || '',
        pluginName: message.pluginName || '',
        pluginDescription: message.pluginDescription || '',
        reviewResult: null
      })
    }
  })
  return restoredMessages
}

function normalizeConversationMessages(messages) {
  const roleOrder = { user: 0, assistant: 1 }
  return [...messages].sort((a, b) => {
    const roundDiff = (Number(a.round) || 0) - (Number(b.round) || 0)
    if (roundDiff !== 0) return roundDiff
    return (roleOrder[a.role] ?? 9) - (roleOrder[b.role] ?? 9)
  })
}

function parseAssistantContent(content) {
  try {
    const parsed = JSON.parse(content || '{}')
    if (Array.isArray(parsed)) {
      return { files: parsed.map(normalizeGeneratedFile), dependencies: [], reviewResult: null, textContent: '代码生成完毕' }
    }
    return {
      textContent: parsed.text || parsed.content || parsed.message || '',
      files: Array.isArray(parsed.files) ? parsed.files.map(normalizeGeneratedFile) : [],
      dependencies: Array.isArray(parsed.dependencies) ? parsed.dependencies : [],
      pluginName: parsed.pluginName || parsed.name || '',
      pluginDescription: parsed.pluginDescription || parsed.description || '',
      version: parsed.version || '',
      changelog: parsed.changelog || '',
      isPublic: typeof parsed.isPublic === 'boolean' ? parsed.isPublic : undefined,
      reviewResult: parsed.reviewResult || null
    }
  } catch (error) {
    return {
      textContent: normalizeAssistantPlainText(content || ''),
      files: parseStreamingFiles(content || ''),
      dependencies: [],
      pluginName: '',
      pluginDescription: '',
      version: '',
      changelog: '',
      isPublic: undefined,
      reviewResult: null
    }
  }
}

function normalizeAssistantPlainText(content) {
  return stripStreamTags(content || '').replace(/<file\s+path="[^"]*">/gi, '').trim()
}

function parseJsonMaybe(value, fallback) {
  if (Array.isArray(value)) return value
  if (value == null || value === '') return fallback
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch (error) {
    return fallback
  }
}

function normalizeMessageParts(rawParts, fallbackText = '') {
  const parsed = parseJsonMaybe(rawParts, [])
  if (Array.isArray(parsed) && parsed.length) {
    return parsed.map(part => {
      if (part?.type === 'tool_call') {
        return {
          type: 'tool_call',
          name: part?.name || '工具调用',
          status: part?.status || 'RUNNING'
        }
      }
      if (part?.type === 'thinking') {
        return {
          type: 'thinking',
          content: part?.content || '',
          expanded: part?.expanded ?? false,
          streaming: part?.streaming ?? false,
          fullExpanded: part?.fullExpanded ?? false
        }
      }
      return { type: 'text', content: part?.content || '' }
    })
  }
  return fallbackText ? [{ type: 'text', content: fallbackText }] : []
}

function normalizeGeneratedFile(file) {
  return {
    filePath: (file.filePath || file.path || '').replace(/\\/g, '/'),
    content: file.content || file.code || ''
  }
}

function normalizePayload(data) {
  return {
    conversationId: data.conversationId,
    round: data.round || data.currentRound,
    files: Array.isArray(data.files) ? data.files.map(normalizeGeneratedFile) : [],
    dependencies: Array.isArray(data.dependencies) ? data.dependencies : [],
    pluginName: data.pluginName || data.name || '',
    pluginDescription: data.pluginDescription || data.description || '',
    version: data.version || '',
    changelog: data.changelog || '',
    isPublic: typeof data.isPublic === 'boolean' ? data.isPublic : undefined,
    reviewResult: data.reviewResult || null
  }
}

function isDisplayableGeneratedPath(filePath) {
  return filePath.startsWith('src/main/java/') || filePath.startsWith('src/main/resources/')
}

function buildFileTree(files) {
  const root = []
  const rootMap = new Map()
  const ensureNode = (children, map, part, path, leaf = false, originalPath = '', status) => {
    if (map.has(path)) return map.get(path)
    const node = {
      id: path,
      label: part,
      path: leaf ? (originalPath || path) : '',
      leaf,
      children: leaf ? undefined : []
    }
    if (leaf && status) node.status = status
    children.push(node)
    map.set(path, node)
    return node
  }
  files.forEach(file => {
    const parts = file.filePath.split('/').filter(Boolean)
    // 压缩前3层（如 src/main/java）为一个节点
    let effectiveParts
    if (parts.length >= 3) {
      effectiveParts = [`${parts[0]}.${parts[1]}.${parts[2]}`, ...parts.slice(3)]
    } else {
      effectiveParts = parts
    }
    let children = root
    let map = rootMap
    let currentPath = ''
    effectiveParts.forEach((part, index) => {
      currentPath = currentPath ? `${currentPath}/${part}` : part
      const leaf = index === effectiveParts.length - 1
      // 叶子节点使用原始文件路径，并保留 status（用于变更视图着色）
      const node = ensureNode(children, map, part, currentPath, leaf, leaf ? file.filePath : '', file.status)
      if (!leaf) {
        node._map = node._map || new Map()
        children = node.children
        map = node._map
      }
    })
  })
  const stripMaps = nodes => nodes.map(({ _map, ...node }) => ({
    ...node,
    children: node.children ? stripMaps(node.children) : undefined
  }))
  return stripMaps(root)
}

function parseStreamingFiles(rawText) {
  const files = []
  const fileStartPattern = /<file\s+path="([^"]+)">\s*/gi
  let match
  while ((match = fileStartPattern.exec(rawText)) !== null) {
    const filePath = match[1].trim().replace(/\\/g, '/')
    if (!isDisplayableGeneratedPath(filePath)) continue
    const contentStart = fileStartPattern.lastIndex
    const closeIndex = rawText.indexOf('</file>', contentStart)
    const nextOpenIndex = rawText.slice(contentStart).search(/<file\s+path="/i)
    const contentEnd = closeIndex >= 0
      ? closeIndex
      : nextOpenIndex >= 0
        ? contentStart + nextOpenIndex
        : rawText.length
    files.push({
      filePath,
      content: normalizeStreamingFileContent(stripStreamTags(rawText.slice(contentStart, contentEnd)))
    })
  }
  return files
}

function getCurrentStreamingFilePath(rawText, files) {
  const openFilePath = getOpenFilePath(rawText)
  if (openFilePath && isDisplayableGeneratedPath(openFilePath)) return openFilePath
  return files[files.length - 1]?.filePath || ''
}

function getOpenFilePath(rawText) {
  const matches = [...rawText.matchAll(/<file\s+path="([^"]+)">/gi)]
  return matches[matches.length - 1]?.[1]?.trim().replace(/\\/g, '/') || ''
}

function stripStreamTags(content) {
  return content
    .replace(/<\/file>[\s\S]*$/i, '')
    .replace(/<progress>[\s\S]*?<\/progress>/gi, '')
}

function normalizeStreamingFileContent(content) {
  return content.replace(/^\r?\n/, '')
}

function formatTime() {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

const JAVA_KEYWORDS = new Set([
  'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char', 'class',
  'const', 'continue', 'default', 'do', 'double', 'else', 'enum', 'extends', 'final',
  'finally', 'float', 'for', 'if', 'implements', 'import', 'instanceof', 'int',
  'interface', 'long', 'native', 'new', 'package', 'private', 'protected', 'public',
  'return', 'short', 'static', 'strictfp', 'super', 'switch', 'synchronized', 'this',
  'throw', 'throws', 'transient', 'try', 'void', 'volatile', 'while', 'record', 'var'
])

const JAVA_TYPES = new Set([
  'String', 'Integer', 'Long', 'Double', 'Boolean', 'List', 'Map', 'Object', 'Result',
  'GenerateResponse', 'UserPrincipal', 'RuntimeException', 'Exception', 'Collections'
])

function tokenizeJavaLine(line) {
  const tokens = []
  const push = (text, type = 'plain') => {
    if (text) tokens.push({ text, type })
  }

  let rest = line
  const commentIndex = rest.indexOf('//')
  const blockCommentIndex = rest.indexOf('/*')
  const starComment = rest.trimStart().startsWith('*')
  if (starComment) {
    return [{ text: line || ' ', type: 'comment' }]
  }

  let comment = ''
  let cutIndex = -1
  if (commentIndex >= 0 && blockCommentIndex >= 0) cutIndex = Math.min(commentIndex, blockCommentIndex)
  else cutIndex = Math.max(commentIndex, blockCommentIndex)
  if (cutIndex >= 0) {
    comment = rest.slice(cutIndex)
    rest = rest.slice(0, cutIndex)
  }

  const pattern = /(@[A-Za-z_][\w]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][\w]*\b|\s+|.)/g
  let match
  const previousWords = []
  while ((match = pattern.exec(rest)) !== null) {
    const part = match[0]
    if (/^\s+$/.test(part)) {
      push(part)
      continue
    }
    if (part.startsWith('@')) {
      push(part, 'annotation')
      continue
    }
    if (part.startsWith('"') || part.startsWith("'")) {
      push(part, 'string')
      continue
    }
    if (/^\d/.test(part)) {
      push(part, 'number')
      continue
    }
    if (/^[A-Za-z_]\w*$/.test(part)) {
      const nextChunk = rest.slice(pattern.lastIndex).trimStart()
      const previous = previousWords[previousWords.length - 1]
      if (JAVA_KEYWORDS.has(part)) push(part, 'keyword')
      else if (JAVA_TYPES.has(part) || /^[A-Z]/.test(part)) push(part, 'type')
      else if (nextChunk.startsWith('(')) push(part, 'method')
      else if (previous === 'new') push(part, 'type')
      else push(part, 'variable')
      previousWords.push(part)
      continue
    }
    push(part, /[{}()[\];,.=+\-*/<>!?:]/.test(part) ? 'punctuation' : 'plain')
  }
  if (comment) push(comment, 'comment')
  return tokens.length ? tokens : [{ text: ' ', type: 'plain' }]
}
