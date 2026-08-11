<script setup>
import { computed } from 'vue'
import { Delete, Select } from '@element-plus/icons-vue'
import {
  advancedTokenGroups,
  colorTokenGroups,
  predefinedThemeColors
} from '../../theme/tokenSchema'

const props = defineProps({
  editor: {
    type: Object,
    required: true
  },
  editMode: {
    type: String,
    default: 'simple'
  },
  saving: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'update:editMode',
  'apply',
  'delete',
  'open-json'
])

const editModeModel = computed({
  get: () => props.editMode,
  set: value => emit('update:editMode', value)
})

const editingDisabled = computed(() => props.editor.builtin)

const complexTokenGroups = computed(() => advancedTokenGroups)
</script>

<template>
  <div class="theme-editor-panel">
    <div class="editor-header">
      <div>
        <div class="theme-section-title">样式编辑器</div>
        <div class="theme-section-subtitle">{{ editModeModel === 'simple' ? '常用颜色用颜色选择器快速调整' : '所有样式 token 直接输入 CSS 值' }}</div>
      </div>
    </div>

    <el-form label-position="top" class="theme-form">
      <el-form-item label="主题名称">
        <el-input v-model="editor.name" :disabled="editingDisabled" />
      </el-form-item>
    </el-form>

    <el-segmented
      v-model="editModeModel"
      class="theme-mode-switch"
      :options="[
        { label: '简要颜色配置', value: 'simple' },
        { label: '复杂样式配置', value: 'advanced' }
      ]"
    />

    <div class="token-groups" v-if="editModeModel === 'simple'">
      <section v-for="group in colorTokenGroups" :key="group.title" class="token-group">
        <h3>{{ group.title }}</h3>
        <label v-for="item in group.tokens" :key="item.key" class="token-row">
          <span>{{ item.label }}</span>
          <span class="token-color-control">
            <el-color-picker
              v-model="editor.tokens[item.key]"
              :predefine="predefinedThemeColors"
              :disabled="editingDisabled"
              show-alpha
            />
            <span class="token-color-value">{{ editor.tokens[item.key] }}</span>
          </span>
        </label>
      </section>
    </div>

    <div class="token-groups" v-else>
      <section v-for="group in complexTokenGroups" :key="group.title" class="token-group">
        <h3>{{ group.title }}</h3>
        <label v-for="item in group.tokens" :key="item.key" class="token-row token-row-wide">
          <span>{{ item.label }}</span>
          <el-input
            v-model="editor.tokens[item.key]"
            :disabled="editingDisabled"
            :placeholder="item.placeholder"
          />
        </label>
      </section>
    </div>

    <div class="theme-editor-actions">
      <el-button :icon="Select" type="primary" @click="emit('apply')" :loading="saving">应用</el-button>
      <el-button @click="emit('open-json')" :disabled="editingDisabled">高级 JSONC</el-button>
      <el-button :icon="Delete" type="danger" @click="emit('delete')" :disabled="editor.builtin">删除</el-button>
    </div>
  </div>
</template>
