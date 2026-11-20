import { reactive } from 'vue'
import { onPersist, repository } from '@/services/repository'
import {
  defaultCategories,
  normalizeCategory,
  normalizeItem,
  normalizeRule,
  normalizeSettings,
} from '@/services/model'
import { generateItemsFromRule } from '@/services/rule-generator'
import { STATUS, DEFAULT_SETTINGS } from '@/utils/constants'
import { uid } from '@/utils/id'

const DAY_MS = 24 * 60 * 60 * 1000
let persistBound = false

export const store = reactive({
  ready: false,
  items: [],
  categories: [],
  rules: [],
  settings: { ...DEFAULT_SETTINGS },
  theme: 'light',
  storageError: '',
  lastSavedAt: 0,
})

function dedupeById(list) {
  const seen = new Set()
  return list.filter((entry) => {
    if (!entry || seen.has(entry.id)) return false
    seen.add(entry.id)
    return true
  })
}

/** 按设置自动归档超过保留期的已完成事项，返回归档数量 */
export function runAutoArchive(items, settings, now = Date.now()) {
  const days = Number(settings && settings.autoArchiveDays) || 0
  if (days <= 0) return 0
  const threshold = days * DAY_MS
  let count = 0
  items.forEach((item) => {
    if (item.archivedAt || item.status !== STATUS.DONE || !item.completedAt) return
    if (now - item.completedAt >= threshold) {
      item.archivedAt = now
      count += 1
    }
  })
  return count
}

function persistNow() {
  repository.save({
    items: store.items,
    categories: store.categories,
    rules: store.rules,
    settings: store.settings,
    meta: { savedAt: Date.now() },
  })
}

export function persistState() {
  persistNow()
}

/**
 * 初始化：读取本地数据 → 归一化 → 清理无效引用 → 自动归档 → 回写。
 * 幂等，可在任意页面重复调用。
 */
export function initStore(force = false) {
  if (store.ready && !force) return store
  const snapshot = repository.load()

  let categories = dedupeById(
    (Array.isArray(snapshot.categories) ? snapshot.categories : []).map(normalizeCategory).filter(Boolean)
  )
  if (!categories.length) categories = defaultCategories()

  const settings = normalizeSettings(snapshot.settings)
  const items = dedupeById(
    (Array.isArray(snapshot.items) ? snapshot.items : []).map(normalizeItem).filter((item) => item.title)
  )
  const categoryIds = new Set(categories.map((category) => category.id))
  items.forEach((item) => {
    if (item.categoryId && !categoryIds.has(item.categoryId)) item.categoryId = null
  })
  runAutoArchive(items, settings)

  const rules = dedupeById(
    (Array.isArray(snapshot.rules) ? snapshot.rules : []).map(normalizeRule).filter(Boolean)
  )

  store.items = items
  store.categories = categories
  store.rules = rules
  store.settings = settings
  store.ready = true

  if (!persistBound) {
    persistBound = true
    onPersist(({ ok, at }) => {
      if (ok) {
        store.storageError = ''
        store.lastSavedAt = at
      } else {
        store.storageError = '本地存储写入失败，请检查设备存储空间'
      }
    })
  }

  persistNow()
  return store
}

/**
 * 新建或更新事项。标题为必填项，其余字段由数据模型统一归一化，
 * 保证任何入口写入的数据结构一致。
 */
export function saveItem(draft) {
  if (!draft || typeof draft.title !== 'string' || !draft.title.trim()) {
    return { ok: false, error: '请填写事项内容' }
  }
  const now = Date.now()
  if (draft.id) {
    const index = store.items.findIndex((item) => item.id === draft.id)
    if (index === -1) return { ok: false, error: '事项不存在或已被删除' }
    const prev = store.items[index]
    if (prev.archivedAt) return { ok: false, error: '已归档事项请先恢复后再编辑' }

    const next = normalizeItem({ ...prev, ...draft, id: prev.id, updatedAt: now })
    next.archivedAt = prev.archivedAt
    next.completedAt = next.status === STATUS.DONE ? prev.completedAt || now : null
    if (prev.date !== next.date || prev.startTime !== next.startTime || prev.reminder !== next.reminder) {
      next.reminderFired = false
    }
    store.items.splice(index, 1, next)
  } else {
    const item = normalizeItem({
      ...draft,
      id: '',
      status: STATUS.PENDING,
      completedAt: null,
      archivedAt: null,
      reminderFired: false,
      createdAt: now,
      updatedAt: now,
    })
    store.items.unshift(item)
  }
  persistNow()
  return { ok: true }
}

