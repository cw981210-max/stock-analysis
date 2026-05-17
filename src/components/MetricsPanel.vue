<template>
  <div class="w-full rounded-xl border border-[#21262d] bg-[#161b22] px-5 py-4">
    <!-- Header -->
    <h2 class="mb-4 text-sm font-semibold tracking-wide text-[#8892b0]">核心指标</h2>

    <!-- Metrics Grid -->
    <div class="grid grid-cols-2 gap-x-6 gap-y-4">
      <div
        v-for="item in metricItems"
        :key="item.label"
        class="flex flex-col gap-1"
      >
        <span class="text-xs text-[#8892b0]">{{ item.label }}</span>
        <span
          class="text-base font-semibold tabular-nums"
          :class="item.colorClass || 'text-[#c9d1d9]'"
        >
          {{ item.value }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  metrics: {
    type: Object,
    default: null,
  },
})

const m = computed(() => props.metrics || {})

function formatValue(val) {
  if (val == null || isNaN(val)) return '--'
  return Number(val).toFixed(2)
}

function formatMarketCap(val) {
  if (val == null || isNaN(val)) return '--'
  const num = Number(val)
  if (Math.abs(num) >= 1e12) return (num / 1e12).toFixed(2) + ' 万亿'
  if (Math.abs(num) >= 1e8) return (num / 1e8).toFixed(2) + ' 亿'
  return num.toLocaleString()
}

function formatPercentValue(val) {
  if (val == null || isNaN(val)) return '--'
  return Number(val).toFixed(2) + '%'
}

function formatMoney(val) {
  if (val == null || isNaN(val)) return '--'
  const num = Number(val)
  if (Math.abs(num) >= 1e8) return (num / 1e8).toFixed(2) + ' 亿'
  if (Math.abs(num) >= 1e4) return (num / 1e4).toFixed(2) + ' 万'
  return num.toFixed(0)
}

function growthColor(val) {
  if (val == null || isNaN(val)) return ''
  const num = Number(val)
  if (num > 0) return 'text-[#1abc9c]'
  if (num < 0) return 'text-[#e94560]'
  return ''
}

const metricItems = computed(() => [
  { label: '市盈率 PE', value: formatValue(m.value.pe) },
  { label: '市净率 PB', value: formatValue(m.value.pb) },
  { label: '总市值', value: formatMarketCap(m.value.totalMarketCap) },
  { label: 'ROE 净资产收益率', value: formatPercentValue(m.value.roe) },
  { label: '营收增速', value: formatPercentValue(m.value.revenueGrowth), colorClass: growthColor(m.value.revenueGrowth) },
  { label: '净利润增速', value: formatPercentValue(m.value.profitGrowth), colorClass: growthColor(m.value.profitGrowth) },
  { label: '毛利率', value: formatPercentValue(m.value.grossMargin) },
  { label: '净利率', value: formatPercentValue(m.value.netMargin) },
  { label: '资产负债率', value: formatPercentValue(m.value.debtRatio) },
  { label: '换手率', value: formatPercentValue(m.value.turnover) },
  { label: '主力净流入', value: formatMoney(m.value.primeInflow), colorClass: m.value.primeInflow > 0 ? 'text-[#e94560]' : m.value.primeInflow < 0 ? 'text-[#1abc9c]' : '' },
])
</script>
