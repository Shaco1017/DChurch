// 验证 rule-generator 核心函数的 Node 脚本（独立于 UniApp 运行时）
// 跑法：node scripts/test-rule-generator.js
// 为了不引入 uni-app 的 Vue 运行时，这里只拷贝纯函数到本文件底部。

const WEEKDAY_LABELS = ['周日','周一','周二','周三','周四','周五','周六']

function isDateKey(k) { return typeof k === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k) }
function parseKey(k) { const [y,m,d]=k.split('-').map(Number); return new Date(y, m-1, d) }
function toKey(d) {
  const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), day=String(d.getDate()).padStart(2,'0')
  return `${y}-${m}-${day}`
}
function addDays(k, n) { const d = parseKey(k); d.setDate(d.getDate() + n); return toKey(d) }
function diffDays(a, b) { return Math.round((parseKey(b) - parseKey(a)) / (24*3600*1000)) }
function weekdayIndex(k) { return parseKey(k).getDay() }

function enumerateDates(rule) {
  const errors = []
  if (!rule) return { dates: [], errors: ['no rule'] }
  if (!isDateKey(rule.startDate)) errors.push('起始日期无效')
  if (!isDateKey(rule.endDate)) errors.push('结束日期无效')
  if (errors.length) return { dates: [], errors }
  if (rule.endDate < rule.startDate) return { dates: [], errors: ['结束日期必须晚于起始日期'] }
  const span = diffDays(rule.startDate, rule.endDate)
  if (span < 0 || span > 3650) return { dates: [], errors: ['日期区间异常'] }
  const dates = []
  if (rule.type === 'daily') {
    for (let i = 0; i <= span; i += 1) dates.push(addDays(rule.startDate, i))
  } else if (rule.type === 'weekly') {
    const set = new Set((rule.weekdays || []).filter((d) => Number.isInteger(d) && d >= 0 && d < 7))
    if (!set.size) errors.push('请至少选择一个星期')
    else {
      for (let i = 0; i <= span; i += 1) {
        const key = addDays(rule.startDate, i)
        if (set.has(weekdayIndex(key))) dates.push(key)
      }
    }
  } else if (rule.type === 'monthly') {
    const set = new Set((rule.monthDays || []).filter((d) => Number.isInteger(d) && d >= 1 && d <= 31))
    if (!set.size) errors.push('请至少选择一个每月日期')
    else {
      const cursor = parseKey(rule.startDate)
      const end = parseKey(rule.endDate)
      while (cursor <= end) {
        const lastDay = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()
        Array.from(set).forEach((target) => {
          const day = Math.min(target, lastDay)
          const candidate = new Date(cursor.getFullYear(), cursor.getMonth(), day)
          if (candidate >= cursor && candidate <= end) dates.push(toKey(candidate))
        })
        cursor.setMonth(cursor.getMonth() + 1, 1)
      }
      dates.sort()
    }
  } else if (rule.type === 'interval') {
    const n = Math.max(1, Math.min(365, Number(rule.intervalCount) || 1))
    const unit = rule.intervalUnit || 'day'
    if (unit === 'day') {
      for (let i = 0; i <= span; i += n) dates.push(addDays(rule.startDate, i))
    } else if (unit === 'week') {
      for (let i = 0; i <= span; i += n * 7) dates.push(addDays(rule.startDate, i))
    } else if (unit === 'month') {
      const cursor = parseKey(rule.startDate)
      const end = parseKey(rule.endDate)
      dates.push(toKey(cursor))
      while (true) {
        const next = new Date(cursor)
        next.setMonth(next.getMonth() + n)
        if (next > end) break
        dates.push(toKey(next))
        cursor.setMonth(cursor.getMonth() + n)
      }
    } else { errors.push('无效的间隔单位') }
  } else { errors.push('未知规则类型') }
  return { dates, errors }
}

function assert(label, fn) {
  try {
    const result = fn()
    if (result.ok) { console.log('  ✓', label); return true }
    console.log('  ✗', label, '→', result.msg)
    return false
  } catch (err) {
    console.log('  ✗', label, 'THREW:', err.message)
    return false
  }
}

let ok = 0, fail = 0
function check(label, cond) {
  if (cond) { ok++; console.log('  ✓', label) }
  else { fail++; console.log('  ✗', label) }
}