export function setStatus(id, status) {
  const allowed = [STATUS.PENDING, STATUS.DOING, STATUS.DONE]
  if (!allowed.includes(status)) return { ok: false, error: '无效的状态' }
  const item = store.items.find((entry) => entry.id === id)
  if (!item) return { ok: false, error: '事项不存在或已被删除' }
  if (item.archivedAt) return { ok: false, error: '已归档事项请先恢复' }

  item.status = status
  item.updatedAt = Date.now()
  if (status === STATUS.DONE) {
    item.completedAt = item.completedAt || item.updatedAt
  } else {
    item.completedAt = null
    item.archivedAt = null
  }
  persistNow()
  return { ok: true }
}

export function toggleDone(id) {
  const item = store.items.find((entry) => entry.id === id)
  if (!item) return { ok: false, error: '事项不存在或已被删除' }
  return setStatus(id, item.status === STATUS.DONE ? STATUS.PENDING : STATUS.DONE)
}

/** 只有已完成事项允许归档，保证“完成 → 归档 → 恢复”链路闭环 */
export function archiveItem(id) {
  const item = store.items.find((entry) => entry.id === id)
  if (!item) return { ok: false, error: '事项不存在或已被删除' }
  if (item.archivedAt) return { ok: false, error: '该事项已归档' }
  if (item.status !== STATUS.DONE) return { ok: false, error: '仅已完成事项可以归档' }
  item.archivedAt = Date.now()
  item.updatedAt = item.archivedAt
  persistNow()
  return { ok: true }
}

export function archiveCompleted() {
  const now = Date.now()
  let count = 0
  store.items.forEach((item) => {
    if (!item.archivedAt && item.status === STATUS.DONE) {
      item.archivedAt = now
      item.updatedAt = now
      count += 1
    }
  })
  if (count) persistNow()
  return count
}

export function restoreItem(id) {
  const item = store.items.find((entry) => entry.id === id)
  if (!item || !item.archivedAt) return { ok: false, error: '该事项不在归档中' }
  item.archivedAt = null
  item.updatedAt = Date.now()
  persistNow()
  return { ok: true }
}

export function deleteItem(id) {
  const index = store.items.findIndex((entry) => entry.id === id)
  if (index === -1) return { ok: false, error: '事项不存在或已被删除' }
  store.items.splice(index, 1)
  persistNow()
  return { ok: true }
}

export function clearArchive() {
  const before = store.items.length
  store.items = store.items.filter((item) => !item.archivedAt)
  const count = before - store.items.length
  if (count) persistNow()
  return count
}

export function addCategory({ name, color }) {
  const clean = typeof name === 'string' ? name.trim() : ''
  if (!clean) return { ok: false, error: '请输入分类名称' }
  if (clean.length > 12) return { ok: false, error: '分类名称不能超过 12 个字' }
  if (store.categories.some((category) => category.name === clean)) {
    return { ok: false, error: '已存在同名分类' }
  }
  const category = normalizeCategory({ id: uid('c'), name: clean, color, createdAt: Date.now() })
  store.categories.push(category)
  persistNow()
  return { ok: true, id: category.id }
}

export function updateCategory(id, patch) {
  const category = store.categories.find((entry) => entry.id === id)
  if (!category) return { ok: false, error: '分类不存在' }
  const clean = typeof patch.name === 'string' ? patch.name.trim() : category.name
  if (!clean) return { ok: false, error: '请输入分类名称' }
  if (clean.length > 12) return { ok: false, error: '分类名称不能超过 12 个字' }
  if (store.categories.some((entry) => entry.id !== id && entry.name === clean)) {
    return { ok: false, error: '已存在同名分类' }
  }
  const next = normalizeCategory({ ...category, ...patch, id, name: clean })
  Object.assign(category, next)
  persistNow()
  return { ok: true }
}

/** 删除分类后，原有事项保留并归入“未分类”，不丢数据 */
export function removeCategory(id) {
  const exists = store.categories.some((entry) => entry.id === id)
  if (!exists) return { ok: false, error: '分类不存在', detached: 0 }
  let detached = 0
  store.items.forEach((item) => {
    if (item.categoryId === id) {
      item.categoryId = null
      detached += 1
    }
  })
  onCategoryRemovedFromRule(id)
  store.categories = store.categories.filter((entry) => entry.id !== id)
  persistNow()
  return { ok: true, detached }
}

