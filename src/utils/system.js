export function getStatusBarHeight() {
  try {
    if (typeof uni.getWindowInfo === 'function') {
      const info = uni.getWindowInfo()
      return info.statusBarHeight || 0
    }
    return uni.getSystemInfoSync().statusBarHeight || 0
  } catch (error) {
    return 0
  }
}

export const STATUS_BAR_HEIGHT = getStatusBarHeight()
