/**
 * 统一路由封装 —— 路由锁 + 去重 + tabBar 自动纠正
 *
 * 解决的三类问题：
 *   1) 快速连点触发多次并发路由请求 → 小程序/H5 端路由 timeout 或页面栈混乱
 *   2) navigateTo 跳 tabBar 页面 → uni 静默失败或报错
 *   3) 失败回调里串联多个不同 API 兜底 → 竞态放大，越兜越乱
 *
 * 约定：
 *   - 锁在路由回调结束（success / fail / complete）时立即释放，
 *     并保留一个兜底定时器，防止个别平台不回调导致永久锁死
 *   - 所有 API 返回 Promise，调用方可忽略，也可 catch
 */

// tabBar 页面路径（与 pages.json 保持一致）
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
  }, 600)
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
  const clean = url.split('?')[0].split('#')[0]
  return TAB_PAGES.has(clean)
}

/**
 * 统一调度器：把「是否 tabBar」的判断集中在一处，避免各处手写 API 选错。
 * 返回 Promise；被锁拦截时不会发起任何 uni 调用。
 */
function dispatch(api, url, options = {}) {
  // navigateBack 不需要 url，其余跳转必须有目标地址
  if (api !== 'navigateBack' && !url) return Promise.reject(new Error('Empty route url'))
  if (!acquireLock()) {
    // 重复点击 / 路由动画未结束时静默忽略，避免产生 Unhandled Promise Rejection
    return Promise.resolve(undefined)
  }

  const { success, fail, complete, ...rest } = options
  const payload = { ...rest }
  // navigateBack 不需要 url 字段
  if (api !== 'navigateBack') payload.url = url
  return new Promise((resolve, reject) => {
    uni[api]({
      ...payload,
      success: (res) => {
        releaseLock()
        if (typeof success === 'function') success(res)
        resolve(res)
      },
      fail: (err) => {
        releaseLock()
        if (typeof fail === 'function') fail(err)
        reject(err)
      },
      complete: (res) => {
        // 兜底：个别平台 success/fail 未触发时也能解锁
        releaseLock()
        if (typeof complete === 'function') complete(res)
      },
    })
  })
}

/** 跳转页面：tabBar 页面自动使用 switchTab，其余使用 navigateTo */
export function go(url, options = {}) {
  return dispatch(isTabUrl(url) ? 'switchTab' : 'navigateTo', url, options)
}

/** 替换当前页面：tabBar 页面用 switchTab（不压栈），其余用 redirectTo */
export function replace(url, options = {}) {
  return dispatch(isTabUrl(url) ? 'switchTab' : 'redirectTo', url, options)
}

export function relaunch(url, options = {}) {
  return dispatch('reLaunch', url, options)
}

export function switchTab(url, options = {}) {
  return dispatch('switchTab', url, options)
}

/** 返回上一页；无栈可退时通过 fail 回调交给调用方兜底 */
export function back(options = {}) {
  return dispatch('navigateBack', '', { delta: 1, ...options })
}

/** 特殊场景手动解锁（一般不使用） */
export function unlockRoute() {
  releaseLock()
}
