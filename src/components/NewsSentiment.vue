<template>
  <section class="news-sentiment-section">
    <h2 class="section-title">
      <span class="title-icon">📰</span>
      新闻与市场情绪
    </h2>

    <!-- Market Indices Bar -->
    <div v-if="marketIndices" class="market-overview">
      <div class="indices-bar">
        <div class="index-item" v-if="marketIndices.shanghai">
          <span class="index-name">上证指数</span>
          <span class="index-value" :style="{ color: indexColor(marketIndices.shanghai?.changePercent) }">
            {{ marketIndices.shanghai?.price?.toFixed(2) || '--' }}
          </span>
          <span class="index-change" :style="{ color: indexColor(marketIndices.shanghai?.changePercent) }">
            {{ formatIndexChange(marketIndices.shanghai?.changePercent) }}
          </span>
          <span v-if="fundFlowData?.shanghai?.mainInflow != null" class="index-flow" :style="{ color: flowColor(fundFlowData.shanghai.mainInflow) }">
            主力{{ formatFlow(fundFlowData.shanghai.mainInflow) }}
          </span>
        </div>
        <div class="index-item" v-if="marketIndices.shenzhen">
          <span class="index-name">深证成指</span>
          <span class="index-value" :style="{ color: indexColor(marketIndices.shenzhen?.changePercent) }">
            {{ marketIndices.shenzhen?.price?.toFixed(2) || '--' }}
          </span>
          <span class="index-change" :style="{ color: indexColor(marketIndices.shenzhen?.changePercent) }">
            {{ formatIndexChange(marketIndices.shenzhen?.changePercent) }}
          </span>
          <span v-if="fundFlowData?.shenzhen?.mainInflow != null" class="index-flow" :style="{ color: flowColor(fundFlowData.shenzhen.mainInflow) }">
            主力{{ formatFlow(fundFlowData.shenzhen.mainInflow) }}
          </span>
        </div>
        <div class="index-item" v-if="marketIndices.csi300">
          <span class="index-name">沪深300</span>
          <span class="index-value" :style="{ color: indexColor(marketIndices.csi300?.changePercent) }">
            {{ marketIndices.csi300?.price?.toFixed(2) || '--' }}
          </span>
          <span class="index-change" :style="{ color: indexColor(marketIndices.csi300?.changePercent) }">
            {{ formatIndexChange(marketIndices.csi300?.changePercent) }}
          </span>
          <span v-if="fundFlowData?.csi300?.mainInflow != null" class="index-flow" :style="{ color: flowColor(fundFlowData.csi300.mainInflow) }">
            主力{{ formatFlow(fundFlowData.csi300.mainInflow) }}
          </span>
        </div>
        <div class="index-item" v-if="marketIndices.chinext">
          <span class="index-name">创业板指</span>
          <span class="index-value" :style="{ color: indexColor(marketIndices.chinext?.changePercent) }">
            {{ marketIndices.chinext?.price?.toFixed(2) || '--' }}
          </span>
          <span class="index-change" :style="{ color: indexColor(marketIndices.chinext?.changePercent) }">
            {{ formatIndexChange(marketIndices.chinext?.changePercent) }}
          </span>
        </div>
      </div>
    </div>

    <div class="content-grid">
      <!-- Left: News + Reports -->
      <div class="news-panel">
        <!-- Tab Switch: News / Reports -->
        <div class="news-tabs">
          <button
            class="news-tab"
            :class="{ active: activeTab === 'news' }"
            @click="activeTab = 'news'"
          >
            公告与新闻
          </button>
          <button
            class="news-tab"
            :class="{ active: activeTab === 'reports' }"
            @click="activeTab = 'reports'"
          >
            研究报告
          </button>
        </div>

        <!-- News List -->
        <div v-if="activeTab === 'news'">
          <div v-if="!news || news.length === 0" class="empty-state">
            <span class="empty-icon">📭</span>
            <p>暂无相关新闻</p>
          </div>
          <ul v-else class="news-list">
            <li v-for="(item, index) in news" :key="index" class="news-item">
              <span class="news-source" :class="getSourceClass(item.source)">{{ item.source }}</span>
              <a
                v-if="item.url"
                :href="item.url"
                target="_blank"
                rel="noopener noreferrer"
                class="news-title"
              >
                {{ item.title }}
              </a>
              <span v-else class="news-title news-title-no-link">{{ item.title }}</span>
              <span class="news-time">{{ item.time }}</span>
            </li>
          </ul>
        </div>

        <!-- Research Reports / Analyst Ratings -->
        <div v-if="activeTab === 'reports'">
          <div v-if="!researchReports || researchReports.length === 0" class="empty-state">
            <span class="empty-icon">📊</span>
            <p>暂无机构评级数据</p>
          </div>
          <template v-else>
            <div v-for="(item, index) in researchReports" :key="index" class="rating-card">
              <!-- Rating Summary -->
              <div class="rating-header">
                <span class="rating-org-count">{{ item.title }}</span>
              </div>
              <div class="rating-bars">
                <div class="rating-bar-row">
                  <span class="bar-label">买入</span>
                  <div class="bar-track"><div class="bar-fill buy" :style="{ width: barWidth(item.buyNum, item.buyNum + item.addNum + item.neutralNum + item.reduceNum + item.saleNum) }"></div></div>
                  <span class="bar-num">{{ item.buyNum }}家</span>
                </div>
                <div class="rating-bar-row">
                  <span class="bar-label">增持</span>
                  <div class="bar-track"><div class="bar-fill add" :style="{ width: barWidth(item.addNum, item.buyNum + item.addNum + item.neutralNum + item.reduceNum + item.saleNum) }"></div></div>
                  <span class="bar-num">{{ item.addNum }}家</span>
                </div>
                <div class="rating-bar-row">
                  <span class="bar-label">中性</span>
                  <div class="bar-track"><div class="bar-fill neutral" :style="{ width: barWidth(item.neutralNum, item.buyNum + item.addNum + item.neutralNum + item.reduceNum + item.saleNum) }"></div></div>
                  <span class="bar-num">{{ item.neutralNum }}家</span>
                </div>
              </div>
              <!-- Target Price -->
              <div v-if="item.targetPriceMin || item.targetPriceMax" class="target-price">
                <span class="target-label">机构目标价</span>
                <span class="target-value">{{ item.targetPriceMin || '--' }} ~ {{ item.targetPriceMax || '--' }} 元</span>
              </div>
              <!-- EPS Forecast -->
              <div v-if="item.epsYears && item.epsYears.length" class="eps-forecast">
                <span class="target-label">EPS预测</span>
                <div class="eps-items">
                  <span v-for="eps in item.epsYears" :key="eps.year" class="eps-item">
                    {{ eps.year }}({{ eps.mark }}): {{ eps.eps }}元
                  </span>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- Right: Sentiment Analysis -->
      <div class="sentiment-panel">
        <div v-if="!sentiment || sentiment.sentimentScore == null" class="empty-state">
          <span class="empty-icon">📊</span>
          <p>暂无舆情数据</p>
        </div>
        <template v-else>
          <div ref="chartRef" class="sentiment-chart"></div>
          <div class="sentiment-info">
            <div class="sentiment-label" :class="sentimentClass">
              {{ sentiment.sentimentLabel }}
            </div>
            <div class="sentiment-score">
              综合评分: <strong>{{ sentiment.sentimentScore }}</strong> / 100
            </div>
            <div class="sentiment-details" v-if="sentiment.focus">
              <div class="detail-item">
                <span class="detail-label">关注度</span>
                <span class="detail-value">{{ sentiment.focus }}<span class="detail-unit">/100</span></span>
              </div>
              <div class="detail-item" v-if="sentiment.rank">
                <span class="detail-label">人气排名</span>
                <span class="detail-value">第 {{ sentiment.rank }} 名</span>
              </div>
              <div class="detail-item" v-if="sentiment.ratio">
                <span class="detail-label">多空比</span>
                <span class="detail-value" :style="{color: sentiment.ratio > 0.5 ? '#58a6ff' : '#e94560'}">{{ (sentiment.ratio * 100).toFixed(1) }}%</span>
              </div>
              <div class="detail-item" v-if="sentiment.orgParticipate">
                <span class="detail-label">机构参与</span>
                <span class="detail-value">{{ (sentiment.orgParticipate * 100).toFixed(1) }}%</span>
              </div>
              <div class="detail-item" v-if="sentiment.primeInflow">
                <span class="detail-label">主力净流入</span>
                <span class="detail-value" :style="{color: sentiment.primeInflow > 0 ? '#e94560' : '#1abc9c'}">{{ sentiment.primeInflow > 0 ? '+' : '' }}{{ (sentiment.primeInflow / 1e8).toFixed(2) }}亿</span>
              </div>
            </div>
          </div>

          <!-- AI Sentiment Analysis Button -->
          <div class="ai-analysis-section">
            <button
              v-if="!sentimentAnalyzing && !sentimentHtmlAnalysis"
              class="ai-analysis-btn"
              @click="$emit('analyze-sentiment')"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
              </svg>
              AI 专业情绪分析
            </button>

            <div v-if="sentimentAnalyzing && !sentimentHtmlAnalysis" class="ai-loading">
              <div class="loading-dots">
                <span class="dot"></span>
                <span class="dot"></span>
                <span class="dot"></span>
              </div>
              <span class="loading-text">AI 正在分析市场情绪...</span>
            </div>

            <div v-if="sentimentHtmlAnalysis" class="ai-analysis-content">
              <div class="ai-analysis-header">
                <span class="ai-badge">AI 分析</span>
                <button class="ai-analysis-btn small" @click="$emit('analyze-sentiment')">重新分析</button>
              </div>
              <div class="markdown-body" v-html="sentimentHtmlAnalysis"></div>
              <span v-if="sentimentAnalyzing" class="typing-cursor"></span>
            </div>
          </div>
        </template>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  news: {
    type: Array,
    default: () => []
  },
  sentiment: {
    type: Object,
    default: () => null
  },
  researchReports: {
    type: Array,
    default: () => []
  },
  marketIndices: {
    type: Object,
    default: () => null
  },
  fundFlow: {
    type: Object,
    default: () => null
  },
  sentimentAnalyzing: {
    type: Boolean,
    default: false
  },
  sentimentHtmlAnalysis: {
    type: String,
    default: ''
  },
})

