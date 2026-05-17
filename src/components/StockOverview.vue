<template>
  <div class="w-full rounded-xl border border-[#21262d] bg-[#161b22] px-5 py-4">
    <div class="flex flex-wrap items-start gap-x-8 gap-y-4">
      <!-- Left: Name & Meta -->
      <div class="flex min-w-[180px] flex-shrink-0 items-baseline gap-3">
        <h1 class="text-xl font-bold text-[#c9d1d9]">{{ quote.name || '--' }}</h1>
        <span
          class="rounded bg-[#21262d] px-2 py-0.5 font-mono text-xs text-[#58a6ff]"
        >
          {{ code || '--' }}
        </span>
        <span
          v-if="industry"
          class="rounded border border-[#21262d] px-2 py-0.5 text-xs text-[#8892b0]"
        >
          {{ industry }}
        </span>
      </div>

      <!-- Center: Price & Change -->
      <div class="flex min-w-[240px] flex-shrink-0 items-baseline gap-5">
        <span class="text-3xl font-bold tabular-nums" :style="{ color: priceColor }">
          {{ formatPrice(quote.price) }}
        </span>
        <div class="flex items-baseline gap-2">
          <span
            class="text-base font-semibold tabular-nums"
            :style="{ color: priceColor }"
          >
            {{ changePrefix }}{{ formatPrice(change) }}
          </span>
          <span
            class="text-sm font-medium tabular-nums"
            :style="{ color: priceColor }"
          >
            {{ changePrefix }}{{ formatPercent(changePercent) }}
          </span>
        </div>
      </div>

      <!-- Right: Key Stats Grid -->
      <div class="grid min-w-[360px] flex-1 grid-cols-3 gap-x-6 gap-y-2">
        <div v-for="stat in stats" :key="stat.label" class="flex items-baseline justify-between">
          <span class="text-xs text-[#8892b0]">{{ stat.label }}</span>
          <span class="text-sm font-medium tabular-nums text-[#c9d1d9]">
            {{ stat.value }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatNumber, formatPercent, formatPrice } from '../utils/format'

const props = defineProps({
  quote: {
    type: Object,
    required: true,
    default: () => ({
      name: '',
      open: null,
      prevClose: null,
      price: null,
      high: null,
      low: null,
      volume: null,
      amount: null,
    }),
  },
  code: {
    type: String,
    default: '',
  },
  industry: {
    type: String,
    default: null,
  },
})

const change = computed(() => {
  if (props.quote.price == null || props.quote.prevClose == null) return null
  return Number(props.quote.price) - Number(props.quote.prevClose)
})

const changePercent = computed(() => {
  if (
    props.quote.price == null ||
    props.quote.prevClose == null ||
    Number(props.quote.prevClose) === 0
  ) {
    return null
  }
  return ((Number(props.quote.price) - Number(props.quote.prevClose)) / Number(props.quote.prevClose)) * 100
})

const changePrefix = computed(() => {
  if (change.value == null) return ''
  return change.value > 0 ? '+' : ''
})

const priceColor = computed(() => {
  if (props.quote.price == null || props.quote.prevClose == null) return '#8892b0'
  const price = Number(props.quote.price)
  const prevClose = Number(props.quote.prevClose)
  if (price > prevClose) return '#e94560'
  if (price < prevClose) return '#1abc9c'
  return '#8892b0'
})

const formatVolume = (val) => {
  if (val == null || isNaN(val)) return '--'
  const num = Number(val)
  if (Math.abs(num) >= 1e8) return (num / 1e8).toFixed(2) + ' 亿'
  if (Math.abs(num) >= 1e4) return (num / 1e4).toFixed(2) + ' 万'
  return num.toLocaleString()
}

const formatAmount = (val) => {
  if (val == null || isNaN(val)) return '--'
  const num = Number(val)
  if (Math.abs(num) >= 1e8) return (num / 1e8).toFixed(2) + ' 亿'
  if (Math.abs(num) >= 1e4) return (num / 1e4).toFixed(2) + ' 万'
  return num.toLocaleString()
}

const stats = computed(() => [
  { label: '开盘', value: formatPrice(props.quote.open) },
  { label: '最高', value: formatPrice(props.quote.high) },
  { label: '最低', value: formatPrice(props.quote.low) },
  { label: '昨收', value: formatPrice(props.quote.prevClose) },
  { label: '成交量', value: formatVolume(props.quote.volume) },
  { label: '成交额', value: formatAmount(props.quote.amount) },
])
</script>
