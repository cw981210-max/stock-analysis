<template>
  <div class="w-full rounded-xl border border-[#21262d] bg-[#161b22] p-5">
    <!-- Section Title -->
    <h2 class="mb-5 text-lg font-semibold text-[#c9d1d9]">财务数据与行业分析</h2>

    <div class="flex gap-5 max-lg:flex-col">
      <!-- Left: Financial Data -->
      <div class="flex-1 min-w-0">
        <template v-if="financial && financial.length">
          <!-- Bar Chart -->
          <div
            ref="chartRef"
            class="mb-5 h-[280px] w-full rounded-lg bg-[#0d1117]"
          />

          <!-- Metrics Table -->
          <div class="overflow-x-auto rounded-lg border border-[#21262d]">
            <table class="w-full border-collapse text-xs">
              <thead>
                <tr class="bg-[#0d1117]">
                  <th class="whitespace-nowrap px-3 py-2 text-left font-medium text-[#8892b0]">
                    报告期
                  </th>
                  <th class="whitespace-nowrap px-3 py-2 text-right font-medium text-[#8892b0]">
                    营收(亿)
                  </th>
                  <th class="whitespace-nowrap px-3 py-2 text-right font-medium text-[#8892b0]">
                    净利润(亿)
                  </th>
                  <th class="whitespace-nowrap px-3 py-2 text-right font-medium text-[#8892b0]">
                    营收增长
                  </th>
                  <th class="whitespace-nowrap px-3 py-2 text-right font-medium text-[#8892b0]">
                    利润增长
                  </th>
                  <th class="whitespace-nowrap px-3 py-2 text-right font-medium text-[#8892b0]">
                    ROE
                  </th>
                  <th class="whitespace-nowrap px-3 py-2 text-right font-medium text-[#8892b0]">
                    毛利率
                  </th>
                  <th class="whitespace-nowrap px-3 py-2 text-right font-medium text-[#8892b0]">
                    资产负债率
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, idx) in financial"
                  :key="row.reportDate"
                  class="border-t border-[#21262d]"
                  :class="idx % 2 === 0 ? 'bg-[#161b22]' : 'bg-[#0d1117]'"
                >
                  <td class="whitespace-nowrap px-3 py-2 text-[#c9d1d9]">
                    {{ row.reportDate }}
                  </td>
                  <td class="whitespace-nowrap px-3 py-2 text-right tabular-nums text-[#c9d1d9]">
                    {{ formatYi(row.revenue) }}
                  </td>
                  <td class="whitespace-nowrap px-3 py-2 text-right tabular-nums text-[#c9d1d9]">
                    {{ formatYi(row.netProfit) }}
                  </td>
                  <td
                    class="whitespace-nowrap px-3 py-2 text-right tabular-nums"
                    :style="{ color: growthColor(row.revenueGrowth) }"
                  >
                    {{ formatGrowth(row.revenueGrowth) }}
                  </td>
                  <td
                    class="whitespace-nowrap px-3 py-2 text-right tabular-nums"
                    :style="{ color: growthColor(row.profitGrowth) }"
                  >
                    {{ formatGrowth(row.profitGrowth) }}
                  </td>
                  <td class="whitespace-nowrap px-3 py-2 text-right tabular-nums text-[#c9d1d9]">
                    {{ formatPercent(row.roe) }}
                  </td>
                  <td class="whitespace-nowrap px-3 py-2 text-right tabular-nums text-[#c9d1d9]">
                    {{ formatPercent(row.grossMargin) }}
                  </td>
                  <td class="whitespace-nowrap px-3 py-2 text-right tabular-nums text-[#c9d1d9]">
                    {{ formatPercent(row.debtRatio) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
        <div v-else class="flex h-[280px] items-center justify-center rounded-lg border border-[#21262d] bg-[#0d1117] text-sm text-[#8892b0]">
          暂无财务数据
        </div>
      </div>

      <!-- Right: Industry Analysis -->
      <div class="w-full lg:w-[320px] flex-shrink-0 space-y-4">
        <template v-if="industry">
          <!-- Industry Name -->
          <div class="rounded-lg border border-[#21262d] bg-[#0d1117] p-4">
            <div class="mb-1 text-xs text-[#8892b0]">所属行业</div>
            <div class="text-lg font-semibold text-[#58a6ff]">
              {{ industry.industry }}
            </div>
          </div>

          <!-- Industry Ranking in All Industries -->
          <div class="rounded-lg border border-[#21262d] bg-[#0d1117] p-4">
            <div class="mb-2 text-xs text-[#8892b0]">行业排名</div>
            <div v-if="industry.industryRank" class="flex items-end gap-2">
              <span class="text-3xl font-bold tabular-nums" :class="industryRankColor">
                {{ industry.industryRank }}
              </span>
              <span class="text-sm text-[#8892b0] pb-1">/ {{ industry.totalIndustries || '--' }} 个行业</span>
            </div>
            <div v-if="industryRankingInfo" class="mt-2 text-xs text-[#8892b0]">
              今日涨幅 <span :style="{ color: industryRankingInfo.changePercent > 0 ? '#e94560' : '#1abc9c' }">{{ formatGrowth(industryRankingInfo.changePercent) }}</span>
            </div>
            <div v-if="!industry.industryRank" class="text-sm text-[#8892b0]">暂无排名数据</div>
            <!-- Mini ranking bar -->
            <div v-if="industry.industryRank && industry.totalIndustries" class="mt-3">
              <div class="h-2 rounded-full bg-[#21262d] overflow-hidden">
                <div
                  class="h-full rounded-full transition-all"
                  :class="industry.industryRank <= 20 ? 'bg-[#e94560]' : industry.industryRank <= 50 ? 'bg-[#f0a500]' : 'bg-[#1abc9c]'"
                  :style="{ width: ((industry.totalIndustries - industry.industryRank + 1) / industry.totalIndustries * 100) + '%' }"
                />
              </div>
              <div class="mt-1 flex justify-between text-[10px] text-[#484f58]">
                <span>第{{ industry.totalIndustries }}名</span>
                <span>第1名</span>
              </div>
            </div>
          </div>

          <!-- Stock Rank within Industry -->
          <div class="rounded-lg border border-[#21262d] bg-[#0d1117] p-4">
            <div class="mb-2 text-xs text-[#8892b0]">行业内排名</div>
            <template v-if="stockIndustryRank">
              <div class="flex items-end gap-2">
                <span class="text-3xl font-bold tabular-nums" :class="stockRankColor">
                  {{ stockIndustryRank.stockRank || '--' }}
                </span>
                <span class="text-sm text-[#8892b0] pb-1">/ {{ stockIndustryRank.total || '--' }} 只股票</span>
              </div>
              <!-- Top 5 in industry -->
              <div v-if="stockIndustryRank.topStocks && stockIndustryRank.topStocks.length" class="mt-3 space-y-1.5">
                <div class="text-[10px] text-[#484f58]">行业前5名</div>
                <div
                  v-for="(s, idx) in stockIndustryRank.topStocks"
                  :key="s.code"
                  class="flex items-center justify-between text-xs"
                >
                  <div class="flex items-center gap-2">
                    <span class="w-4 text-center font-mono" :class="idx < 3 ? 'text-[#f0a500] font-bold' : 'text-[#484f58]'">{{ idx + 1 }}</span>
                    <span :class="s.code === currentCode ? 'text-[#58a6ff] font-semibold' : 'text-[#c9d1d9]'">{{ s.name }}</span>
                  </div>
                  <span :style="{ color: s.changePercent > 0 ? '#e94560' : s.changePercent < 0 ? '#1abc9c' : '#8892b0' }">
                    {{ formatGrowth(s.changePercent) }}
                  </span>
                </div>
              </div>
            </template>
            <div v-else class="text-sm text-[#8892b0]">暂无行业内排名数据</div>
          </div>

          <!-- Market Popularity Rank -->
          <div class="rounded-lg border border-[#21262d] bg-[#0d1117] p-4">
            <div class="mb-2 text-xs text-[#8892b0]">市场人气排名</div>
            <div class="mb-2 text-2xl font-bold tabular-nums text-[#c9d1d9]">
              {{ industry.rank ? '第 ' + industry.rank + ' 名' : '暂无排名' }}
            </div>
            <div v-if="industry.totalScore" class="mb-1 text-xs text-[#8892b0]">综合评分</div>
            <div v-if="industry.totalScore" class="text-lg font-semibold text-[#58a6ff]">
              {{ industry.totalScore.toFixed(1) }}<span class="text-xs text-[#8892b0]"> / 100</span>
            </div>
            <div v-if="industry.focus" class="mt-2 text-xs text-[#8892b0]">关注度 {{ industry.focus }} / 100</div>
          </div>
        </template>
        <div v-else class="flex h-full min-h-[200px] items-center justify-center rounded-lg border border-[#21262d] bg-[#0d1117] text-sm text-[#8892b0]">
          暂无行业数据
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  financial: {
    type: Array,
    default: null,
  },
  industry: {
    type: Object,
    default: null,
  },
  stockIndustryRank: {
    type: Object,
    default: null,
  },
  industryRanking: {
    type: Array,
    default: () => [],
  },
  currentCode: {
    type: String,
    default: '',
  },
})

