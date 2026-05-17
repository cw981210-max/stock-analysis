<script setup>
import { ref } from 'vue'
import SearchBar from './components/SearchBar.vue'
import StockOverview from './components/StockOverview.vue'
import KlineChart from './components/KlineChart.vue'
import MetricsPanel from './components/MetricsPanel.vue'
import FinancialData from './components/FinancialData.vue'
import NewsSentiment from './components/NewsSentiment.vue'
import AIReport from './components/AIReport.vue'
import SettingsModal from './components/SettingsModal.vue'
import SmartRecommend from './components/SmartRecommend.vue'
import { useStockData } from './composables/useStockData.js'
import { useAIAnalysis } from './composables/useAIAnalysis.js'
import { useSentimentAnalysis } from './composables/useSentimentAnalysis.js'
import { useSmartRecommend } from './composables/useSmartRecommend.js'
import { useFeedback } from './composables/useFeedback.js'
import { fetchHotStockQuotes } from './api/eastmoney.js'
import MarkdownIt from 'markdown-it'

const md = new MarkdownIt({ html: false, breaks: true })

const {
  loading, error: dataError, searchResults,
  quote, kline, klinePeriod, financial, metrics, industry, news, sentiment,
  currentCode, currentName,
  industryRanking, stockIndustryRank, researchReports, marketIndices, marketFundFlow,
  search, selectStock, loadAll, loadKline,
} = useStockData()

const {
  report, htmlReport, analyzing, error: aiError,
  analyze, reset: resetAI,
} = useAIAnalysis()

const {
  analysis: sentimentAnalysis, htmlAnalysis: sentimentHtmlAnalysis,
  analyzing: sentimentAnalyzing, error: sentimentError,
  analyzeSentiment, reset: resetSentiment,
} = useSentimentAnalysis()

const {
  recommendation, htmlRecommendation, analyzing: recommendAnalyzing,
  error: recommendError, recommend, reset: resetRecommend,
} = useSmartRecommend()

const {
  refining: aiRefining, refineWithFeedback: refineAIReport,
} = useFeedback()
const {
  refining: recommendRefining, refineWithFeedback: refineRecommend,
} = useFeedback()

const showSettings = ref(false)
const activeTab = ref('analysis') // 'analysis' | 'recommend'
const apiKey = ref(localStorage.getItem('stockai_apikey') || '')
const provider = ref(localStorage.getItem('stockai_provider') || 'openai')
const model = ref(localStorage.getItem('stockai_model') || 'gpt-4o-mini')
const proxyUrl = ref(localStorage.getItem('stockai_proxy') || '')

const hasApiKey = ref(!!localStorage.getItem('stockai_apikey'))

function onApiKeyChange(val) {
  apiKey.value = val
  hasApiKey.value = !!val
  localStorage.setItem('stockai_apikey', val)
}

function onProviderChange(val) {
  provider.value = val
  localStorage.setItem('stockai_provider', val)
}

function onModelChange(val) {
  model.value = val
  localStorage.setItem('stockai_model', val)
}

function onProxyChange(val) {
  proxyUrl.value = val
  localStorage.setItem('stockai_proxy', val)
}

async function onSelectStock(stock) {
  console.log('[StockAI] 选中股票:', stock, 'apiKey:', apiKey.value ? '已配置' : '未配置')
  selectStock(stock)
  resetAI()
  resetSentiment()

  const loadPromise = loadAll(stock.code)
  const timeoutPromise = new Promise(resolve => setTimeout(resolve, 15000))
  await Promise.race([loadPromise, timeoutPromise])

  console.log('[StockAI] 数据加载阶段完成, apiKey:', apiKey.value ? '已配置(' + apiKey.value.slice(0, 8) + '...)' : '未配置', 'code:', currentCode.value)

  if (apiKey.value && currentCode.value) {
    console.log('[StockAI] 准备调用 runAnalysis...')
    await runAnalysis()
  } else {
    console.warn('[StockAI] 跳过AI分析：', apiKey.value ? '' : '未配置API Key', currentCode.value ? '' : '未选择股票')
  }
}

async function onPeriodChange(period) {
  await loadKline(currentCode.value, period)
}

async function runAnalysis() {
  if (!currentCode.value) return
  if (!apiKey.value) {
    showSettings.value = true
    return
  }
  try {
    console.log('[StockAI] 开始AI分析:', { provider: provider.value, model: model.value, code: currentCode.value })
    await analyze(
      {
        code: currentCode.value,
        name: currentName.value,
        quote: quote.value,
        metrics: metrics.value,
        financial: financial.value,
        industry: industry.value,
        news: news.value,
        sentiment: sentiment.value,
        marketIndices: marketIndices.value,
        marketFundFlow: marketFundFlow.value,
        industryRanking: industryRanking.value,
        stockIndustryRank: stockIndustryRank.value,
        researchReports: researchReports.value,
      },
      apiKey.value,
      provider.value,
      model.value,
    )
  } catch (e) {
    console.error('[StockAI] AI分析失败:', e)
  }
}

