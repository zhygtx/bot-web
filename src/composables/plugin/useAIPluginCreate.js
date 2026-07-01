import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { createPatch } from 'diff'
import request from '../../utils/request'

const DEFAULT_ENTITY_PACKAGE = 'com.example.entity'
const DEFAULT_METHOD_PACKAGE = 'com.example.service'
const DRAFT_KEY = 'ai-plugin-create-draft'

export const useAIPluginCreate = () => {
  const route = useRoute()
  const router = useRouter()

  const generationLoading = ref(false)
  const compileLoading = ref(false)
  const historyLoading = ref(false)
  const reviewVisible = ref(false)
  const activeTab = ref('code')
  const activeFilePath = ref('')
  const conversationId = ref(route.query.conversationId || '')
  const currentRound = ref(0)
  const generatedFiles = ref([])
  const previousFiles = ref([])
  const displayedFiles = ref([])
  const dependencies = ref([])
  const reviewResult = ref(null)
  const chatScrollRef = ref(null)
  const chatInput = ref('')
  const reviewEnabled = ref(false)
  const compileStepIndex = ref(0)
  const webSocketRef = ref(null)
  const draftSavePaused = ref(false)

  const demandForm = ref({
    entityPackage: route.query.entityPackage || DEFAULT_ENTITY_PACKAGE,
    methodPackage: route.query.methodPackage || DEFAULT_METHOD_PACKAGE,
    pluginId: route.query.pluginId || ''
  })

  const publishForm = ref({
    name: '',
    description: '',
    version: '1.0.0',
    changelog: 'AI 自动生成',
    isPublic: true
  })

  const chatMessages = ref([createWelcomeMessage()])

  const isUpdateMode = computed(() => Boolean(demandForm.value.pluginId))
  const hasGeneratedCode = computed(() => generatedFiles.value.length > 0)
  const visibleFiles = computed(() => displayedFiles.value.length ? displayedFiles.value : generatedFiles.value)
  const activeFile = computed(() => visibleFiles.value.find(file => file.filePath === activeFilePath.value) || visibleFiles.value[0])
  const codeLineCount = computed(() => activeFile.value?.content?.split('\n').length || 0)
  const reviewIssues = computed(() => Array.isArray(reviewResult.value?.issues) ? reviewResult.value.issues : [])
  const reviewPassed = computed(() => reviewResult.value == null || reviewResult.value.passed === true)
  const canCompile = computed(() => hasGeneratedCode.value && !compileLoading.value && !generationLoading.value)
  const shortConversationId = computed(() => {
    if (!conversationId.value) return '未开始'
    return conversationId.value.length > 12 ? `${conversationId.value.slice(0, 8)}...` : conversationId.value
  })
  const selectedFileName = computed(() => {
    const path = activeFile.value?.filePath || ''
    return path.split('/').pop() || '未选择文件'
  })
  const totalCodeLines = computed(() => visibleFiles.value.reduce((sum, file) => sum + (file.content?.split('\n').length || 0), 0))
  const compileButtonText = computed(() => {
    if (!compileLoading.value) return '确认编译并上传'
    return compileStepLabels.value[compileStepIndex.value] || '处理中'
  })
  const compileStepLabels = computed(() => {
    const labels = ['Maven 编译', '扫描校验', '上传插件']
    return reviewEnabled.value ? ['代码审查', ...labels] : labels
  })
  const reviewBadge = computed(() => {
    if (!reviewVisible.value || !reviewResult.value) return null
    return reviewResult.value.passed === false ? { type: 'danger', text: '审查未通过' } : null
  })

  const fileTree = computed(() => buildFileTree(visibleFiles.value))

  const diffText = computed(() => {
    if (!activeFile.value) return ''
    const previousFile = previousFiles.value.find(file => file.filePath === activeFile.value.filePath)
    if (!previousFile) {
      return createPatch(activeFile.value.filePath, '', activeFile.value.content || '', 'previous', 'current')
    }
    return createPatch(activeFile.value.filePath, previousFile.content || '', activeFile.value.content || '', 'previous', 'current')
  })

  const diffLines = computed(() => {
    return diffText.value
      .split('\n')
      .filter(line => !line.startsWith('Index:') && !line.startsWith('==='))
      .map((line, index) => {
        let type = 'context'
        if (line.startsWith('+') && !line.startsWith('+++')) type = 'added'
        if (line.startsWith('-') && !line.startsWith('---')) type = 'removed'
        if (line.startsWith('@@')) type = 'hunk'
        return { id: index, text: line || ' ', type }
      })
  })

  const scrollChatToBottom = async () => {
    await nextTick()
    const wrap = chatScrollRef.value?.wrapRef
    if (wrap) wrap.scrollTop = wrap.scrollHeight
  }

  const saveDraft = (force = false) => {
    if (draftSavePaused.value && !force) return
    if (!conversationId.value && !chatInput.value && !hasGeneratedCode.value) return
    draftSavePaused.value = false
    const draft = {
      conversationId: conversationId.value,
      currentRound: currentRound.value,
      demandForm: demandForm.value,
      publishForm: publishForm.value,
      chatInput: chatInput.value,
      updateTime: new Date().toISOString()
    }
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  }

  const saveDraftManually = () => {
    saveDraft(true)
    ElMessage.success('草稿已保存')
  }

  const deleteDraft = () => {
    localStorage.removeItem(DRAFT_KEY)
    resetPageState()
    draftSavePaused.value = true
    ElMessage.success('当前草稿已删除')
  }

  const resetPageState = () => {
    try {
      webSocketRef.value?.close?.()
    } catch (error) {
      // ignore closed socket
    }
    generationLoading.value = false
    compileLoading.value = false
    historyLoading.value = false
    reviewVisible.value = false
    activeTab.value = 'code'
    activeFilePath.value = ''
    conversationId.value = ''
    currentRound.value = 0
    generatedFiles.value = []
    previousFiles.value = []
    displayedFiles.value = []
    dependencies.value = []
    reviewResult.value = null
    chatInput.value = ''
    compileStepIndex.value = 0
    webSocketRef.value = null
    demandForm.value = {
      entityPackage: DEFAULT_ENTITY_PACKAGE,
      methodPackage: DEFAULT_METHOD_PACKAGE,
      pluginId: ''
    }
    publishForm.value = {
      name: '',
      description: '',
      version: '1.0.0',
      changelog: 'AI 自动生成',
      isPublic: true
    }
    chatMessages.value = [createWelcomeMessage()]
    if (Object.keys(route.query || {}).length) {
      router.replace({ path: route.path })
    }
  }

  const restoreDraft = () => {
    if (conversationId.value) return
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (!raw) return
      const draft = JSON.parse(raw)
      if (!draft?.conversationId) {
        if (draft?.publishForm) publishForm.value = { ...publishForm.value, ...draft.publishForm }
        if (draft?.chatInput) chatInput.value = draft.chatInput
        return
      }
      conversationId.value = draft.conversationId
      currentRound.value = draft.currentRound || 0
      demandForm.value = { ...demandForm.value, ...(draft.demandForm || {}) }
      publishForm.value = { ...publishForm.value, ...(draft.publishForm || {}) }
      chatInput.value = draft.chatInput || ''
    } catch (error) {
      localStorage.removeItem(DRAFT_KEY)
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
      createTime: formatTime()
    })
    const assistantMessage = createGeneratingMessage(nextRound)
    chatMessages.value.push(assistantMessage)
    await scrollChatToBottom()

    try {
      await sendPromptStream(text, assistantMessage.id)
    } catch (error) {
      patchChatMessage(assistantMessage.id, {
        error: true,
        content: error.message || 'AI 生成失败'
      })
    } finally {
      generationLoading.value = false
      draftSavePaused.value = false
      saveDraft()
      scrollChatToBottom()
    }
  }

  const sendPromptStream = (text, assistantMessageId) => {
    const token = localStorage.getItem('token')
    if (!token) {
      return Promise.reject(new Error('登录状态已失效，请重新登录'))
    }

    displayedFiles.value = []
    activeFilePath.value = ''
    activeTab.value = 'code'

    return new Promise((resolve, reject) => {
      let rawText = ''
      let settled = false
      const socket = new WebSocket(buildAIPluginWsUrl(token))
      webSocketRef.value = socket

      const finish = callback => {
        if (settled) return
        settled = true
        if (webSocketRef.value === socket) webSocketRef.value = null
        try {
          if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
            socket.close()
          }
        } catch (error) {
          // ignore closed socket
        }
        callback()
      }

      socket.onopen = () => {
        socket.send(JSON.stringify({
          type: 'message',
          data: {
            conversationId: conversationId.value || '',
            message: text
          }
        }))
      }

      socket.onmessage = async event => {
        const parsed = parseWsMessage(event.data)
        if (!parsed) return
        if (parsed.type === 'delta') {
          rawText += parsed.data || ''
          updateStreamingPreview(rawText, assistantMessageId)
          await scrollChatToBottom()
          return
        }
        if (parsed.type === 'message_change') {
          const progress = String(parsed.data || '')
          patchChatMessage(assistantMessageId, {
            progress,
            content: progress,
            hasBackendContent: true
          })
          return
        }
        if (parsed.type === 'done') {
          const messages = Array.isArray(parsed.data) ? parsed.data : []
          restoreConversationFromMessages(messages)
          const latestPayload = getLatestAssistantPayload(messages)
          if (latestPayload) fillPublishInfo(latestPayload, text)
          finish(resolve)
          return
        }
        if (parsed.type === 'error') {
          finish(() => reject(new Error(parsed.data?.message || 'AI 生成失败')))
        }
      }

      socket.onerror = () => {
        finish(() => reject(new Error('WebSocket 连接异常，AI 生成中断')))
      }

      socket.onclose = () => {
        if (!settled) {
          finish(() => reject(new Error('WebSocket 连接已关闭，AI 生成中断')))
        }
      }
    })
  }

  const parseWsMessage = raw => {
    try {
      return JSON.parse(raw)
    } catch (error) {
      return null
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

  const patchChatMessage = (id, patch) => {
    const index = chatMessages.value.findIndex(message => message.id === id)
    if (index < 0) return
    chatMessages.value[index] = {
      ...chatMessages.value[index],
      ...patch
    }
  }

  const fillPublishInfo = (data, text) => {
    const payload = normalizePayload(data || {})
    if (payload.round !== 1) return
    if (!publishForm.value.name) {
      publishForm.value.name = payload.pluginName || inferPluginName(text)
    }
    if (!publishForm.value.description) {
      publishForm.value.description = payload.pluginDescription || text.slice(0, 80)
    }
  }

  const restoreConversationFromMessages = messages => {
    const sortedMessages = normalizeConversationMessages(messages)
    const assistantMessages = sortedMessages.filter(message => message.role === 'assistant')
    const latestAssistant = assistantMessages[assistantMessages.length - 1]
    const previousAssistant = assistantMessages[assistantMessages.length - 2]
    const latestPayload = latestAssistant ? parseAssistantContent(latestAssistant.code || latestAssistant.message) : null
    const previousPayload = previousAssistant ? parseAssistantContent(previousAssistant.code || previousAssistant.message) : null

    const restoredMessages = [createWelcomeMessage()]
    sortedMessages.forEach((message, index) => {
      if (message.role === 'assistant') {
        const payload = parseAssistantContent(message.code || message.message)
        restoredMessages.push({
          id: message.id || `assistant-${message.round}-${index}`,
          role: 'assistant',
          round: Number(message.round) || 0,
          content: '代码生成完毕',
          createTime: message.createTime || '',
          files: payload.files,
          dependencies: payload.dependencies,
          pluginName: payload.pluginName,
          pluginDescription: payload.pluginDescription,
          reviewResult: payload.reviewResult
        })
        return
      }
      restoredMessages.push({
        id: message.id || `user-${message.round}-${index}`,
        role: 'user',
        round: Number(message.round) || 0,
        content: message.message || '',
        createTime: message.createTime || ''
      })
    })

    const maxRound = sortedMessages.reduce((max, message) => Math.max(max, Number(message.round) || 0), 0)
    const firstMessage = sortedMessages[0]
    chatMessages.value = restoredMessages
    conversationId.value = firstMessage?.conversationId || conversationId.value
    currentRound.value = maxRound
    demandForm.value.pluginId = firstMessage?.pluginId || demandForm.value.pluginId
    previousFiles.value = previousPayload?.files || []
    generatedFiles.value = latestPayload?.files || []
    displayedFiles.value = latestPayload?.files || []
    dependencies.value = latestPayload?.dependencies || []
    reviewResult.value = latestPayload?.reviewResult || null
    activeFilePath.value = generatedFiles.value[0]?.filePath || ''
    if (latestPayload) fillPublishInfo({ ...latestPayload, round: 1 }, '')
    saveDraft()
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
      await loadConversation(conversationId.value, false)
      chatInput.value = userMessage?.content || chatInput.value
    } finally {
      generationLoading.value = false
    }
  }

  const validatePublishForm = () => {
    if (!publishForm.value.name.trim()) {
      ElMessage.warning('请输入插件名称')
      return false
    }
    if (!publishForm.value.version.trim()) {
      ElMessage.warning('请输入版本号')
      return false
    }
    return true
  }

  const confirmCompile = async () => {
    if (!hasGeneratedCode.value) {
      ElMessage.warning('请先生成代码')
      return
    }
    if (!validatePublishForm()) return
    compileLoading.value = true
    compileStepIndex.value = 0
    reviewVisible.value = false

    const timer = window.setInterval(() => {
      compileStepIndex.value = Math.min(compileStepIndex.value + 1, compileStepLabels.value.length - 1)
    }, 1200)
    try {
      const response = await request({
        url: '/ai-plugin/conversation/compile',
        method: 'post',
        data: {
          files: generatedFiles.value,
          dependencies: dependencies.value,
          name: publishForm.value.name.trim(),
          description: publishForm.value.description.trim(),
          version: publishForm.value.version.trim(),
          changelog: publishForm.value.changelog.trim(),
          entityPackage: demandForm.value.entityPackage || DEFAULT_ENTITY_PACKAGE,
          methodPackage: demandForm.value.methodPackage || DEFAULT_METHOD_PACKAGE,
          isPublic: publishForm.value.isPublic,
          conversationId: conversationId.value,
          reviewResult: reviewResult.value
        },
        timeout: 180000
      })
      const pluginId = response.data?.pluginId
      const versionId = response.data?.versionId
      reviewResult.value = null
      reviewVisible.value = false
      ElMessage.success('编译上传完成')
      if (pluginId) router.push(`/plugin/${pluginId}${versionId ? `?versionId=${versionId}` : ''}`)
    } catch (error) {
      reviewResult.value = error.data?.reviewResult || reviewResult.value
      reviewVisible.value = reviewResult.value?.passed === false
      if (reviewVisible.value) activeTab.value = 'review'
    } finally {
      window.clearInterval(timer)
      compileLoading.value = false
      compileStepIndex.value = 0
    }
  }

  const loadConversation = async (id, showLoading = true) => {
    if (!id) return
    if (showLoading) historyLoading.value = true
    try {
      const response = await request({
        url: `/ai-plugin/${id}`,
        method: 'get',
        timeout: 60000
      })
      restoreConversationFromMessages(Array.isArray(response.data) ? response.data : [])
    } finally {
      if (showLoading) historyLoading.value = false
      scrollChatToBottom()
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
    saveDraft()
    router.push('/plugin/ai-list')
  }

  onMounted(() => {
    loadAIPluginConfig()
    restoreDraft()
    if (conversationId.value) loadConversation(conversationId.value)
  })

  onBeforeRouteLeave(() => {
    saveDraft()
  })

  onBeforeUnmount(() => {
    saveDraft()
    try {
      webSocketRef.value?.close?.()
    } catch (error) {
      // ignore closed socket
    }
  })

  return {
    generationLoading,
    compileLoading,
    historyLoading,
    reviewVisible,
    activeTab,
    activeFilePath,
    conversationId,
    currentRound,
    generatedFiles,
    dependencies,
    reviewResult,
    reviewEnabled,
    chatScrollRef,
    chatInput,
    publishForm,
    chatMessages,
    isUpdateMode,
    hasGeneratedCode,
    activeFile,
    codeLineCount,
    reviewIssues,
    reviewPassed,
    canCompile,
    shortConversationId,
    selectedFileName,
    totalCodeLines,
    compileButtonText,
    reviewBadge,
    fileTree,
    diffLines,
    sendPrompt,
    saveDraftManually,
    deleteDraft,
    undoToBeforeRound,
    confirmCompile,
    selectTreeNode,
    copyCurrentCode,
    highlightLine,
    goBack
  }
}

function createWelcomeMessage() {
  return {
    id: 'welcome',
    role: 'assistant',
    round: 0,
    content: '请描述你想生成的插件需求，我会生成 Java 源码、依赖和审查结果。',
    createTime: '',
    files: [],
    dependencies: [],
    reviewResult: null
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
    reviewResult: null,
    error: false,
    hasBackendContent: false
  }
}

function getLatestAssistantPayload(messages) {
  const assistantMessages = normalizeConversationMessages(messages).filter(message => message.role === 'assistant')
  const latestAssistant = assistantMessages[assistantMessages.length - 1]
  return latestAssistant ? parseAssistantContent(latestAssistant.code || latestAssistant.message) : null
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
    if (Array.isArray(parsed)) return { files: parsed.map(normalizeGeneratedFile), dependencies: [], reviewResult: null }
    return {
      files: Array.isArray(parsed.files) ? parsed.files.map(normalizeGeneratedFile) : [],
      dependencies: Array.isArray(parsed.dependencies) ? parsed.dependencies : [],
      pluginName: parsed.pluginName || '',
      pluginDescription: parsed.pluginDescription || '',
      reviewResult: parsed.reviewResult || null
    }
  } catch (error) {
    return { files: [], dependencies: [], pluginName: '', pluginDescription: '', reviewResult: null }
  }
}

