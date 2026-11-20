/**
 * 极简 XML 序列化 / 解析，用于本地备份。
 * 仅覆盖本应用自身的结构，不引入第三方依赖。
 */
const ATTR_RE = /([a-zA-Z][\w-]*)="([^"]*)"/g

export function escapeXml(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function unescapeXml(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
}

function parseAttrs(source) {
  const result = {}
  if (!source) return result
  source.replace(ATTR_RE, (match, key, value) => {
    result[key] = unescapeXml(value)
    return ''
  })
  return result
}

function readTag(body, tag) {
  const match = body.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))
  return match ? unescapeXml(match[1]).trim() : ''
}

export function serializeXml(snapshot) {
  const data = snapshot.data || {}
  const items = Array.isArray(data.items) ? data.items : []
  const categories = Array.isArray(data.categories) ? data.categories : []
  const rules = Array.isArray(data.rules) ? data.rules : []
  const settings = data.settings || {}
  const lines = ['<?xml version="1.0" encoding="UTF-8"?>']
  lines.push(`<dchurch app="dchurch" version="${snapshot.version || 1}" exportedAt="${escapeXml(snapshot.exportedAt)}">`)
  lines.push('  <categories>')
  categories.forEach((category) => {
    lines.push(
      `    <category id="${escapeXml(category.id)}" name="${escapeXml(category.name)}" color="${escapeXml(category.color)}" createdAt="${category.createdAt || ''}"/>`
    )
  })
  lines.push('  </categories>')
  if (rules.length) {
    lines.push('  <rules>')
    rules.forEach((rule) => {
      const weekdays = Array.isArray(rule.weekdays) ? rule.weekdays.join(',') : ''
      const monthDays = Array.isArray(rule.monthDays) ? rule.monthDays.join(',') : ''
      const attrs = [
        `id="${escapeXml(rule.id)}"`,
        `type="${escapeXml(rule.type)}"`,
        `start="${escapeXml(rule.startDate)}"`,
        `end="${escapeXml(rule.endDate)}"`,
        `category="${escapeXml(rule.categoryId)}"`,
        `priority="${escapeXml(rule.priority)}"`,
        `startTime="${escapeXml(rule.startTime)}"`,
        `endTime="${escapeXml(rule.endTime)}"`,
        `reminder="${rule.reminder === null || rule.reminder === undefined ? '' : rule.reminder}"`,
        `weekdays="${escapeXml(weekdays)}"`,
        `monthDays="${escapeXml(monthDays)}"`,
        `intervalCount="${rule.intervalCount || 1}"`,
        `intervalUnit="${escapeXml(rule.intervalUnit)}"`,
        `createdAt="${rule.createdAt || ''}"`,
        `updatedAt="${rule.updatedAt || ''}"`,
      ].join(' ')
      lines.push(`    <rule ${attrs}>`)
      lines.push(`      <title>${escapeXml(rule.title)}</title>`)
      if (rule.note) lines.push(`      <note>${escapeXml(rule.note)}</note>`)
      lines.push('    </rule>')
    })
    lines.push('  </rules>')
  }
  lines.push('  <items>')
  items.forEach((item) => {
    const attrs = [
      `id="${escapeXml(item.id)}"`,
      `status="${escapeXml(item.status)}"`,
      `date="${escapeXml(item.date)}"`,
      `start="${escapeXml(item.startTime)}"`,
      `end="${escapeXml(item.endTime)}"`,
      `category="${escapeXml(item.categoryId)}"`,
      `priority="${escapeXml(item.priority)}"`,
      `ruleId="${escapeXml(item.ruleId)}"`,
      `ruleIndex="${item.ruleIndex === null || item.ruleIndex === undefined ? '' : item.ruleIndex}"`,
      `reminder="${item.reminder === null || item.reminder === undefined ? '' : item.reminder}"`,
      `reminderFired="${item.reminderFired ? 1 : 0}"`,
      `createdAt="${item.createdAt || ''}"`,
      `updatedAt="${item.updatedAt || ''}"`,
      `completedAt="${item.completedAt || ''}"`,
      `archivedAt="${item.archivedAt || ''}"`,
    ].join(' ')
    lines.push(`    <item ${attrs}>`)
    lines.push(`      <title>${escapeXml(item.title)}</title>`)
    if (item.note) lines.push(`      <note>${escapeXml(item.note)}</note>`)
    lines.push('    </item>')
  })
  lines.push('  </items>')
  lines.push(
    `  <settings weekStart="${settings.weekStart}" defaultView="${escapeXml(settings.defaultView)}" defaultReminder="${
      settings.defaultReminder === null || settings.defaultReminder === undefined ? '' : settings.defaultReminder
    }" remindersEnabled="${settings.remindersEnabled ? 1 : 0}" autoArchiveDays="${settings.autoArchiveDays || 0}"/>`
  )
  lines.push('</dchurch>')
  return lines.join('\n')
}

