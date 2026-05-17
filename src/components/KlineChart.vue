<template>
  <div class="flex w-full flex-col rounded-xl border border-[#21262d] bg-[#161b22]">
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-[#21262d] px-5 py-3">
      <h2 class="text-base font-semibold text-[#c9d1d9]">K线走势</h2>
      <div class="flex items-center gap-1">
        <button
          v-for="opt in periodOptions"
          :key="opt.value"
          class="rounded px-3 py-1 text-xs font-medium transition-colors"
          :class="
            period === opt.value
              ? 'bg-[#58a6ff] text-[#0d1117]'
              : 'text-[#8892b0] hover:bg-[#21262d] hover:text-[#c9d1d9]'
          "
          @click="$emit('update:period', opt.value)"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>

    <!-- Chart container -->
    <div ref="chartRef" class="min-h-[400px] w-full" />
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  klineData: {
    type: Array,
    default: () => [],
  },
  code: {
    type: String,
    default: '',
  },
  period: {
    type: String,
    default: 'day',
  },
})

defineEmits(['update:period'])

const periodOptions = [
  { label: '日K', value: 'day' },
  { label: '周K', value: 'week' },
  { label: '月K', value: 'month' },
]

const UP_COLOR = '#e94560'
const DOWN_COLOR = '#1abc9c'
const BORDER_COLOR = '#21262d'
const TEXT_COLOR = '#8892b0'
const CARD_BG = '#161b22'
const MA5_COLOR = '#f0c850'
const MA10_COLOR = '#58a6ff'
const MA20_COLOR = '#b87ee6'

const chartRef = ref(null)
let chartInstance = null
let resizeObserver = null

// ---- Helpers ----

function computeMA(data, dayCount) {
  const result = []
  for (let i = 0; i < data.length; i++) {
    if (i < dayCount - 1) {
      result.push('-')
      continue
    }
    let sum = 0
    for (let j = 0; j < dayCount; j++) {
      sum += Number(data[i - j].close)
    }
    result.push(+(sum / dayCount).toFixed(2))
  }
  return result
}

