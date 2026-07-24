<script setup>
import {
  Back,
  Top,
  VideoPause
} from '@element-plus/icons-vue'
import AIMessageMarkdown from './AIMessageMarkdown.vue'
import AIToolCallBlock from './AIToolCallBlock.vue'

defineProps({
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

const chatScrollRef = defineModel('chatScrollRef')

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
  emit('send')
}
</script>

<template>
  <section class="conversation-shell">
    <el-scrollbar ref="chatScrollRef" class="chat-history">
      <div class="conversation-feed">
        <div
          v-for="message in chatMessages"
          :key="message.id"
          class="message-row"
          :class="[message.role, { error: message.error }]"
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
              v-if="message.role === 'assistant' && message.round === currentRound && currentRound > 0"
              class="message-actions"
            >
              <el-button
                :icon="Back"
                text
                size="small"
                :disabled="generationLoading"
                @click="emit('undo', message.round)"
              >
                撤回本轮
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </el-scrollbar>

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
        v-if="generationLoading"
        class="composer-send-button stop"
        circle
        :icon="VideoPause"
        @click="emit('cancel')"
      />
      <el-button
        v-else
        class="composer-send-button"
        circle
        :icon="Top"
        @click="emit('send')"
      />
    </div>
  </section>
</template>
