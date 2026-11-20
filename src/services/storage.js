/**
 * 本地存储适配层。
 * 所有数据都通过 uni 的本地存储 API 落在当前设备，不产生任何网络请求。
 * 更换存储实现（例如未来接入 SQLite / 云同步）时只需替换本文件。
 */
const PREFIX = 'dchurch.'

export const STORAGE_KEYS = {
  items: `${PREFIX}items`,
  categories: `${PREFIX}categories`,
  rules: `${PREFIX}rules`,
  settings: `${PREFIX}settings`,
  meta: `${PREFIX}meta`,
}

export function readValue(key, fallback) {
  try {
    const value = uni.getStorageSync(key)
    if (value === '' || value === null || value === undefined) return fallback
    return value
  } catch (error) {
    console.warn('[storage] 读取失败', key, error)
    return fallback
  }
}

export function writeValue(key, value) {
  try {
    uni.setStorageSync(key, value)
    return true
  } catch (error) {
    console.error('[storage] 写入失败', key, error)
    return false
  }
}

export function removeValue(key) {
  try {
    uni.removeStorageSync(key)
    return true
  } catch (error) {
    return false
  }
}

export function clearAppStorage() {
  Object.values(STORAGE_KEYS).forEach((key) => removeValue(key))
}

export function storageUsage() {
  try {
    const info = uni.getStorageInfoSync()
    return {
      currentSize: Number(info.currentSize) || 0,
      limitSize: Number(info.limitSize) || 0,
    }
  } catch (error) {
    return { currentSize: 0, limitSize: 0 }
  }
}
