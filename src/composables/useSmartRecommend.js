import { ref } from 'vue'
import { streamAnalysis } from '../api/openai.js'
import MarkdownIt from 'markdown-it'

const md = new MarkdownIt({ html: false, breaks: true })

export function useSmartRecommend() {
  const recommendation = ref('')
  const htmlRecommendation = ref('')
  const analyzing = ref(false)
  const error = ref(null)

  function buildPrompt(preferences, marketIndices, marketFundFlow, hotStocks) {
    const { riskLevel, investmentAmount, holdingMonths, expectedReturnPct, sectorPreference, customNeeds } = preferences

    const riskMap = {
      conservative: '保守型 — 追求本金安全，宁愿收益低也不愿亏损',
      steady: '稳健型 — 追求稳定收益，能承受小幅波动（-10%以内回撤）',
      aggressive: '积极型 — 追求较高收益，能承受中等波动（-20%以内回撤）',
      radical: '激进型 — 追求最大收益，能承受大幅波动（-30%以上回撤）',
    }

    const sectorMap = {
      tech: '科技（半导体/人工智能/软件/数字经济等）',
      consumer: '消费（食品饮料/家电/零售/旅游等）',
      finance: '金融（银行/保险/券商等）',
      pharma: '医药（创新药/CXO/医疗器械等）',
      energy: '新能源（锂电/光伏/风电/储能等）',
      cyclical: '周期（有色金属/煤炭/钢铁/化工等）',
      dividend: '高股息（银行/公用事业/高速公路等）',
      bond: '债券/固收（国债/企业债/可转债等）',
      fund: '基金（ETF/主动管理基金等）',
      any: '不限',
    }

    const riskDesc = riskMap[riskLevel] || riskLevel
    const months = holdingMonths || 6
    const periodDesc = months <= 3 ? `短线（${months}个月）` : months <= 12 ? `中线（${months}个月）` : `长线（${months}个月）`
    const sectorDesc = sectorMap[sectorPreference] || sectorPreference
    const returnPct = expectedReturnPct ?? 15
    const returnDesc = returnPct === 0 ? '保本为主，收益率不低于0' : `年化收益${returnPct}%`

    let marketStr = '暂无数据'
    if (marketIndices) {
      const parts = []
      if (marketIndices.shanghai) {
        const s = marketIndices.shanghai
        parts.push(`上证指数 ${s.price?.toFixed(2)} ${s.changePercent > 0 ? '+' : ''}${s.changePercent?.toFixed(2)}%`)
      }
      if (marketIndices.shenzhen) {
        const s = marketIndices.shenzhen
        parts.push(`深证成指 ${s.price?.toFixed(2)} ${s.changePercent > 0 ? '+' : ''}${s.changePercent?.toFixed(2)}%`)
      }
      if (marketIndices.csi300) {
        const s = marketIndices.csi300
        parts.push(`沪深300 ${s.price?.toFixed(2)} ${s.changePercent > 0 ? '+' : ''}${s.changePercent?.toFixed(2)}%`)
      }
      if (marketIndices.chinext) {
        const s = marketIndices.chinext
        parts.push(`创业板指 ${s.price?.toFixed(2)} ${s.changePercent > 0 ? '+' : ''}${s.changePercent?.toFixed(2)}%`)
      }
      if (parts.length) marketStr = parts.join('；')
    }

    let fundFlowStr = ''
    if (marketFundFlow) {
      const parts = []
      if (marketFundFlow.shanghai?.mainInflow != null) {
        const v = marketFundFlow.shanghai.mainInflow
        parts.push(`沪市主力${v > 0 ? '净流入' : '净流出'}${Math.abs(v / 1e8).toFixed(2)}亿`)
      }
      if (marketFundFlow.shenzhen?.mainInflow != null) {
        const v = marketFundFlow.shenzhen.mainInflow
        parts.push(`深市主力${v > 0 ? '净流入' : '净流出'}${Math.abs(v / 1e8).toFixed(2)}亿`)
      }
      if (parts.length) fundFlowStr = `\n资金面：${parts.join('，')}`
    }

    // 实时行情数据（股票 + ETF基金 + 可转债）
    let hotStocksStr = '暂无数据'
    if (hotStocks && hotStocks.length > 0) {
      const stocks = hotStocks.filter(s => s.type === '股票').slice(0, 300)
      const etfs = hotStocks.filter(s => s.type === 'ETF')
      const cbs = hotStocks.filter(s => s.type === '可转债')

      let str = ''
      if (stocks.length) {
        str += `【机构关注个股（前${stocks.length}只，含实时价格）】\n代码 | 名称 | 当前价 | 涨跌幅 | PE\n` +
          stocks.map(s =>
            `${s.code} | ${s.name} | ${s.price} | ${s.changePercent > 0 ? '+' : ''}${s.changePercent?.toFixed(2)}% | ${s.pe || '--'}`
          ).join('\n')
      }
      if (etfs.length) {
        str += `\n\n【全市场ETF基金（${etfs.length}只，含实时价格）】\n代码 | 名称 | 当前价 | 涨跌幅\n` +
          etfs.map(s =>
            `${s.code} | ${s.name} | ${s.price} | ${s.changePercent > 0 ? '+' : ''}${s.changePercent?.toFixed(2)}%`
          ).join('\n')
      }
      if (cbs.length) {
        str += `\n\n【可转债（前${cbs.length}只，含实时价格）】\n代码 | 名称 | 当前价 | 涨跌幅\n` +
          cbs.map(s =>
            `${s.code} | ${s.name} | ${s.price} | ${s.changePercent > 0 ? '+' : ''}${s.changePercent?.toFixed(2)}%`
          ).join('\n')
      }
      hotStocksStr = str || '暂无数据'
    }

    return `你是一位拥有25年投资经验的资深首席投资官（CIO），曾管理千亿级资产。你精通宏观经济、行业研究、基本面分析、技术分析、资产配置和风险管理。你不仅熟悉A股市场，还深入了解全球宏观经济、货币政策、地缘政治对市场的影响。你的投资哲学融合了价值投资、趋势投资和量化思维。

现在有一位投资者向你寻求投资建议，请根据其投资偏好，结合当前市场环境和你的全部知识储备，给出最合理、最负责任、最符合当下形势的投资建议。

## 当前市场环境
${marketStr}${fundFlowStr}

## 投资者画像
- 风险偏好：${riskDesc}
- 投资金额：${investmentAmount}万元人民币
- 预计持有时间：${periodDesc}
- 板块/资产偏好：${sectorDesc}
${returnDesc ? '- 预期收益目标：' + returnDesc : ''}
${customNeeds ? '- 个性化需求：' + customNeeds : ''}

## 当前热门A股实时行情（供推荐参考）
${hotStocksStr}

【核心要求】
1. 你的建议不局限于股票。根据投资者的风险偏好和市场环境，你可以推荐：A股个股、ETF基金、债券、可转债、货币基金、银行理财、黄金等任何合适的投资品种。如果当下不适合投资，你应该明确建议持币观望。
2. 你的分析必须基于多维度数据：宏观经济周期、货币政策、行业景气度、估值水平、资金面、技术面、历史经验、国际形势等。
3. 每个推荐品种必须给出具体的操作策略。对于股票类品种，用"当前价位附近"、"回调X%"、"上涨X%"等方式描述买卖时机，避免编造你不确信的具体价格数字。对于ETF/基金等品种，可以参考当前市场估值水平（PE百分位等）给出"当前可建仓"、"等待估值回落后建仓"等建议。
4. 如果推荐股票，必须是A股真实存在的股票，并说明推荐该股票的核心逻辑。
5. 你必须对投资者的资金安全负责。如果市场环境不适合该投资者的风险偏好，必须直言不讳。
6. 考虑该投资者${months}个月的投资期限，判断当前时点是否适合建仓。
7. 【重要】上方的市场行情数据包含了约300只机构关注个股、全市场数百只ETF基金和数百只可转债的真实实时价格。你可以优先从这些品种中选择推荐，这样你的建议将基于真实价格。如果需要推荐不在列表中的品种，请说明"该品种未在实时行情列表中，请投资者自行查询最新价格"。

请严格按照以下格式输出：

### 一、当前市场环境评估
【分析当前宏观经济所处周期、货币政策方向、市场估值水平、资金面状况、国际形势等，判断当前市场整体环境是否适合投资】

### 二、投资策略方向
【基于投资者的风险偏好、资金规模、持有期限和市场环境，确定最合适的投资策略方向。说明为什么选择这个策略。如果建议持币观望，请明确说明理由】

### 三、投资组合方案
【给出具体的投资组合，包含每只资产/股票/基金的代码、名称、建议仓位配比。如果推荐多个方案，分别标注"方案一"和"方案二"】

| 代码 | 名称 | 仓位占比 | 类型 |
|------|------|---------|------|
（仓位合计100%）

### 四、各品种详细操作计划

#### 【名称】(代码)
- **当前参考价**：【投资者应在下单前实时查看最新股价。以下价位为策略参考，请根据实时行情调整】
- **首次买入价位**：【给出具体策略，如"当前价位附近可首次建仓30%"或"等待回调至XX元附近首次建仓"。注意：如果你不确信该股票当前实时价格，请用"当前价位"代替具体数字，或使用"回调X%"等比例方式描述】
- **加仓条件**：【下跌到XX元（或回调X%时）加仓X%，或突破XX元（或上涨X%时）加仓X%】
- **减仓条件**：【上涨到XX元（或盈利X%时）减仓X%】
- **止损价位**：【跌破XX元（或亏损X%时）止损，理由】
- **目标价位**：【XX元，预期收益率XX%】
- **核心逻辑**：【2-3句话说明为什么推荐这个品种】

（对组合中的每个品种重复上述格式）

### 五、风控方案
- 总仓位止损线：【账户总亏损达到X%时全部清仓】
- 分批建仓计划：【如"分3批，首次30%，回调加30%，突破加40%"】
- 需要关注的风险事件：【列出可能影响持仓的重大事件和时间节点】

### 六、投资建议总结
【3-5句话总结核心建议，包括：最大的机会和风险、最需要关注的时间节点、一句话建议】`
  }

  async function recommend(preferences, apiKey, providerId, model, marketIndices, marketFundFlow, hotStocks) {
    analyzing.value = true
    error.value = null
    recommendation.value = ''
    htmlRecommendation.value = ''

    const prompt = buildPrompt(preferences, marketIndices, marketFundFlow, hotStocks)

    try {
      const result = await streamAnalysis(prompt, apiKey, providerId, model, (text) => {
        recommendation.value = text
        htmlRecommendation.value = md.render(text)
      })
      return result
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      analyzing.value = false
    }
  }

  function reset() {
    recommendation.value = ''
    htmlRecommendation.value = ''
    analyzing.value = false
    error.value = null
  }

  return { recommendation, htmlRecommendation, analyzing, error, recommend, reset }
}