export function parseXml(text) {
  const source = String(text || '')
  const rootMatch = source.match(/<dchurch\b([^>]*)>/)
  if (!rootMatch) throw new Error('未找到备份根节点，请确认文件来源')
  const rootAttrs = parseAttrs(rootMatch[1])

  const categories = []
  source.replace(/<category\b([^>]*)\/>/g, (match, attrText) => {
    const attrs = parseAttrs(attrText)
    if (attrs.id) {
      categories.push({
        id: attrs.id,
        name: attrs.name || '',
        color: attrs.color || '',
        createdAt: Number(attrs.createdAt) || 0,
      })
    }
    return ''
  })

  const rules = []
  const ruleRe = /<rule\b([^>]*)>([\s\S]*?)<\/rule>/g
  let rMatch = ruleRe.exec(source)
  while (rMatch) {
    const attrs = parseAttrs(rMatch[1])
    const body = rMatch[2]
    rules.push({
      id: attrs.id,
      title: readTag(body, 'title'),
      note: readTag(body, 'note'),
      type: attrs.type,
      startDate: attrs.start,
      endDate: attrs.end,
      categoryId: attrs.category || null,
      priority: attrs.priority || 'normal',
      startTime: attrs.startTime || null,
      endTime: attrs.endTime || null,
      reminder: attrs.reminder === '' || attrs.reminder === undefined ? null : Number(attrs.reminder),
      weekdays: attrs.weekdays ? attrs.weekdays.split(',').filter(Boolean).map((v) => Number(v)) : [],
      monthDays: attrs.monthDays ? attrs.monthDays.split(',').filter(Boolean).map((v) => Number(v)) : [],
      intervalCount: Number(attrs.intervalCount) || 1,
      intervalUnit: attrs.intervalUnit || 'day',
      createdAt: Number(attrs.createdAt) || 0,
      updatedAt: Number(attrs.updatedAt) || 0,
    })
    rMatch = ruleRe.exec(source)
  }

  const items = []
  const itemRe = /<item\b([^>]*)>([\s\S]*?)<\/item>/g
  let match = itemRe.exec(source)
  while (match) {
    const attrs = parseAttrs(match[1])
    const body = match[2]
    items.push({
      id: attrs.id,
      title: readTag(body, 'title'),
      note: readTag(body, 'note'),
      status: attrs.status,
      date: attrs.date || null,
      startTime: attrs.start || null,
      endTime: attrs.end || null,
      categoryId: attrs.category || null,
      priority: attrs.priority || 'normal',
      ruleId: attrs.ruleId || null,
      ruleIndex: attrs.ruleIndex === '' || attrs.ruleIndex === undefined ? null : Number(attrs.ruleIndex),
      reminder: attrs.reminder === '' || attrs.reminder === undefined ? null : Number(attrs.reminder),
      reminderFired: attrs.reminderFired === '1',
      createdAt: Number(attrs.createdAt) || 0,
      updatedAt: Number(attrs.updatedAt) || 0,
      completedAt: Number(attrs.completedAt) || null,
      archivedAt: Number(attrs.archivedAt) || null,
    })
    match = itemRe.exec(source)
  }

  const settingsMatch = source.match(/<settings\b([^>]*)\/>/)
  let settings = null
  if (settingsMatch) {
    const attrs = parseAttrs(settingsMatch[1])
    settings = {
      weekStart: attrs.weekStart === '0' ? 0 : 1,
      defaultView: attrs.defaultView,
      defaultReminder: attrs.defaultReminder === '' ? null : Number(attrs.defaultReminder),
      remindersEnabled: attrs.remindersEnabled !== '0',
      autoArchiveDays: Number(attrs.autoArchiveDays) || 0,
    }
  }

  return {
    app: 'dchurch',
    kind: 'backup',
    version: Number(rootAttrs.version) || 1,
    exportedAt: rootAttrs.exportedAt || '',
    data: { items, categories, rules, settings },
  }
}
