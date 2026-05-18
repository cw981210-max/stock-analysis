// 东方财富 JSONP 工具 — push2 API 使用 cb 参数（浏览器环境可用）
function emJsonp(url) {
  return new Promise((resolve) => {
    const cbName = `__em_cb_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const script = document.createElement('script')
    let timer

    window[cbName] = (data) => {
      clearTimeout(timer)
      delete window[cbName]
      if (script.parentNode) script.parentNode.removeChild(script)
      resolve(data)
    }

    timer = setTimeout(() => {
      delete window[cbName]
      if (script.parentNode) script.parentNode.removeChild(script)
      resolve(null)
    }, 8000)

    const sep = url.includes('?') ? '&' : '?'
    script.src = `${url}${sep}cb=${cbName}`
    script.onerror = () => {
      clearTimeout(timer)
      delete window[cbName]
      if (script.parentNode) script.parentNode.removeChild(script)
      resolve(null)
    }
    document.head.appendChild(script)
  })
}

function cleanCode(code) {
  return String(code).replace(/^(sh|sz)/i, '')
}

// DC API 简化封装
async function dcFetch(reportName, filter, pageSize = 10, sortCol = null, sortDir = -1) {
  let url = `https://datacenter-web.eastmoney.com/api/data/v1/get?reportName=${reportName}&columns=ALL&pageSize=${pageSize}`
  if (filter) url += `&filter=${filter}`
  if (sortCol) url += `&sortColumns=${sortCol}&sortTypes=${sortDir}`
  const resp = await fetch(url)
  const data = await resp.json()
  return data?.result?.data || []
}

export async function fetchFinancialData(code) {
  const cc = cleanCode(code)
  try {
    const list = await dcFetch('RPT_LICO_FN_CPD', `(SECURITY_CODE%3D%22${cc}%22)`, 5, 'NOTICE_DATE', -1)
    if (!list.length) return null
    return list.map(r => ({
      reportDate: r.REPORTDATE?.split(' ')[0],
      revenue: r.TOTAL_OPERATE_INCOME,
      netProfit: r.PARENT_NETPROFIT,
      revenueGrowth: r.YSTZ,
      profitGrowth: r.SJLTZ,
      grossMargin: r.XSMLL,
      netMargin: r.TOTAL_OPERATE_INCOME ? (r.PARENT_NETPROFIT / r.TOTAL_OPERATE_INCOME * 100) : null,
      roe: r.WEIGHTAVG_ROE,
      debtRatio: r.ZCFZL,
      eps: r.BASIC_EPS,
      bps: r.BPS,
    }))
  } catch (e) {
    console.error('东方财富财务数据获取失败:', e)
    return null
  }
}

export async function fetchStockMetrics(code) {
  const cc = cleanCode(code)
  try {
    const list = await dcFetch('RPT_LICO_FN_CPD', `(SECURITY_CODE%3D%22${cc}%22)`, 1, 'NOTICE_DATE', -1)
    const r = list[0]
    if (!r) return null

    let debtRatio = r.ZCFZL || null
    if (debtRatio == null) {
      try {
        const balList = await dcFetch('RPT_DMSK_FN_BALANCE', `(SECURITY_CODE%3D%22${cc}%22)`, 1, 'REPORT_DATE', -1)
        debtRatio = balList[0]?.DEBT_ASSET_RATIO ?? null
      } catch { /* ignore */ }
    }

    return {
      roe: r.WEIGHTAVG_ROE,
      grossMargin: r.XSMLL,
      netMargin: r.TOTAL_OPERATE_INCOME ? (r.PARENT_NETPROFIT / r.TOTAL_OPERATE_INCOME * 100) : null,
      debtRatio,
      revenueGrowth: r.YSTZ,
      profitGrowth: r.SJLTZ,
      eps: r.BASIC_EPS,
      bps: r.BPS,
    }
  } catch (e) {
    console.error('东方财富指标数据获取失败:', e)
    return null
  }
}

export async function fetchIndustryData(code) {
  const cc = cleanCode(code)
  try {
    const [orgRes, dmskRes] = await Promise.allSettled([
      dcFetch('RPT_F10_BASIC_ORGINFO', `(SECURITY_CODE%3D%22${cc}%22)`, 1),
      dcFetch('RPT_DMSK_TS_STOCKNEW', `(SECURITY_CODE%3D%22${cc}%22)`, 1),
    ])

    const orgData = orgRes.status === 'fulfilled' ? orgRes.value?.[0] : null
    const dmskData = dmskRes.status === 'fulfilled' ? dmskRes.value?.[0] : null

    return {
      industry: orgData?.INDUSTRYCSRC1 || null,
      rank: dmskData?.RANK || null,
      totalScore: dmskData?.TOTALSCORE || null,
      focus: dmskData?.FOCUS || null,
    }
  } catch (e) {
    console.error('行业数据获取失败:', e)
    return null
  }
}

// 获取该股票的板块信息和机构评级（来自 RPT_WEB_RESPREDICT）
export async function fetchStockAnalysisData(code) {
  const cc = cleanCode(code)
  try {
    const list = await dcFetch('RPT_WEB_RESPREDICT', `(SECURITY_CODE%3D%22${cc}%22)`, 1)
    const r = list[0]
    if (!r) return null

    return {
      industryBoard: r.INDUSTRY_BOARD || null,
      conceptBoards: r.CONCEPTINDEX_BOARD || null,
      regionBoard: r.REGION_BOARD || null,
      ratingOrgNum: r.RATING_ORG_NUM || 0,
      ratingBuyNum: r.RATING_BUY_NUM || 0,
      ratingAddNum: r.RATING_ADD_NUM || 0,
      ratingNeutralNum: r.RATING_NEUTRAL_NUM || 0,
      targetPriceMax: r.DEC_AIMPRICEMAX || null,
      targetPriceMin: r.DEC_AIMPRICEMIN || null,
      epsYear1: r.EPS1,
      epsYear2: r.EPS2,
      epsYear3: r.EPS3,
      year1: r.YEAR1,
      year2: r.YEAR2,
      year3: r.YEAR3,
    }
  } catch (e) {
    console.error('个股评级数据获取失败:', e)
    return null
  }
}

// 获取行业板块排名 — 基于 RPT_WEB_RESPREDICT 中的 INDUSTRY_BOARD 聚合
export async function fetchIndustryRanking() {
  try {
    // 获取所有有评级的股票，按机构评级数排序
    const list = await dcFetch('RPT_WEB_RESPREDICT', null, 500, 'RATING_ORG_NUM', -1)
    if (!list.length) return []

    // 按行业板块聚合：统计每个板块的机构总评级数
    const boardMap = {}
    for (const item of list) {
      const board = item.INDUSTRY_BOARD
      if (!board) continue
      if (!boardMap[board]) {
        boardMap[board] = { name: board, totalOrgs: 0, stockCount: 0, buyRatio: 0, buyCount: 0 }
      }
      boardMap[board].totalOrgs += item.RATING_ORG_NUM || 0
      boardMap[board].stockCount += 1
      boardMap[board].buyCount += (item.RATING_BUY_NUM || 0) + (item.RATING_ADD_NUM || 0)
    }

    // 转为数组并排序（按机构关注度）
    const boards = Object.values(boardMap)
    boards.sort((a, b) => b.totalOrgs - a.totalOrgs)
    for (let i = 0; i < boards.length; i++) {
      boards[i].rank = i + 1
      boards[i].buyRatio = boards[i].totalOrgs > 0 ? (boards[i].buyCount / boards[i].totalOrgs * 100) : 0
    }

    return boards
  } catch (e) {
    console.error('行业排名获取失败:', e)
    return []
  }
}

// 获取个股在所属行业内的排名 — 通过 INDUSTRY_BOARD 查询同行业所有股票
export async function fetchStockIndustryRank(code, industryBoard) {
  if (!industryBoard) return null
  try {
    const list = await dcFetch(
      'RPT_WEB_RESPREDICT',
      `(INDUSTRY_BOARD%3D%22${encodeURIComponent(industryBoard)}%22)`,
      200,
      'RATING_ORG_NUM',
      -1
    )
    if (!list.length) return null

    const cc = cleanCode(code)
    const total = list.length
    let stockRank = null

    for (let i = 0; i < list.length; i++) {
      if (String(list[i].SECURITY_CODE) === cc) {
        stockRank = i + 1
        break
      }
    }

    const topStocks = list.slice(0, 5).map((item, index) => ({
      rank: index + 1,
      name: item.SECURITY_NAME_ABBR,
      code: item.SECURITY_CODE,
      ratingOrgNum: item.RATING_ORG_NUM || 0,
      buyNum: item.RATING_BUY_NUM || 0,
      addNum: item.RATING_ADD_NUM || 0,
      targetPriceMin: item.DEC_AIMPRICEMIN || null,
      targetPriceMax: item.DEC_AIMPRICEMAX || null,
    }))

    return { stockRank, topStocks, total }
  } catch (e) {
    console.error('行业内排名获取失败:', e)
    return null
  }
}

// 获取研报/机构评级数据
export async function fetchResearchReports(code) {
  const cc = cleanCode(code)
  try {
    const list = await dcFetch('RPT_WEB_RESPREDICT', `(SECURITY_CODE%3D%22${cc}%22)`, 1)
    const r = list[0]
    if (!r) return []

    // 构造为研报汇总数据
    const items = []
    if (r.RATING_ORG_NUM) {
      items.push({
        type: 'rating_summary',
        title: `${r.RATING_ORG_NUM}家机构覆盖`,
        buyNum: r.RATING_BUY_NUM || 0,
        addNum: r.RATING_ADD_NUM || 0,
        neutralNum: r.RATING_NEUTRAL_NUM || 0,
        reduceNum: r.RATING_REDUCE_NUM || 0,
        saleNum: r.RATING_SALE_NUM || 0,
        targetPriceMin: r.DEC_AIMPRICEMIN || null,
        targetPriceMax: r.DEC_AIMPRICEMAX || null,
        epsYears: [
          r.YEAR1 && r.EPS1 ? { year: r.YEAR1, eps: r.EPS1.toFixed(2), mark: r.YEAR_MARK1 } : null,
          r.YEAR2 && r.EPS2 ? { year: r.YEAR2, eps: r.EPS2.toFixed(2), mark: r.YEAR_MARK2 } : null,
          r.YEAR3 && r.EPS3 ? { year: r.YEAR3, eps: r.EPS3.toFixed(2), mark: r.YEAR_MARK3 } : null,
        ].filter(Boolean),
      })
    }
    return items
  } catch (e) {
    console.error('研报数据获取失败:', e)
    return []
  }
}

// 获取大盘指数 — 使用腾讯行情API（稳定可靠，已验证）
async function fetchIndexQuote(fullCode) {
  const url = `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${fullCode},day,,,1,`
  const resp = await fetch(url)
  const data = await resp.json()
  const key = Object.keys(data.data)[0]
  const qt = data.data[key]?.qt?.[key]
  if (!qt) return null
  const price = Number(qt[3])
  const prevClose = Number(qt[4])
  const changePercent = prevClose !== 0 ? ((price - prevClose) / prevClose * 100) : 0
  return {
    price,
    prevClose,
    changePercent,
    changeAmount: price - prevClose,
    high: Number(qt[33]) || price,
    low: Number(qt[34]) || price,
    volume: Number(qt[6]) * 100,
    amount: Number(qt[37]) * 10000,
  }
}

export async function fetchMarketIndices() {
  try {
    const [sh, sz, csi, cyb] = await Promise.allSettled([
      fetchIndexQuote('sh000001'),
      fetchIndexQuote('sz399001'),
      fetchIndexQuote('sh000300'),
      fetchIndexQuote('sz399006'),
    ])
    const indices = {}
    if (sh.status === 'fulfilled' && sh.value) indices.shanghai = { name: '上证指数', ...sh.value }
    if (sz.status === 'fulfilled' && sz.value) indices.shenzhen = { name: '深证成指', ...sz.value }
    if (csi.status === 'fulfilled' && csi.value) indices.csi300 = { name: '沪深300', ...csi.value }
    if (cyb.status === 'fulfilled' && cyb.value) indices.chinext = { name: '创业板指', ...cyb.value }
    return Object.keys(indices).length > 0 ? indices : null
  } catch (e) {
    console.error('大盘指数获取失败:', e)
    return null
  }
}

// 获取大盘资金流向 — 尝试 push2 JSONP，失败返回 null 不阻塞
export async function fetchMarketFundFlow() {
  try {
    const url = 'https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&fields=f2,f3,f6,f12,f14,f62,f184,f66,f69,f72,f75,f78,f81,f164,f174&secids=1.000001,0.399001,1.000300'
    const data = await emJsonp(url)
    if (!data) return null
    const list = data?.data?.diff
    if (!list || !Array.isArray(list)) return null

    const flows = {}
    for (const item of list) {
      const code = String(item.f12)
      const key = code === '000001' ? 'shanghai' : code === '399001' ? 'shenzhen' : 'csi300'
      flows[key] = {
        mainInflow: item.f62,
        mainInflowPct: item.f184,
        superLargeInflow: item.f66,
        superLargePct: item.f69,
        largeInflow: item.f72,
        largePct: item.f75,
        mediumInflow: item.f78,
        mediumPct: item.f81,
        smallInflow: item.f164,
        smallPct: item.f174,
      }
    }
    return flows
  } catch (e) {
    console.error('大盘资金流向获取失败:', e)
    return null
  }
}

// 获取全A股实时行情（使用clist API，一次性获取所有A股实时价格）
async function fetchAllAShareQuotes() {
  const results = []
  const pageSize = 3000
  try {
    const pages = await Promise.all([
      emJsonp(`https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=${pageSize}&po=1&np=1&fltt=2&invt=2&fid=f6&fs=m:0+t:6,m:0+t:80,m:0+t:81,m:1+t:2,m:1+t:23&fields=f2,f3,f6,f9,f12,f14`).catch(() => null),
      emJsonp(`https://push2.eastmoney.com/api/qt/clist/get?pn=2&pz=${pageSize}&po=1&np=1&fltt=2&invt=2&fid=f6&fs=m:0+t:6,m:0+t:80,m:0+t:81,m:1+t:2,m:1+t:23&fields=f2,f3,f6,f9,f12,f14`).catch(() => null),
      emJsonp(`https://push2.eastmoney.com/api/qt/clist/get?pn=3&pz=${pageSize}&po=1&np=1&fltt=2&invt=2&fid=f6&fs=m:0+t:6,m:0+t:80,m:0+t:81,m:1+t:2,m:1+t:23&fields=f2,f3,f6,f9,f12,f14`).catch(() => null),
    ])
    for (const data of pages) {
      const list = data?.data?.diff
      if (!list || !Array.isArray(list)) continue
      for (const item of list) {
        if (item.f2 === '-' || !item.f2 || item.f2 <= 0) continue
        results.push({
          code: String(item.f12),
          name: item.f14,
          price: item.f2,
          changePercent: item.f3,
          pe: item.f9,
          volume: item.f6,
        })
      }
    }
  } catch (e) {
    console.error('全A股行情获取失败:', e)
  }
  return results
}

// 按需获取任意股票/基金代码的实时行情（用于AI推荐后补充缺失价格）
export async function fetchRealtimeQuotesByCodes(codes) {
  if (!codes || codes.length === 0) return new Map()

  function getSecid(code) {
    const c = String(code)
    if (c.startsWith('6') || c.startsWith('5') || c.startsWith('11')) return `1.${c}`
    return `0.${c}`
  }

  const results = new Map()
  const batchSize = 50

  for (let i = 0; i < codes.length; i += batchSize) {
    const batch = codes.slice(i, i + batchSize)
    const secids = batch.map(c => getSecid(c)).join(',')
    const url = `https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&fields=f2,f3,f6,f9,f12,f14&secids=${secids}`
    try {
      const data = await emJsonp(url)
      const list = data?.data?.diff
      if (!list || !Array.isArray(list)) continue
      for (const item of list) {
        if (item.f2 === '-' || !item.f2 || item.f2 <= 0) continue
        results.set(String(item.f12), {
          price: item.f2,
          name: item.f14,
          changePercent: item.f3,
          pe: item.f9,
        })
      }
    } catch (e) {
      console.error('按需行情获取失败:', e)
    }
  }

  return results
}

// 获取市场热门股票实时行情 + 全市场ETF + 可转债 + LOF基金 + 全A股价格速查表
export async function fetchHotStockQuotes() {
  try {
    // 并行获取：机构评级股票、全市场ETF、可转债、全A股实时行情
    const [allList, etfResp, cbResp, lofResp, allAShares] = await Promise.all([
      dcFetch('RPT_WEB_RESPREDICT', null, 3000, 'RATING_ORG_NUM', -1),
      emJsonp(`https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=1000&po=1&np=1&fltt=2&invt=2&fid=f6&fs=b:MK0022&fields=f2,f3,f6,f12,f14`).catch(() => null),
      emJsonp(`https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=500&po=1&np=1&fltt=2&invt=2&fid=f6&fs=b:MK0021&fields=f2,f3,f6,f12,f14`).catch(() => null),
      emJsonp(`https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=500&po=1&np=1&fltt=2&invt=2&fid=f6&fs=b:MK0023&fields=f2,f3,f6,f12,f14`).catch(() => null),
      fetchAllAShareQuotes(),
    ])

    // 处理ETF数据（clist API已含实时价格）
    const etfs = []
    if (etfResp?.data?.diff) {
      for (const item of etfResp.data.diff) {
        if (item.f2 === '-' || !item.f2 || item.f2 <= 0) continue
        etfs.push({
          code: String(item.f12),
          name: item.f14,
          price: item.f2,
          changePercent: item.f3,
          volume: item.f6,
          type: 'ETF',
        })
      }
    }

    // 处理可转债数据（clist API已含实时价格）
    const cbs = []
    if (cbResp?.data?.diff) {
      for (const item of cbResp.data.diff) {
        if (item.f2 === '-' || !item.f2 || item.f2 <= 0) continue
        cbs.push({
          code: String(item.f12),
          name: item.f14,
          price: item.f2,
          changePercent: item.f3,
          volume: item.f6,
          type: '可转债',
        })
      }
    }

    // 处理LOF基金数据（clist API已含实时价格）
    const lofs = []
    if (lofResp?.data?.diff) {
      for (const item of lofResp.data.diff) {
        if (item.f2 === '-' || !item.f2 || item.f2 <= 0) continue
        lofs.push({
          code: String(item.f12),
          name: item.f14,
          price: item.f2,
          changePercent: item.f3,
          volume: item.f6,
          type: 'LOF',
        })
      }
    }

    // 处理股票数据（需批量获取实时行情）
    const stockCodes = allList.map(r => {
      const code = r.SECURITY_CODE
      const prefix = (r.SECUCODE || '').includes('.SH') ? '1' : '0'
      return { code, secid: `${prefix}.${code}`, name: r.SECURITY_NAME_ABBR, type: '股票' }
    }).filter(c => c.code)

    const stockQuotes = []
    const batchSize = 50
    for (let i = 0; i < stockCodes.length; i += batchSize) {
      const batch = stockCodes.slice(i, i + batchSize)
      const secids = batch.map(c => c.secid).join(',')
      const url = `https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&fields=f2,f3,f4,f6,f9,f12,f14&secids=${secids}`
      const data = await emJsonp(url)
      const quoteList = data?.data?.diff
      if (!quoteList || !Array.isArray(quoteList)) continue
      for (const item of quoteList) {
        const code = String(item.f12)
        const meta = batch.find(c => c.code === code)
        if (!meta) continue
        stockQuotes.push({
          code,
          name: item.f14 || meta.name,
          price: item.f2,
          changePercent: item.f3,
          pe: item.f9,
          marketCap: item.f6,
          type: meta.type,
        })
      }
    }

    // 构建全量价格速查表（用于AI推荐后自动补充实时价格）
    const priceLookup = new Map()
    for (const item of allAShares) {
      priceLookup.set(item.code, { price: item.price, name: item.name, changePercent: item.changePercent, pe: item.pe })
    }
    for (const etf of etfs) {
      priceLookup.set(etf.code, { price: etf.price, name: etf.name, changePercent: etf.changePercent })
    }
    for (const cb of cbs) {
      priceLookup.set(cb.code, { price: cb.price, name: cb.name, changePercent: cb.changePercent })
    }
    for (const lof of lofs) {
      priceLookup.set(lof.code, { price: lof.price, name: lof.name, changePercent: lof.changePercent })
    }
    for (const sq of stockQuotes) {
      priceLookup.set(sq.code, { price: sq.price, name: sq.name, changePercent: sq.changePercent, pe: sq.pe })
    }

    return { hotStocks: [...stockQuotes, ...etfs, ...cbs, ...lofs], priceLookup }
  } catch (e) {
    console.error('热门股票行情获取失败:', e)
    return { hotStocks: [], priceLookup: new Map() }
  }
}