function buildOption(data) {
  const dates = data.map((d) => d.date)
  const ohlc = data.map((d) => [d.open, d.close, d.low, d.high])
  const volumes = data.map((d) => d.volume)
  const ma5 = computeMA(data, 5)
  const ma10 = computeMA(data, 10)
  const ma20 = computeMA(data, 20)

  // Per-bar volume colours: up = red, down = green
  const volumeColors = data.map((d) =>
    Number(d.close) >= Number(d.open) ? UP_COLOR : DOWN_COLOR,
  )

  return {
    backgroundColor: 'transparent',
    animation: true,
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        lineStyle: { color: BORDER_COLOR },
        crossStyle: { color: BORDER_COLOR },
        label: { backgroundColor: '#30363d', color: '#c9d1d9', borderColor: BORDER_COLOR },
      },
      backgroundColor: CARD_BG,
      borderColor: BORDER_COLOR,
      textStyle: { color: '#c9d1d9', fontSize: 12 },
      formatter(params) {
        if (!Array.isArray(params) || params.length === 0) return ''
        const idx = params[0].dataIndex
        const d = data[idx]
        if (!d) return ''
        const chg = Number(d.close) - Number(d.open)
        const pct = Number(d.open) !== 0 ? ((chg / Number(d.open)) * 100).toFixed(2) : '--'
        const sign = chg > 0 ? '+' : ''
        const color = chg >= 0 ? UP_COLOR : DOWN_COLOR
        const vol = formatVol(d.volume)
        return [
          `<div style="font-weight:600;margin-bottom:4px">${d.date}</div>`,
          `开盘 <span style="color:${TEXT_COLOR}">${d.open}</span><br/>`,
          `收盘 <span style="color:${color}">${d.close}</span><br/>`,
          `最高 <span style="color:${TEXT_COLOR}">${d.high}</span><br/>`,
          `最低 <span style="color:${TEXT_COLOR}">${d.low}</span><br/>`,
          `涨跌 <span style="color:${color}">${sign}${chg.toFixed(2)} (${sign}${pct}%)</span><br/>`,
          `成交量 <span style="color:${TEXT_COLOR}">${vol}</span>`,
        ].join('')
      },
    },
    axisPointer: {
      link: [{ xAxisIndex: 'all' }],
      label: { backgroundColor: '#30363d', color: '#c9d1d9' },
    },
    grid: [
      {
        left: 60,
        right: 20,
        top: 20,
        height: '58%',
      },
      {
        left: 60,
        right: 20,
        top: '74%',
        height: '14%',
      },
    ],
    xAxis: [
      {
        type: 'category',
        data: dates,
        boundaryGap: true,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: TEXT_COLOR, fontSize: 10 },
        splitLine: { show: false },
        gridIndex: 0,
      },
      {
        type: 'category',
        data: dates,
        boundaryGap: true,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { show: false },
        splitLine: { show: false },
        gridIndex: 1,
      },
    ],
    yAxis: [
      {
        type: 'value',
        scale: true,
        position: 'left',
        gridIndex: 0,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: TEXT_COLOR, fontSize: 10 },
        splitLine: { lineStyle: { color: BORDER_COLOR, type: 'dashed' } },
        splitNumber: 5,
      },
      {
        type: 'value',
        scale: true,
        position: 'left',
        gridIndex: 1,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { show: false },
        splitLine: { show: false },
        splitNumber: 2,
      },
    ],
    dataZoom: [
      {
        type: 'inside',
        xAxisIndex: [0, 1],
        start: 0,
        end: 100,
      },
      {
        type: 'slider',
        xAxisIndex: [0, 1],
        top: '92%',
        height: 18,
        borderColor: BORDER_COLOR,
        fillerColor: 'rgba(88,166,255,0.12)',
        handleStyle: { color: '#58a6ff', borderColor: '#58a6ff' },
        moveHandleSize: 4,
        moveHandleStyle: { color: '#58a6ff' },
        emphasis: { handleStyle: { borderColor: '#58a6ff' } },
        dataBackground: {
          lineStyle: { color: '#30363d' },
          areaStyle: { color: '#21262d' },
        },
        selectedDataBackground: {
          lineStyle: { color: '#58a6ff' },
          areaStyle: { color: 'rgba(88,166,255,0.15)' },
        },
        textStyle: { color: TEXT_COLOR, fontSize: 10 },
      },
    ],
    series: [
      {
        name: 'K线',
        type: 'candlestick',
        xAxisIndex: 0,
        yAxisIndex: 0,
        data: ohlc,
        itemStyle: {
          color: UP_COLOR,
          color0: DOWN_COLOR,
          borderColor: UP_COLOR,
          borderColor0: DOWN_COLOR,
        },
      },
      {
        name: 'MA5',
        type: 'line',
        xAxisIndex: 0,
        yAxisIndex: 0,
        data: ma5,
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 1, color: MA5_COLOR },
        z: 5,
      },
      {
        name: 'MA10',
        type: 'line',
        xAxisIndex: 0,
        yAxisIndex: 0,
        data: ma10,
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 1, color: MA10_COLOR },
        z: 5,
      },
      {
        name: 'MA20',
        type: 'line',
        xAxisIndex: 0,
        yAxisIndex: 0,
        data: ma20,
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 1, color: MA20_COLOR },
        z: 5,
      },
      {
        name: '成交量',
        type: 'bar',
        xAxisIndex: 1,
        yAxisIndex: 1,
        data: volumes,
        itemStyle: {
          color(params) {
            return volumeColors[params.dataIndex]
          },
        },
      },
    ],
  }
}

function formatVol(val) {
  if (val == null || isNaN(val)) return '--'
  const num = Number(val)
  if (Math.abs(num) >= 1e8) return (num / 1e8).toFixed(2) + ' 亿'
  if (Math.abs(num) >= 1e4) return (num / 1e4).toFixed(2) + ' 万'
  return num.toLocaleString()
}

// ---- Chart lifecycle ----

function initChart() {
  if (!chartRef.value) return
  chartInstance = echarts.init(chartRef.value, null, { renderer: 'canvas' })
  if (props.klineData && props.klineData.length > 0) {
    chartInstance.setOption(buildOption(props.klineData))
  }
}

function updateChart(data) {
  if (!chartInstance) return
  if (!data || data.length === 0) {
    chartInstance.clear()
    return
  }
  chartInstance.setOption(buildOption(data), true)
}

function handleResize() {
  if (chartInstance) {
    chartInstance.resize()
  }
}

// ---- Watchers ----

watch(
  () => props.klineData,
  (newData) => {
    updateChart(newData)
  },
  { deep: true },
)

// ---- Lifecycle ----

onMounted(() => {
  nextTick(() => {
    initChart()
  })

  // Use ResizeObserver for container-level resizing
  if (window.ResizeObserver && chartRef.value) {
    resizeObserver = new ResizeObserver(() => {
      handleResize()
    })
    resizeObserver.observe(chartRef.value)
  }

  // Fallback: also listen to window resize
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
})
</script>