defineEmits(['analyze-sentiment'])

const activeTab = ref('news')
const chartRef = ref(null)
let chartInstance = null

const sentimentClass = ref('')

function updateSentimentClass() {
  if (!props.sentiment) return
  const label = props.sentiment.sentimentLabel
  if (label && (label.includes('偏多') || label.includes('积极'))) {
    sentimentClass.value = 'positive'
  } else if (label && (label.includes('偏空') || label.includes('消极'))) {
    sentimentClass.value = 'negative'
  } else {
    sentimentClass.value = 'neutral'
  }
}

function indexColor(val) {
  if (val == null) return '#8892b0'
  return val > 0 ? '#e94560' : val < 0 ? '#1abc9c' : '#8892b0'
}

function formatIndexChange(val) {
  if (val == null) return '--'
  const prefix = val > 0 ? '+' : ''
  return prefix + val.toFixed(2) + '%'
}

function getSourceClass(source) {
  if (!source) return ''
  if (source.includes('研报') || source.includes('研究')) return 'source-report'
  if (source.includes('公告') || source.includes('决议')) return 'source-announce'
  return ''
}

const fundFlowData = computed(() => props.fundFlow)

function flowColor(val) {
  if (val == null) return '#8892b0'
  return val > 0 ? '#e94560' : val < 0 ? '#1abc9c' : '#8892b0'
}

