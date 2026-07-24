<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  Back,
  Loading,
  Top
} from '@element-plus/icons-vue'
import AIMessageMarkdown from './AIMessageMarkdown.vue'
import AIToolCallBlock from './AIToolCallBlock.vue'

const props = defineProps({
  chatMessages: { type: Array, required: true },
  chatInput: { type: String, default: '' },
  conversationId: { type: String, default: '' },
  generationLoading: { type: Boolean, default: false },
  currentRound: { type: Number, default: 0 }
})

const emit = defineEmits([
  'update:chatInput',
  'send',
  'undo',
  'cancel'
])

// 内部管理 ref，通过 defineExpose 暴露给父组件
const chatScrollRef = ref(null)
defineExpose({ chatScrollRef })

/* —— 会话导航圆点 —— */
const activeUserIndex = ref(-1)
const hoverUserIndex = ref(-1)

const userMessages = computed(() => props.chatMessages.filter(m => m.role === 'user'))

const getUserMessageEls = () => {
  const container = chatScrollRef.value
  if (!container) return []
  return Array.from(container.querySelectorAll('[data-user-round]'))
}

// 根据可视区域中心计算当前停留的用户消息
const updateActiveUserIndex = () => {
  const container = chatScrollRef.value
  if (!container) return
  const els = getUserMessageEls()
  if (!els.length) {
    activeUserIndex.value = -1
    return
  }
  const containerRect = container.getBoundingClientRect()
  const viewportCenter = containerRect.top + containerRect.height / 2
  let closestIndex = 0
  let closestDistance = Infinity
  els.forEach((el, idx) => {
    const rect = el.getBoundingClientRect()
    const elCenter = rect.top + rect.height / 2
    const distance = Math.abs(elCenter - viewportCenter)
    if (distance < closestDistance) {
      closestDistance = distance
      closestIndex = idx
    }
  })
  activeUserIndex.value = closestIndex
}

// 根据到活跃点的距离返回样式类（控制颜色深浅渐变）
const dotClass = (index) => {
  const active = activeUserIndex.value
  if (active < 0) return ''
  const d = Math.abs(index - active)
  if (d === 0) return 'dot-active'
  if (d === 1) return 'dot-near-1'
  if (d === 2) return 'dot-near-2'
  if (d === 3) return 'dot-near-3'
  return ''
}

// 消息预览文本（过长省略）
const getMessagePreview = (index) => {
  const msg = userMessages.value[index]
  if (!msg) return ''
  const text = msg.content || ''
  return text.length > 40 ? text.slice(0, 40) + '...' : text
}

// 点击圆点滚动到对应用户消息
const scrollToUserMessage = (index) => {
  const els = getUserMessageEls()
  const el = els[index]
  const container = chatScrollRef.value
  if (!el || !container) return
  const containerRect = container.getBoundingClientRect()
  const elRect = el.getBoundingClientRect()
  const targetTop = elRect.top - containerRect.top + container.scrollTop - (containerRect.height - elRect.height) / 2
  container.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' })
}

let scrollHandler = null
const setupScrollListener = () => {
  const container = chatScrollRef.value
  if (!container) return
  if (scrollHandler) {
    container.removeEventListener('scroll', scrollHandler)
  }
  scrollHandler = () => updateActiveUserIndex()
  container.addEventListener('scroll', scrollHandler, { passive: true })
  updateActiveUserIndex()
}

watch(() => props.chatMessages.length, () => {
  nextTick(setupScrollListener)
})

onMounted(() => {
  nextTick(setupScrollListener)
})

onBeforeUnmount(() => {
  if (scrollHandler && chatScrollRef.value) {
    chatScrollRef.value.removeEventListener('scroll', scrollHandler)
  }
})

const shouldShowTypingDots = message => {
  return message.role === 'assistant' && (message.loading || message.waitingForBackend) && !message.parts?.length
}

const messageParts = message => {
  if (Array.isArray(message.parts) && message.parts.length) return message.parts
  return message.content ? [{ type: 'text', content: message.content }] : []
}

const toolCallForPart = (message, part) => {
  return message.toolCalls?.[part.toolCallId] || null
}

const handleInputKeydown = event => {
  if (event.key !== 'Enter') return
  if (event.altKey || event.shiftKey) return
  event.preventDefault()
  if (canSend.value) emit('send')
}

// 是否可发送：输入框有内容且未在生成中
const canSend = computed(() => {
  const text = (props.chatInput || '').trim()
  return text.length > 0 && !props.generationLoading
})
</script>

<template>
  <section class="conversation-shell">
    <!-- 会话导航圆点 — 固定在主内容区左侧边缘 -->
    <div
      v-if="userMessages.length >= 1"
      class="chat-nav-dots"
      @mouseleave="hoverUserIndex = -1"
    >
      <div
        v-for="(msg, index) in userMessages"
        :key="msg.id"
        class="nav-dot-wrapper"
        @mouseenter="hoverUserIndex = index"
        @click="scrollToUserMessage(index)"
      >
        <div
          class="nav-dot"
          :class="dotClass(index)"
          :data-hovered="hoverUserIndex === index"
        ></div>
        <div v-if="hoverUserIndex === index" class="nav-dot-tooltip">
          {{ getMessagePreview(index) }}
        </div>
      </div>
    </div>

    <div ref="chatScrollRef" class="chat-history">
      <div class="conversation-feed">
        <div
          v-for="message in chatMessages"
          :key="message.id"
          class="message-row"
          :class="[message.role, { error: message.error }]"
          :data-user-round="message.role === 'user' ? message.round : null"
        >
          <div class="message-stack">
            <div v-if="message.role === 'user'" class="message-meta">
              <span>你</span>
              <span v-if="message.createTime">{{ message.createTime }}</span>
            </div>

            <div class="message-surface">
              <span
                v-if="shouldShowTypingDots(message)"
                class="typing-dots"
                aria-label="正在加载"
              >
                <i></i>
                <i></i>
                <i></i>
              </span>

              <template v-else>
                <template v-for="(part, index) in messageParts(message)" :key="`${message.id}-${index}`">
                  <AIMessageMarkdown
                    v-if="part.type === 'text' && part.content"
                    :content="part.content"
                    :class="{ 'user-markdown': message.role === 'user' }"
                  />
                  <AIToolCallBlock
                    v-else-if="part.type === 'tool_call'"
                    :tool-call="toolCallForPart(message, part)"
                  />
                </template>
              </template>
            </div>

            <div
              v-if="message.role === 'assistant' && message.round === currentRound && currentRound > 0 && !generationLoading"
              class="message-actions"
            >
              <el-button
                :icon="Back"
                text
                size="small"
                @click="emit('undo', message.round)"
              >
                撤回本轮
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="composer">
      <textarea
        class="composer-input"
        :value="chatInput"
        maxlength="2000"
        :disabled="generationLoading"
        placeholder="描述插件要处理的事件、动作、参数和返回结果..."
        @input="emit('update:chatInput', $event.target.value)"
        @keydown="handleInputKeydown"
      ></textarea>
      <el-button
        class="composer-send-button"
        :class="{
          loading: generationLoading,
          'is-disabled': !canSend
        }"
        circle
        :disabled="!canSend"
        :icon="generationLoading ? Loading : Top"
        @click="canSend ? emit('send') : null"
      />
    </div>
  </section>
</template>
