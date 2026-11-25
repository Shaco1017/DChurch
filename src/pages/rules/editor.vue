<template>
  <view class="page" :class="{ 'theme-dark': store.theme === 'dark' }">
    <app-header :title="form.id ? '编辑规则' : '新建规则'" back>
      <template #right>
        <view class="text-btn" @tap="onSave">保存</view>
      </template>
    </app-header>

    <view class="container">
      <view class="card field-card">
        <view class="field">
          <text class="field-label">规则名称</text>
          <input
            v-model="form.title"
            class="field-input"
            maxlength="80"
            placeholder="例如：每周一运送物品"
            placeholder-class="field-placeholder"
          />
        </view>

        <view class="field">
          <text class="field-label">描述（可选）</text>
          <textarea
            v-model="form.note"
            class="field-textarea"
            maxlength="500"
            placeholder="备注"
            placeholder-class="field-placeholder"
          />
        </view>
      </view>

      <view class="card section">
        <text class="section-title">重复方式</text>
        <view class="seg">
          <view
            v-for="type in typeOptions"
            :key="type.value"
            class="seg-item"
            :class="{ active: form.type === type.value }"
            @tap="form.type = type.value"
          >
            {{ type.label }}
          </view>
        </view>

        <view v-if="form.type === 'weekly'" class="chips">
          <view
            v-for="(name, index) in weekdayLabels"
            :key="index"
            class="chip"
            :class="{ active: form.weekdays.includes(index) }"
            @tap="toggleWeekday(index)"
          >
            {{ name }}
          </view>
        </view>

        <view v-if="form.type === 'monthly'" class="month-grid">
          <view
            v-for="day in 31"
            :key="day"
            class="day-chip"
            :class="{ active: form.monthDays.includes(day) }"
            @tap="toggleMonthDay(day)"
          >
            {{ day }}
          </view>
        </view>

        <view v-if="form.type === 'interval'" class="interval-row">
          <text class="interval-label">每</text>
          <input
            v-model="intervalCount"
            class="interval-input"
            type="number"
            placeholder="1"
          />
          <view class="seg seg-inline">
            <view
              v-for="u in unitOptions"
              :key="u.value"
              class="seg-item"
              :class="{ active: form.intervalUnit === u.value }"
              @tap="form.intervalUnit = u.value"
            >
              {{ u.label }}
            </view>
          </view>
        </view>
      </view>

      <view class="card section">
        <text class="section-title">生效日期</text>
        <view class="row-between">
          <view class="date-pick">
            <text class="pick-label">起始</text>
            <picker mode="date" :value="form.startDate" @change="onStartChange">
              <text class="pick-value">{{ form.startDate }}</text>
            </picker>
          </view>
          <text class="arrow">至</text>
          <view class="date-pick">
            <text class="pick-label">结束</text>
            <picker mode="date" :value="form.endDate" @change="onEndChange">
              <text class="pick-value">{{ form.endDate }}</text>
            </picker>
          </view>
        </view>
      </view>

      <view class="card section">
        <text class="section-title">执行时间</text>
        <view class="row-between">
          <view class="date-pick">
            <text class="pick-label">开始</text>
            <picker mode="time" :value="form.startTime" @change="(e) => form.startTime = e.detail.value">
              <text class="pick-value">{{ form.startTime || '全天' }}</text>
            </picker>
          </view>
          <view class="date-pick">
            <text class="pick-label">结束</text>
            <picker mode="time" :value="form.endTime" @change="(e) => form.endTime = e.detail.value">
              <text class="pick-value">{{ form.endTime || '不设置' }}</text>
            </picker>
          </view>
        </view>
      </view>

      <view class="card section">
        <text class="section-title">其他</text>

        <view class="row">
          <text class="row-label">分类</text>
          <picker range="categoryNames" @change="onCategoryChange">
            <view class="picker-view">
              <text :class="{ placeholder: !form.categoryId }">{{ selectedCategoryName }}</text>
              <view class="chevron chevron-left" style="transform: rotate(-135deg); width: 12rpx; height: 12rpx;"></view>
            </view>
          </picker>
        </view>

        <view class="row">
          <text class="row-label">优先级</text>
          <view class="seg seg-inline">
            <view
              v-for="p in priorityOptions"
              :key="p.value"
              class="seg-item"
              :class="{ active: form.priority === p.value }"
              @tap="form.priority = p.value"
            >
              {{ p.label }}
            </view>
          </view>
        </view>

        <view class="row">
          <text class="row-label">提醒</text>
          <picker range="reminderLabels" @change="onReminderChange">
            <view class="picker-view">
              <text>{{ reminderLabels[form.reminderIndex] }}</text>
              <view class="chevron chevron-left" style="transform: rotate(-135deg); width: 12rpx; height: 12rpx;"></view>
            </view>
          </picker>
        </view>
      </view>

      <view class="card preview-card">
        <view v-if="preview.ok" class="preview-ok">
          <text class="preview-num">将生成 {{ preview.count }} 个实例</text>
          <text class="preview-desc">{{ preview.desc }}</text>
        </view>
        <view v-else class="preview-err">
          <text class="preview-err-title">规则暂不可用</text>
          <text v-for="(err, i) in preview.errors" :key="i" class="preview-err-line">· {{ err }}</text>
        </view>
      </view>

      <view v-if="form.id" class="card danger-card">
        <view class="field-label" style="margin-bottom: 16rpx;">删除规则时</view>
        <view class="seg seg-danger">
          <view
            class="seg-item"
            :class="{ active: deleteMode === 'pending' }"
            @tap="deleteMode = 'pending'"
          >
            删规则 + 未完成
          </view>
          <view
            class="seg-item"
            :class="{ active: deleteMode === 'keep' }"
            @tap="deleteMode = 'keep'"
          >
            只删规则
          </view>
          <view
            class="seg-item"
            :class="{ active: deleteMode === 'all' }"
            @tap="deleteMode = 'all'"
          >
            全部删除
          </view>
        </view>
        <view class="btn btn-danger foot-delete" style="margin-top: 20rpx;" @tap="onDelete">删除规则</view>
      </view>

      <view style="height: 80rpx;"></view>
    </view>
  </view>
