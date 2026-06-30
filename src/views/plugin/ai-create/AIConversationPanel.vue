<script setup>
import {
  Back,
  ChatDotRound,
  Delete,
  MagicStick,
  Promotion,
  Refresh
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
  'delete-round',
  'regenerate'
])

const chatScrollRef = defineModel('chatScrollRef')

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
              <Transition name="message-text-slide" mode="out-in">
                <span :key="message.content">{{ message.content }}</span>
              </Transition>
            </p>
            <span v-if="message.createTime" class="message-time">{{ message.createTime }}</span>
          </div>
          <div v-if="message.round > 0" class="message-actions">
            <el-button
              v-if="message.role === 'user'"
              class="message-icon-button"
              :icon="Delete"
              text
              type="danger"
              :disabled="generationLoading"
              @click="emit('delete-round', message.round)"
            />
            <el-button
              v-if="message.role === 'assistant' && message.round === currentRound && currentRound > 0"
              class="message-icon-button"
              :icon="Back"
              text
              :disabled="generationLoading"
              @click="emit('undo', message.round)"
            />
            <el-button
              v-if="message.role === 'assistant'"
              class="message-icon-button"
              :icon="Refresh"
              text
              :disabled="generationLoading"
              @click="emit('regenerate', message)"
            />
          </div>
        </div>
      </div>
    </el-scrollbar>

    <div class="chat-input-box">
      <el-input
        :model-value="chatInput"
        type="textarea"
        :rows="2"
        maxlength="1000"
        show-word-limit
        resize="none"
        :disabled="generationLoading"
        placeholder="描述你想生成或修改的插件功能..."
        @update:model-value="emit('update:chatInput', $event)"
        @keydown="handleInputKeydown"
      />
      <el-button
        type="primary"
        :icon="conversationId ? Promotion : MagicStick"
        :loading="generationLoading"
        @click="emit('send')"
      />
      <div class="input-hint">Enter 发送，Alt + Enter 换行</div>
    </div>
  </section>
</template>
