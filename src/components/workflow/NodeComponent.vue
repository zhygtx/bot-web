<template>
  <div
    class="workflow-node"
    :class="[
      { 'node-selected': isSelected },
      { 'node-branch': node.branch },
      executionStatus ? (executionStatus.status === 'FAILED' ? 'node-failed' : 'node-success') : ''
    ]"
    :data-node-id="node.id"
    :style="{ left: node.x + 'px', top: node.y + 'px' }"
    @mousedown.stop="handleNodeMouseDown"
    @click.stop
    @contextmenu="handleNodeContextMenu"
    @dblclick="handleNodeDblClick"
  >
    <div class="node-body">
      <div
        class="node-dot node-dot-left"
        @mousedown="handlePortMouseDown($event, node, 'left')"
      ></div>
      <div class="node-content-inner">
        <div class="node-header">
          <span class="node-method-name">{{ getNodeName(node) }}</span>
        </div>
        <div v-if="node.descriptor?.description" class="node-description">
          {{ node.descriptor.description }}
        </div>
        <div v-if="sortedParameters.length > 0" class="node-params">
          <span v-for="param in sortedParameters" :key="param.name" class="node-param">
            {{ param.type }} {{ param.name }}
          </span>
        </div>
        <div class="node-return">
          <span class="return-label">返回值:</span>
          <span class="return-type">{{ node.descriptor?.returnType || 'void' }}</span>
        </div>
      </div>
      <div class="node-outputs">
        <div
          v-for="port in outputPorts"
          :key="port"
          class="node-dot node-dot-right"
          :class="[`node-dot-${port}`, { 'node-dot-filled': isRightPortConnected(node.id, port) }]"
          :title="port === 'success' ? '成功输出' : '失败输出'"
          @mousedown="handlePortMouseDown($event, node, port)"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { getNodeName, getNodePorts, sortParameters } from '../../utils/workflow'

const props = defineProps({
  node: {
    type: Object,
    required: true
  },
  isSelected: {
    type: Boolean,
    default: false
  },
  connections: {
    type: Array,
    default: () => []
  },
  executionStatus: {
    type: Object,
    default: null
  }
})

const emit = defineEmits([
  'nodeMouseDown',
  'nodeContextMenu',
  'nodeDblClick',
  'portMouseDown'
])

const outputPorts = computed(() => getNodePorts(props.node))

const isRightPortConnected = (nodeId, port) => {
  return props.connections.some(connection =>
    connection.fromNode === nodeId && (connection.port || 'success') === port)
}

const sortedParameters = computed(() => sortParameters(props.node.descriptor?.parameters))

const handleNodeMouseDown = (e) => {
  emit('nodeMouseDown', e, props.node)
}

const handleNodeContextMenu = (e) => {
  e.preventDefault()
  e.stopPropagation()
  emit('nodeContextMenu', e, props.node)
}

const handleNodeDblClick = () => {
  emit('nodeDblClick', props.node)
}

const handlePortMouseDown = (e, node, port) => {
  e.stopPropagation()
  emit('portMouseDown', e, node, port)
}
</script>
