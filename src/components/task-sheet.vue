<template>
  <view class="sheet-root" :class="{ visible }">
    <view class="mask" @tap="close" @touchmove.stop.prevent="noop"></view>
    <view class="panel">
      <view class="grabber"></view>
      <view class="panel-head">
        <text class="panel-title">{{ isEdit ? '编辑事项' : '新建事项' }}</text>
        <view class="close-btn" @tap="close">
          <view class="close-line"></view>
        </view>
      </view>

      <scroll-view scroll-y class="panel-body" :show-scrollbar="false">
        <input
          v-model="form.title"
          class="title-input"
          type="text"
          maxlength="80"
          placeholder="准备做什么？"
          placeholder-class="title-placeholder"
          confirm-type="done"
        />

        <view v-if="isEdit" class="block">
          <text class="block-label">状态</text>
          <view class="status-chips">
            <view
              v-for="option in statusOptions"
              :key="option.value"
              class="status-chip"
              :class="{ active: form.status === option.value }"
              @tap="form.status = option.value"
            >
              <view class="status-dot" :style="{ backgroundColor: option.color }"></view>
              <text>{{ option.label }}</text>
            </view>
          </view>
        </view>

        <view class="block">
          <text class="block-label">分类</text>
          <scroll-view scroll-x class="chip-scroll" :show-scrollbar="false">
            <view class="chip-row">
              <view class="chip" :class="{ active: !form.categoryId }" @tap="form.categoryId = null">无分类</view>
              <view
                v-for="category in store.categories"
                :key="category.id"
                class="chip"
                :class="{ active: form.categoryId === category.id }"
                @tap="form.categoryId = category.id"
              >
                <view class="chip-dot" :style="{ backgroundColor: category.color }"></view>
                <text>{{ category.name }}</text>
              </view>
            </view>
          </scroll-view>
        </view>

        <view class="field-list">
          <view class="field-row">
            <text class="field-label">日期</text>
            <view class="field-main">
              <picker mode="date" :value="form.date || today" start="2000-01-01" end="2100-12-31" @change="onDateChange">
                <view class="field-value" :class="{ muted: !form.date }">{{ dateText }}</view>
              </picker>
            </view>
            <view v-if="form.date" class="field-action" @tap.stop="clearDate">
              <text>清除</text>
            </view>
          </view>

          <view v-if="form.date" class="field-row">
            <text class="field-label">全天</text>
            <view class="field-main"></view>
            <switch class="field-switch" :checked="!form.startTime" :color="store.theme === 'dark' ? '#c6cfc2' : '#17181a'" @change="onAllDayChange" />
          </view>

          <template v-if="form.date && form.startTime">
            <view class="field-row">
              <text class="field-label">开始</text>
              <view class="field-main">
                <picker mode="time" :value="form.startTime" @change="onStartChange">
                  <view class="field-value">{{ form.startTime }}</view>
                </picker>
              </view>
            </view>
            <view class="field-row">
              <text class="field-label">结束</text>
              <view class="field-main">
                <picker mode="time" :value="form.endTime || form.startTime" @change="onEndChange">
                  <view class="field-value">{{ form.endTime }}</view>
                </picker>
              </view>
            </view>
          </template>

          <view class="field-row">
            <text class="field-label">提醒</text>
            <view class="field-main">
              <picker
                v-if="form.date"
                :range="reminderLabels"
                :value="reminderIndex"
                @change="onReminderChange"
              >
                <view class="field-value" :class="{ muted: form.reminder === null }">{{ reminderText }}</view>
              </picker>
              <text v-else class="field-value muted">设置日期后可提醒</text>
            </view>
          </view>
        </view>

        <text v-if="form.date && !form.startTime && form.reminder !== null" class="field-hint">
          全天事项将在当天 09:00 提醒
        </text>

        <view class="block note-block">
          <text class="block-label">备注</text>
          <textarea
            v-model="form.note"
            class="note-input"
            maxlength="500"
            placeholder="补充说明（可选）"
            placeholder-class="note-placeholder"
            :auto-height="true"
          />
        </view>
      </scroll-view>

      <view class="panel-foot">
        <view v-if="isEdit" class="btn btn-danger foot-delete" @tap="onDelete">删除</view>
        <view v-if="canArchive" class="btn btn-ghost foot-archive" @tap="onArchive">归档</view>
        <view class="btn btn-primary foot-save" @tap="onSave">保存</view>
      </view>
    </view>
  </view>
