function stripPrefix(code) {
  return String(code).replace(/^(sh|sz)/i, '')
}

function ensurePrefix(code) {
  const clean = stripPrefix(code)
  if (clean.length === 6 && /^[036]/.test(clean)) {
    return clean.startsWith('6') ? `sh${clean}` : `sz${clean}`
  }
  return code
}

export async function searchStock(keyword) {
  const url = `https://suggest3.sinajs.cn/suggest/type=11,12&key=${encodeURIComponent(keyword)}`
  return new Promise((resolve) => {
    const script = document.createElement('script')
    script.src = url
    script.onload = () => {
      const raw = window.suggestvalue
      if (!raw) { resolve([]); script.remove(); return }
      const items = raw.split(';').filter(Boolean).map(item => {
        const parts = item.split(',')
        if (parts.length >= 5) {
          return { code: parts[2], name: parts[4], market: parts[3].startsWith('sh') ? 'sh' : 'sz', fullCode: parts[3] }
        }
        return null
      }).filter(Boolean)
      resolve(items.slice(0, 10))
      script.remove()
    }
    script.onerror = () => { script.remove(); resolve([]) }
    document.head.appendChild(script)
  })
}

export async function fetchRealtimeQuote(code) {
  const cleanCode = stripPrefix(code)
  const fullCode = ensurePrefix(cleanCode)
  const url = `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${fullCode},day,,,1,`
  const resp = await fetch(url)
  const data = await resp.json()
  const key = Object.keys(data.data)[0]
  const qt = data.data[key]?.qt?.[key]
  if (!qt) throw new Error('未获取到行情数据')
  const num = (v) => (v != null && v !== '' && !isNaN(v)) ? Number(v) : null
  return {
    name: qt[1], code: qt[2],
    price: Number(qt[3]), prevClose: Number(qt[4]), open: Number(qt[5]),
    high: num(qt[33]) || Number(qt[3]), low: num(qt[34]) || Number(qt[3]),
    volume: Number(qt[6]) * 100, amount: Number(qt[37]) * 10000,
    change: num(qt[31]), changePercent: num(qt[32]), turnover: num(qt[38]),
    date: qt[30]?.toString().replace(/^(\d{4})(\d{2})(\d{2}).*/, '$1-$2-$3') || '',
    pe: num(qt[39]), pb: num(qt[46]),
    totalMarketCap: num(qt[45]) ? num(qt[45]) * 1e8 : null,
    circulationMarketCap: num(qt[44]) ? num(qt[44]) * 1e8 : null,
  }
}

// 获取公司公告和新闻（多类型合并）
export async function fetchNews(code, count = 10) {
  const cleanCode = stripPrefix(code)
  try {
    // 并行获取不同类型的公告
    const [typeA, typeB] = await Promise.allSettled([
      fetchAnnouncements(cleanCode, 'A', Math.ceil(count * 0.6)),
      fetchAnnouncements(cleanCode, 'B', Math.ceil(count * 0.4)),
    ])

    const announcements = typeA.status === 'fulfilled' ? typeA.value : []
    const extraNews = typeB.status === 'fulfilled' ? typeB.value : []

    // 合并去重并按时间排序
    const seen = new Set()
    const all = [...announcements, ...extraNews]
      .filter(item => {
        if (seen.has(item.title)) return false
        seen.add(item.title)
        return true
      })
    all.sort((a, b) => (b.time || '').localeCompare(a.time || ''))
    return all.slice(0, count)
  } catch (e) {
    console.error('新闻获取失败:', e)
    return fetchAnnouncements(cleanCode, 'A', count)
  }
}

async function fetchAnnouncements(code, annType = 'A', count = 6) {
  try {
    const url = `https://np-anotice-stock.eastmoney.com/api/security/ann?page_size=${count}&page_index=1&ann_type=${annType}&stock_list=${code}&client_source=web`
    const resp = await fetch(url)
    const data = await resp.json()
    const list = data?.data?.list || []
    return list.map(item => {
      const columns = item.columns || []
      const colName = columns[0]?.column_name || ''
      return {
        title: item.title || '',
        url: item.art_code ? `https://data.eastmoney.com/notices/detail/${code}/${item.art_code}.html` : '',
        time: item.notice_date?.split(' ')[0] || '',
        source: colName || (annType === 'A' ? '公司公告' : '公司新闻'),
        type: annType === 'A' ? 'announcement' : 'news',
      }
    })
  } catch (e) {
    console.error('公告获取失败:', e)
    return []
  }
}