</template>

<script>
import AppHeader from '@/components/app-header.vue'
import { addRule, deleteRule, initStore, store, updateRule } from '@/store'
import { confirmDialog, toast } from '@/utils/ui'
import { generateItemsFromRule, RULE_TYPES } from '@/services/rule-generator'
import { REMINDER_OPTIONS } from '@/utils/constants'
import { todayKey, addDays } from '@/utils/date'

const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const PRIORITY_OPTIONS = [
  { value: 'low', label: '低' },
  { value: 'normal', label: '中' },
  { value: 'high', label: '高' },
]
const UNIT_OPTIONS = [
  { value: 'day', label: '天' },
  { value: 'week', label: '周' },
  { value: 'month', label: '月' },
]

function defaultForm() {
  const today = todayKey()
  const end = addDays(today, 90)
  return {
    id: null,
    title: '',
    note: '',
    type: 'daily',
    startDate: today,
    endDate: end,
    startTime: null,
    endTime: null,
    categoryId: null,
    priority: 'normal',
    reminder: null,
    weekdays: [],
    monthDays: [],
    intervalCount: 1,
    intervalUnit: 'day',
  }
}

export default {
  components: { AppHeader },
  data() {
    return {
      store,
      form: defaultForm(),
      deleteMode: 'pending',
    }
  },
  computed: {
    typeOptions() {
      return RULE_TYPES.map((t) => ({
        value: t,
        label: t === 'daily' ? '每日' : t === 'weekly' ? '每周' : t === 'monthly' ? '每月' : '自定义',
      }))
    },
    weekdayLabels() {
      return WEEKDAY_LABELS
    },
    unitOptions() {
      return UNIT_OPTIONS
    },
    priorityOptions() {
      return PRIORITY_OPTIONS
    },
    intervalCount: {
      get() { return this.form.intervalCount },
      set(v) { this.form.intervalCount = Math.max(1, Math.min(365, Number(v) || 1)) },
    },
    categoryNames() {
      return ['不分类', ...this.store.categories.map((c) => c.name)]
    },
    selectedCategoryName() {
      if (!this.form.categoryId) return '不分类'
      const hit = this.store.categories.find((c) => c.id === this.form.categoryId)
      return hit ? hit.name : '不分类'
    },
    reminderLabels() {
      return ['不提醒', ...REMINDER_OPTIONS.filter((r) => r !== null).map((r) => {
        if (r === 0) return '准时'
        if (r < 60) return `提前 ${r} 分钟`
        if (r === 60) return '提前 1 小时'
        if (r === 1440) return '提前 1 天'
        return `提前 ${Math.round(r / 60)} 小时`
      })]
    },
    reminderIndex() {
      if (this.form.reminder === null || this.form.reminder === undefined) return 0
      const list = [null, ...REMINDER_OPTIONS.filter((r) => r !== null)]
      const idx = list.indexOf(this.form.reminder)
      return idx === -1 ? 0 : idx
    },
    preview() {
      const base = { ok: true, count: 0, errors: [], desc: '' }
      if (!this.form.title.trim()) return { ok: false, errors: ['请填写规则名称'] }
      const draft = JSON.parse(JSON.stringify(this.form))
      const result = generateItemsFromRule(draft)
      if (!result.ok) return { ok: false, errors: result.errors }
      const desc = `${this.form.startDate} 至 ${this.form.endDate}`
      return { ok: true, count: result.count, errors: [], desc }
    },
  },
  onLoad(options) {
    initStore()
    if (options && options.id) {
      const rule = store.rules.find((r) => r.id === options.id)
      if (rule) this.form = JSON.parse(JSON.stringify(rule))
    }
  },
  methods: {
    onStartChange(e) {
      this.form.startDate = e.detail.value
      if (this.form.endDate < this.form.startDate) this.form.endDate = this.form.startDate
    },
    onEndChange(e) {
      this.form.endDate = e.detail.value
    },
    toggleWeekday(d) {
      const idx = this.form.weekdays.indexOf(d)
      if (idx === -1) this.form.weekdays.push(d)
      else this.form.weekdays.splice(idx, 1)
    },
    toggleMonthDay(d) {
      const idx = this.form.monthDays.indexOf(d)
      if (idx === -1) this.form.monthDays.push(d)
      else this.form.monthDays.splice(idx, 1)
    },
    onCategoryChange(e) {
      const idx = e.detail.value
      if (idx === 0) this.form.categoryId = null
      else this.form.categoryId = this.store.categories[idx - 1].id
    },
    onReminderChange(e) {
      const idx = Number(e.detail.value)
      const list = [null, ...REMINDER_OPTIONS.filter((r) => r !== null)]
      this.form.reminder = list[idx]
    },
    async onSave() {
      if (!this.preview.ok) {
        toast(this.preview.errors[0])
        return
      }
      const payload = { ...this.form }
      let result
      if (this.form.id) {
        result = updateRule(this.form.id, payload)
      } else {
        result = addRule(payload)
      }
      if (!result.ok) {
        toast(result.error)
        return
      }
      toast(this.form.id ? '已更新' : `已创建，生成 ${result.count || 0} 个实例`)
      this.$utils.route.back()
    },
    async onDelete() {
      const confirmMsg =
        this.deleteMode === 'all'
          ? '删除规则并移除所有关联的已生成事项（含已完成）'
          : this.deleteMode === 'keep'
          ? '仅删除规则，已生成的事项保留为独立日程'
          : '删除规则并移除未完成的关联事项（已完成/已归档保留）'
      const ok = await confirmDialog(confirmMsg, { title: '删除规则', confirmText: '删除', danger: true })
      if (!ok) return
      const result = deleteRule(this.form.id, this.deleteMode)
      if (!result.ok) {
        toast(result.error)
        return
      }
      toast(`已删除，移除 ${result.removed} 个实例`)
      this.$utils.route.back()
    },
  },
}
</script>