function normalizeGeneratedFile(file) {
  return {
    filePath: (file.filePath || file.path || '').replace(/\\/g, '/'),
    content: file.content || file.code || ''
  }
}

function buildFileTree(files) {
  const root = []
  const rootMap = new Map()
  const ensureNode = (children, map, part, path, leaf = false) => {
    if (map.has(path)) return map.get(path)
    const node = { id: path, label: part, path: leaf ? path : '', leaf, children: leaf ? undefined : [] }
    children.push(node)
    map.set(path, node)
    return node
  }
  files.forEach(file => {
    const parts = file.filePath.split('/').filter(Boolean)
    let children = root
    let map = rootMap
    let currentPath = ''
    parts.forEach((part, index) => {
      currentPath = currentPath ? `${currentPath}/${part}` : part
      const leaf = index === parts.length - 1
      const node = ensureNode(children, map, part, currentPath, leaf)
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

function normalizePayload(data) {
  return {
    conversationId: data.conversationId,
    round: data.round || data.currentRound,
    files: Array.isArray(data.files) ? data.files.map(normalizeGeneratedFile) : [],
    dependencies: Array.isArray(data.dependencies) ? data.dependencies : [],
    pluginName: data.pluginName || '',
    pluginDescription: data.pluginDescription || '',
    reviewResult: data.reviewResult || null
  }
}

function buildAIPluginWsUrl(token) {
  const query = `token=${encodeURIComponent(token)}`
  if (import.meta.env.DEV) {
    return `ws://localhost:8080/ws/ai-plugin?${query}`
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/ws/ai-plugin?${query}`
}

function isDisplayableGeneratedPath(filePath) {
  return filePath.startsWith('src/main/java/') || filePath.startsWith('src/main/resources/')
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

function inferPluginName(requirements) {
  const trimmed = requirements.replace(/\s+/g, '')
  if (!trimmed) return ''
  const match = trimmed.match(/(?:做一个|生成一个|创建一个|需要一个|开发一个)?([^，。,.、\s]{2,16})(?:插件|系统|功能)/)
  return match?.[1] ? `${match[1]}插件` : `${trimmed.slice(0, 10)}插件`
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