const industryRankingInfo = computed(() => {
  if (!props.industry?.industry || !props.industryRanking?.length) return null
  const indName = props.industry.industry
  return props.industryRanking.find(item =>
    item.name && (indName.includes(item.name.replace('行业', '')) || item.name.replace('行业', '').includes(indName))
  )
})

const industryRankColor = computed(() => {
  const rank = props.industry?.industryRank
  if (!rank) return 'text-[#c9d1d9]'
  if (rank <= 20) return 'text-[#e94560]'
  if (rank <= 50) return 'text-[#f0a500]'
  return 'text-[#1abc9c]'
})

const stockRankColor = computed(() => {
  const rank = props.stockIndustryRank?.stockRank
  if (!rank) return 'text-[#c9d1d9]'
  const total = props.stockIndustryRank?.total || 100
  const pct = rank / total
  if (pct <= 0.1) return 'text-[#e94560]'
  if (pct <= 0.3) return 'text-[#f0a500]'
  return 'text-[#1abc9c]'
})

// ---------- Chart ----------

const chartRef = ref(null)
let chartInstance = null
let resizeObserver = null

function buildChartOption() {
  if (!props.financial || !props.financial.length) return null

  const dates = props.financial.map((r) => r.reportDate)
  const revenues = props.financial.map((r) => toYi(r.revenue))
  const profits = props.financial.map((r) => toYi(r.netProfit))

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#161b22',
      borderColor: '#21262d',
      textStyle: { color: '#c9d1d9', fontSize: 12 },
      axisPointer: { type: 'shadow' },
      formatter(params) {
        let html = `<div style="margin-bottom:4px;font-weight:600">${params[0].axisValue}</div>`
        params.forEach((p) => {
          html += `<div style="display:flex;align-items:center;gap:6px;">
            <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${p.color};"></span>
            ${p.seriesName}: <b>${p.value != null ? p.value.toFixed(2) : '--'}</b> 亿
          </div>`
        })
        return html
      },
    },
    legend: {
      top: 8,
      right: 16,
      textStyle: { color: '#8892b0', fontSize: 11 },
      itemWidth: 12,
      itemHeight: 8,
      itemGap: 16,
    },
    grid: {
      top: 40,
      left: 16,
      right: 16,
      bottom: 8,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#8892b0', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      splitLine: { show: false },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#8892b0', fontSize: 11, formatter: '{value}' },
    },
    series: [
      {
        name: '营收',
        type: 'bar',
        barWidth: '28%',
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#58a6ff' },
            { offset: 1, color: '#1a5bb5' },
          ]),
          borderRadius: [3, 3, 0, 0],
        },
        data: revenues,
      },
      {
        name: '净利润',
        type: 'bar',
        barWidth: '28%',
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#1abc9c' },
            { offset: 1, color: '#0e7a64' },
          ]),
          borderRadius: [3, 3, 0, 0],
        },
        data: profits,
      },
    ],
  }
}

