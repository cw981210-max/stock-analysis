import { ref } from 'vue'
import { streamAnalysis } from '../api/openai.js'
import MarkdownIt from 'markdown-it'

const md = new MarkdownIt({ html: false, breaks: true })

// AI推荐完成后，对"当前参考价/当前净值"等行注入实时价格
function postProcessRecommendation(text, priceLookup) {
  if (!priceLookup || priceLookup.size === 0) return text

  // Step 1: 找到所有价格标签行（兼容"当前参考价"、"当前净值"、"当前价格"等各种变体）
  const priceLineRegex = /(\*{0,2}(?:当前参考价|当前净值|当前价格|最新价|当前市价|参考价格|参考净值)\*{0,2}\s*[：:]\s*)([^\n]+)/g
  const replacements = []
  let priceMatch

  while ((priceMatch = priceLineRegex.exec(text)) !== null) {
    const oldPrice = priceMatch[2]
    // 已经有 ¥ 符号或具体小数价格的跳过
    if (oldPrice.includes('¥') || /\d{2,}\.\d{2}/.test(oldPrice)) continue

    // 向上1000字符范围内查找最近的6位股票/ETF代码
    const searchStart = Math.max(0, priceMatch.index - 1000)
    const beforeText = text.slice(searchStart, priceMatch.index)
    const codeMatches = beforeText.match(/(?<!\d)(6\d{5}|0\d{5}|3\d{5}|5\d{5}|8\d{5}|4\d{5})(?!\d)/g)
    if (!codeMatches || codeMatches.length === 0) continue

    // 从最近的代码开始，找到第一个有价格的
    let foundInfo = null
    for (let i = codeMatches.length - 1; i >= 0; i--) {
      const info = priceLookup.get(codeMatches[i])
      if (info && info.price) {
        foundInfo = { code: codeMatches[i], ...info }
        break
      }
    }
    if (!foundInfo) continue

    const priceStr = `¥${foundInfo.price}（今日${foundInfo.changePercent > 0 ? '+' : ''}${foundInfo.changePercent?.toFixed(2)}%）`
    replacements.push({
      start: priceMatch.index,
      end: priceMatch.index + priceMatch[0].length,
      replacement: priceMatch[1] + priceStr,
    })
  }

  // 从后往前替换，保持前面的位置不变
  let updatedText = text
  for (let i = replacements.length - 1; i >= 0; i--) {
    const { start, end, replacement } = replacements[i]
    updatedText = updatedText.slice(0, start) + replacement + updatedText.slice(end)
  }

  // Step 2: 替换残留的模糊价格描述（AI可能在不同位置使用这些短语）
  const fuzzyReplacements = [
    [/当前净值附近/g, '（实时价格见下方参考表）'],
    [/当前价位附近/g, '（实时价格见下方参考表）'],
    [/当前价格附近/g, '（实时价格见下方参考表）'],
    [/该品种未在实时行情列表中[，,]?\s*请投资者自行查询最新价格/g, '（实时价格见下方参考表）'],
    [/无法获得实时股价[^。\n]*/g, '（实时价格见下方参考表）'],
    [/请投资者自行查询最新价格/g, '（实时价格见下方参考表）'],
    [/投资者应在下单前实时查看最新股价[^。\n]*/g, '请参考下方实时价格表，并在下单前确认最新价格'],
    [/请根据实时行情调整/g, '系统已自动补充实时价格，请参考'],
  ]
  for (const [regex, replacement] of fuzzyReplacements) {
    updatedText = updatedText.replace(regex, replacement)
  }

  // Step 3: 收集所有推荐品种代码，在末尾追加实时价格参考表
  const codeRegex = /(?<!\d)(6\d{5}|0\d{5}|3\d{5}|5\d{5}|8\d{5}|4\d{5})(?!\d)/g
  const codes = new Set()
  let match
  while ((match = codeRegex.exec(text)) !== null) {
    codes.add(match[1])
  }

  const foundPrices = []
  for (const code of codes) {
    const info = priceLookup.get(code)
    if (info && info.price) {
      foundPrices.push({ code, ...info })
    }
  }

  if (foundPrices.length === 0) return updatedText

  const section = `\n\n---\n### 📊 推荐品种实时价格参考\n\n| 代码 | 名称 | 当前价格 | 涨跌幅 | PE |\n|------|------|---------|--------|----|\n` +
    foundPrices.map(p =>
      `| ${p.code} | ${p.name} | ¥${p.price} | ${p.changePercent > 0 ? '+' : ''}${p.changePercent?.toFixed(2)}% | ${p.pe || '--'} |`
    ).join('\n') +
    `\n\n> 以上价格为系统自动补充的实时行情数据，供投资决策参考。实际交易请以下单时的实时价格为准。`

  return updatedText + section
}

