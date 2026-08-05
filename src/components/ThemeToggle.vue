<script setup>
import { computed } from 'vue'
import { Moon, Sunny } from '@element-plus/icons-vue'
import { useTheme } from '../composables/useTheme'

const { isDark, toggleTheme } = useTheme()

const label = computed(() => (isDark.value ? '切换到亮色模式' : '切换到暗色模式'))
</script>

<template>
  <button
    class="theme-toggle"
    type="button"
    :class="{ 'is-dark': isDark }"
    :aria-label="label"
    :title="label"
    @click="toggleTheme"
  >
    <span class="toggle-track">
      <span class="toggle-glow"></span>
      <span class="toggle-thumb">
        <el-icon class="theme-icon sun-icon"><Sunny /></el-icon>
        <el-icon class="theme-icon moon-icon"><Moon /></el-icon>
      </span>
    </span>
  </button>
</template>

