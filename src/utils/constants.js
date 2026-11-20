/**
 * 全局常量。状态、提醒、分类色板等配置集中在此，
 * 页面与数据层共用同一份定义，避免出现状态值不一致的断点。
 */
export const APP_NAME = 'DChurch'
export const APP_VERSION = '1.0.0'
export const SCHEMA_VERSION = 2

export const STATUS = {
  PENDING: 'pending',
  DOING: 'doing',
  DONE: 'done',
}

export const STATUS_LIST = [
  { value: STATUS.PENDING, label: '待完成', color: '#8E939B' },
  { value: STATUS.DOING, label: '进行中', color: '#D79A34' },
  { value: STATUS.DONE, label: '已完成', color: '#3C9A6B' },
]

export const STATUS_MAP = STATUS_LIST.reduce((map, item) => {
  map[item.value] = item
  return map
}, {})

export const REMINDER_OPTIONS = [
  { value: null, label: '不提醒' },
  { value: 0, label: '准时提醒' },
  { value: 5, label: '提前 5 分钟' },
  { value: 10, label: '提前 10 分钟' },
  { value: 30, label: '提前 30 分钟' },
  { value: 60, label: '提前 1 小时' },
  { value: 1440, label: '提前 1 天' },
]

export function reminderLabel(value) {
  const hit = REMINDER_OPTIONS.find((item) => item.value === value)
  return hit ? hit.label : '不提醒'
}

export const VIEWS = [
  { value: 'day', label: '日' },
  { value: 'week', label: '周' },
  { value: 'month', label: '月' },
]

export const VIEW_MAP = VIEWS.reduce((map, item) => {
  map[item.value] = item
  return map
}, {})

export const WEEK_START_OPTIONS = [
  { value: 1, label: '周一' },
  { value: 0, label: '周日' },
]

export const AUTO_ARCHIVE_OPTIONS = [
  { value: 0, label: '关闭' },
  { value: 3, label: '完成 3 天后' },
  { value: 7, label: '完成 7 天后' },
  { value: 30, label: '完成 30 天后' },
]

export const CATEGORY_COLORS = [
  '#4B6BFB',
  '#3C9A6B',
  '#D79A34',
  '#E0603F',
  '#9B7BD4',
  '#2E9AA6',
  '#C76E9C',
  '#8E939B',
]

export const DEFAULT_CATEGORIES = [
  { id: 'c_work', name: '工作', color: '#4B6BFB' },
  { id: 'c_life', name: '生活', color: '#3C9A6B' },
  { id: 'c_study', name: '学习', color: '#D79A34' },
]

export const DEFAULT_SETTINGS = {
  weekStart: 1,
  defaultView: 'month',
  defaultReminder: 10,
  remindersEnabled: true,
  autoArchiveDays: 0,
  theme: 'system',
}

export const THEME_OPTIONS = [
  { value: 'system', label: '跟随系统' },
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
]