<style scoped>
.text-btn {
  padding: 12rpx 8rpx;
  font-size: 28rpx;
  color: var(--black);
  font-weight: 500;
}

.field-card {
  padding: 28rpx 28rpx 12rpx;
}

.field {
  margin-bottom: 16rpx;
}

.field-label {
  display: block;
  margin-bottom: 12rpx;
  font-size: 23rpx;
  color: var(--text-3);
}

.field-input {
  width: 100%;
  height: 80rpx;
  padding: 0 20rpx;
  background: var(--fill);
  border-radius: 18rpx;
  font-size: 28rpx;
}

.field-textarea {
  width: 100%;
  min-height: 140rpx;
  padding: 16rpx 20rpx;
  background: var(--fill);
  border-radius: 18rpx;
  font-size: 28rpx;
}

.field-placeholder {
  color: var(--text-3);
}

.section {
  padding: 24rpx 28rpx;
}

.section-title {
  display: block;
  margin-bottom: 18rpx;
  font-size: 23rpx;
  color: var(--text-3);
  letter-spacing: 0.6rpx;
}

.seg {
  display: flex;
  background: var(--fill);
  border-radius: 18rpx;
  padding: 6rpx;
}

.seg-item {
  flex: 1;
  padding: 18rpx 12rpx;
  text-align: center;
  font-size: 26rpx;
  border-radius: 14rpx;
  color: var(--text-2);
  transition: all 0.16s ease;
}

