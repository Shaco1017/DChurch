import { STORAGE_KEYS, readValue, removeValue, writeValue } from './storage'

const listeners = new Set()
let pendingPayload = null
let pendingTimer = null
let lastWriteOk = true

const localAdapter = {
  kind: 'local',
  read() {
    return {
      items: readValue(STORAGE_KEYS.items, []),
      categories: readValue(STORAGE_KEYS.categories, []),
      rules: readValue(STORAGE_KEYS.rules, []),
      settings: readValue(STORAGE_KEYS.settings, {}),
      meta: readValue(STORAGE_KEYS.meta, {}),
    }
  },
  write(payload) {
    const results = [
      writeValue(STORAGE_KEYS.items, payload.items),
      writeValue(STORAGE_KEYS.categories, payload.categories),
      writeValue(STORAGE_KEYS.rules, payload.rules),
      writeValue(STORAGE_KEYS.settings, payload.settings),
      writeValue(STORAGE_KEYS.meta, payload.meta),
    ]
    return results.every(Boolean)
  },
  clear() {
    Object.values(STORAGE_KEYS).forEach((key) => removeValue(key))
  },
}

/**
 * Repository 是全应用唯一的数据出入口。
 * 当前只装配本地适配器；后续接入同步时，新增一个结构一致的远程适配器，
 * 在本地写入成功后镜像同一份快照即可，页面与业务逻辑无需改动。
 */
export class Repository {
  constructor(adapter) {
    this.adapter = adapter
    this.lastWriteAt = 0
  }

  load() {
    const raw = this.adapter.read()
    return {
      items: Array.isArray(raw.items) ? raw.items : [],
      categories: Array.isArray(raw.categories) ? raw.categories : [],
      rules: Array.isArray(raw.rules) ? raw.rules : [],
      settings: raw.settings && typeof raw.settings === 'object' ? raw.settings : {},
      meta: raw.meta && typeof raw.meta === 'object' ? raw.meta : {},
    }
  }

  /** 合并短时间内的多次修改，减少写盘次数 */
  save(snapshot) {
    pendingPayload = {
      items: snapshot.items,
      categories: snapshot.categories,
      rules: snapshot.rules,
      settings: snapshot.settings,
      meta: { ...snapshot.meta, savedAt: Date.now() },
    }
    if (pendingTimer) return
    pendingTimer = setTimeout(() => {
      pendingTimer = null
      this.flush()
    }, 120)
  }

  flush() {
    if (!pendingPayload) return lastWriteOk
    const payload = pendingPayload
    pendingPayload = null
    if (pendingTimer) {
      clearTimeout(pendingTimer)
      pendingTimer = null
    }
    lastWriteOk = this.adapter.write(payload)
    this.lastWriteAt = Date.now()
    listeners.forEach((listener) => {
      try {
        listener({ ok: lastWriteOk, at: this.lastWriteAt })
      } catch (error) {
        console.warn('[repository] 监听回调异常', error)
      }
    })
    return lastWriteOk
  }

  clear() {
    pendingPayload = null
    if (pendingTimer) {
      clearTimeout(pendingTimer)
      pendingTimer = null
    }
    this.adapter.clear()
  }
}

export const repository = new Repository(localAdapter)

export function onPersist(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
