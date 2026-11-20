<template>
  <view class="week">
    <view
      v-for="day in days"
      :key="day.key"
      class="day"
      :class="{ selected: day.key === selected, today: day.key === today }"
      @tap="$emit('select', day.key)"
    >
      <text class="weekday">{{ day.weekday }}</text>
      <text class="num">{{ day.dayNumber }}</text>
      <view class="dots">
        <view
          v-for="(status, index) in (marks[day.key] || []).slice(0, 3)"
          :key="index"
          class="dot"
          :style="{ backgroundColor: statusColor(status) }"
        ></view>
      </view>
    </view>
  </view>
</template>

<script>
import { STATUS_MAP } from '@/utils/constants'

export default {
  name: 'CalendarWeek',
  props: {
    days: { type: Array, default: () => [] },
    selected: { type: String, default: '' },
    today: { type: String, default: '' },
    marks: { type: Object, default: () => ({}) },
  },
  emits: ['select'],
  methods: {
    statusColor(status) {
      return (STATUS_MAP[status] && STATUS_MAP[status].color) || '#8e939b'
    },
  },
}
</script>

<style scoped>
.week {
  display: flex;
  padding: 6rpx 20rpx 6rpx;
}

.day {
  flex: 1;
  margin: 0 4rpx;
  padding: 18rpx 0 14rpx;
  border-radius: 22rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: background-color 0.16s ease;
}

.weekday {
  font-size: 21rpx;
  color: var(--text-3);
}

.num {
  margin-top: 8rpx;
  font-size: 32rpx;
  font-weight: 600;
  color: var(--text);
}

.day.today .num {
  color: var(--blue);
}

.day.selected {
  background: var(--black);
}

.day.selected .weekday,
.day.selected .num {
  color: var(--on-primary);
}

.dots {
  height: 10rpx;
  margin-top: 10rpx;
  display: flex;
  align-items: center;
  gap: 6rpx;
}

.dot {
  width: 8rpx;
  height: 8rpx;
  border-radius: 4rpx;
}

.day.selected .dot {
  background: var(--on-primary) !important;
}
</style>