export function useSmartRecommend() {
  const recommendation = ref('')
  const htmlRecommendation = ref('')
  const analyzing = ref(false)
  const error = ref(null)

  function buildPrompt(preferences, marketIndices, marketFundFlow, hotStocks, priceLookup) {
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

    // 构建全市场品种实时价格速查表（紧凑格式，供AI查找任意品种的实时价格）
    let compactPriceStr = ''
    if (priceLookup && priceLookup.size > 0) {
      const existingCodes = new Set((hotStocks || []).map(s => s.code))
      const entries = []
      for (const [code, info] of priceLookup) {
        if (existingCodes.has(code)) continue
        if (entries.length >= 2000) break
        entries.push(`${code}:${info.price}(${info.changePercent > 0 ? '+' : ''}${info.changePercent?.toFixed(2)}%)`)
      }
      if (entries.length > 0) {
        const lines = []
        for (let i = 0; i < entries.length; i += 15) {
          lines.push(entries.slice(i, i + 15).join(', '))
        }
        compactPriceStr = `\n\n【全A股实时价格速查表（${entries.length}只，代码:价格(涨跌幅)）】\n（推荐任何品种时，请在此查找实时价格填入"当前参考价"）\n` + lines.join('\n')
      }
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
${hotStocksStr}${compactPriceStr}

【核心要求】
1. 你的建议不局限于股票。根据投资者的风险偏好和市场环境，你可以推荐：A股个股、ETF基金、债券、可转债、货币基金、银行理财、黄金等任何合适的投资品种。如果当下不适合投资，你应该明确建议持币观望。
2. 你的分析必须基于多维度数据：宏观经济周期、货币政策、行业景气度、估值水平、资金面、技术面、历史经验、国际形势等。
3. 每个推荐品种必须给出具体的操作策略和实时价格。上方的实时行情数据和价格速查表已包含全市场数千只品种的当前价格。推荐任何股票或ETF时，你必须从上方数据中查找该品种的实时价格，在"当前参考价"中直接写出具体价格（如"¥28.35（今日+1.12%）"），严禁使用"当前价位附近"等模糊描述。如果确实在上方的数据中找不到该品种的价格，才可以使用比例描述（如"回调X%"）。
4. 如果推荐股票，必须是A股真实存在的股票，并说明推荐该股票的核心逻辑。
5. 你必须对投资者的资金安全负责。如果市场环境不适合该投资者的风险偏好，必须直言不讳。
6. 考虑该投资者${months}个月的投资期限，判断当前时点是否适合建仓。
7. 【重要】上方的机构关注个股、ETF、可转债行情表和全A股价格速查表已覆盖全市场品种的实时价格。推荐时请务必在"当前参考价"中填写从上方数据查到的实时价格，不要用"当前价位附近"替代。

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
- **当前参考价**：【从上方实时行情数据或价格速查表中查找该品种的价格，直接填写如"¥28.35（今日+1.12%）"。这是必填项，不要用"当前价位附近"替代】
- **首次买入价位**：【给出具体策略，如"¥28.35附近可首次建仓30%"或"等待回调至¥25元附近首次建仓"】
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

  async function recommend(preferences, apiKey, providerId, model, marketIndices, marketFundFlow, hotStocks, priceLookup) {
    analyzing.value = true
    error.value = null
    recommendation.value = ''
    htmlRecommendation.value = ''

    const prompt = buildPrompt(preferences, marketIndices, marketFundFlow, hotStocks, priceLookup)

    try {
      const result = await streamAnalysis(prompt, apiKey, providerId, model, (text) => {
        recommendation.value = text
        htmlRecommendation.value = md.render(text)
      })

      // AI推荐完成后，自动补充推荐品种的实时价格（兜底）
      if (priceLookup && recommendation.value) {
        const processed = postProcessRecommendation(recommendation.value, priceLookup)
        recommendation.value = processed
        htmlRecommendation.value = md.render(processed)
      }

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