console.log('=== 1. DAILY 规则 ===')
const rDaily = { type:'daily', startDate:'2026-11-20', endDate:'2026-11-27' }
const { dates: d1, errors: e1 } = enumerateDates(rDaily)
check('8天 → 8实例', d1.length === 8 && e1.length === 0)
check('首尾日期正确', d1[0] === '2026-11-20' && d1[d1.length-1] === '2026-11-27')

console.log('=== 2. WEEKLY 规则 ===')
// 2026-11-20 是周五；设 周三=3、周五=5
const rWeekly = { type:'weekly', startDate:'2026-11-20', endDate:'2026-12-10', weekdays:[3,5] }
const { dates: d2, errors: e2 } = enumerateDates(rWeekly)
// 11-20 周五 ✓、11-25 周三 ✓、11-27 周五 ✓、12-02 周三 ✓、12-04 周五 ✓、12-09 周三 ✓ = 6
check('约 6 个实例', d2.length === 6 && e2.length === 0)
check('不含 11-19（周四）', !d2.includes('2026-11-19'))
check('不含 11-21（周六）', !d2.includes('2026-11-21'))

console.log('=== 3. MONTHLY 规则 · 月末截断 ===')
// 起始 2026-01-15，结束 2026-05-10，选每月 31 日
// min(31,lastDay) 截断：1月31(31), 2月28(28≥15), 3月31(31), 4月30(30), 5月31>10 跳过
const rMonthly = { type:'monthly', startDate:'2026-01-15', endDate:'2026-05-10', monthDays:[31] }
const { dates: d3, errors: e3 } = enumerateDates(rMonthly)
check('月末截断 · 4 个实例（1/31、2/28、3/31、4/30）', d3.length === 4 && e3.length === 0)
check('实例集合正确',
  new Set(d3).has('2026-01-31') &&
  new Set(d3).has('2026-02-28') &&
  new Set(d3).has('2026-03-31') &&
  new Set(d3).has('2026-04-30'))

console.log('=== 4. INTERVAL 规则 ===')
// 每 3 天，起始 11-20，结束 12-05
const rInt = { type:'interval', startDate:'2026-11-20', endDate:'2026-12-05', intervalCount:3, intervalUnit:'day' }
const { dates: d4 } = enumerateDates(rInt)
// 20,23,26,29 + 02,05 = 6
check('每3天 16天区间 → 6个实例', d4.length === 6)

// 每 2 周
const rIntWeek = { type:'interval', startDate:'2026-11-20', endDate:'2027-01-31', intervalCount:2, intervalUnit:'week' }
const { dates: d5 } = enumerateDates(rIntWeek)
// 2026-11-20, 12-04, 12-18, 2027-01-01, 01-15, 01-29 = 6
check('每2周 约 6 个实例', d5.length === 6)

// 每 1 月
const rIntMonth = { type:'interval', startDate:'2026-11-20', endDate:'2027-02-20', intervalCount:1, intervalUnit:'month' }
const { dates: d6 } = enumerateDates(rIntMonth)
// 11-20,12-20,01-20,02-20 = 4
check('每月 4 个实例', d6.length === 4)

console.log('=== 5. 边界与错误拦截 ===')
const eEnd = enumerateDates({ type:'daily', startDate:'2026-11-20', endDate:'2026-11-10' })
check('end<start → 报错', eEnd.errors.includes('结束日期必须晚于起始日期'))

const eWeek = enumerateDates({ type:'weekly', startDate:'2026-11-20', endDate:'2026-12-10', weekdays:[] })
check('weekly 无星期 → 报错', eWeek.errors.includes('请至少选择一个星期'))

const eMonth = enumerateDates({ type:'monthly', startDate:'2026-11-20', endDate:'2027-11-20', monthDays:[] })
check('monthly 无日期 → 报错', eMonth.errors.includes('请至少选择一个每月日期'))

const eSpan = enumerateDates({ type:'daily', startDate:'2000-01-01', endDate:'2011-01-01' })
check('超过10年 → 报错', eSpan.errors.length > 0)

const eStart = enumerateDates({ type:'daily', startDate:'abc', endDate:'2026-11-27' })
check('起始日期无效 → 报错', eStart.errors.includes('起始日期无效'))

console.log(`\n结果：${ok + fail} 项检查，PASS ${ok}，FAIL ${fail}`)
process.exit(fail > 0 ? 1 : 0)
