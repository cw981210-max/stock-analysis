import { ref } from 'vue'
import { fetchRealtimeQuote, searchStock, fetchNews } from '../api/sina.js'
import { fetchKlineData } from '../api/tencent.js'
import {
  fetchFinancialData, fetchStockMetrics, fetchIndustryData,
  fetchStockAnalysisData, fetchIndustryRanking, fetchStockIndustryRank,
  fetchResearchReports, fetchMarketIndices, fetchMarketFundFlow,
} from '../api/eastmoney.js'
import { fetchSentiment } from '../api/xueqiu.js'

export function useStockData() {
  const loading = ref(false)
  const error = ref(null)
  const searchResults = ref([])

  const quote = ref(null)
  const kline = ref([])
  const klinePeriod = ref('day')
  const financial = ref(null)
  const metrics = ref(null)
  const industry = ref(null)
  const news = ref([])
  const sentiment = ref(null)
  const currentCode = ref('')
  const currentName = ref('')

  const industryRanking = ref([])
  const stockIndustryRank = ref(null)
  const researchReports = ref([])
  const stockAnalysisData = ref(null)
  const marketIndices = ref(null)
  const marketFundFlow = ref(null)

  async function search(keyword) {
    if (!keyword || keyword.trim().length === 0) {
      searchResults.value = []
      return
    }
    try {
      searchResults.value = await searchStock(keyword.trim())
    } catch {
      searchResults.value = []
    }
  }

  function selectStock(item) {
    currentCode.value = item.code
    currentName.value = item.name
    searchResults.value = []
  }

  async function loadAll(code) {
    if (!code) return
    loading.value = true
    error.value = null

    try {
      const [quoteRes, klineRes, finRes, metricsRes, indRes, newsRes, sentRes,
              analysisRes, rankRes, reportRes, indicesRes, fundFlowRes] = await Promise.allSettled([
        fetchRealtimeQuote(code),
        fetchKlineData(code, klinePeriod.value),
        fetchFinancialData(code),
        fetchStockMetrics(code),
        fetchIndustryData(code),
        fetchNews(code),
        fetchSentiment(code),
        fetchStockAnalysisData(code),
        fetchIndustryRanking(),
        fetchResearchReports(code),
        fetchMarketIndices(),
        fetchMarketFundFlow(),
      ])

      if (quoteRes.status === 'fulfilled') {
        quote.value = quoteRes.value
        currentName.value = quoteRes.value.name
      }

      kline.value = klineRes.status === 'fulfilled' ? klineRes.value : []
      financial.value = finRes.status === 'fulfilled' ? finRes.value : null
      industry.value = indRes.status === 'fulfilled' ? indRes.value : null
      news.value = newsRes.status === 'fulfilled' ? newsRes.value : []
      sentiment.value = sentRes.status === 'fulfilled' ? sentRes.value : null
      stockAnalysisData.value = analysisRes.status === 'fulfilled' ? analysisRes.value : null
      industryRanking.value = rankRes.status === 'fulfilled' ? rankRes.value : []
      researchReports.value = reportRes.status === 'fulfilled' ? reportRes.value : []
      marketIndices.value = indicesRes.status === 'fulfilled' ? indicesRes.value : null
      marketFundFlow.value = fundFlowRes.status === 'fulfilled' ? fundFlowRes.value : null

      // 合并指标
      const q = (quoteRes.status === 'fulfilled' && quoteRes.value) || {}
      const f = (metricsRes.status === 'fulfilled' && metricsRes.value) || {}
      const s = (sentRes.status === 'fulfilled' && sentRes.value) || {}

      metrics.value = {
        pe: q.pe ?? null,
        pb: q.pb ?? null,
        totalMarketCap: q.totalMarketCap ?? null,
        roe: f.roe ?? null,
        grossMargin: f.grossMargin ?? null,
        netMargin: f.netMargin ?? null,
        eps: f.eps ?? null,
        revenueGrowth: f.revenueGrowth ?? null,
        profitGrowth: f.profitGrowth ?? null,
        debtRatio: f.debtRatio ?? null,
        turnover: q.turnover ?? null,
        primeInflow: s.primeInflow ?? null,
      }

      // 把板块信息合并到 industry
      const analysisData = stockAnalysisData.value
      if (analysisData) {
        if (!industry.value) industry.value = {}
        if (analysisData.industryBoard) {
          industry.value.industryBoard = analysisData.industryBoard
          // 如果没有 CSRC 行业名，用板块名代替
          if (!industry.value.industry) {
            industry.value.industry = analysisData.industryBoard
          }
        }
        industry.value.conceptBoards = analysisData.conceptBoards
        industry.value.regionBoard = analysisData.regionBoard
        industry.value.ratingOrgNum = analysisData.ratingOrgNum
        industry.value.ratingBuyNum = analysisData.ratingBuyNum
        industry.value.targetPriceMin = analysisData.targetPriceMin
        industry.value.targetPriceMax = analysisData.targetPriceMax
      }

      // 匹配行业排名
      if (industry.value?.industryBoard && industryRanking.value.length > 0) {
        const match = industryRanking.value.find(b => b.name === industry.value.industryBoard)
        if (match) {
          industry.value.industryRank = match.rank
          industry.value.totalIndustries = industryRanking.value.length
          industry.value.industryBuyRatio = match.buyRatio
        }
      }

      // 获取行业内排名
      if (industry.value?.industryBoard) {
        try {
          stockIndustryRank.value = await fetchStockIndustryRank(code, industry.value.industryBoard)
        } catch (e) {
          console.warn('[StockAI] 行业内排名获取失败:', e)
        }
      }

    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  async function loadKline(code, period) {
    klinePeriod.value = period
    try {
      kline.value = await fetchKlineData(code, period)
    } catch {
      kline.value = []
    }
  }

  return {
    loading, error, searchResults,
    quote, kline, klinePeriod, financial, metrics, industry, news, sentiment,
    currentCode, currentName,
    industryRanking, stockIndustryRank, researchReports, stockAnalysisData,
    marketIndices, marketFundFlow,
    search, selectStock, loadAll, loadKline,
  }
}
