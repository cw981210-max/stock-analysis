export function formatNumber(num) {
  if (num == null || isNaN(num)) return '--'
  num = Number(num)
  if (Math.abs(num) >= 1e12) return (num / 1e12).toFixed(2) + ' 万亿'
  if (Math.abs(num) >= 1e8) return (num / 1e8).toFixed(2) + ' 亿'
  if (Math.abs(num) >= 1e4) return (num / 1e4).toFixed(2) + ' 万'
  return num.toFixed(2)
}

export function formatPercent(val, decimals = 2) {
  if (val == null || isNaN(val)) return '--'
  const num = Number(val)
  const prefix = num > 0 ? '+' : ''
  return `${prefix}${num.toFixed(decimals)}%`
}

export function formatPrice(val) {
  if (val == null || isNaN(val)) return '--'
  return Number(val).toFixed(2)
}

export function formatDate(dateStr) {
  if (!dateStr) return '--'
  const d = new Date(dateStr)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function getStockColor(change) {
  if (change > 0) return 'var(--color-up)'
  if (change < 0) return 'var(--color-down)'
  return 'var(--color-text-secondary)'
}

export function getRatingColor(rating) {
  const map = {
    '强烈推荐': '#e94560',
    '建议买入': '#ff6b6b',
    '持有观望': '#f0a500',
    '建议减持': '#1abc9c',
    '回避': '#6c757d',
  }
  return map[rating] || 'var(--color-accent)'
}

export function getRatingBgColor(rating) {
  const map = {
    '强烈推荐': 'rgba(233,69,96,0.15)',
    '建议买入': 'rgba(255,107,107,0.15)',
    '持有观望': 'rgba(240,165,0,0.15)',
    '建议减持': 'rgba(26,188,156,0.15)',
    '回避': 'rgba(108,117,125,0.15)',
  }
  return map[rating] || 'rgba(88,166,255,0.15)'
}
