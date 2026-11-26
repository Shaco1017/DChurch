<template>
  <view class="page" :class="{ 'theme-dark': store.theme === 'dark' }">
    <app-header title="重复规则" back>
      <template #right>
        <view v-if="batchMode" class="text-btn" @tap="toggleBatch">完成</view>
        <template v-else>
          <view v-if="store.rules.length" class="text-btn muted" @tap="toggleBatch">批量</view>
          <view class="text-btn" @tap="openEditor(null)">新建</view>
        </template>
      </template>
    </app-header>

    <text class="intro">
      保存规则后会自动生成未来 {{ horizonDays }} 天内所有符合规则的日程，无需选择结束日期。
      修改重复方式会重新生成实例；仅修改名称/时间/分类会批量更新未完成实例。
    </text>

    <view v-if="store.rules.length" class="list">
      <view class="card list-card">
        <view
          v-for="rule in store.rules"
          :key="rule.id"
          class="row"
          :class="{ selected: batchMode && isSelected(rule.id) }"
          @tap="onRowTap(rule)"
        >
          <view v-if="batchMode" class="check" :class="{ on: isSelected(rule.id) }"></view>
          <view class="row-main">
            <text class="title">{{ rule.title }}</text>
            <text class="desc">{{ describeRule(rule) }}</text>
            <text class="range">自 {{ rule.startDate }} 起 · 自动生成</text>
          </view>
          <view v-if="!batchMode" class="row-right">
            <view class="count-chip">{{ stats[rule.id]?.total || 0 }}</view>
            <view class="chevron row-chevron"></view>
          </view>
        </view>
      </view>
    </view>

    <empty-state
      v-else
      text="还没有重复规则"
      hint="创建一条规则，自动批量生成未来的日程"
      action-label="新建规则"
      @action="openEditor(null)"
    />

    <view v-if="batchMode" class="batch-bar">
      <view class="batch-meta">
        <text class="batch-count">已选 {{ selectedIds.length }} 条</text>
        <view class="batch-links">
          <text class="link" @tap="selectAll">全选</text>
          <text class="link" @tap="selectSameGroup">同类</text>
          <text class="link" @tap="clearSelection">清空</text>
        </view>
      </view>
      <view class="btn btn-primary batch-apply" :class="{ disabled: !selectedIds.length }" @tap="openBatchSheet">
        批量修改
      </view>
    </view>

    <view style="height: 40rpx;"></view>

    <view class="sheet-root" :class="{ visible: sheetVisible }">
      <view class="mask" @tap="closeSheet" @touchmove.stop.prevent="noop"></view>
      <view class="panel">
        <view class="grabber"></view>
        <view class="panel-head">
          <text class="panel-title">批量修改 {{ selectedIds.length }} 条规则</text>
          <view class="close-btn" @tap="closeSheet">
            <view class="close-line"></view>
          </view>
        </view>
        <text class="sheet-hint">只应用你改动过的项目，未填写的属性保持原样。</text>

        <view class="field">
          <text class="field-label">名称（留空则不修改）</text>
          <input
            v-model="batchForm.title"
            class="field-input"
            maxlength="80"
            placeholder="例如：每周一运送物品"
            placeholder-class="field-placeholder"
          />
        </view>

        <view class="field">
          <view class="field-head">
            <text class="field-label">执行时间</text>
            <text v-if="batchForm.timeTouched" class="field-link" @tap="clearTime">清除时间</text>
          </view>
          <view class="row-between">
            <picker mode="time" :value="batchForm.startTime || '09:00'" @change="onBatchStartTime">
              <view class="date-pick">
                <text class="pick-label">开始</text>
                <text class="pick-value" :class="{ placeholder: !batchForm.startTime }">
                  {{ batchForm.timeTouched ? batchForm.startTime || '全天' : '不修改' }}
                </text>
              </view>
            </picker>
            <picker mode="time" :value="batchForm.endTime || '18:00'" @change="onBatchEndTime">
              <view class="date-pick">
                <text class="pick-label">结束</text>
                <text class="pick-value" :class="{ placeholder: !batchForm.endTime }">
                  {{ batchForm.timeTouched ? batchForm.endTime || '不设置' : '不修改' }}
                </text>
              </view>
            </picker>
          </view>
        </view>

        <view class="field">
          <text class="field-label">分类</text>
          <picker :range="batchCategoryNames" @change="onBatchCategory">
            <view class="picker-view">
              <text :class="{ placeholder: batchForm.categoryIndex === 0 }">
                {{ batchCategoryNames[batchForm.categoryIndex] }}
              </text>
              <view class="chevron chevron-left"></view>
            </view>
          </picker>
        </view>

        <view class="field">
          <text class="field-label">优先级</text>
          <view class="seg">
            <view
              v-for="option in batchPriorityOptions"
              :key="option.value"
              class="seg-item"
              :class="{ active: batchForm.priority === option.value }"
              @tap="batchForm.priority = option.value"
            >
              {{ option.label }}
            </view>
          </view>
        </view>

        <view class="field">
          <text class="field-label">提醒</text>
          <picker :range="batchReminderLabels" @change="onBatchReminder">
            <view class="picker-view">
              <text :class="{ placeholder: batchForm.reminderIndex === 0 }">
                {{ batchReminderLabels[batchForm.reminderIndex] }}
              </text>
              <view class="chevron chevron-left"></view>
            </view>
          </picker>
        </view>

        <view class="panel-foot">
          <view class="btn btn-ghost foot-cancel" @tap="closeSheet">取消</view>
          <view class="btn btn-primary foot-save" @tap="applyBatch">应用到所选规则</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import AppHeader from '@/components/app-header.vue'
