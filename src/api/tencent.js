export async function fetchKlineData(code, period = 'day', count = 250) {
  // 去掉 sh/sz 前缀
  const cleanCode = String(code).replace(/^(sh|sz)/i, '')
  const prefix = cleanCode.startsWith('6') ? 'sh' : 'sz'
  const fullCode = `${prefix}${cleanCode}`

  const periodMap = { day: 'day', week: 'week', month: 'month' }
  const p = periodMap[period] || 'day'

  try {
    const url = `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${fullCode},${p},,,${count},`
    const resp = await fetch(url)
    const data = await resp.json()

    const key = Object.keys(data.data)[0]
    const rawKlines = data.data[key]?.[p] || data.data[key]?.day || []

    return rawKlines.map(item => ({
      date: item[0],
      open: Number(item[1]),
      close: Number(item[2]),
      high: Number(item[3]),
      low: Number(item[4]),
      volume: Number(item[5]),
    }))
  } catch (e) {
    console.error('腾讯K线数据获取失败:', e)
    return []
  }
}
