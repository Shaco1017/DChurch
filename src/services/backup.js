import { SCHEMA_VERSION } from '@/utils/constants'
import { uid } from '@/utils/id'
import {
  defaultCategories,
  normalizeCategory,
  normalizeItem,
  normalizeRule,
  normalizeSettings,
} from './model'
import { parseXml, serializeXml } from './xml'

/**
 * 备份数据统一结构：
 * { app, kind, version, exportedAt, data: { items, categories, rules, settings } }
 * JSON 与 XML 共用同一份快照，两种格式可互相迁移。
 */
export function buildBackupSource(items, categories, rules, settings) {
  return {
    app: 'dchurch',
    kind: 'backup',
    version: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      items: JSON.parse(JSON.stringify(items || [])),
      categories: JSON.parse(JSON.stringify(categories || [])),
      rules: JSON.parse(JSON.stringify(rules || [])),
      settings: { ...(settings || {}) },
    },
  }
}

export function serializeBackup(snapshot, format) {
  if (format === 'xml') return serializeXml(snapshot)
  return JSON.stringify(snapshot, null, 2)
}

export function parseBackupText(text) {
  const raw = String(text || '').trim()
  if (!raw) throw new Error('内容为空，请先粘贴或选择备份内容')
  let parsed
  if (raw.startsWith('<')) {
    parsed = parseXml(raw)
  } else {
    try {
      parsed = JSON.parse(raw)
    } catch (error) {
      throw new Error('JSON 解析失败，请确认内容完整')
    }
  }
  return validateBackup(parsed)
}

/**
 * 校验并归一化备份数据。返回可直接写入仓库的快照与摘要。
 * strict 模式下只要存在致命问题就不会写入。
 */
export function validateBackup(raw) {
  const issues = []
  const warnings = []
  if (!raw || typeof raw !== 'object') {
    return { ok: false, issues: ['无法识别的数据格式'], warnings, snapshot: null, summary: null }
  }
  if (raw.app && raw.app !== 'dchurch') {
    issues.push('该数据不属于本应用，已拒绝导入')
  }
  const version = Number(raw.version) || 1
  if (version > SCHEMA_VERSION) {
    issues.push(`备份版本 v${version} 高于当前应用版本 v${SCHEMA_VERSION}`)
  }
  const data = raw.data && typeof raw.data === 'object' ? raw.data : raw
  if (!Array.isArray(data.items)) {
    issues.push('缺少事项列表（items）')
  }

  const seenIds = new Set()
  const items = []
  let invalidCount = 0
  const sourceItems = Array.isArray(data.items) ? data.items : []
  sourceItems.forEach((entry) => {
    const item = normalizeItem(entry)
    if (!item.title) {
      invalidCount += 1
      return
    }
    if (seenIds.has(item.id)) item.id = uid('it')
    seenIds.add(item.id)
    items.push(item)
  })
  if (invalidCount > 0) warnings.push(`${invalidCount} 条缺少标题的记录已跳过`)

  const seenCatIds = new Set()
  const categories = []
  const sourceCategories = Array.isArray(data.categories) ? data.categories : []
  sourceCategories.forEach((entry) => {
    const category = normalizeCategory(entry)
    if (!category) return
    if (seenCatIds.has(category.id)) category.id = uid('c')
    seenCatIds.add(category.id)
    categories.push(category)
  })
  const finalCategories = categories.length ? categories : defaultCategories()
  const categoryIds = new Set(finalCategories.map((category) => category.id))
  items.forEach((item) => {
    if (item.categoryId && !categoryIds.has(item.categoryId)) item.categoryId = null
  })

  const seenRuleIds = new Set()
  const rules = []
  const sourceRules = Array.isArray(data.rules) ? data.rules : []
  sourceRules.forEach((entry) => {
    const rule = normalizeRule(entry)
    if (!rule) return
    if (rule.categoryId && !categoryIds.has(rule.categoryId)) rule.categoryId = null
    if (seenRuleIds.has(rule.id)) rule.id = uid('ru')
    seenRuleIds.add(rule.id)
    rules.push(rule)
  })

  const settings = normalizeSettings(data.settings)
  const archived = items.filter((item) => item.archivedAt).length

  return {
    ok: issues.length === 0,
    issues,
    warnings,
    snapshot: {
      app: 'dchurch',
      kind: 'backup',
      version: SCHEMA_VERSION,
      exportedAt: raw.exportedAt || new Date().toISOString(),
      data: { items, categories: finalCategories, rules, settings },
    },
    summary: {
      items: items.length,
      archived,
      categories: finalCategories.length,
      rules: rules.length,
      exportedAt: raw.exportedAt || '',
    },
  }
}
