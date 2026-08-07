import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { createDefaultNode, isTriggerCallable } from '../../utils/workflow'

// 画布交互模块（新模型）
export function useEventHandling() {
  const canvasRef = ref(null)
  const isDragging = ref(false)
  const startX = ref(0)
  const startY = ref(0)
  const canvasX = ref(0)
  const canvasY = ref(0)
  const draggingElement = ref(null)
  const showCanvasPlaceholder = ref(true)

  // 画布拖动
  const handleCanvasMouseDown = (e, currentMode) => {
    if (currentMode === 'drag' || (currentMode === 'select' && e.button === 1)) {
      isDragging.value = true
      startX.value = e.clientX - canvasX.value
      startY.value = e.clientY - canvasY.value
      canvasRef.value.style.cursor = 'grabbing'
    }
  }

  const handleMouseMove = (e) => {
    if (isDragging.value) {
      e.preventDefault()
      canvasX.value = e.clientX - startX.value
      canvasY.value = e.clientY - startY.value
    }
  }

  const handleMouseUp = () => {
    if (isDragging.value && canvasRef.value) {
      isDragging.value = false
      canvasRef.value.style.cursor = 'grab'
    }
  }

  const handleMouseLeave = () => {
    if (isDragging.value && canvasRef.value) {
      isDragging.value = false
      canvasRef.value.style.cursor = 'grab'
    }
  }

  // 从左侧面板开始拖动
  const startDrag = (e, callable, descriptor) => {
    e.dataTransfer.effectAllowed = 'copy'
    draggingElement.value = { callable, descriptor }
    document.body.style.cursor = 'grabbing'
    return draggingElement.value
  }

  const endDrag = () => {
    draggingElement.value = null
    document.body.style.cursor = 'default'
  }

  // 放置节点到画布
  const dropNode = (e, dragElement, nodes, zoom) => {
    e.preventDefault()
    if (!dragElement?.callable) return null

    if (isTriggerCallable(dragElement.callable)
        && nodes.some(node => isTriggerCallable(node.callable))) {
      ElMessage.warning('每个工作流只能有一个触发节点')
      return null
    }

    const rect = canvasRef.value.getBoundingClientRect()
    const z = zoom?.value ?? 1
    const x = (e.clientX - rect.left - canvasX.value) / z
    const y = (e.clientY - rect.top - canvasY.value) / z
    return createDefaultNode(dragElement.callable, dragElement.descriptor, x, y)
  }

  return {
    canvasRef,
    isDragging,
    startX,
    startY,
    canvasX,
    canvasY,
    draggingElement,
    showCanvasPlaceholder,
    handleCanvasMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    startDrag,
    endDrag,
    dropNode
  }
}