import EmptyState from '@/components/empty-state.vue'
import { batchUpdateRules, initStore, ruleStats, store } from '@/store'
import { describeRule, ruleRecurrenceKey } from '@/services/rule-generator'
import { REMINDER_OPTIONS, RULE_HORIZON_DAYS } from '@/utils/constants'
import { toast } from '@/utils/ui'

const BATCH_PRIORITY_OPTIONS = [
  { value: '', label: '不修改' },
  { value: 'low', label: '低' },
  { value: 'normal', label: '中' },
  { value: 'high', label: '高' },
]

function defaultBatchForm() {
  return {
    title: '',
    startTime: null,
    endTime: null,
    timeTouched: false,
    categoryIndex: 0,
    priority: '',
    reminderIndex: 0,
  }
}

export default {
  components: { AppHeader, EmptyState },
  data() {
    return {
      store,
      horizonDays: RULE_HORIZON_DAYS,
      batchMode: false,
      selectedIds: [],
      sheetVisible: false,
      batchForm: defaultBatchForm(),
      batchPriorityOptions: BATCH_PRIORITY_OPTIONS,
    }
  },
  computed: {
    stats() {
      const map = {}
      store.rules.forEach((r) => { map[r.id] = ruleStats(r.id) })
      return map
    },
    batchCategoryNames() {
      return ['不修改', '不分类', ...store.categories.map((c) => c.name)]
    },
    batchReminderLabels() {
      return ['不修改', ...REMINDER_OPTIONS.map((item) => item.label)]
    },
  },
  onShow() {
    initStore()
  },
  methods: {
    describeRule,
    noop() {},
    isSelected(id) {
      return this.selectedIds.indexOf(id) !== -1
    },
    openEditor(rule) {
      if (this.batchMode) return
      const url = rule ? `/pages/rules/editor?id=${rule.id}` : '/pages/rules/editor'
      this.$utils.route.go(url)
    },
    toggleBatch() {
      this.batchMode = !this.batchMode
      this.selectedIds = []
      this.sheetVisible = false
      this.batchForm = defaultBatchForm()
    },
    onRowTap(rule) {
      if (!this.batchMode) {
        this.openEditor(rule)
        return
      }
      const index = this.selectedIds.indexOf(rule.id)
      if (index === -1) this.selectedIds.push(rule.id)
      else this.selectedIds.splice(index, 1)
    },
    selectAll() {
      this.selectedIds = store.rules.map((rule) => rule.id)
    },
    clearSelection() {
      this.selectedIds = []
    },
    /** 选中与当前第一条已选规则「重复方式完全相同」的所有规则 */
    selectSameGroup() {
      const first = store.rules.find((rule) => this.isSelected(rule.id))
      if (!first) {
        toast('请先选中一条规则，再按同类选择')
        return
      }
      const key = ruleRecurrenceKey(first)
      this.selectedIds = store.rules.filter((rule) => ruleRecurrenceKey(rule) === key).map((rule) => rule.id)
      toast(`已选中 ${this.selectedIds.length} 条同类规则`)
    },
    openBatchSheet() {
      if (!this.selectedIds.length) {
        toast('请先选择要修改的规则')
        return
      }
      this.batchForm = defaultBatchForm()
      this.sheetVisible = true
    },
    closeSheet() {
      this.sheetVisible = false
    },
    onBatchStartTime(e) {
      this.batchForm.startTime = e.detail.value
      this.batchForm.timeTouched = true
    },
    onBatchEndTime(e) {
      this.batchForm.endTime = e.detail.value
      this.batchForm.timeTouched = true
    },
    clearTime() {
      this.batchForm.startTime = null
      this.batchForm.endTime = null
      this.batchForm.timeTouched = true
    },
    onBatchCategory(e) {
      this.batchForm.categoryIndex = Number(e.detail.value)
    },
    onBatchReminder(e) {
      this.batchForm.reminderIndex = Number(e.detail.value)
    },
    applyBatch() {
      const patch = {}
      const title = this.batchForm.title.trim()
      if (title) patch.title = title
      if (this.batchForm.timeTouched) {
        patch.startTime = this.batchForm.startTime
        patch.endTime = this.batchForm.endTime
      }
      if (this.batchForm.categoryIndex > 0) {
        patch.categoryId = this.batchForm.categoryIndex === 1
          ? null
          : store.categories[this.batchForm.categoryIndex - 2].id
      }
      if (this.batchForm.priority) patch.priority = this.batchForm.priority
      if (this.batchForm.reminderIndex > 0) {
        patch.reminder = REMINDER_OPTIONS[this.batchForm.reminderIndex - 1].value
      }

      if (!Object.keys(patch).length) {
        toast('请至少修改一项属性')
        return
      }

      const result = batchUpdateRules(this.selectedIds, patch)
      if (!result.ok) {
        toast(result.error)
        return
      }
      const regenerated = result.regenerated ? `，其中 ${result.regenerated} 条重新生成实例` : ''
      toast(`已更新 ${result.updated} 条规则${regenerated}`)
      this.sheetVisible = false
      this.batchMode = false
      this.selectedIds = []
    },
  },
}
</script>

