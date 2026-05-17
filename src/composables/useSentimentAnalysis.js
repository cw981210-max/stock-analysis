import { ref } from 'vue'
import { streamAnalysis } from '../api/openai.js'
import MarkdownIt from 'markdown-it'

const md = new MarkdownIt({ html: false, breaks: true })

export function useSentimentAnalysis() {
  const analysis = ref('')
  const htmlAnalysis = ref('')
  const analyzing = ref(false)
  const error = ref(null)

  function buildPrompt(data) {
    const { news, sentiment, researchReports, marketIndices, name, code } = data

    let newsStr = '暂无新闻'
    if (news && news.length > 0) {
      newsStr = news.slice(0, 6).map((n, i) =>
        `${i + 1}. [${n.source}] ${n.title} (${n.time})`
      ).join('\n')
    }

    let reportStr = '暂无研报'
    if (researchReports && researchReports.length > 0) {
      reportStr = researchReports.slice(0, 3).map(r => {
        if (r.type === 'rating_summary') {
          return `${r.title}：买入${r.buyNum || 0}家，增持${r.addNum || 0}家，中性${r.neutralNum || 0}家${r.targetPriceMax ? '，目标价' + r.targetPriceMin + '~' + r.targetPriceMax + '元' : ''}`
        }
        return ''
      }).filter(Boolean).join('\n')
    }

    let marketStr = '暂无数据'
    if (marketIndices) {
      const parts = []
      if (marketIndices.shanghai) {
        const s = marketIndices.shanghai
        parts.push(`上证 ${s.changePercent > 0 ? '+' : ''}${s.changePercent?.toFixed(2)}%`)
      }
      if (marketIndices.shenzhen) {
        const s = marketIndices.shenzhen
        parts.push(`深证 ${s.changePercent > 0 ? '+' : ''}${s.changePercent?.toFixed(2)}%`)
      }
      if (marketIndices.csi300) {
        const s = marketIndices.csi300
        parts.push(`沪深300 ${s.changePercent > 0 ? '+' : ''}${s.changePercent?.toFixed(2)}%`)
      }
      if (parts.length) marketStr = parts.join('；')
    }

    let sentStr = '暂无数据'
    if (sentiment) {
      sentStr = `评分: ${sentiment.sentimentScore ?? '--'}/100, 情绪: ${sentiment.sentimentLabel}`
      if (sentiment.ratio) sentStr += `, 多空比: ${(sentiment.ratio * 100).toFixed(1)}%`
      if (sentiment.primeInflow) sentStr += `, 主力净流入: ${(sentiment.primeInflow / 1e8).toFixed(2)}亿`
      if (sentiment.rank) sentStr += `, 人气: 第${sentiment.rank}名`
    }

    return `你是资深市场分析师。请对 ${name}(${code}) 的新闻舆情给出简要结论。

大盘：${marketStr}
新闻：${newsStr}
研报：${reportStr}
情绪数据：${sentStr}

要求：精简分析，只给出结论。用3-5句话概括：
1. 新闻舆情整体偏多/偏空/中性
2. 最关键的1-2条信息及其影响
3. 资金面态度
4. 一句话结论判断`
  }

  async function analyzeSentiment(data, apiKey, providerId, model) {
    analyzing.value = true
    error.value = null
    analysis.value = ''
    htmlAnalysis.value = ''

    const prompt = buildPrompt(data)

    try {
      const result = await streamAnalysis(prompt, apiKey, providerId, model, (text) => {
        analysis.value = text
        htmlAnalysis.value = md.render(text)
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
    analysis.value = ''
    htmlAnalysis.value = ''
    analyzing.value = false
    error.value = null
  }

  return { analysis, htmlAnalysis, analyzing, error, analyzeSentiment, reset }
}
