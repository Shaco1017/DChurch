import { STATUS } from '@/utils/constants'
import {
  addDays,
  isOverdue,
  minutesOf,
  sortDayItems,
  startOfWeekKey,
  toKey,
  todayKey,
} from '@/utils/date'

export function activeItems(items) {
  return items.filter((item) => !item.archivedAt)
}

export function archivedItems(items) {
  return items.filter((item) => item.archivedAt).sort((a, b) => (b.archivedAt || 0) - (a.archivedAt || 0))
}

export function categoryIndex(categories) {
  return categories.reduce((map, category) => {
    map[category.id] = category
    return map
  }, {})
}

export function dayItems(items, dateKey) {
  return sortDayItems(items.filter((item) => !item.archivedAt && item.date === dateKey))
}

export function overdueItems(items, now = new Date()) {
  return activeItems(items)
    .filter((item) => isOverdue(item, now))
    .sort((a, b) => {
      const dateCompare = String(a.date).localeCompare(String(b.date))
      if (dateCompare !== 0) return dateCompare
      return minutesOf(a.startTime || '23:59') - minutesOf(b.startTime || '23:59')
    })
}

export function statusCounts(items) {
  const counts = { all: 0, pending: 0, doing: 0, done: 0 }
  activeItems(items).forEach((item) => {
    counts.all += 1
    if (counts[item.status] !== undefined) counts[item.status] += 1
  })
  return counts
}

export function categoryCounts(items) {
  const counts = {}
  activeItems(items).forEach((item) => {
    if (!item.categoryId) return
    counts[item.categoryId] = (counts[item.categoryId] || 0) + 1
  })
  return counts
}

/**
 * 待办分组：已逾期 / 今天 / 明天 / 之后 / 无日期 / 已完成。
 * 仅在分组非空时返回，界面不会出现空标题。
 */
export function buildTodoGroups(items, options = {}) {
  const now = options.now || new Date()
  const status = options.status || 'all'
  const categoryId = options.categoryId || null
  const today = todayKey()
  const tomorrow = addDays(today, 1)

  const filtered = items.filter((item) => {
    if (item.archivedAt) return false
    if (status !== 'all' && item.status !== status) return false
    if (categoryId && item.categoryId !== categoryId) return false
    return true
  })

  const open = filtered.filter((item) => item.status !== STATUS.DONE)
  const done = filtered
    .filter((item) => item.status === STATUS.DONE)
    .sort((a, b) => (b.completedAt || b.updatedAt || 0) - (a.completedAt || a.updatedAt || 0))

  const overdue = open.filter((item) => isOverdue(item, now))
  const rest = open.filter((item) => !overdue.includes(item))
  const todayList = rest.filter((item) => item.date === today)
  const tomorrowList = rest.filter((item) => item.date === tomorrow)
  const later = rest.filter((item) => item.date && item.date > tomorrow)
  const someday = rest
    .filter((item) => !item.date)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))

  const groups = [
    { key: 'overdue', label: '已逾期', items: sortDayItems(overdue) },
    { key: 'today', label: '今天', items: sortDayItems(todayList) },
    { key: 'tomorrow', label: '明天', items: sortDayItems(tomorrowList) },
    { key: 'later', label: '之后', items: sortDayItems(later) },
    { key: 'someday', label: '无日期', items: someday },
    { key: 'done', label: '已完成', items: done },
  ]
  return groups.filter((group) => group.items.length > 0)
}

export function weeklyDoneCount(items, weekStart, now = new Date()) {
  const start = startOfWeekKey(toKey(now), weekStart)
  const end = addDays(start, 6)
  return items.filter((item) => {
    if (!item.completedAt) return false
    const key = toKey(new Date(item.completedAt))
    return key >= start && key <= end
  }).length
}

export function overviewStats(items, settings, now = new Date()) {
  const active = activeItems(items)
  return {
    pending: active.filter((item) => item.status === STATUS.PENDING).length,
    doing: active.filter((item) => item.status === STATUS.DOING).length,
    done: active.filter((item) => item.status === STATUS.DONE).length,
    overdue: overdueItems(items, now).length,
    weekDone: weeklyDoneCount(items, settings.weekStart, now),
    archived: items.filter((item) => item.archivedAt).length,
    total: active.length,
  }
}

/** 日历圆点：每日最多取 3 条事项状态，按时间排序 */
export function calendarMarks(items) {
  const marks = {}
  const sorted = [...items].filter((item) => !item.archivedAt && item.date).sort((a, b) => {
    const timeA = a.startTime ? minutesOf(a.startTime) : 24 * 60
    const timeB = b.startTime ? minutesOf(b.startTime) : 24 * 60
    if (timeA !== timeB) return timeA - timeB
    return (a.createdAt || 0) - (b.createdAt || 0)
  })
  sorted.forEach((item) => {
    if (!marks[item.date]) marks[item.date] = []
    if (marks[item.date].length < 3) marks[item.date].push(item.status)
  })
  return marks
}