async function runSentimentAnalysis() {
  if (!apiKey.value) {
    showSettings.value = true
    return
  }
  try {
    await analyzeSentiment(
      {
        name: currentName.value,
        code: currentCode.value,
        news: news.value,
        sentiment: sentiment.value,
        researchReports: researchReports.value,
        marketIndices: marketIndices.value,
      },
      apiKey.value,
      provider.value,
      model.value,
    )
  } catch (e) {
    console.error('[StockAI] 情绪分析失败:', e)
  }
}

async function onSmartRecommend(preferences) {
  if (!apiKey.value) {
    showSettings.value = true
    return
  }
  try {
    // 获取热门股票实时行情 + 全市场价格速查表
    const { hotStocks, priceLookup } = await fetchHotStockQuotes()
    await recommend(preferences, apiKey.value, provider.value, model.value, marketIndices.value, marketFundFlow.value, hotStocks, priceLookup)
  } catch (e) {
    console.error('[StockAI] 智能荐股失败:', e)
  }
}

function onResetRecommend() {
  resetRecommend()
}

async function onAIReportFeedback(feedback) {
  if (!report.value || !apiKey.value) return
  try {
    await refineAIReport(report.value, feedback, apiKey.value, provider.value, model.value, (text) => {
      report.value = text
      htmlReport.value = md.render(text)
    })
  } catch (e) {
    console.error('[StockAI] 反馈优化失败:', e)
  }
}

async function onRecommendFeedback(feedback) {
  if (!recommendation.value || !apiKey.value) return
  try {
    await refineRecommend(recommendation.value, feedback, apiKey.value, provider.value, model.value, (text) => {
      recommendation.value = text
      htmlRecommendation.value = md.render(text)
    })
  } catch (e) {
    console.error('[StockAI] 荐股反馈优化失败:', e)
  }
}
</script>

