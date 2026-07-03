<script setup>
import {
  Back,
  ChatDotRound,
  MagicStick,
  Promotion
} from '@element-plus/icons-vue'

defineProps({
  chatMessages: { type: Array, required: true },
  chatInput: { type: String, default: '' },
  conversationId: { type: String, default: '' },
  shortConversationId: { type: String, default: '未开始' },
  generationLoading: { type: Boolean, default: false },
  currentRound: { type: Number, default: 0 }
})

const emit = defineEmits([
  'update:chatInput',
  'send',
  'undo',
  'cancel'
])

const chatScrollRef = defineModel('chatScrollRef')

const shouldShowTypingDots = (message, messages, isGenerating) => {
  if (message.role !== 'assistant') return false
  if (message.loading || message.waitingForBackend || (!message.hasBackendContent && message.content === '...')) return true

  const latestAssistant = [...messages].reverse().find(item => item.role === 'assistant')
  return Boolean(isGenerating && message.round > 0 && latestAssistant?.id === message.id && !message.hasBackendContent)
}

const handleInputKeydown = event => {
  if (event.key !== 'Enter') return
  if (event.altKey) return
  event.preventDefault()
  emit('send')
}
</script>

<template>
  <section class="panel conversation-panel">
    <div class="panel-header">
      <div>
        <h2>对话</h2>
        <p>会话ID：{{ shortConversationId }}</p>
      </div>
    </div>

    <el-scrollbar ref="chatScrollRef" class="chat-history">
      <div
        v-for="message in chatMessages"
        :key="message.id"
        class="message-row"
        :class="[message.role, { error: message.error }]"
      >
        <div class="avatar">
          <el-icon v-if="message.role === 'assistant'"><ChatDotRound /></el-icon>
          <span v-else>我</span>
          </div>
        <div class="message-stack">
          <div class="message-bubble">
            <p class="message-text">
              <span
                v-if="shouldShowTypingDots(message, chatMessages, generationLoading)"
                :key="`${message.id}-loading`"
                class="typing-dots"
                aria-label="正在加载"
              >
                <i></i>
                <i></i>
                <i></i>
              </span>
              <Transition v-else name="message-text-slide" mode="out-in">
                <span :key="message.content">{{ message.content }}</span>
              </Transition>
            </p>
            <span v-if="message.createTime" class="message-time">{{ message.createTime }}</span>
          </div>
          <div
            v-if="message.role === 'assistant' && message.round === currentRound && currentRound > 0"
            class="message-actions"
          >
            <el-button
              class="message-icon-button"
              :icon="Back"
              text
              :disabled="generationLoading"
              @click="emit('undo', message.round)"
            />
          </div>
        </div>
      </div>
    </el-scrollbar>

    <div class="chat-input-box">
      <el-input
        :model-value="chatInput"
        type="textarea"
        :autosize="{ minRows: 2, maxRows: 6 }"
        maxlength="1000"
        show-word-limit
        resize="none"
        :disabled="generationLoading"
        placeholder="描述你想生成或修改的插件功能..."
        @update:model-value="emit('update:chatInput', $event)"
        @keydown="handleInputKeydown"
      />
      <el-button
        v-if="generationLoading"
        type="danger"
        @click="emit('cancel')"
      >停止</el-button>
      <el-button
        v-else
        type="primary"
        :icon="conversationId ? Promotion : MagicStick"
        @click="emit('send')"
      />
      <div class="input-hint">Enter 发送，Alt + Enter 换行</div>
    </div>
  </section>
</template>
