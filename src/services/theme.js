import { store } from '@/store'

/**
 * 主题解析与下发。
 * - 设置项 theme 只存三态：light / dark / system
 * - 页面通过根节点的 .theme-dark 类继承深色令牌
 * - H5 同时把结果写到 <html data-theme>，让 body、滚动条、原生控件一起跟随
 */

export function systemTheme() {
  try {
    const info = uni.getSystemInfoSync()
    if (info.theme === 'dark' || info.theme === 'light') return info.theme
  } catch (e) {
    // 部分平台不返回 theme，继续走降级
  }
  // #ifdef H5
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  // #endif
  return 'light'
}

function currentMode() {
  return (store.settings && store.settings.theme) || 'system'
}

export function resolveTheme(mode) {
  const value = mode || currentMode()
  if (value === 'light' || value === 'dark') return value
  return systemTheme()
}

const TAB_KEYS = ['calendar', 'todo', 'mine']

function syncNativeChrome(theme) {
  const dark = theme === 'dark'
  try {
    uni.setTabBarStyle({
      color: dark ? '#828a85' : '#a3a6ac',
      selectedColor: dark ? '#e7e7e2' : '#17181a',
      backgroundColor: dark ? '#1b1e20' : '#ffffff',
      borderStyle: dark ? 'black' : 'white',
    })
  } catch (e) {
    // 非 tabBar 页面或平台不支持时忽略
  }

  // 图标是位图，深浅两套随主题切换
  TAB_KEYS.forEach((name, index) => {
    try {
      uni.setTabBarItem({
        index,
        iconPath: `/static/tab/${name}${dark ? '-dark' : ''}.png`,
        selectedIconPath: `/static/tab/${name}-active${dark ? '-dark' : ''}.png`,
        fail: () => {},
      })
    } catch (e) {
      // 忽略不支持动态图标的平台
    }
  })
}

export function applyTheme(mode) {
  const theme = resolveTheme(mode)
  store.theme = theme

  // #ifdef H5
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.style.colorScheme = theme
  }
  // #endif

  syncNativeChrome(theme)
  return theme
}

/** 用户在设置里切换主题：写入设置并立即生效 */
export function setThemeMode(mode) {
  store.settings.theme = mode
  return applyTheme(mode)
}

let started = false

/** 跟随系统：只监听一次，设置项不是 system 时不响应 */
export function startThemeWatcher() {
  if (started) return
  started = true

  // #ifdef H5
  if (typeof window !== 'undefined' && window.matchMedia) {
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      if (currentMode() === 'system') applyTheme('system')
    }
    if (query.addEventListener) query.addEventListener('change', handler)
    else if (query.addListener) query.addListener(handler)
  }
  // #endif

  // #ifndef H5
  if (typeof uni.onThemeChange === 'function') {
    try {
      uni.onThemeChange(() => {
        if (currentMode() === 'system') applyTheme('system')
      })
    } catch (e) {
      // 平台不支持系统主题回调
    }
  }
  // #endif
}
