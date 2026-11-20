/**
 * 日期与时间工具。全部使用本地时区，日期键统一为 YYYY-MM-DD，
 * 避免跨时区/夏令时导致的偏移问题。
 */
const DAY_MS = 24 * 60 * 60 * 1000

export const WEEKDAY_CN = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

export function pad2(value) {
  return value < 10 ? `0${value}` : String(value)
}

export function isDateKey(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}

export function isValidTime(value) {
  if (typeof value !== 'string' || !/^\d{2}:\d{2}$/.test(value)) return false
  const [hour, minute] = value.split(':').map(Number)
  return hour >= 0 && hour < 24 && minute >= 0 && minute < 60
}

export function parseKey(key) {
  if (!isDateKey(key)) return null
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function toKey(date) {
  const value = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date()
  return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`
}

export function todayKey() {
  return toKey(new Date())
}

export function addDays(key, amount) {
  const date = parseKey(key) || new Date()
  date.setDate(date.getDate() + amount)
  return toKey(date)
}

export function addMonths(key, amount) {
  const date = parseKey(key) || new Date()
  const day = date.getDate()
  date.setDate(1)
  date.setMonth(date.getMonth() + amount)
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  date.setDate(Math.min(day, lastDay))
  return toKey(date)
}

export function diffDays(fromKey, toKeyValue) {
  const from = parseKey(fromKey)
  const to = parseKey(toKeyValue)
  if (!from || !to) return 0
  return Math.round((to.getTime() - from.getTime()) / DAY_MS)
}

export function weekdayIndex(key) {
  const date = parseKey(key)
  return date ? date.getDay() : 0
}

export function startOfWeekKey(key, weekStart = 1) {
  const date = parseKey(key) || new Date()
  const offset = (date.getDay() - weekStart + 7) % 7
  date.setDate(date.getDate() - offset)
  return toKey(date)
}

export function weekKeys(key, weekStart = 1) {
  const start = startOfWeekKey(key, weekStart)
  return Array.from({ length: 7 }, (_, index) => addDays(start, index))
}

/** 生成月视图网格，返回按周起始日排列、补齐整周的日期单元 */
export function monthMatrix(key, weekStart = 1) {
  const base = parseKey(key) || new Date()
  const year = base.getFullYear()
  const month = base.getMonth()
  const first = new Date(year, month, 1)
  const lead = (first.getDay() - weekStart + 7) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const total = Math.ceil((lead + daysInMonth) / 7) * 7
  const cells = []
  for (let index = 0; index < total; index += 1) {
    const date = new Date(year, month, 1 - lead + index)
    cells.push({
      key: toKey(date),
      day: date.getDate(),
      inMonth: date.getMonth() === month,
    })
  }
  return cells
}

export function weekdayLabel(key) {
  return WEEKDAY_CN[weekdayIndex(key)]
}

export function monthDayTitle(key) {
  const date = parseKey(key)
  if (!date) return ''
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

export function fullDateTitle(key) {
  const date = parseKey(key)
  if (!date) return ''
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}

export function monthTitle(key) {
  const date = parseKey(key)
  if (!date) return ''
  return `${date.getFullYear()}年${date.getMonth() + 1}月`
}

export function relativeDayLabel(key, today = todayKey()) {
  const delta = diffDays(today, key)
  if (delta === 0) return '今天'
  if (delta === 1) return '明天'
  if (delta === 2) return '后天'
  if (delta === -1) return '昨天'
  return monthDayTitle(key)
}

export function humanDate(key) {
  return `${relativeDayLabel(key)} · ${monthDayTitle(key)} ${weekdayLabel(key)}`
}

export function weekRangeTitle(key, weekStart = 1) {
  const days = weekKeys(key, weekStart)
  const first = parseKey(days[0])
  const last = parseKey(days[6])
  if (!first || !last) return ''
  return `${first.getMonth() + 1}月${first.getDate()}日 - ${last.getMonth() + 1}月${last.getDate()}日`
}

export function periodTitle(key, view, weekStart = 1) {
  if (view === 'day') return fullDateTitle(key)
  if (view === 'week') return weekRangeTitle(key, weekStart)
  return monthTitle(key)
}

export function minutesOf(time) {
  if (!isValidTime(time)) return 0
  const [hour, minute] = time.split(':').map(Number)
  return hour * 60 + minute
}

export function timeFromMinutes(total) {
  const normalized = ((Math.round(total) % 1440) + 1440) % 1440
  return `${pad2(Math.floor(normalized / 60))}:${pad2(normalized % 60)}`
}

export function shiftTime(time, deltaMinutes) {
  return timeFromMinutes(minutesOf(time) + deltaMinutes)
}

export function itemTimeText(item) {
  if (!item) return ''
  if (!item.date) return '待办'
  if (!item.startTime) return '全天'
  return item.endTime ? `${item.startTime} - ${item.endTime}` : item.startTime
}

/** 事项的提醒基准时间：有开始时间取开始时间，全天事项默认 09:00 */
export function dueTimestamp(item) {
  if (!item || !item.date) return null
  const date = parseKey(item.date)
  if (!date) return null
  return date.getTime() + minutesOf(item.startTime || '09:00') * 60000
}

export function isOverdue(item, now = new Date()) {
  if (!item || item.archivedAt || item.status === 'done' || !item.date) return false
  const today = toKey(now)
  if (item.date < today) return true
  if (item.date > today) return false
  const anchor = item.endTime || item.startTime
  if (!anchor) return false
  const date = parseKey(item.date)
  return now.getTime() > date.getTime() + minutesOf(anchor) * 60000
}

export function formatStamp(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return ''
  return `${toKey(date)} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

export function formatTime(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return ''
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

/** 同日事项排序：有时段的在前并按时间升序，全天/无时间置后 */
export function sortDayItems(items) {
  return [...items].sort((a, b) => {
    const timeA = a.startTime ? minutesOf(a.startTime) : 24 * 60 - 1
    const timeB = b.startTime ? minutesOf(b.startTime) : 24 * 60 - 1
    if (timeA !== timeB) return timeA - timeB
    return (a.createdAt || 0) - (b.createdAt || 0)
  })
}