export function updateSettings(patch) {
  store.settings = normalizeSettings({ ...store.settings, ...patch })
  runAutoArchive(store.items, store.settings)
  persistNow()
  return store.settings
}

/** 新建重复规则 → 生成规则覆盖区间内的所有 item 草稿 */
export function addRule(draft) {
  const normalized = normalizeRule({ ...draft, id: '' })
  if (!normalized) return { ok: false, error: '规则配置无效，请检查类型与日期' }
  const generated = generateItemsFromRule(normalized)
  if (!generated.ok) return { ok: false, error: generated.errors.join('；') }

  const { items } = generated
  const categoryIds = new Set(store.categories.map((c) => c.id))
  items.forEach((item) => {
    if (item.categoryId && !categoryIds.has(item.categoryId)) item.categoryId = null
  })
  store.items.push(...items)
  store.rules.push(normalized)
  persistNow()
  return { ok: true, id: normalized.id, count: items.length }
}

/** 更新规则：允许改规则属性（重新生成实例）或只改模板属性 */
export function updateRule(id, patch) {
  const index = store.rules.findIndex((entry) => entry.id === id)
  if (index === -1) return { ok: false, error: '规则不存在' }
  const prev = store.rules[index]
  const normalized = normalizeRule({ ...prev, ...patch, id })
  if (!normalized) return { ok: false, error: '规则配置无效，请检查类型与日期' }

  // 规则属性变化时，删除旧实例并按新规则重新生成
  const ruleChanged =
    prev.type !== normalized.type ||
    prev.startDate !== normalized.startDate ||
    prev.endDate !== normalized.endDate ||
    JSON.stringify(prev.weekdays) !== JSON.stringify(normalized.weekdays) ||
    JSON.stringify(prev.monthDays) !== JSON.stringify(normalized.monthDays) ||
    prev.intervalCount !== normalized.intervalCount ||
    prev.intervalUnit !== normalized.intervalUnit

  if (ruleChanged) {
    store.items = store.items.filter((item) => item.ruleId !== id || item.status === STATUS.DONE)
    const generated = generateItemsFromRule(normalized)
    if (!generated.ok) return { ok: false, error: generated.errors.join('；') }
    const categoryIds = new Set(store.categories.map((c) => c.id))
    generated.items.forEach((item) => {
      if (item.categoryId && !categoryIds.has(item.categoryId)) item.categoryId = null
    })
    store.items.push(...generated.items)
  } else {
    // 仅模板属性变化：批量更新关联实例（已完成的不动）
    store.items.forEach((item) => {
      if (item.ruleId !== id || item.status === STATUS.DONE || item.archivedAt) return
      item.title = normalized.title
      item.note = normalized.note
      item.categoryId = normalized.categoryId && categoryIds.has(normalized.categoryId) ? normalized.categoryId : null
      item.priority = normalized.priority
      item.startTime = normalized.startTime
      item.endTime = normalized.endTime
      item.reminder = normalized.reminder
      item.updatedAt = Date.now()
    })
  }
  normalized.updatedAt = Date.now()
  store.rules.splice(index, 1, normalized)
  persistNow()
  return { ok: true, count: ruleChanged ? (store.items.filter((i) => i.ruleId === id).length) : 0 }
}

/**
 * 删除重复规则。
 * mode: 'keep' 仅删规则保留已生成的实例；
 *       'pending' 删规则 + 删除未完成实例（已完成/已归档保留）；
 *       'all' 删规则 + 删除所有关联实例。
 */
export function deleteRule(id, mode = 'pending') {
  const index = store.rules.findIndex((entry) => entry.id === id)
  if (index === -1) return { ok: false, error: '规则不存在' }
  let removed = 0
  if (mode === 'all') {
    const before = store.items.length
    store.items = store.items.filter((item) => item.ruleId !== id)
    removed = before - store.items.length
  } else if (mode === 'pending') {
    const before = store.items.length
    store.items = store.items.filter((item) => !(item.ruleId === id && item.status !== STATUS.DONE))
    removed = before - store.items.length
  }
  store.rules.splice(index, 1)
  persistNow()
  return { ok: true, removed }
}

