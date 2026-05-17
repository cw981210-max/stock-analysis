function cleanCode(code) {
  return String(code).replace(/^(sh|sz)/i, '')
}

export async function fetchSentiment(code) {
  const cc = cleanCode(code)
  try {
    const url = `https://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPT_DMSK_TS_STOCKNEW&columns=ALL&filter=(SECURITY_CODE%3D%22${cc}%22)&pageSize=1`
    const resp = await fetch(url)
    const data = await resp.json()
    const r = data?.result?.data?.[0]
    if (!r) return getFallback()

    // RATIO 是市场多空比（>0.5 偏多，<0.5 偏空）
    const ratio = r.RATIO || 0.5
    const ratio3d = r.RATIO_3DAYS || ratio
    const avgRatio = (ratio + ratio3d) / 2

    // 计算正面/中性/负面比例
    const positive = Math.round(Math.min(avgRatio, 0.7) * 100) / 100
    const negative = Math.round(Math.max(1 - avgRatio - 0.15, 0.05) * 100) / 100
    const neutral = Math.round((1 - positive - negative) * 100) / 100

    return {
      sentimentScore: Math.round(r.TOTALSCORE * 10) / 10,
      sentimentLabel: r.TOTALSCORE > 70 ? '偏多' : r.TOTALSCORE < 40 ? '偏空' : '中性',
      totalScore: r.TOTALSCORE,
      focus: r.FOCUS,          // 关注度 (0-100)
      rank: r.RANK,            // 人气排名
      orgParticipate: r.ORG_PARTICIPATE, // 机构参与度
      ratio: ratio,            // 多空比
      ratio3d: ratio3d,        // 3日多空比
      primeInflow: r.PRIME_INFLOW, // 主力净流入
      positiveRatio: positive,
      neutralRatio: neutral,
      negativeRatio: negative,
    }
  } catch (e) {
    console.error('市场情绪数据获取失败:', e)
    return getFallback()
  }
}

function getFallback() {
  return {
    sentimentScore: null,
    sentimentLabel: '数据暂不可用',
    totalScore: null,
    focus: null,
    rank: null,
    orgParticipate: null,
    ratio: null,
    ratio3d: null,
    primeInflow: null,
    positiveRatio: 0.45,
    neutralRatio: 0.30,
    negativeRatio: 0.25,
  }
}