function formatFlow(val) {
  if (val == null) return '--'
  const num = Number(val)
  const prefix = num > 0 ? '+' : ''
  if (Math.abs(num) >= 1e8) return prefix + (num / 1e8).toFixed(2) + '亿'
  if (Math.abs(num) >= 1e4) return prefix + (num / 1e4).toFixed(2) + '万'
  return prefix + num.toFixed(0)
}

function barWidth(val, total) {
  if (!total || total === 0) return '0%'
  return Math.max(2, (val || 0) / total * 100) + '%'
}

function renderChart() {
  if (!chartRef.value || !props.sentiment) return

  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value)
  }

  const { positiveRatio, neutralRatio, negativeRatio } = props.sentiment

  const option = {
    tooltip: {
      trigger: 'item',
      backgroundColor: '#161b22',
      borderColor: '#21262d',
      textStyle: { color: '#c9d1d9' },
      formatter: '{b}: {d}%'
    },
    legend: { show: false },
    series: [
      {
        type: 'pie',
        radius: ['45%', '72%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 4,
          borderColor: '#161b22',
          borderWidth: 2
        },
        label: {
          show: true,
          color: '#c9d1d9',
          fontSize: 12,
          formatter: '{b}\n{d}%'
        },
        labelLine: {
          lineStyle: { color: '#21262d' }
        },
        emphasis: {
          label: { show: true, fontSize: 14, fontWeight: 'bold' }
        },
        data: [
          { value: positiveRatio ?? 0, name: '看多', itemStyle: { color: '#e94560' } },
          { value: neutralRatio ?? 0, name: '中性', itemStyle: { color: '#8892b0' } },
          { value: negativeRatio ?? 0, name: '看空', itemStyle: { color: '#1abc9c' } },
        ]
      }
    ]
  }

  chartInstance.setOption(option)
}

