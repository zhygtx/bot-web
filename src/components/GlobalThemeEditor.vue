<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { ArrowDown, Brush } from '@element-plus/icons-vue'
import { useThemeEditor } from '../composables/useThemeEditor'
import { useThemePreviewStore } from '../stores/themePreview'
import ThemeEditorPanel from '../views/theme/ThemeEditorPanel.vue'

const open = ref(false)
const panelMovedInCurrentOpen = ref(false)
const panelPosition = reactive({ x: 0, y: 0 })
const bubblePosition = reactive({ x: 0, y: 0 })
const drag = reactive({
  active: false,
  kind: 'panel',
  pointerId: null,
  startX: 0,
  startY: 0,
  originX: 0,
  originY: 0,
  moved: false
})

const themePreviewStore = useThemePreviewStore()

const {
  loading,
  saving,
  jsonDialogVisible,
  jsonContent,
  editMode,
  editor,
  syncEditor,
  applySelectedTheme,
  deleteCustomTheme,
  openJsonEditor,
  applyJsonContent
} = useThemeEditor({
  previewDraft: true,
  afterApply: () => {
    open.value = false
    themePreviewStore.finishPreview()
  }
})

const panelSize = computed(() => ({
  width: 430,
  height: Math.min(window.innerHeight - 72, 760)
}))

const bubbleSize = { width: 48, height: 48 }

const clampPoint = (point, size) => {
  if (typeof window === 'undefined') return
  const margin = 12
  point.x = Math.min(Math.max(point.x, margin), Math.max(margin, window.innerWidth - size.width - margin))
  point.y = Math.min(Math.max(point.y, margin), Math.max(margin, window.innerHeight - size.height - margin))
}

const clampPositions = () => {
  clampPoint(panelPosition, panelSize.value)
  clampPoint(bubblePosition, bubbleSize)
}

const setDefaultPosition = () => {
  if (typeof window === 'undefined') return
  const margin = 24
  panelPosition.x = Math.max(12, window.innerWidth - panelSize.value.width - margin)
  panelPosition.y = Math.max(12, window.innerHeight - panelSize.value.height - margin)
  bubblePosition.x = Math.max(12, window.innerWidth - bubbleSize.width - margin)
  bubblePosition.y = Math.max(12, window.innerHeight - bubbleSize.height - margin)
  nextTick(clampPositions)
}

const startDrag = (event, kind) => {
  drag.active = true
  drag.kind = kind
  drag.pointerId = event.pointerId
  drag.startX = event.clientX
  drag.startY = event.clientY
  const point = kind === 'panel' ? panelPosition : bubblePosition
  drag.originX = point.x
  drag.originY = point.y
  drag.moved = false
  event.currentTarget?.setPointerCapture?.(event.pointerId)
}

const moveDrag = (event) => {
  if (!drag.active || drag.pointerId !== event.pointerId) return
  const dx = event.clientX - drag.startX
  const dy = event.clientY - drag.startY
  if (Math.abs(dx) > 3 || Math.abs(dy) > 3) drag.moved = true
  const point = drag.kind === 'panel' ? panelPosition : bubblePosition
  point.x = drag.originX + dx
  point.y = drag.originY + dy
  clampPoint(point, drag.kind === 'panel' ? panelSize.value : bubbleSize)
  if (drag.kind === 'panel' && drag.moved) panelMovedInCurrentOpen.value = true
}

const stopDrag = (event) => {
  if (!drag.active || drag.pointerId !== event.pointerId) return
  drag.active = false
  event.currentTarget?.releasePointerCapture?.(event.pointerId)
}

const openPanel = () => {
  if (drag.moved) {
    drag.moved = false
    return
  }
  panelPosition.x = bubblePosition.x - panelSize.value.width + bubbleSize.width
  panelPosition.y = bubblePosition.y - panelSize.value.height + bubbleSize.height
  open.value = true
  panelMovedInCurrentOpen.value = false
  nextTick(clampPositions)
}

const collapsePanel = (event) => {
  if (panelMovedInCurrentOpen.value && event?.currentTarget) {
    const rect = event.currentTarget.getBoundingClientRect()
    bubblePosition.x = rect.left + rect.width / 2 - bubbleSize.width / 2
    bubblePosition.y = rect.top + rect.height / 2 - bubbleSize.height / 2
  }
  open.value = false
  nextTick(clampPositions)
}

watch(
  () => themePreviewStore.active,
  (active) => {
    if (!active || !themePreviewStore.sourceTheme) {
      open.value = false
      return
    }
    syncEditor(themePreviewStore.sourceTheme)
    open.value = true
    panelMovedInCurrentOpen.value = false
    setDefaultPosition()
  },
  { immediate: true }
)

onMounted(() => {
  window.addEventListener('resize', clampPositions)
})

onUnmounted(() => {
  window.removeEventListener('resize', clampPositions)
})
</script>

<template>
  <teleport to="body">
    <transition name="theme-editor-panel-pop">
      <div
        v-if="themePreviewStore.active && open"
        class="global-theme-editor"
        :class="{ 'is-dragging': drag.active && drag.kind === 'panel' }"
        :style="{ left: `${panelPosition.x}px`, top: `${panelPosition.y}px` }"
        v-loading="loading"
      >
        <div
          class="global-theme-editor-header"
          @pointerdown="startDrag($event, 'panel')"
          @pointermove="moveDrag"
          @pointerup="stopDrag"
          @pointercancel="stopDrag"
        >
          <span>全局样式编辑器</span>
          <el-button
            circle
            size="small"
            :icon="ArrowDown"
            @pointerdown.stop
            @click.stop="collapsePanel"
          />
        </div>

        <ThemeEditorPanel
          v-model:edit-mode="editMode"
          :editor="editor"
          :saving="saving"
          @apply="applySelectedTheme"
          @delete="deleteCustomTheme"
          @open-json="openJsonEditor"
        />
      </div>
    </transition>

    <transition name="theme-editor-bubble-pop">
      <button
        v-if="themePreviewStore.active && !open"
        class="global-theme-editor-bubble"
        :class="{ 'is-dragging': drag.active && drag.kind === 'bubble' }"
        type="button"
        :style="{ left: `${bubblePosition.x}px`, top: `${bubblePosition.y}px` }"
        @click="openPanel"
        @pointerdown="startDrag($event, 'bubble')"
        @pointermove="moveDrag"
        @pointerup="stopDrag"
        @pointercancel="stopDrag"
      >
        <el-icon><Brush /></el-icon>
      </button>
    </transition>

    <el-dialog v-if="themePreviewStore.active" v-model="jsonDialogVisible" title="高级 JSONC" width="720px">
      <el-input v-model="jsonContent" type="textarea" :rows="18" class="theme-json-editor" />
      <template #footer>
        <el-button @click="jsonDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="applyJsonContent">应用并保存</el-button>
      </template>
    </el-dialog>
  </teleport>
</template>
