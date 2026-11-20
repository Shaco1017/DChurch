/**
 * 重复规则生成器。
 * 输入规则配置，在 startDate → endDate（含两端）区间内
 * 按规则类型枚举所有应触达的日期，再映射为 item 草稿。
 *
 * 幂等策略：同一条 rule 多次调用本函数，输入相同时输出完全一致；
 * 实际写入仓库时由调用方结合 ruleId + 日期键做去重。
 */
import { isDateKey, parseKey, toKey, addDays, diffDays, weekdayIndex } from '@/utils/date'
import { uid } from '@/utils/id'

export const RULE_TYPES = ['daily', 'weekly', 'monthly', 'interval']

export const RULE_TYPE_LABEL = {
  daily: '每日重复',
  weekly: '每周重复',
  monthly: '每月重复',
  interval: '自定义间隔',
}

export function describeRule(rule) {
  if (!rule) return ''
  if (rule.type === 'daily') return '每天'
  if (rule.type === 'weekly') {
    const names = ['日', '一', '二', '三', '四', '五', '六']
    const days = Array.isArray(rule.weekdays) ? rule.weekdays.sort() : []
    if (!days.length) return '无效的每周规则'
    return '每周' + days.map((d) => names[d] || '').filter(Boolean).join('、')
  }
  if (rule.type === 'monthly') {
    const days = Array.isArray(rule.monthDays) ? rule.monthDays.slice() : []
    if (!days.length) return '无效的每月规则'
    return '每月' + days.sort((a, b) => a - b).join('、') + ' 日'
  }
  if (rule.type === 'interval') {
    const n = Number(rule.intervalCount) || 1
    const unit = rule.intervalUnit === 'week' ? '周' : rule.intervalUnit === 'month' ? '月' : '天'
    return `每 ${n} ${unit}`
  }
  return '未知规则'
}

/**
 * 枚举规则覆盖区间内所有应触达的日期键。
 * 失败时返回空数组并把原因写入 errors。
 */
export function enumerateDates(rule) {
  const errors = []
  if (!rule) return { dates: [], errors }
  if (!isDateKey(rule.startDate)) errors.push('起始日期无效')
  if (!isDateKey(rule.endDate)) errors.push('结束日期无效')
  if (errors.length) return { dates: [], errors }
  if (rule.endDate < rule.startDate) return { dates: [], errors: ['结束日期必须晚于起始日期'] }

  const span = diffDays(rule.startDate, rule.endDate)
  if (span < 0 || span > 3650) {
    return { dates: [], errors: ['日期区间超过 10 年或小于 0'] }
  }

  const dates = []
  if (rule.type === 'daily') {
    for (let i = 0; i <= span; i += 1) dates.push(addDays(rule.startDate, i))
  } else if (rule.type === 'weekly') {
    const set = new Set((rule.weekdays || []).filter((d) => Number.isInteger(d) && d >= 0 && d < 7))
    if (!set.size) errors.push('请至少选择一个星期')
    else {
      for (let i = 0; i <= span; i += 1) {
        const key = addDays(rule.startDate, i)
        if (set.has(weekdayIndex(key))) dates.push(key)
      }
    }
  } else if (rule.type === 'monthly') {
    const set = new Set((rule.monthDays || []).filter((d) => Number.isInteger(d) && d >= 1 && d <= 31))
    if (!set.size) errors.push('请至少选择一个每月日期')
    else {
      const cursor = parseKey(rule.startDate)
      const end = parseKey(rule.endDate)
      while (cursor <= end) {
        const lastDay = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()
        Array.from(set).forEach((target) => {
          const day = Math.min(target, lastDay)
          const candidate = new Date(cursor.getFullYear(), cursor.getMonth(), day)
          if (candidate >= cursor && candidate <= end) dates.push(toKey(candidate))
        })
        cursor.setMonth(cursor.getMonth() + 1, 1)
      }
      dates.sort()
    }
  } else if (rule.type === 'interval') {
    const n = Math.max(1, Math.min(365, Number(rule.intervalCount) || 1))
    const unit = rule.intervalUnit || 'day'
    if (unit === 'day') {
      for (let i = 0; i <= span; i += n) dates.push(addDays(rule.startDate, i))
    } else if (unit === 'week') {
      for (let i = 0; i <= span; i += n * 7) dates.push(addDays(rule.startDate, i))
    } else if (unit === 'month') {
      const cursor = parseKey(rule.startDate)
      dates.push(toKey(cursor))
      while (true) {
        const next = new Date(cursor)
        next.setMonth(next.getMonth() + n)
        if (next > end) break
        dates.push(toKey(next))
        cursor.setMonth(cursor.getMonth() + n)
      }
    } else {
      errors.push('无效的间隔单位')
    }
  } else {
    errors.push('未知的规则类型')
  }
  return { dates, errors }
}

/**
 * 根据规则与指定日期列表，生成 item 草稿数组。
 * 不写入仓库、不做去重，调用方自行处理。
 */
export function buildDraftsForRule(rule, dates, startIndex = 0) {
  return dates.map((dateKey, offset) => ({
    id: uid('it'),
    title: rule.title,
    note: rule.note || '',
    categoryId: rule.categoryId || null,
    priority: rule.priority || 'normal',
    date: dateKey,
    startTime: rule.startTime || null,
    endTime: rule.endTime || null,
    reminder: Number.isFinite(rule.reminder) ? rule.reminder : null,
    ruleId: rule.id,
    ruleIndex: startIndex + offset,
    status: 'pending',
    completedAt: null,
    archivedAt: null,
    reminderFired: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }))
}

/**
 * 便捷方法：一次性从规则得到可落库的 item 草稿数组。
 */
export function generateItemsFromRule(rule) {
  const { dates, errors } = enumerateDates(rule)
  if (errors.length) return { ok: false, errors, items: [] }
  const items = buildDraftsForRule(rule, dates)
  return { ok: true, errors: [], items, count: items.length }
}