.seg-item.active {
  background: var(--pill);
  color: var(--text);
  box-shadow: 0 1rpx 4rpx var(--shadow-soft);
}

.seg-inline {
  display: inline-flex;
  flex: none;
}

.seg-inline .seg-item {
  flex: none;
  padding: 14rpx 22rpx;
  font-size: 25rpx;
}

.seg-danger {
  background: var(--danger-bg);
}

.seg-danger .seg-item.active {
  background: var(--pill);
  color: var(--danger);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
  margin-top: 18rpx;
}

.chip {
  padding: 12rpx 26rpx;
  border-radius: 100rpx;
  background: var(--fill);
  font-size: 26rpx;
  color: var(--text-2);
}

.chip.active {
  background: var(--black);
  color: var(--on-primary);
}

.month-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 18rpx;
}

.day-chip {
  width: 64rpx;
  height: 64rpx;
  border-radius: 16rpx;
  background: var(--fill);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26rpx;
  color: var(--text-2);
}

.day-chip.active {
  background: var(--black);
  color: var(--on-primary);
}

.interval-row {
  margin-top: 18rpx;
  display: flex;
  align-items: center;
  gap: 14rpx;
}

.interval-label {
  font-size: 27rpx;
  color: var(--text-2);
}

.interval-input {
  width: 80rpx;
  height: 60rpx;
  text-align: center;
  background: var(--fill);
  border-radius: 12rpx;
  font-size: 28rpx;
}

.row-between {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.date-pick {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16rpx 20rpx;
  background: var(--fill);
  border-radius: 16rpx;
}

.pick-label {
  font-size: 22rpx;
  color: var(--text-3);
}

.pick-value {
  margin-top: 6rpx;
  font-size: 28rpx;
  color: var(--text);
}

.arrow {
  font-size: 24rpx;
  color: var(--text-3);
}

.row {
  display: flex;
  align-items: center;
  padding: 12rpx 0;
}

.row-label {
  flex: 0 0 140rpx;
  font-size: 26rpx;
  color: var(--text-2);
}

.picker-view {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  font-size: 26rpx;
  color: var(--text);
  gap: 10rpx;
}

.picker-view .placeholder {
  color: var(--text-3);
}

.preview-card {
  padding: 24rpx 28rpx;
}

.preview-ok {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.preview-num {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--black);
}

.preview-desc {
  font-size: 24rpx;
  color: var(--text-3);
}

.preview-err {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.preview-err-title {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--danger);
}

.preview-err-line {
  font-size: 24rpx;
  color: var(--text-2);
}

.danger-card {
  padding: 24rpx 28rpx;
}

.foot-delete {
  height: 80rpx;
}
</style>