<template>
  <div class="min-h-screen bg-[#0d1117] text-[#c9d1d9]">
    <!-- Header -->
    <header class="sticky top-0 z-50 bg-[#0d1117]/95 backdrop-blur border-b border-[#21262d]">
      <div class="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
        <div class="flex items-center gap-2 shrink-0">
          <svg class="w-7 h-7 text-[#58a6ff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
          <h1 class="text-lg font-semibold tracking-tight hidden sm:block">StockAI <span class="text-[#8892b0] font-normal text-sm">智能投研</span></h1>
        </div>

        <!-- Tab Navigation -->
        <div class="flex items-center gap-1 bg-[#161b22] rounded-lg p-1">
          <button
            @click="activeTab = 'analysis'"
            class="px-3 py-1.5 rounded-md text-sm font-medium transition-all"
            :class="activeTab === 'analysis' ? 'bg-[#58a6ff] text-white' : 'text-[#8892b0] hover:text-[#c9d1d9]'"
          >
            个股分析
          </button>
          <button
            @click="activeTab = 'recommend'"
            class="px-3 py-1.5 rounded-md text-sm font-medium transition-all"
            :class="activeTab === 'recommend' ? 'bg-[#58a6ff] text-white' : 'text-[#8892b0] hover:text-[#c9d1d9]'"
          >
            智能荐股
          </button>
        </div>

        <!-- Search (only in analysis tab) -->
        <div v-if="activeTab === 'analysis'" class="flex-1 max-w-xl">
          <SearchBar
            :search-results="searchResults"
            :search-fn="search"
            @select="onSelectStock"
          />
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <button
            v-if="activeTab === 'analysis' && currentCode && !analyzing && hasApiKey"
            @click="runAnalysis"
            class="px-4 py-2 bg-[#58a6ff] text-white rounded-lg text-sm font-medium hover:bg-[#4393e6] transition-colors"
          >
            重新分析
          </button>
          <button
            v-if="currentCode && !hasApiKey"
            @click="showSettings = true"
            class="px-4 py-2 bg-[#0f3460] text-[#58a6ff] rounded-lg text-sm font-medium hover:bg-[#0f3460]/80 transition-colors border border-[#58a6ff]/30"
          >
            配置 AI
          </button>
          <button
            v-if="analyzing || recommendAnalyzing"
            disabled
            class="px-4 py-2 bg-[#21262d] text-[#8892b0] rounded-lg text-sm font-medium cursor-not-allowed"
          >
            分析中...
          </button>
          <button
            @click="showSettings = true"
            class="p-2 rounded-lg hover:bg-[#161b22] transition-colors"
            title="设置"
          >
            <svg class="w-5 h-5 text-[#8892b0]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
            </svg>
          </button>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 py-6 space-y-6">

      <!-- ===== Smart Recommend Tab ===== -->
      <template v-if="activeTab === 'recommend'">
        <div v-if="!hasApiKey" class="flex flex-col items-center justify-center py-20 text-[#8892b0]">
          <svg class="w-16 h-16 mb-4 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
          </svg>
          <p class="text-lg mb-1">请先配置 AI 模型</p>
          <p class="text-sm mb-4">智能荐股功能需要配置 API Key 才能使用</p>
          <button
            @click="showSettings = true"
            class="px-5 py-2.5 bg-[#58a6ff] text-white rounded-lg text-sm font-medium hover:bg-[#4393e6] transition-colors"
          >
            配置 AI 模型
          </button>
        </div>
        <SmartRecommend
          v-else
          :analyzing="recommendAnalyzing"
          :html-recommendation="htmlRecommendation"
          :error="recommendError"
          :refining="recommendRefining"
          @submit="onSmartRecommend"
          @reset="onResetRecommend"
          @feedback="onRecommendFeedback"
        />
      </template>

      <!-- ===== Stock Analysis Tab ===== -->
      <template v-if="activeTab === 'analysis'">
        <!-- Loading -->
        <div v-if="loading" class="flex items-center justify-center py-20">
          <div class="flex items-center gap-3 text-[#8892b0]">
            <svg class="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" class="opacity-20"/>
              <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
            </svg>
            <span>数据加载中...</span>
          </div>
        </div>

        <!-- Error -->
        <div v-if="dataError" class="bg-[#e94560]/10 border border-[#e94560]/30 rounded-lg p-4 text-[#e94560] text-sm">
          {{ dataError }}
        </div>

        <!-- Empty State -->
        <div v-if="!currentCode && !loading" class="flex flex-col items-center justify-center py-32 text-[#8892b0]">
          <svg class="w-16 h-16 mb-4 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
          <p class="text-lg mb-1">搜索股票开始分析</p>
          <p class="text-sm">输入股票代码或名称，如 "600519" 或 "贵州茅台"</p>
          <button
            v-if="!hasApiKey"
            @click="showSettings = true"
            class="mt-6 px-5 py-2.5 bg-[#58a6ff] text-white rounded-lg text-sm font-medium hover:bg-[#4393e6] transition-colors"
          >
            首次使用？点击配置 AI 模型
          </button>
        </div>

        <!-- Stock Data Sections -->
        <template v-if="currentCode && !loading">
          <!-- Block 2: Stock Overview -->
          <StockOverview
            v-if="quote"
            :quote="quote"
            :code="currentCode"
            :industry="industry?.industry"
          />

          <!-- Block 3: K-line + Metrics -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-2">
              <KlineChart
                :kline-data="kline"
                :code="currentCode"
                :period="klinePeriod"
                @update:period="onPeriodChange"
              />
            </div>
            <div>
              <MetricsPanel :metrics="metrics" />
            </div>
          </div>

          <!-- Block 4: Financial + Industry -->
          <FinancialData
            :financial="financial"
            :industry="industry"
            :stock-industry-rank="stockIndustryRank"
            :industry-ranking="industryRanking"
            :current-code="currentCode"
          />

          <!-- Block 5: News + Sentiment -->
          <NewsSentiment
            :news="news"
            :sentiment="sentiment"
            :research-reports="researchReports"
            :market-indices="marketIndices"
            :fund-flow="marketFundFlow"
            :sentiment-analyzing="sentimentAnalyzing"
            :sentiment-html-analysis="sentimentHtmlAnalysis"
            @analyze-sentiment="runSentimentAnalysis"
          />

          <!-- Block 6: AI Report -->
          <AIReport
            :html-report="htmlReport"
            :report="report"
            :analyzing="analyzing"
            :error="aiError"
            :refining="aiRefining"
            @retry="runAnalysis"
            @feedback="onAIReportFeedback"
          />
        </template>
      </template>
    </main>

    <!-- Footer -->
    <footer class="border-t border-[#21262d] mt-12">
      <div class="max-w-7xl mx-auto px-4 py-6 text-center text-[#8892b0] text-xs">
        <p>StockAI 智能投研 — 数据仅供参考，不构成投资建议。投资有风险，入市需谨慎。</p>
      </div>
    </footer>

    <!-- Settings Modal -->
    <SettingsModal
      v-model="showSettings"
      :api-key="apiKey"
      :provider="provider"
      :model="model"
      :proxy-url="proxyUrl"
      @update:api-key="onApiKeyChange"
      @update:provider="onProviderChange"
      @update:model="onModelChange"
      @update:proxy-url="onProxyChange"
    />
  </div>
</template>
