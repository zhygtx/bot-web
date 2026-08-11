<script setup>
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'
import request from '../../utils/request'
import { init, use } from 'echarts/core'
import { LineChart, BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { getThemeToken } from '../../theme/themeRuntime'

// 只注册首页用到的 ECharts 模块，避免全量引入把打包体积撑大
use([LineChart, BarChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])

const loading = ref(false)
const overview = ref(null)
const trendChartEl = ref(null)
const trendDays = ref(7)
const nowMs = ref(Date.now())
let trendChart = null
let tickTimer = null

/**
 * 加载统计首页总览。
 * 后端一次返回 Bot 状态、资源数量、今日汇总、趋势和 Top 工作流。
 */
const loadOverview = async () => {
  loading.value = true
  try {
    const response = await request({
      url: '/statistics/overview',
      method: 'get',
      params: {
        days: trendDays.value
      }
    })
    overview.value = response.data || null
    syncBotTimer()
    await nextTick()
    renderCharts()
  } catch (error) {
    console.error('统计首页加载失败:', error)
  } finally {
    loading.value = false
  }
}

/**
 * 根据 Bot 是否在线启停每秒计时器：
 * 在线时用后端返回的 onlineSince 做起点，前端本地累加显示实时在线时长。
 */
const syncBotTimer = () => {
  const online = overview.value?.bot?.online
  if (online && !tickTimer) {
    tickTimer = setInterval(() => {
      nowMs.value = Date.now()
    }, 1000)
  } else if (!online && tickTimer) {
    clearInterval(tickTimer)
    tickTimer = null
  }
}

/**
 * 把毫秒时长格式化成适合首页卡片展示的文本。
 * 低于 1 分钟显示秒，超过 1 分钟显示“X 分 Y 秒”，超过 1 小时显示“X 小时 Y 分”。
 */
const formatDuration = (ms) => {
  const value = Number(ms || 0)
  if (value < 1000) return `${value}ms`
  const seconds = Math.floor(value / 1000)
  if (seconds < 60) return `${seconds}秒`
  const minutes = Math.floor(seconds / 60)
  const restSeconds = seconds % 60
  if (minutes < 60) return `${minutes}分${restSeconds}秒`
  const hours = Math.floor(minutes / 60)
  const restMinutes = minutes % 60
  return `${hours}小时${restMinutes}分`
}

/**
 * 在线时长的实时格式：始终带秒数，让“我的 BOT”卡片每秒走动。
 */
const formatLiveDuration = (ms) => {
  const totalSeconds = Math.max(0, Math.floor(Number(ms || 0) / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const parts = []
  if (hours > 0) parts.push(`${hours} 小时`)
  if (minutes > 0 || hours > 0) parts.push(`${minutes} 分`)
  parts.push(`${seconds} 秒`)
  return parts.join(' ')
}

/**
 * 格式化时间戳为本地时间字符串，用于表格里的“最近执行时间”。
 */
const formatTime = (timestamp) => {
  if (!timestamp) return '-'
  return new Date(Number(timestamp)).toLocaleString()
}

/**
 * 格式化数字，加上千分位分隔符，让卡片数值更易读。
 */
const formatNumber = (value) => Number(value || 0).toLocaleString()

/**
 * 平均节点数带小数，统一保留两位展示。
 */
const formatNodeCount = (value) => Number(value || 0).toFixed(2)

/**
 * 趋势横坐标日期格式化：统一用紧凑的 M/D（例如 8/9），
 * 15 天档位再配合 axisLabel 旋转，保证标签清晰可读。
 */
const formatTrendDate = (date) => {
  const text = String(date || '')
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return text.slice(5)
  return `${Number(match[2])}/${Number(match[3])}`
}

/**
 * 顶部资源卡片：首页只展示插件和工作流，AI 卡片已移除，Bot 使用独立卡片。
 */
const resourceCards = computed(() => {
  const resource = overview.value?.resource || {}
  return [
    { label: '插件总数', value: formatNumber(resource.pluginCount), sub: `${formatNumber(resource.publicPluginCount)} 个公开` },
    { label: '工作流总数', value: formatNumber(resource.workflowCount), sub: `${formatNumber(resource.enabledWorkflowCount)} 个启用` }
  ]
})

/**
 * 今日执行卡片：执行次数、活跃工作流数、平均执行耗时、平均执行节点数。
 * 失败会直接禁用工作流，因此首页不展示失败相关指标，聚焦执行表现。
 */
const todayCards = computed(() => {
  const today = overview.value?.today || {}
  return [
    { label: '今日执行次数', value: formatNumber(today.executeCount), tone: 'primary' },
    { label: '今日活跃工作流', value: formatNumber(today.workflowCount), tone: 'muted' },
    { label: '平均执行耗时', value: formatDuration(today.avgDurationMs), tone: 'success' },
    { label: '平均执行节点数', value: formatNodeCount(today.avgNodeCount), tone: 'warning', sub: '每次执行经过的节点数' }
  ]
})

/**
 * “我的 BOT”在线时长：以 onlineSince 为起点，前端本地每秒刷新，展示动态走时。
 */
const botLiveDuration = computed(() => {
  const bot = overview.value?.bot
  if (!bot?.online || !bot.onlineSince) return ''
  return formatLiveDuration(nowMs.value - Number(bot.onlineSince))
})

/**
 * 顶部汇总卡片：资源卡片和今日执行卡片合并成网格，BOT 卡片在模板中单独渲染。
 */
const summaryCards = computed(() => [...resourceCards.value, ...todayCards.value])

/**
 * 执行趋势配置（支持 7/15 天）：柱状展示执行次数，折线展示平均耗时，双 Y 轴让两个指标各自可读。
 */
const trendOption = computed(() => {
  const trend = overview.value?.trend || []
  const chartPrimary = getThemeToken('--chart-primary', '#409eff')
  const chartWarning = getThemeToken('--chart-warning', '#e6a23c')
  return {
    tooltip: { trigger: 'axis' },
    legend: { top: 0, data: ['执行次数', '平均耗时'] },
    grid: { left: 12, right: 16, top: 42, bottom: 8, containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: trend.map(item => formatTrendDate(item.date)),
      axisLabel: {
        hideOverlap: true,
        rotate: trendDays.value === 15 ? 30 : 0
      }
    },
    yAxis: [
      { type: 'value', minInterval: 1 },
      { type: 'value', name: 'ms' }
    ],
    series: [
      {
        name: '执行次数',
        type: 'bar',
        data: trend.map(item => item.executeCount),
        barMaxWidth: 14,
        itemStyle: { color: chartPrimary, borderRadius: [3, 3, 0, 0] }
      },
      {
        name: '平均耗时',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        symbol: 'none',
        data: trend.map(item => item.avgDurationMs),
        lineStyle: { width: 2, color: chartWarning },
        itemStyle: { color: chartWarning }
      }
    ]
  }
})

/**
 * 趋势图标题跟随当前选择的天数变化。
 */
const trendTitle = computed(() => `最近 ${trendDays.value} 天执行趋势`)

/**
 * 渲染执行趋势图；初始化后再次进入只 setOption，避免重复创建实例。
 */
const renderCharts = () => {
  if (!overview.value) return
  if (trendChartEl.value) {
    trendChart = trendChart || init(trendChartEl.value)
    // 使用 notMerge=true 强制替换整份配置，避免 7/15 天切换后旧横坐标残留
    trendChart.setOption(trendOption.value, true)
  }
}

/**
 * 窗口尺寸变化时让图表自适应容器宽度。
 */
const handleResize = () => {
  trendChart?.resize()
}

onMounted(() => {
  loadOverview()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  if (tickTimer) {
    clearInterval(tickTimer)
    tickTimer = null
  }
  trendChart?.dispose()
  trendChart = null
})
</script>

<template>
  <div class="statistics-page" v-loading="loading">
    <template v-if="overview">
      <section class="stats-grid">
        <div
          v-if="overview.bot"
          class="stat-card bot-stat-card"
          :class="overview.bot.online ? 'tone-success' : 'tone-muted'"
        >
          <div class="stat-card-label">我的 BOT</div>
          <span class="bot-status-badge" :class="overview.bot.online ? 'online' : 'offline'">
            <span class="status-dot" :class="overview.bot.online ? 'online' : 'offline'"></span>
            {{ overview.bot.online ? '在线中' : '当前离线' }}
          </span>
          <div v-if="overview.bot.online" class="bot-live-duration">{{ botLiveDuration }}</div>
          <div class="bot-qq">QQ {{ overview.bot.botQQ || '-' }}</div>
        </div>
        <div v-else class="stat-card bot-stat-card tone-muted">
          <div class="stat-card-label">我的 BOT</div>
          <div class="bot-empty">尚未登记 Bot</div>
        </div>
        <div
          class="stat-card"
          :class="card.tone ? `tone-${card.tone}` : ''"
          v-for="card in summaryCards"
          :key="card.label"
        >
          <div class="stat-card-label">{{ card.label }}</div>
          <div class="stat-card-value">{{ card.value }}</div>
          <div class="stat-card-sub" v-if="card.sub">{{ card.sub }}</div>
        </div>
      </section>

      <section class="charts-row">
        <div class="chart-panel">
          <div class="panel-header">
            <div class="panel-title">{{ trendTitle }}</div>
            <el-radio-group v-model="trendDays" size="small" @change="loadOverview">
              <el-radio-button :value="7">7 天</el-radio-button>
              <el-radio-button :value="15">15 天</el-radio-button>
            </el-radio-group>
          </div>
          <div class="chart-box" ref="trendChartEl"></div>
        </div>
        <div class="data-panel">
          <div class="panel-title">Top 工作流</div>
          <el-table :data="overview.topWorkflows || []" size="small">
            <el-table-column prop="workflowName" label="工作流" min-width="160" show-overflow-tooltip />
            <el-table-column label="执行次数" width="90">
              <template #default="{ row }">{{ formatNumber(row.executeCount) }}</template>
            </el-table-column>
            <el-table-column label="平均执行耗时" width="120">
              <template #default="{ row }">{{ formatDuration(row.avgDurationMs) }}</template>
            </el-table-column>
            <el-table-column label="平均执行节点数" width="120">
              <template #default="{ row }">{{ formatNodeCount(row.avgNodeCount) }}</template>
            </el-table-column>
            <el-table-column label="最近执行时间" min-width="160">
              <template #default="{ row }">{{ formatTime(row.lastExecutionTime) }}</template>
            </el-table-column>
          </el-table>
        </div>
      </section>
    </template>

    <el-empty v-else-if="!loading" description="暂无统计数据" />
  </div>
</template>