watch(
  () => props.sentiment,
  () => {
    updateSentimentClass()
    nextTick(() => renderChart())
  },
  { deep: true, immediate: true }
)

onMounted(() => {
  updateSentimentClass()
  nextTick(() => renderChart())
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
})

function handleResize() {
  if (chartInstance) chartInstance.resize()
}
</script>

<style scoped>
.news-sentiment-section {
  background-color: #161b22;
  border: 1px solid #21262d;
  border-radius: 12px;
  padding: 24px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #c9d1d9;
  margin: 0 0 20px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-icon {
  font-size: 20px;
}

/* Market Indices Bar */
.market-overview {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
}

.indices-bar {
  display: flex;
  gap: 16px;
  padding: 12px 16px;
  background-color: #0d1117;
  border: 1px solid #21262d;
  border-radius: 8px;
}

.fund-flow-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  background-color: #0d1117;
  border: 1px solid #21262d;
  border-radius: 8px;
}

.flow-label {
  font-size: 11px;
  color: #484f58;
  white-space: nowrap;
}

.flow-items {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.flow-tag {
  font-size: 11px;
  color: #8892b0;
  padding: 1px 6px;
  background-color: #161b22;
  border-radius: 3px;
}

.flow-value {
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.index-item {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.index-name {
  font-size: 12px;
  color: #8892b0;
  white-space: nowrap;
}

.index-value {
  font-size: 14px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.index-change {
  font-size: 12px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.index-flow {
  font-size: 10px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  padding: 1px 4px;
  background-color: #0d1117;
  border-radius: 3px;
}

/* Content Grid */
.content-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

@media (max-width: 768px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
  .market-overview {
    gap: 6px;
  }
  .indices-bar {
    flex-wrap: wrap;
    gap: 8px;
  }
  .fund-flow-bar {
    flex-wrap: wrap;
  }
}

/* News Tabs */
.news-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
}

.news-tab {
  padding: 6px 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  color: #8892b0;
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
}

.news-tab:hover {
  color: #c9d1d9;
  background-color: #0d1117;
}

.news-tab.active {
  color: #58a6ff;
  background-color: rgba(88, 166, 255, 0.1);
  border-color: rgba(88, 166, 255, 0.3);
}

/* News Panel */
.news-panel {
  min-height: 200px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  color: #8892b0;
}

.empty-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
}

.news-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.news-item {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
  padding: 10px 12px;
  background-color: #0d1117;
  border: 1px solid #21262d;
  border-radius: 8px;
  transition: border-color 0.2s;
}

.news-item:hover {
  border-color: #58a6ff;
}

.news-source {
  display: inline-block;
  padding: 2px 8px;
  background-color: rgba(88, 166, 255, 0.15);
  color: #58a6ff;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  flex-shrink: 0;
}

.source-report {
  background-color: rgba(240, 200, 80, 0.15);
  color: #f0c850;
}

.source-announce {
  background-color: rgba(88, 166, 255, 0.15);
  color: #58a6ff;
}

.news-title {
  flex: 1;
  min-width: 0;
  color: #c9d1d9;
  text-decoration: none;
  font-size: 13px;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  transition: color 0.2s;
}

.news-title:hover {
  color: #58a6ff;
  text-decoration: underline;
}

.news-title-no-link {
  color: #c9d1d9;
}

.news-title-no-link:hover {
  color: #c9d1d9;
  text-decoration: none;
}

.news-time {
  color: #8892b0;
  font-size: 11px;
  white-space: nowrap;
  flex-shrink: 0;
}

/* Rating Card */
.rating-card {
  background-color: #0d1117;
  border: 1px solid #21262d;
  border-radius: 8px;
  padding: 14px;
}

.rating-header {
  margin-bottom: 12px;
}

.rating-org-count {
  font-size: 14px;
  font-weight: 600;
  color: #58a6ff;
}

.rating-bars {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.rating-bar-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bar-label {
  width: 36px;
  font-size: 11px;
  color: #8892b0;
  text-align: right;
}

.bar-track {
  flex: 1;
  height: 14px;
  background-color: #161b22;
  border-radius: 3px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s;
}

.bar-fill.buy {
  background: linear-gradient(90deg, #e94560, #ff6b6b);
}

.bar-fill.add {
  background: linear-gradient(90deg, #f0a500, #ffc107);
}

.bar-fill.neutral {
  background: linear-gradient(90deg, #8892b0, #a0aab8);
}

.bar-num {
  width: 40px;
  font-size: 11px;
  color: #c9d1d9;
  font-variant-numeric: tabular-nums;
}

.target-price {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 10px;
  border-top: 1px solid #21262d;
}

.target-label {
  font-size: 11px;
  color: #8892b0;
}

.target-value {
  font-size: 14px;
  font-weight: 600;
  color: #e94560;
}

.eps-forecast {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.eps-items {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.eps-item {
  font-size: 11px;
  color: #c9d1d9;
  padding: 2px 8px;
  background-color: #161b22;
  border-radius: 4px;
}

/* Sentiment Panel */
.sentiment-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 200px;
}

.sentiment-chart {
  width: 100%;
  height: 220px;
}

.sentiment-info {
  text-align: center;
  margin-top: 8px;
}

.sentiment-label {
  display: inline-block;
  padding: 4px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 6px;
}

.sentiment-label.positive {
  color: #58a6ff;
  background-color: rgba(88, 166, 255, 0.15);
}

.sentiment-label.negative {
  color: #e94560;
  background-color: rgba(233, 69, 96, 0.15);
}

.sentiment-label.neutral {
  color: #8892b0;
  background-color: rgba(136, 146, 176, 0.15);
}

.sentiment-score {
  font-size: 13px;
  color: #8892b0;
}

.sentiment-score strong {
  color: #c9d1d9;
}

.sentiment-details {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 12px;
  width: 100%;
}

.detail-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 0;
}

.detail-label {
  font-size: 11px;
  color: #8892b0;
}

.detail-value {
  font-size: 14px;
  font-weight: 600;
  color: #c9d1d9;
}

.detail-unit {
  font-size: 11px;
  color: #8892b0;
  font-weight: 400;
}

/* AI Analysis Section */
.ai-analysis-section {
  width: 100%;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #21262d;
}

.ai-analysis-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 10px 16px;
  background: linear-gradient(135deg, rgba(88, 166, 255, 0.1), rgba(184, 126, 230, 0.1));
  border: 1px solid rgba(88, 166, 255, 0.3);
  border-radius: 8px;
  color: #58a6ff;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.ai-analysis-btn:hover {
  background: linear-gradient(135deg, rgba(88, 166, 255, 0.2), rgba(184, 126, 230, 0.2));
  border-color: #58a6ff;
}

.ai-analysis-btn.small {
  width: auto;
  padding: 4px 12px;
  font-size: 11px;
}

.ai-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 20px;
}

.loading-dots {
  display: flex;
  gap: 8px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #58a6ff;
  animation: pulse-dot 1.4s ease-in-out infinite;
}

.dot:nth-child(2) { animation-delay: 0.2s; }
.dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes pulse-dot {
  0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
  40% { opacity: 1; transform: scale(1.1); }
}

.loading-text {
  color: #8892b0;
  font-size: 13px;
}

.ai-analysis-content {
  background-color: #0d1117;
  border: 1px solid #21262d;
  border-radius: 8px;
  padding: 16px;
}

.ai-analysis-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.ai-badge {
  padding: 2px 8px;
  background: linear-gradient(135deg, rgba(88, 166, 255, 0.2), rgba(184, 126, 230, 0.2));
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  color: #b87ee6;
}

.typing-cursor {
  display: inline-block;
  width: 2px;
  height: 1.1em;
  background-color: #58a6ff;
  margin-left: 2px;
  vertical-align: text-bottom;
  animation: blink-cursor 1s step-end infinite;
}

@keyframes blink-cursor {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
</style>
