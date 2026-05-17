import { ref } from 'vue'
import { streamAnalysis } from '../api/openai.js'
import MarkdownIt from 'markdown-it'

const md = new MarkdownIt({ html: false, breaks: true })

export function useAIAnalysis() {
  const report = ref('')
  const htmlReport = ref('')
  const analyzing = ref(false)
  const error = ref(null)

  function buildPrompt(data) {
    const { quote, metrics, financial, industry, news, sentiment, code, name,
            marketIndices, marketFundFlow, industryRanking, stockIndustryRank, researchReports } = data

    const price = quote?.price ?? '--'
    const changePct = quote ? ((quote.price - quote.prevClose) / quote.prevClose * 100).toFixed(2) : '--'
    const pe = metrics?.pe ?? '--'
    const pb = metrics?.pb ?? '--'
    const mcap = metrics?.totalMarketCap ? (metrics.totalMarketCap / 1e8).toFixed(2) + '亿' : '--'
    const turnover = metrics?.turnover?.toFixed(2) ?? '--'
    const roe = metrics?.roe?.toFixed(2) ?? '--'
    const grossMargin = metrics?.grossMargin?.toFixed(2) ?? '--'
    const netMargin = metrics?.netMargin?.toFixed(2) ?? '--'
    const eps = metrics?.eps?.toFixed(2) ?? '--'
    const revenueGrowth = metrics?.revenueGrowth?.toFixed(2) ?? '--'
    const profitGrowth = metrics?.profitGrowth?.toFixed(2) ?? '--'
    const debtRatio = metrics?.debtRatio?.toFixed(2) ?? '--'
    const primeInflow = metrics?.primeInflow ? (metrics.primeInflow / 1e8).toFixed(2) + '亿' : '--'

    // 财务数据
    let finStr = '暂无数据'
    if (financial && financial.length > 0) {
      finStr = financial.slice(0, 3).map(f =>
        `${f.reportDate}: 营收 ${(f.revenue / 1e8).toFixed(2)}亿, 净利润 ${(f.netProfit / 1e8).toFixed(2)}亿, 营收增速 ${f.revenueGrowth?.toFixed(2) ?? '--'}%, 净利润增速 ${f.profitGrowth?.toFixed(2) ?? '--'}%, ROE ${f.roe?.toFixed(2) ?? '--'}%, 毛利率 ${f.grossMargin?.toFixed(2) ?? '--'}%, 资产负债率 ${f.debtRatio?.toFixed(2) ?? '--'}%`
      ).join('\n')
    }

    // 新闻
    let newsStr = '暂无新闻'
    if (news && news.length > 0) {
      newsStr = news.slice(0, 8).map(n => `[${n.source}] ${n.title} (${n.time})`).join('\n')
    }

    // 研报
    let reportStr = '暂无研报'
    if (researchReports && researchReports.length > 0) {
      const r = researchReports[0]
      if (r.type === 'rating_summary') {
        const parts = []
        parts.push(`${r.title}`)
        if (r.buyNum) parts.push(`买入${r.buyNum}家`)
        if (r.addNum) parts.push(`增持${r.addNum}家`)
        if (r.neutralNum) parts.push(`中性${r.neutralNum}家`)
        if (r.targetPriceMin || r.targetPriceMax) parts.push(`目标价${r.targetPriceMin || '--'}~${r.targetPriceMax || '--'}元`)
        if (r.epsYears && r.epsYears.length) {
          parts.push(`EPS预测: ${r.epsYears.map(e => `${e.year}(${e.mark})${e.eps}元`).join(', ')}`)
        }
        reportStr = parts.join('；')
      }
    }

    // 情绪数据
    let sentStr = '暂无数据'
    if (sentiment) {
      sentStr = `综合评分: ${sentiment.sentimentScore ?? '--'}/100, 情绪标签: ${sentiment.sentimentLabel}`
      if (sentiment.ratio) sentStr += `, 多空比: ${(sentiment.ratio * 100).toFixed(1)}%`
      if (sentiment.orgParticipate) sentStr += `, 机构参与度: ${(sentiment.orgParticipate * 100).toFixed(1)}%`
      if (sentiment.primeInflow) sentStr += `, 主力净流入: ${(sentiment.primeInflow / 1e8).toFixed(2)}亿`
      if (sentiment.focus) sentStr += `, 市场关注度: ${sentiment.focus}/100`
    }

    // 行业数据
    let industryStr = `所属行业：${industry?.industry ?? '未知'}`
    if (industry?.rank) industryStr += `，市场人气排名：第${industry.rank}名`
    if (industry?.totalScore) industryStr += `，综合评分：${industry.totalScore.toFixed(1)}/100`
    if (industry?.industryRank) industryStr += `，行业排名：第${industry.industryRank}/${industry.totalIndustries || '--'}个行业`
    if (stockIndustryRank?.stockRank) industryStr += `，行业内排名：第${stockIndustryRank.stockRank}/${stockIndustryRank.total || '--'}只股票`

    // 行业概况（前3名行业）
    let hotIndustries = ''
    if (industryRanking && industryRanking.length > 0) {
      const top3 = industryRanking.slice(0, 3).map(i => `${i.name}(${i.changePercent > 0 ? '+' : ''}${i.changePercent?.toFixed(2)}%)`)
      const bottom3 = industryRanking.slice(-3).reverse().map(i => `${i.name}(${i.changePercent > 0 ? '+' : ''}${i.changePercent?.toFixed(2)}%)`)
      hotIndustries = `\n今日领涨行业：${top3.join('、')}\n今日领跌行业：${bottom3.join('、')}`
    }

    // 大盘数据
    let marketStr = '暂无数据'
    if (marketIndices) {
      const parts = []
      if (marketIndices.shanghai) parts.push(`上证指数 ${marketIndices.shanghai.price} ${marketIndices.shanghai.changePercent > 0 ? '+' : ''}${marketIndices.shanghai.changePercent?.toFixed(2)}%`)
      if (marketIndices.shenzhen) parts.push(`深证成指 ${marketIndices.shenzhen.price} ${marketIndices.shenzhen.changePercent > 0 ? '+' : ''}${marketIndices.shenzhen.changePercent?.toFixed(2)}%`)
      if (marketIndices.csi300) parts.push(`沪深300 ${marketIndices.csi300.price} ${marketIndices.csi300.changePercent > 0 ? '+' : ''}${marketIndices.csi300.changePercent?.toFixed(2)}%`)
      if (marketIndices.chinext) parts.push(`创业板指 ${marketIndices.chinext.price} ${marketIndices.chinext.changePercent > 0 ? '+' : ''}${marketIndices.chinext.changePercent?.toFixed(2)}%`)
      if (parts.length) marketStr = parts.join('；')
    }

    // 大盘资金流向
    let fundFlowStr = '暂无数据'
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
      if (marketFundFlow.csi300?.mainInflow != null) {
        const v = marketFundFlow.csi300.mainInflow
        parts.push(`沪深300主力${v > 0 ? '净流入' : '净流出'}${Math.abs(v / 1e8).toFixed(2)}亿`)
      }
      if (parts.length) fundFlowStr = parts.join('；')
    }

    return `你是一位拥有20年A股投资经验的资深分析师，现任某头部券商研究所首席策略师。你同时精通基本面分析、技术面分析和宏观经济分析，具有丰富的理论实战基础。请基于以下真实数据，结合当下大盘情况、行业背景、国内外形势，以首席策略投资分析师的角度，对 ${name}(${code}) 进行最专业、最客观、最全面的投资分析。

【绝对规则 — 违反任何一条即视为无效报告】
规则1：逻辑自洽。综合评级、估值判断、买入/卖出建议必须内部一致。"建议减持"却给出高于当前价的目标价是矛盾的。"强烈推荐"却认为当前高估也是矛盾的。
规则2：估值判断是核心。基于PE/PB历史分位、同行对比、盈利增速客观判断当前${price}元是高估/合理/低估。低估→建议买入，合理+看好增长→可建议买入，合理+不确定→持有观望，高估→建议减持/回避。
规则3：所有分析必须引用下方具体数据（PE、ROE、营收增速等），不得编造数据。
规则4：你是一名首席策略投资分析师，不是销售。必须客观公正，不利因素同样需要重点强调，甚至应给予更多篇幅。
规则5：必须结合大盘环境进行分析，不能脱离市场环境孤立评价个股。

## 当前大盘环境
${marketStr}${hotIndustries}

## 大盘资金流向
${fundFlowStr}

## 当前行情
- 当前价格：${price}元，涨跌幅：${changePct}%
- 市盈率PE：${pe}，市净率PB：${pb}
- 总市值：${mcap}
- 换手率：${turnover}%

## 核心财务指标
- ROE（净资产收益率）：${roe}%
- 毛利率：${grossMargin}%
- 净利率：${netMargin}%
- EPS（每股收益）：${eps}元
- 营收增速：${revenueGrowth}%
- 净利润增速：${profitGrowth}%
- 资产负债率：${debtRatio}%
- 主力净流入：${primeInflow}

## 财务数据（近年报告）
${finStr}

## 行业与市场地位
${industryStr}

## 研究报告摘要
${reportStr}

## 公司最新公告与新闻
${newsStr}

## 市场资金情绪
${sentStr}

请严格按以下格式输出（每个部分都要有实质性内容）：

### 综合评级
【必须且只能从以下5个中选1个：强烈推荐 / 建议买入 / 持有观望 / 建议减持 / 回避】
【再次确认：如果你建议买入，这里必须是"强烈推荐"或"建议买入"；如果你认为风险大，必须是"建议减持"或"回避"】

### 大盘与宏观环境
【分析当前大盘走势、宏观经济环境、货币政策、国内外重大事件对市场的影响】

### 行业前景分析
【分析该行业当前处于的生命周期阶段、行业景气度、政策支持力度、竞争格局、国内外行业趋势】

### 基本面深度分析
【基于财务数据深入分析：盈利质量、成长性、财务安全性、估值合理性，每个论点必须引用具体数据】

### 技术面与资金面
【结合换手率、主力资金流向、市场情绪等技术面和资金面指标进行分析】

### 投资逻辑
【3-5个关键论据，综合基本面+行业+宏观因素，说明看好或不看好的核心原因】

### 风险提示
【3-5个主要风险因素，包括但不限于：行业风险、政策风险、财务风险、市场风险、国际形势风险】

### 建议操作
- 当前股价${price}元的估值判断：【高估/合理/低估】，核心依据：
- 操作建议：
  - 如果判断低估或合理看好：建议在${price}元附近或回调至XX元时分批买入，目标价XX元（基于XX估值方法计算）
  - 如果判断合理但风险较大：建议持有观望，等待回调至XX元以下再考虑
  - 如果判断高估：建议减持，合理价格区间在XX-XX元
- 止损建议：【给出止损价位（亏损X%时）及理由】`
  }

  async function analyze(data, apiKey, providerId, model) {
    analyzing.value = true
    error.value = null
    report.value = ''
    htmlReport.value = ''

    const prompt = buildPrompt(data)

    try {
      const result = await streamAnalysis(prompt, apiKey, providerId, model, (text) => {
        report.value = text
        htmlReport.value = md.render(text)
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
    report.value = ''
    htmlReport.value = ''
    analyzing.value = false
    error.value = null
  }

  return { report, htmlReport, analyzing, error, analyze, reset }
}
