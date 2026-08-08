<template>
  <div class="code-diff-view">
    <div class="code-diff-header">
      <span>旧版本</span>
      <span>新版本</span>
    </div>
    <div class="code-diff-grid">
      <template v-for="row in rows" :key="row.key">
        <div class="diff-line-number" :class="row.type">{{ row.oldNo || '' }}</div>
        <div class="diff-line" :class="row.type" v-html="row.oldHtml"></div>
        <div class="diff-line-number" :class="row.type">{{ row.newNo || '' }}</div>
        <div class="diff-line" :class="row.type" v-html="row.newHtml"></div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import hljs from 'highlight.js/lib/core'
import java from 'highlight.js/lib/languages/java'
import xml from 'highlight.js/lib/languages/xml'
import json from 'highlight.js/lib/languages/json'
import yaml from 'highlight.js/lib/languages/yaml'
import ini from 'highlight.js/lib/languages/ini'
import plaintext from 'highlight.js/lib/languages/plaintext'
import { diffLines } from 'diff'

hljs.registerLanguage('java', java)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('json', json)
hljs.registerLanguage('yaml', yaml)
hljs.registerLanguage('ini', ini)
hljs.registerLanguage('plaintext', plaintext)

const props = defineProps({
  file: {
    type: Object,
    default: null
  },
  language: {
    type: String,
    default: 'java'
  }
})

const LANGUAGE_ALIASES = {
  properties: 'ini',
  pom: 'xml'
}

const escapeHtml = (text) => {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

const highlightLine = (text) => {
  if (!text) return ''
  const alias = LANGUAGE_ALIASES[props.language] || props.language
  if (alias && hljs.getLanguage(alias)) {
    return hljs.highlight(text, { language: alias }).value
  }
  return escapeHtml(text)
}

const rows = computed(() => {
  if (!props.file) return []
  const parts = diffLines(props.file.previousContent || '', props.file.currentContent || '')
  const result = []
  let oldNo = 0
  let newNo = 0
  let key = 0
  parts.forEach(part => {
    const lines = part.value.replace(/\n$/, '').split('\n')
    if (part.added) {
      lines.forEach(line => {
        newNo += 1
        result.push({
          key: key++,
          type: 'added',
          oldNo: null,
          newNo,
          oldHtml: '',
          newHtml: highlightLine(line)
        })
      })
    } else if (part.removed) {
      lines.forEach(line => {
        oldNo += 1
        result.push({
          key: key++,
          type: 'removed',
          oldNo,
          newNo: null,
          oldHtml: highlightLine(line),
          newHtml: ''
        })
      })
    } else {
      lines.forEach(line => {
        oldNo += 1
        newNo += 1
        result.push({
          key: key++,
          type: 'unchanged',
          oldNo,
          newNo,
          oldHtml: highlightLine(line),
          newHtml: highlightLine(line)
        })
      })
    }
  })
  return result
})
</script>