<style scoped>
.text-btn {
  padding: 12rpx 8rpx;
  font-size: 26rpx;
  color: var(--text);
}

.text-btn.muted {
  color: var(--text-2);
}

.intro {
  display: block;
  padding: 12rpx 40rpx 24rpx;
  font-size: 23rpx;
  line-height: 1.6;
  color: var(--text-3);
}

.list {
  padding: 0 32rpx;
}

.list-card {
  overflow: hidden;
}

.row {
  display: flex;
  align-items: center;
  padding: 24rpx 26rpx;
  border-bottom: 1rpx solid var(--line);
}

.row:last-child {
  border-bottom: none;
}

.row:active {
  background: var(--fill-2);
}

.row.selected {
  background: var(--fill-2);
}

.row-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.title {
  font-size: 30rpx;
  font-weight: 500;
  color: var(--text);
}

.desc {
  font-size: 24rpx;
  color: var(--text-2);
}

.range {
  font-size: 22rpx;
  color: var(--text-3);
}

.row-right {
  display: flex;
  align-items: center;
  gap: 14rpx;
}

.count-chip {
  min-width: 60rpx;
  height: 40rpx;
  padding: 0 14rpx;
  border-radius: 20rpx;
  background: var(--fill);
  color: var(--text-2);
  font-size: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.row-chevron {
  width: 14rpx;
  height: 14rpx;
  border-color: var(--text-3);
}

.check {
  flex: none;
  width: 38rpx;
  height: 38rpx;
  margin-right: 20rpx;
  border-radius: 19rpx;
  border: 2rpx solid var(--check);
  box-sizing: border-box;
}

.check.on {
  background: var(--black);
  border-color: var(--black);
}

.batch-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
  max-width: 560px;
  margin: 0 auto;
  padding: 16rpx 32rpx calc(16rpx + env(safe-area-inset-bottom));
  background: var(--card);
  border-top: 1rpx solid var(--line);
  display: flex;
  align-items: center;
  gap: 20rpx;
  box-shadow: 0 -8rpx 24rpx var(--shadow-soft);
}

