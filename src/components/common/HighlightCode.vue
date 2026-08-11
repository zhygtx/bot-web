<template>
  <pre class="highlight-code hljs" :class="themeClass"><code v-html="highlighted" class="hljs"></code></pre>
</template>

<script setup>
import { computed, onMounted, watch } from 'vue'
import hljs from 'highlight.js/lib/core'
import java from 'highlight.js/lib/languages/java'
import css from 'highlight.js/lib/languages/css'
import xml from 'highlight.js/lib/languages/xml'
import json from 'highlight.js/lib/languages/json'
import yaml from 'highlight.js/lib/languages/yaml'
import ini from 'highlight.js/lib/languages/ini'
import plaintext from 'highlight.js/lib/languages/plaintext'
import lightThemeCss from 'highlight.js/styles/github.css?inline'
import darkThemeCss from 'highlight.js/styles/github-dark.css?inline'
import { useTheme } from '../../composables/useTheme'

hljs.registerLanguage('java', java)
hljs.registerLanguage('css', css)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('json', json)
hljs.registerLanguage('yaml', yaml)
hljs.registerLanguage('ini', ini)
hljs.registerLanguage('plaintext', plaintext)

const props = defineProps({
  content: {
    type: [String, Object, Array, Number, Boolean],
    default: ''
  },
  language: {
    type: String,
    default: ''
  },
  plain: {
    type: Boolean,
    default: false
  }
})

const { isDark } = useTheme()
const themeClass = computed(() => (isDark.value ? 'hljs-theme-dark' : 'hljs-theme-light'))

// 按文件扩展名映射 highlight.js 语言别名
const LANGUAGE_ALIASES = {
  properties: 'ini',
  pom: 'xml'
}

const normalizeContent = () => {
  const value = props.content
  if (value === undefined || value === null || value === '') return ''
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value, null, 2)
  } catch (error) {
    return String(value)
  }
}

const resolveLanguage = () => {
  const alias = LANGUAGE_ALIASES[props.language?.toLowerCase()] || props.language?.toLowerCase()
  if (alias && hljs.getLanguage(alias)) return alias
  return ''
}

const detectJson = (text) => {
  if (!text) return false
  try {
    JSON.parse(text)
    return true
  } catch (error) {
    return false
  }
}

const highlighted = computed(() => {
  const text = normalizeContent()
  if (!text) return ''
  if (props.plain) {
    return hljs.highlight(text, { language: 'plaintext' }).value
  }
  const language = resolveLanguage()
  if (language) {
    return hljs.highlight(text, { language }).value
  }
  // 日志输入输出大多是 JSON，其余按纯文本展示，避免 highlightAuto 误判拖慢渲染
  if (detectJson(text)) {
    return hljs.highlight(text, { language: 'json' }).value
  }
  return hljs.highlight(text, { language: 'plaintext' }).value
})

// 亮暗主题共用同一个 style 元素，切换时整体替换为 highlight.js 的 GitHub 主题
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
</script>
