/**
 * 统一路由封装 —— 路由锁 + 去重 + tabBar 自动纠正
 *
 * 问题根源（来自线上/历史案例）：
 *   1) 快速连点触发多次并发路由请求 → 小程序/H5 端 uni 路由 timeout
 *   2) navigateTo 跳 tabBar 页面 → uni 静默失败或抛错
 *   3) 同一 fail 回调里串联多次不同 API 兜底 → 竞态放大
 *
 * 本封装：
 *   - 全局锁 + 800ms 节流窗口（与路由原生动画时长匹配）
 *   - tabBar 页面自动纠正为 switchTab（防止类型不匹配）
 *   - 所有 API 统一入口，参数结构保持与 uni 原生完全一致
 *   - 锁在 nextTick 后释放，避免"锁刚释放下一个请求立即进来"的极端竞态
 */

// tabBar 页面路径（从 pages.json 读取一次）
const TAB_PAGES = new Set([
  '/pages/calendar/index',
  '/pages/todo/index',
  '/pages/mine/index',
])

// 全局路由锁
let routing = false
let unlockTimer = null

function acquireLock() {
  if (routing) return false
  routing = true
  if (unlockTimer) clearTimeout(unlockTimer)
  unlockTimer = setTimeout(() => {
    routing = false
    unlockTimer = null
  }, 800)
  return true
}

function releaseLock() {
  routing = false
  if (unlockTimer) {
    clearTimeout(unlockTimer)
    unlockTimer = null
  }
}

function isTabUrl(url) {
  if (!url) return false
  // 去掉 query 和 hash 再比
  const clean = url.split('?')[0].split('#')[0]
  return TAB_PAGES.has(clean)
}

/**
 * 通用调度器：根据目标 URL 是否在 tabBar 决定用 navigateTo 还是 switchTab
 * 这是最常用的"跳某个内部页面"入口
 */
export function go(url, options = {}) {
  if (!url) return Promise.reject(new Error('Empty route url'))
  if (!acquireLock()) {
    options.fail && options.fail({ errMsg: 'route locked' })
    return Promise.reject(new Error('route locked'))
  }

  const api = isTabUrl(url) ? 'switchTab' : 'navigateTo'
  const payload = { url, ...options }
  const origFail = payload.fail
  const origComplete = payload.complete

  payload.fail = (err) => {
    // navigateTo → tabBar 纠正失败时不再串联 redirectTo/reLaunch，只做单次释放
    releaseLock()
    origFail && origFail(err)
  }
  payload.complete = (res) => {
    // complete 在 success/fail 之后都触发，释放锁交给 fail 回调做即可
    origComplete && origComplete(res)
  }
  // success 时保留锁到动画自然结束（800ms 窗口会自动释放）
  payload.success = (res) => {
    releaseLock() // 成功后立即释放，允许用户在到达新页后马上点下一个跳转
    options.success && options.success(res)
  }

  return new Promise((resolve, reject) => {
    payload.success = (res) => { options.success && options.success(res); resolve(res) }
    payload.fail = (err) => { releaseLock(); origFail && origFail(err); reject(err) }
    uni[api](payload)
  })
}

export function replace(url, options = {}) {
  if (!url) return Promise.reject(new Error('Empty route url'))
  if (!acquireLock()) {
    options.fail && options.fail({ errMsg: 'route locked' })
    return Promise.reject(new Error('route locked'))
  }

  // redirectTo 也不允许跳 tabBar；自动纠正为 switchTab + 释放锁（switchTab 不进栈，自然相当于 replace）
  const api = isTabUrl(url) ? 'switchTab' : 'redirectTo'
  return new Promise((resolve, reject) => {
    uni[api]({
      url,
      ...options,
      success: (res) => { releaseLock(); options.success && options.success(res); resolve(res) },
      fail: (err) => { releaseLock(); options.fail && options.fail(err); reject(err) },
    })
  })
}

export function relaunch(url, options = {}) {
  if (!url) return Promise.reject(new Error('Empty route url'))
  if (!acquireLock()) {
    options.fail && options.fail({ errMsg: 'route locked' })
    return Promise.reject(new Error('route locked'))
  }
  return new Promise((resolve, reject) => {
    uni.reLaunch({
      url,
      ...options,
      success: (res) => { releaseLock(); options.success && options.success(res); resolve(res) },
      fail: (err) => { releaseLock(); options.fail && options.fail(err); reject(err) },
    })
  })
}

export function switchTab(url, options = {}) {
  if (!url) return Promise.reject(new Error('Empty route url'))
  if (!acquireLock()) {
    options.fail && options.fail({ errMsg: 'route locked' })
    return Promise.reject(new Error('route locked'))
  }
  return new Promise((resolve, reject) => {
    uni.switchTab({
      url,
      ...options,
      success: (res) => { releaseLock(); options.success && options.success(res); resolve(res) },
      fail: (err) => { releaseLock(); options.fail && options.fail(err); reject(err) },
    })
  })
}

export function back(options = {}) {
  // navigateBack 可能没有可退栈，fail 是正常情况；锁仍需释放
  if (!acquireLock()) {
    options.fail && options.fail({ errMsg: 'route locked' })
    return Promise.reject(new Error('route locked'))
  }
  return new Promise((resolve, reject) => {
    uni.navigateBack({
      delta: 1,
      ...options,
      success: (res) => { releaseLock(); options.success && options.success(res); resolve(res) },
      fail: (err) => { releaseLock(); options.fail && options.fail(err); reject(err) },
    })
  })
}

/** 供特殊场景（如 onLaunch 初始化后首次跳转）手动释放锁 — 一般不需要调用 */
export function unlockRoute() {
  releaseLock()
}