.batch-meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.batch-count {
  font-size: 25rpx;
  font-weight: 500;
  color: var(--text);
}

.batch-links {
  display: flex;
  gap: 22rpx;
}

.link {
  font-size: 23rpx;
  color: var(--text-2);
}

.batch-apply {
  flex: none;
  width: 240rpx;
  height: 76rpx;
}

.batch-apply.disabled {
  opacity: 0.45;
}

.sheet-root {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 999;
  pointer-events: none;
}

.mask {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background: var(--scrim);
  opacity: 0;
  transition: opacity 0.22s ease;
}

.panel {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  max-width: 560px;
  margin: 0 auto;
  background: var(--card);
  border-radius: 32rpx 32rpx 0 0;
  transform: translateY(105%);
  transition: transform 0.28s cubic-bezier(0.32, 0.72, 0, 1);
  padding: 0 32rpx calc(24rpx + env(safe-area-inset-bottom));
  box-shadow: var(--sheet-shadow);
}

.sheet-root.visible {
  pointer-events: auto;
}

.sheet-root.visible .mask {
  opacity: 1;
}

.sheet-root.visible .panel {
  transform: translateY(0);
}

.grabber {
  width: 68rpx;
  height: 8rpx;
  border-radius: 4rpx;
  background: var(--dash);
  margin: 16rpx auto 0;
}

.panel-head {
  display: flex;
  align-items: center;
  padding: 20rpx 0 12rpx;
}

.panel-title {
  flex: 1;
  font-size: 34rpx;
  font-weight: 600;
}

.close-btn {
  width: 60rpx;
  height: 60rpx;
  border-radius: 30rpx;
  background: var(--fill);
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-line {
  position: relative;
  width: 22rpx;
  height: 2rpx;
  background: var(--text-2);
  transform: rotate(45deg);
}

.close-line::after {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  width: 22rpx;
  height: 2rpx;
  background: var(--text-2);
  transform: rotate(90deg);
}

.sheet-hint {
  display: block;
  margin-bottom: 8rpx;
  font-size: 22rpx;
  color: var(--text-3);
}

.field {
  margin-top: 22rpx;
}

.field-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.field-label {
  display: block;
  margin-bottom: 14rpx;
  font-size: 23rpx;
  color: var(--text-3);
}

.field-link {
  margin-bottom: 14rpx;
  font-size: 23rpx;
  color: var(--accent-deep, var(--text-2));
}

.field-input {
  width: 100%;
  height: 88rpx;
  padding: 0 24rpx;
  background: var(--fill);
  border-radius: 18rpx;
  font-size: 28rpx;
}

.field-placeholder {
  color: var(--text-3);
}

.row-between {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.date-pick {
  display: flex;
  flex-direction: column;
  padding: 16rpx 20rpx;
  background: var(--fill);
  border-radius: 16rpx;
  min-width: 220rpx;
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

.pick-value.placeholder {
  color: var(--text-3);
}

.picker-view {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 80rpx;
  padding: 0 24rpx;
  background: var(--fill);
  border-radius: 18rpx;
  font-size: 27rpx;
  color: var(--text);
}

.picker-view .placeholder {
  color: var(--text-3);
}

.seg {
  display: flex;
  background: var(--fill);
  border-radius: 18rpx;
  padding: 6rpx;
}

.seg-item {
  flex: 1;
  padding: 16rpx 8rpx;
  text-align: center;
  font-size: 25rpx;
  border-radius: 14rpx;
  color: var(--text-2);
}

.seg-item.active {
  background: var(--pill);
  color: var(--text);
  box-shadow: 0 1rpx 4rpx var(--shadow-soft);
}

.panel-foot {
  display: flex;
  gap: 16rpx;
  padding: 32rpx 0 8rpx;
}

.foot-cancel {
  width: 180rpx;
  flex: none;
}

.foot-save {
  flex: 1;
}
</style>