/** 返回某规则关联的实例统计 */
export function ruleStats(id) {
  const list = store.items.filter((item) => item.ruleId === id)
  return {
    total: list.length,
    pending: list.filter((i) => i.status === STATUS.PENDING).length,
    doing: list.filter((i) => i.status === STATUS.DOING).length,
    done: list.filter((i) => i.status === STATUS.DONE).length,
    archived: list.filter((i) => i.archivedAt).length,
  }
}

export function rulesIndex() {
  const map = new Map()
  store.rules.forEach((rule) => map.set(rule.id, rule))
  return map
}

export function itemsByRule(ruleId) {
  return store.items.filter((item) => item.ruleId === ruleId)
}

/** 批量为规则的实例更新 categoryId（分类被删除时调用） */
export function onCategoryRemovedFromRule(categoryId) {
  store.rules.forEach((rule) => {
    if (rule.categoryId === categoryId) {
      rule.categoryId = null
      rule.updatedAt = Date.now()
    }
  })
}

/**
 * 导入备份。
 * merge：按 id 合并，较新的记录覆盖旧记录，分类按 id/名称去重；
 * replace：完全以备份内容替换当前数据。
 */
export function applyImport(snapshot, mode = 'merge') {
  if (!snapshot || !snapshot.data) return { ok: false, error: '备份数据无效' }
  const sourceItems = (snapshot.data.items || []).map(normalizeItem).filter((item) => item.title)
  const sourceCategories = (snapshot.data.categories || []).map(normalizeCategory).filter(Boolean)
  const sourceRules = (snapshot.data.rules || []).map(normalizeRule).filter(Boolean)
  const result = { added: 0, updated: 0, skipped: 0, removed: 0, rulesAdded: 0, rulesUpdated: 0 }

  if (mode === 'replace') {
    result.removed = store.items.length
    store.categories = sourceCategories.length ? sourceCategories : defaultCategories()
    const categoryIds = new Set(store.categories.map((category) => category.id))
    store.items = sourceItems.map((item) => {
      if (item.categoryId && !categoryIds.has(item.categoryId)) item.categoryId = null
      return item
    })
    store.rules = sourceRules.map((rule) => {
      if (rule.categoryId && !categoryIds.has(rule.categoryId)) rule.categoryId = null
      return rule
    })
    store.settings = normalizeSettings(snapshot.data.settings)
    result.added = store.items.length
    result.rulesAdded = store.rules.length
  } else {
    const categoryIdMap = new Map()
    sourceCategories.forEach((category) => {
      const byId = store.categories.find((entry) => entry.id === category.id)
      if (byId) {
        categoryIdMap.set(category.id, byId.id)
        return
      }
      const byName = store.categories.find((entry) => entry.name === category.name)
      if (byName) {
        categoryIdMap.set(category.id, byName.id)
        return
      }
      store.categories.push(category)
      categoryIdMap.set(category.id, category.id)
    })

    sourceItems.forEach((item) => {
      if (item.categoryId) item.categoryId = categoryIdMap.get(item.categoryId) || null
      const index = store.items.findIndex((entry) => entry.id === item.id)
      if (index === -1) {
        store.items.push(item)
        result.added += 1
        return
      }
      const current = store.items[index]
      if ((item.updatedAt || 0) > (current.updatedAt || 0)) {
        store.items.splice(index, 1, item)
        result.updated += 1
      } else {
        result.skipped += 1
      }
    })

    sourceRules.forEach((rule) => {
      if (rule.categoryId) rule.categoryId = categoryIdMap.get(rule.categoryId) || null
      const index = store.rules.findIndex((entry) => entry.id === rule.id)
      if (index === -1) {
        store.rules.push(rule)
        result.rulesAdded += 1
        return
      }
      const current = store.rules[index]
      if ((rule.updatedAt || 0) > (current.updatedAt || 0)) {
        store.rules.splice(index, 1, rule)
        result.rulesUpdated += 1
      }
    })
  }

  runAutoArchive(store.items, store.settings)
  persistNow()
  return { ok: true, ...result }
}

export function resetAll() {
  repository.clear()
  store.items = []
  store.rules = []
  store.categories = defaultCategories()
  store.settings = { ...DEFAULT_SETTINGS }
  store.storageError = ''
  store.ready = true
  persistNow()
}
