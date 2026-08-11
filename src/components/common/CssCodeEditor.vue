<template>
  <div class="css-code-editor" :class="{ 'is-focused': focused }">
    <pre ref="highlightLayer" class="css-code-highlight" aria-hidden="true"><code v-html="highlighted"></code></pre>
    <textarea
      ref="inputRef"
      class="css-code-input"
      :value="modelValue"
      :disabled="disabled"
      :spellcheck="false"
      @input="handleInput"
      @scroll="syncScroll"
      @focus="focused = true"
      @blur="focused = false"
      @keydown.tab.prevent="insertTab"
    ></textarea>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import hljs from 'highlight.js/lib/core'
import css from 'highlight.js/lib/languages/css'
import lightThemeCss from 'highlight.js/styles/github.css?inline'
import darkThemeCss from 'highlight.js/styles/github-dark.css?inline'
import { useTheme } from '../../composables/useTheme'

hljs.registerLanguage('css', css)

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])
const { isDark } = useTheme()
const inputRef = ref(null)
const highlightLayer = ref(null)
const focused = ref(false)

const highlighted = computed(() => {
  const text = props.modelValue || ''
  if (!text) return ''
  return hljs.highlight(text, { language: 'css' }).value
})

const handleInput = (event) => {
  emit('update:modelValue', event.target.value)
}

const syncScroll = () => {
  if (!inputRef.value || !highlightLayer.value) return
  highlightLayer.value.scrollTop = inputRef.value.scrollTop
  highlightLayer.value.scrollLeft = inputRef.value.scrollLeft
}

const insertTab = () => {
  const element = inputRef.value
  if (!element) return
  const start = element.selectionStart
  const end = element.selectionEnd
  const value = props.modelValue || ''
  emit('update:modelValue', `${value.slice(0, start)}  ${value.slice(end)}`)
  nextTick(() => {
    element.selectionStart = start + 2
    element.selectionEnd = start + 2
  })
}

const applyThemeCss = (dark) => {
  if (typeof document === 'undefined') return
  let style = document.getElementById('hljs-theme-css')
  if (!style) {
    style = document.createElement('style')
    style.id = 'hljs-theme-css'
    document.head.appendChild(style)
  }
  style.textContent = dark ? darkThemeCss : lightThemeCss
}

onMounted(() => applyThemeCss(isDark.value))
watch(isDark, applyThemeCss, { immediate: true })
watch(() => props.modelValue, () => nextTick(syncScroll))
</script>
