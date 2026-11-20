import { uid } from '@/utils/id'
import { isDateKey, isValidTime, minutesOf } from '@/utils/date'
import {
  CATEGORY_COLORS,
  DEFAULT_CATEGORIES,
  DEFAULT_SETTINGS,
  STATUS,
  STATUS_LIST,
  VIEWS,
} from '@/utils/constants'

import { RULE_TYPES } from './rule-generator'

const VALID_STATUS = STATUS_LIST.map((item) => item.value)
const VALID_VIEWS = VIEWS.map((item) => item.value)
const VALID_REMINDERS = [null, 0, 5, 10, 30, 60, 1440]
const VALID_ARCHIVE_DAYS = [0, 3, 7, 30]
const VALID_PRIORITIES = ['low', 'normal', 'high']
const VALID_THEMES = ['light', 'dark', 'system']

function toTimestamp(value, fallback = 0) {
  const num = Number(value)
  if (!Number.isFinite(num) || num <= 0) return fallback
  return Math.round(num)
}

function clampText(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

export function normalizeSettings(raw) {
  const source = raw && typeof raw === 'object' ? raw : {}
  return {
    weekStart: source.weekStart === 0 ? 0 : 1,
    defaultView: VALID_VIEWS.includes(source.defaultView) ? source.defaultView : DEFAULT_SETTINGS.defaultView,
    defaultReminder: VALID_REMINDERS.includes(source.defaultReminder)
      ? source.defaultReminder
      : DEFAULT_SETTINGS.defaultReminder,
    remindersEnabled: source.remindersEnabled !== false,
    autoArchiveDays: VALID_ARCHIVE_DAYS.includes(source.autoArchiveDays) ? source.autoArchiveDays : 0,
    theme: VALID_THEMES.includes(source.theme) ? source.theme : 'system',
  }
}

export function normalizeCategory(raw) {
  const source = raw && typeof raw === 'object' ? raw : {}
  const name = clampText(source.name, 12)
  if (!name) return null
  const color = typeof source.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(source.color)
    ? source.color
    : CATEGORY_COLORS[0]
  return {
    id: typeof source.id === 'string' && source.id ? source.id.slice(0, 64) : uid('c'),
    name,
    color,
    createdAt: toTimestamp(source.createdAt, Date.now()),
  }
}

export function defaultCategories(timestamp = Date.now()) {
  return DEFAULT_CATEGORIES.map((item) => normalizeCategory({ ...item, createdAt: timestamp })).filter(Boolean)
}

export function normalizeItem(raw) {
  const source = raw && typeof raw === 'object' ? raw : {}
  const now = Date.now()
  const status = VALID_STATUS.includes(source.status) ? source.status : STATUS.PENDING
  const item = {
    id: typeof source.id === 'string' && source.id ? source.id.slice(0, 64) : uid('it'),
    title: clampText(source.title, 80),
    note: typeof source.note === 'string' ? source.note.slice(0, 500) : '',
    date: isDateKey(source.date) ? source.date : null,
    startTime: isValidTime(source.startTime) ? source.startTime : null,
    endTime: isValidTime(source.endTime) ? source.endTime : null,
    status,
    categoryId: typeof source.categoryId === 'string' && source.categoryId ? source.categoryId.slice(0, 64) : null,
    priority: VALID_PRIORITIES.includes(source.priority) ? source.priority : 'normal',
    ruleId: typeof source.ruleId === 'string' && source.ruleId ? source.ruleId.slice(0, 64) : null,
    ruleIndex: Number.isInteger(source.ruleIndex) ? source.ruleIndex : null,
    reminder:
      typeof source.reminder === 'number' && Number.isFinite(source.reminder) && source.reminder >= 0 && source.reminder <= 10080
        ? Math.round(source.reminder)
        : null,
    reminderFired: !!source.reminderFired,
    createdAt: toTimestamp(source.createdAt, now),
    updatedAt: toTimestamp(source.updatedAt, now),
    completedAt: toTimestamp(source.completedAt, 0) || null,
    archivedAt: toTimestamp(source.archivedAt, 0) || null,
  }

  // 无日期事项按“待办”处理，不保留时间与提醒，避免产生无法触达的无效数据
  if (!item.date) {
    item.startTime = null
    item.endTime = null
    item.reminder = null
    item.reminderFired = false
  }

  // 结束时间必须晚于开始时间，否则丢弃结束时间
  if (item.startTime && item.endTime && minutesOf(item.endTime) <= minutesOf(item.startTime)) {
    item.endTime = null
  }

  if (item.status === STATUS.DONE && !item.completedAt) {
    item.completedAt = item.updatedAt
  }
  if (item.status !== STATUS.DONE) {
    item.completedAt = null
    item.archivedAt = null
  }

  return item
}

/** 归一化重复规则，保证类型与取值合法；返回 null 表示无效 */
export function normalizeRule(raw) {
  const source = raw && typeof raw === 'object' ? raw : {}
  const title = clampText(source.title, 80)
  if (!title) return null
  if (!RULE_TYPES.includes(source.type)) return null
  if (!isDateKey(source.startDate)) return null
  if (!isDateKey(source.endDate)) return null
  if (source.endDate < source.startDate) return null

  const rule = {
    id: typeof source.id === 'string' && source.id ? source.id.slice(0, 64) : uid('ru'),
    title,
    note: typeof source.note === 'string' ? source.note.slice(0, 500) : '',
    type: source.type,
    startDate: source.startDate,
    endDate: source.endDate,
    startTime: isValidTime(source.startTime) ? source.startTime : null,
    endTime: isValidTime(source.endTime) ? source.endTime : null,
    categoryId: typeof source.categoryId === 'string' && source.categoryId ? source.categoryId.slice(0, 64) : null,
    priority: VALID_PRIORITIES.includes(source.priority) ? source.priority : 'normal',
    reminder:
      typeof source.reminder === 'number' && Number.isFinite(source.reminder) && source.reminder >= 0 && source.reminder <= 10080
        ? Math.round(source.reminder)
        : null,
    weekdays: source.type === 'weekly'
      ? Array.from(new Set((source.weekdays || []).filter((d) => Number.isInteger(d) && d >= 0 && d < 7)))
      : [],
    monthDays: source.type === 'monthly'
      ? Array.from(new Set((source.monthDays || []).filter((d) => Number.isInteger(d) && d >= 1 && d <= 31)))
      : [],
    intervalCount: source.type === 'interval'
      ? Math.max(1, Math.min(365, Number(source.intervalCount) || 1))
      : 1,
    intervalUnit: source.type === 'interval' && ['day', 'week', 'month'].includes(source.intervalUnit)
      ? source.intervalUnit
      : 'day',
    createdAt: toTimestamp(source.createdAt, Date.now()),
    updatedAt: toTimestamp(source.updatedAt, Date.now()),
  }

  if (rule.startTime && rule.endTime && minutesOf(rule.endTime) <= minutesOf(rule.startTime)) {
    rule.endTime = null
  }
  return rule
}
