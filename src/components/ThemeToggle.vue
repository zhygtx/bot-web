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

<style scoped>
.theme-toggle {
  width: 58px;
  height: 30px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: transparent;
  cursor: pointer;
  outline: none;
}

.theme-toggle:focus-visible .toggle-track {
  box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.22), 0 8px 20px rgba(15, 23, 42, 0.16);
}

.toggle-track {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: inherit;
  background: linear-gradient(135deg, #dbeafe 0%, #eff6ff 48%, #ffffff 100%);
  border: 1px solid rgba(37, 99, 235, 0.18);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.86), 0 8px 20px rgba(15, 23, 42, 0.12);
  transition: background 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease;
}

.toggle-glow {
  position: absolute;
  inset: -16px;
  background: radial-gradient(circle at 20% 50%, rgba(96, 165, 250, 0.65), transparent 34%);
  opacity: 1;
  transition: transform 0.45s ease, opacity 0.35s ease;
}

.toggle-thumb {
  position: absolute;
  left: 3px;
  top: 3px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #f59e0b;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  box-shadow: 0 3px 10px rgba(15, 23, 42, 0.22);
  transition: transform 0.42s cubic-bezier(0.2, 0.8, 0.2, 1), color 0.35s ease, background 0.35s ease;
}

.theme-icon {
  position: absolute;
  font-size: 15px;
  transition: transform 0.35s ease, opacity 0.25s ease;
}

.moon-icon {
  opacity: 0;
  transform: rotate(-90deg) scale(0.45);
}

.theme-toggle.is-dark .toggle-track {
  background: linear-gradient(135deg, #07111f 0%, #10243b 52%, #153a66 100%);
  border-color: rgba(59, 130, 246, 0.4);
  box-shadow: inset 0 1px 0 rgba(148, 163, 184, 0.16), 0 8px 22px rgba(2, 8, 23, 0.45);
}

.theme-toggle.is-dark .toggle-glow {
  opacity: 0.9;
  transform: translateX(28px);
  background: radial-gradient(circle at 78% 48%, rgba(59, 130, 246, 0.9), transparent 36%);
}

.theme-toggle.is-dark .toggle-thumb {
  transform: translateX(28px) rotate(360deg);
  color: #93c5fd;
  background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%);
}

.theme-toggle.is-dark .sun-icon {
  opacity: 0;
  transform: rotate(120deg) scale(0.45);
}

.theme-toggle.is-dark .moon-icon {
  opacity: 1;
  transform: rotate(0) scale(1);
}
</style>