function initChart() {
  if (!chartRef.value) return
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }

  const option = buildChartOption()
  if (!option) return

  chartInstance = echarts.init(chartRef.value)
  chartInstance.setOption(option)

  resizeObserver = new ResizeObserver(() => {
    chartInstance?.resize()
  })
  resizeObserver.observe(chartRef.value)
}

function disposeChart() {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
}

watch(
  () => props.financial,
  () => {
    nextTick(() => {
      disposeChart()
      initChart()
    })
  },
)

onMounted(() => {
  nextTick(initChart)
})

onBeforeUnmount(disposeChart)

// ---------- Formatting helpers ----------

function toYi(val) {
  if (val == null || isNaN(val)) return null
  return Number(val) / 1e8
}

function formatYi(val) {
  const yi = toYi(val)
  if (yi == null) return '--'
  return yi.toFixed(2)
}

function formatGrowth(val) {
  if (val == null || isNaN(val)) return '--'
  const num = Number(val)
  const prefix = num > 0 ? '+' : ''
  return prefix + num.toFixed(2) + '%'
}

function formatPercent(val) {
  if (val == null || isNaN(val)) return '--'
  return Number(val).toFixed(2) + '%'
}

function growthColor(val) {
  if (val == null || isNaN(val)) return '#c9d1d9'
  const num = Number(val)
  if (num > 0) return '#1abc9c'
  if (num < 0) return '#e94560'
  return '#c9d1d9'
}
</script>
