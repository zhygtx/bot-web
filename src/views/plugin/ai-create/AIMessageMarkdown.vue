<script setup>
import { computed } from 'vue'

const props = defineProps({
  content: { type: String, default: '' }
})

const rendered = computed(() => renderMarkdown(props.content))

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function inlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/~~([^~]+)~~/g, '<del>$1</del>')
}

function isTableSeparator(line) {
  return /^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(line)
}

function parseTableRow(line) {
  const trimmed = line.replace(/^\|/, '').replace(/\|$/, '')
  return trimmed.split('|').map(cell => cell.trim())
}

function renderMarkdown(markdown) {
  const lines = String(markdown || '').split(/\r?\n/)
  const html = []
  let paragraph = []
  let inCode = false
  let codeLines = []
  let listOpen = false
  let i = 0

  const closeParagraph = () => {
    if (!paragraph.length) return
    html.push(`<p>${inlineMarkdown(paragraph.join(' '))}</p>`)
    paragraph = []
  }
  const closeList = () => {
    if (!listOpen) return
    html.push('</ul>')
    listOpen = false
  }

  while (i < lines.length) {
    const line = lines[i]

    // fenced code block
    if (line.match(/^```/)) {
      if (inCode) {
        html.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`)
        codeLines = []
        inCode = false
      } else {
        closeParagraph()
        closeList()
        inCode = true
      }
      i++
      continue
    }

    if (inCode) {
      codeLines.push(line)
      i++
      continue
    }

    // blank line
    if (!line.trim()) {
      closeParagraph()
      closeList()
      i++
      continue
    }

    // heading
    const heading = line.match(/^(#{1,3})\s+(.+)$/)
    if (heading) {
      closeParagraph()
      closeList()
      const level = heading[1].length + 2
      html.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`)
      i++
      continue
    }

    // bullet list
    const bullet = line.match(/^[-*]\s+(.+)$/)
    if (bullet) {
      closeParagraph()
      if (!listOpen) {
        html.push('<ul>')
        listOpen = true
      }
      html.push(`<li>${inlineMarkdown(bullet[1])}</li>`)
      i++
      continue
    }

    // table: detect header row followed by separator row
    if (i + 1 < lines.length && line.includes('|') && isTableSeparator(lines[i + 1])) {
      closeParagraph()
      closeList()
      const headers = parseTableRow(line)
      i += 2 // skip header + separator
      const rows = []
      while (i < lines.length && lines[i].includes('|') && !isTableSeparator(lines[i]) && lines[i].trim()) {
        rows.push(parseTableRow(lines[i]))
        i++
      }
      let table = '<table><thead><tr>'
      headers.forEach(h => { table += `<th>${inlineMarkdown(h)}</th>` })
      table += '</tr></thead><tbody>'
      rows.forEach(row => {
        table += '<tr>'
        row.forEach(cell => { table += `<td>${inlineMarkdown(cell)}</td>` })
        table += '</tr>'
      })
      table += '</tbody></table>'
      html.push(table)
      continue
    }

    // blockquote
    const quote = line.match(/^>\s*(.+)$/)
    if (quote) {
      closeParagraph()
      closeList()
      html.push(`<blockquote><p>${inlineMarkdown(quote[1])}</p></blockquote>`)
      i++
      continue
    }

    // horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      closeParagraph()
      closeList()
      html.push('<hr>')
      i++
      continue
    }

    // normal text → accumulate into paragraph
    paragraph.push(line.trim())
    i++
  }

  if (inCode) html.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`)
  closeParagraph()
  closeList()
  return html.join('')
}
</script>

<template>
  <div class="markdown-body" v-html="rendered"></div>
</template>
