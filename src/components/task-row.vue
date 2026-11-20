<template>
  <view class="task-row" :class="{ 'is-done': isDone }" @tap="$emit('open', item)" @longpress="$emit('longpress', item)">
    <view class="status" :class="item.status" @tap.stop="$emit('toggle', item)">
      <view v-if="item.status === 'doing'" class="status-dot"></view>
      <view v-if="isDone" class="status-tick"></view>
    </view>
    <view class="body">
      <text class="title">{{ item.title }}</text>
      <view class="meta">
        <text v-if="showDate && item.date" class="meta-date" :class="{ overdue }">{{ dateText }}</text>
        <text class="meta-time" :class="{ overdue }">{{ timeText }}</text>
        <view v-if="category" class="meta-cat">
          <view class="cat-dot" :style="{ backgroundColor: category.color }"></view>
          <text>{{ category.name }}</text>
        </view>
        <text v-if="item.status === 'doing'" class="meta-doing">进行中</text>
        <text v-if="item.note" class="meta-note">备注</text>
      </view>
    </view>
    <view class="trail">
      <text v-if="overdue" class="badge-overdue">逾期</text>
    </view>
  </view>
</template>

<script>
import { isOverdue, itemTimeText, relativeDayLabel } from '@/utils/date'

export default {
  name: 'TaskRow',
  props: {
    item: { type: Object, required: true },
    category: { type: Object, default: null },
    showDate: { type: Boolean, default: false },
  },
  emits: ['open', 'toggle', 'longpress'],
  computed: {
    isDone() {
      return this.item.status === 'done'
    },
    timeText() {
      if (!this.item.date) return ''
      return itemTimeText(this.item)
    },
    dateText() {
      return this.item.date ? relativeDayLabel(this.item.date) : ''
    },
    overdue() {
      return isOverdue(this.item)
    },
  },
}
</script>

<style scoped>
.task-row {
  display: flex;
  align-items: flex-start;
  padding: 28rpx 24rpx;
  background: var(--card);
  border-bottom: 1rpx solid var(--line);
}

.task-row:last-child {
  border-bottom: none;
}

.task-row:active {
  background: var(--fill-2);
}

.status {
  flex: none;
  width: 46rpx;
  height: 46rpx;
  margin-right: 22rpx;
  margin-top: 2rpx;
  border-radius: 23rpx;
  border: 2rpx solid var(--check);
  background: var(--field);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.18s ease;
}

.status.doing {
  border-color: var(--amber);
}

.status-dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 7rpx;
  background: var(--amber);
}

.status.done {
  border-color: var(--green);
  background: var(--green);
}

.status-tick {
  width: 18rpx;
  height: 10rpx;
  border-left: 3rpx solid var(--on-color);
  border-bottom: 3rpx solid var(--on-color);
  transform: rotate(-45deg) translate(1rpx, -2rpx);
}

.body {
  flex: 1;
  min-width: 0;
}

.title {
  display: block;
  font-size: 30rpx;
  line-height: 1.4;
  color: var(--text);
  word-break: break-all;
}

.is-done .title {
  color: var(--text-3);
  text-decoration: line-through;
}

.meta {
  margin-top: 8rpx;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 14rpx;
  font-size: 23rpx;
  color: var(--text-3);
}

.meta-date {
  color: var(--text-2);
}

.meta-date.overdue,
.meta-time.overdue {
  color: var(--danger);
}

.meta-cat {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.cat-dot {
  width: 10rpx;
  height: 10rpx;
  border-radius: 5rpx;
}

.meta-doing {
  color: var(--amber);
}

.meta-note {
  color: var(--text-3);
}

.trail {
  flex: none;
  margin-left: 12rpx;
  padding-top: 4rpx;
}

.badge-overdue {
  font-size: 22rpx;
  color: var(--danger);
  background: var(--danger-bg);
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}
</style>
