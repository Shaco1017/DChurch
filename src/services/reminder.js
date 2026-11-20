import { store, persistState } from '@/store'
import { STATUS } from '@/utils/constants'
import { dueTimestamp, humanDate, itemTimeText } from '@/utils/date'
import { toast, tapFeedback } from '@/utils/ui'

/**
 * 本地提醒服务。
 * 通过前台定时扫描判断提醒是否到期，不依赖任何服务器。
 * App 端会同时尝试创建本地通知，H5 端尝试浏览器通知，
 * 若平台不支持则退化为应用内提示，保证提醒链路始终有反馈。
 */
const TICK_INTERVAL = 15000
const FRESH_WINDOW = 60 * 60 * 1000

let timer = null

export function startReminderService() {
  if (timer) return
  timer = setInterval(tick, TICK_INTERVAL)
  setTimeout(tick, 1200)
}

export function stopReminderService() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

export function ensureNotificationPermission() {
  // #ifdef H5
  try {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  } catch (error) {
    // 浏览器拒绝授权时静默降级
  }
  // #endif
}

export function reminderMessage(item) {
  const parts = []
  if (item.date) parts.push(humanDate(item.date))
  const timeText = itemTimeText(item)
  if (timeText !== '待办') parts.push(timeText)
  return parts.join(' · ')
}

function tick() {
  if (!store.ready || !store.settings.remindersEnabled) return
  const now = Date.now()
  let changed = false
  store.items.forEach((item) => {
    if (item.archivedAt || item.status === STATUS.DONE) return
    if (!item.date || item.reminder === null || item.reminderFired) return
    const base = dueTimestamp(item)
    if (!base) return
    const target = base - item.reminder * 60000
    if (now < target) return
    item.reminderFired = true
    changed = true
    if (now - target <= FRESH_WINDOW) notify(item)
  })
  if (changed) persistState()
}

function notify(item) {
  const body = reminderMessage(item)
  tapFeedback()
  try {
    // #ifdef APP-PLUS
    if (typeof plus !== 'undefined' && plus.push) {
      plus.push.createMessage(body || '你有一项日程即将开始', JSON.stringify({ id: item.id }), {
        title: '日程提醒',
        cover: false,
      })
    }
    // #endif
    // #ifdef H5
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      // eslint-disable-next-line no-new
      new Notification('日程提醒', { body: `${item.title}${body ? `\n${body}` : ''}` })
    }
    // #endif
  } catch (error) {
    // 通知能力不可用时保持应用内提示
  }
  toast(`提醒：${item.title}`, 2600)
}