</template>

<script>
import { REMINDER_OPTIONS, STATUS_LIST, reminderLabel } from '@/utils/constants'
import { humanDate, minutesOf, shiftTime, todayKey } from '@/utils/date'
import { archiveItem, deleteItem, saveItem, store } from '@/store'
import { confirmDialog, toast } from '@/utils/ui'

export default {
  name: 'TaskSheet',
  props: {
    visible: { type: Boolean, default: false },
    item: { type: Object, default: null },
    defaultDate: { type: String, default: null },
  },
  emits: ['close', 'saved', 'changed'],
  data() {
    return {
      today: todayKey(),
      statusOptions: STATUS_LIST,
      reminderLabels: REMINDER_OPTIONS.map((option) => option.label),
      form: this.createForm(null, null),
      store,
    }
  },
  computed: {
    isEdit() {
      return !!this.form.id
    },
    canArchive() {
      return this.isEdit && this.form.status === 'done' && !this.form.archived
    },
    dateText() {
      return this.form.date ? humanDate(this.form.date) : '无日期（待办）'
    },
    reminderIndex() {
      const index = REMINDER_OPTIONS.findIndex((option) => option.value === this.form.reminder)
      return index === -1 ? 0 : index
    },
    reminderText() {
      return reminderLabel(this.form.reminder)
    },
  },
  watch: {
    visible(value) {
      if (value) this.form = this.createForm(this.item, this.defaultDate)
    },
    item() {
      if (this.visible) this.form = this.createForm(this.item, this.defaultDate)
    },
  },
  methods: {
    noop() {},
    createForm(item, defaultDate) {
      const date = item ? item.date : defaultDate || null
      const startTime = item ? item.startTime : null
      return {
        id: item ? item.id : null,
        title: item ? item.title : '',
        note: item ? item.note : '',
        date,
        startTime,
        endTime: item ? item.endTime || (startTime ? shiftTime(startTime, 60) : null) : null,
        categoryId: item ? item.categoryId : null,
        status: item ? item.status : 'pending',
        reminder: item
          ? item.reminder
          : date && store.settings.remindersEnabled
          ? store.settings.defaultReminder
          : null,
        archived: item ? !!item.archivedAt : false,
      }
    },
    close() {
      this.$emit('close')
    },
    onDateChange(event) {
      this.form.date = event.detail.value
      if (this.form.reminder === null && store.settings.remindersEnabled) {
        this.form.reminder = store.settings.defaultReminder
      }
    },
    clearDate() {
      this.form.date = null
      this.form.startTime = null
      this.form.endTime = null
      this.form.reminder = null
    },
    onAllDayChange(event) {
      if (event.detail.value) {
        this.form.startTime = null
        this.form.endTime = null
      } else {
        this.form.startTime = '09:00'
        this.form.endTime = '10:00'
      }
    },
    onStartChange(event) {
      this.form.startTime = event.detail.value
      if (!this.form.endTime || minutesOf(this.form.endTime) <= minutesOf(this.form.startTime)) {
        this.form.endTime = shiftTime(this.form.startTime, 60)
      }
    },
    onEndChange(event) {
      const value = event.detail.value
      if (minutesOf(value) <= minutesOf(this.form.startTime)) {
        toast('结束时间需晚于开始时间')
        return
      }
      this.form.endTime = value
    },
    onReminderChange(event) {
      const option = REMINDER_OPTIONS[Number(event.detail.value)]
      this.form.reminder = option ? option.value : null
    },
    onSave() {
      const title = this.form.title.trim()
      if (!title) {
        toast('请填写事项内容')
        return
      }
      if (this.form.startTime && this.form.endTime && minutesOf(this.form.endTime) <= minutesOf(this.form.startTime)) {
        toast('结束时间需晚于开始时间')
        return
      }
      const result = saveItem({
        id: this.form.id,
        title,
        note: this.form.note,
        date: this.form.date,
        startTime: this.form.startTime,
        endTime: this.form.endTime,
        categoryId: this.form.categoryId,
        status: this.form.status,
        reminder: this.form.reminder,
      })
      if (!result.ok) {
        toast(result.error)
        return
      }
      toast('已保存')
      this.$emit('saved')
      this.close()
    },
    async onDelete() {
      const confirmed = await confirmDialog('删除后不可恢复，确定删除该事项？', {
        title: '删除事项',
        confirmText: '删除',
        danger: true,
      })
      if (!confirmed) return
      const result = deleteItem(this.form.id)
      if (!result.ok) {
        toast(result.error)
        return
      }
      toast('已删除')
      this.$emit('changed')
      this.close()
    },
    onArchive() {
      const result = archiveItem(this.form.id)
      if (!result.ok) {
        toast(result.error)
        return
      }
      toast('已归档')
      this.$emit('changed')
      this.close()
    },
  },
}
</script>

<style scoped>
.sheet-root {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 999;
  pointer-events: none;
  visibility: hidden;
  transition: visibility 0s linear 0.3s;
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
  display: flex;
  flex-direction: column;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  box-shadow: var(--sheet-shadow);
}

.sheet-root.visible {
  pointer-events: auto;
  visibility: visible;
  transition: visibility 0s linear 0s;
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
  padding: 20rpx 32rpx 8rpx;
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

.panel-body {
  height: 56vh;
  padding: 8rpx 32rpx 0;
}

.title-input {
  width: 100%;
  height: 96rpx;
  font-size: 34rpx;
  font-weight: 500;
  color: var(--text);
  border-bottom: 1rpx solid var(--line);
}

.title-placeholder {
  color: var(--text-3);
  font-weight: 400;
}

.block {
  margin-top: 28rpx;
}

.block-label {
  display: block;
  margin-bottom: 16rpx;
  font-size: 23rpx;
  color: var(--text-3);
}

.status-chips {
  display: flex;
  gap: 14rpx;
}

.status-chip {
  flex: 1;
  height: 68rpx;
  border-radius: 16rpx;
  border: 1rpx solid var(--line);
  background: var(--fill);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  font-size: 26rpx;
  color: var(--text-2);
}

.status-chip.active {
  background: var(--pill);
  border-color: var(--text);
  color: var(--text);
}

.status-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 6rpx;
}

.chip-scroll {
  width: 100%;
  white-space: nowrap;
}

.chip-row {
  display: inline-flex;
  gap: 14rpx;
  padding-bottom: 4rpx;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  height: 62rpx;
  padding: 0 26rpx;
  border-radius: 31rpx;
  background: var(--fill);
  font-size: 25rpx;
  color: var(--text-2);
  border: 1rpx solid transparent;
}

.chip.active {
  background: var(--pill);
  border-color: var(--text);
  color: var(--text);
}

.chip-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 6rpx;
}

.field-list {
  margin-top: 30rpx;
  border-top: 1rpx solid var(--line);
}

.field-row {
  display: flex;
  align-items: center;
  min-height: 88rpx;
  border-bottom: 1rpx solid var(--line);
}

.field-label {
  width: 120rpx;
  font-size: 27rpx;
  color: var(--text-2);
}

.field-main {
  flex: 1;
  display: flex;
  justify-content: flex-end;
  min-width: 0;
}

.field-value {
  padding: 10rpx 0;
  font-size: 28rpx;
  color: var(--text);
  text-align: right;
}

.field-value.muted {
  color: var(--text-3);
}

.field-action {
  margin-left: 20rpx;
  padding: 10rpx 18rpx;
  border-radius: 12rpx;
  background: var(--fill);
  font-size: 23rpx;
  color: var(--text-2);
}

.field-switch {
  transform: scale(0.82);
  margin-right: -12rpx;
}

.field-hint {
  display: block;
  margin-top: 12rpx;
  padding-left: 120rpx;
  font-size: 22rpx;
  color: var(--text-3);
}

.note-block {
  padding-bottom: 24rpx;
}

.note-input {
  width: 100%;
  min-height: 128rpx;
  padding: 22rpx 24rpx;
  background: var(--fill);
  border-radius: 18rpx;
  font-size: 27rpx;
  line-height: 1.5;
  color: var(--text);
}

.note-placeholder {
  color: var(--text-3);
}

.panel-foot {
  display: flex;
  gap: 16rpx;
  padding: 20rpx 32rpx 8rpx;
  border-top: 1rpx solid var(--line);
}

.foot-delete {
  width: 150rpx;
  flex: none;
}

.foot-archive {
  width: 150rpx;
  flex: none;
}

.foot-save {
  flex: 1;
}
</style>
