<template>
  <view class="month">
    <view class="weekdays">
      <text v-for="label in weekdayLabels" :key="label" class="weekday">{{ label }}</text>
    </view>
    <view class="grid">
      <view
        v-for="cell in cells"
        :key="cell.key"
        class="cell"
        :class="{ other: !cell.inMonth, selected: cell.key === selected, today: cell.key === today }"
        @tap="$emit('select', cell.key)"
      >
        <view class="num">{{ cell.day }}</view>
        <view class="dots">
          <view
            v-for="(status, index) in (marks[cell.key] || []).slice(0, 3)"
            :key="index"
            class="dot"
            :style="{ backgroundColor: statusColor(status) }"
          ></view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { STATUS_MAP } from '@/utils/constants'
import { WEEKDAY_CN } from '@/utils/date'

export default {
  name: 'CalendarMonth',
  props: {
    cells: { type: Array, default: () => [] },
    selected: { type: String, default: '' },
    today: { type: String, default: '' },
    weekStart: { type: Number, default: 1 },
    marks: { type: Object, default: () => ({}) },
  },
  emits: ['select'],
  computed: {
    weekdayLabels() {
      return Array.from({ length: 7 }, (_, index) => WEEKDAY_CN[(this.weekStart + index) % 7].slice(1))
    },
  },
  methods: {
    statusColor(status) {
      return (STATUS_MAP[status] && STATUS_MAP[status].color) || '#8e939b'
    },
  },
}
</script>

<style scoped>
.month {
  padding: 0 20rpx 10rpx;
}

.weekdays {
  display: flex;
}

.weekday {
  flex: 1;
  padding: 12rpx 0 14rpx;
  text-align: center;
  font-size: 22rpx;
  color: var(--text-3);
}

.grid {
  display: flex;
  flex-wrap: wrap;
}

.cell {
  width: 14.2857%;
  height: 94rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.num {
  width: 62rpx;
  height: 62rpx;
  border-radius: 31rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  color: var(--text);
  transition: background-color 0.16s ease;
}

.cell.other .num {
  color: var(--text-3);
  opacity: 0.62;
}

.cell.today .num {
  font-weight: 600;
  box-shadow: inset 0 0 0 2rpx var(--black);
}

.cell.selected .num {
  background: var(--black);
  color: var(--on-primary);
  font-weight: 600;
  box-shadow: none;
}

.dots {
  height: 10rpx;
  margin-top: 6rpx;
  display: flex;
  align-items: center;
  gap: 6rpx;
}

.dot {
  width: 8rpx;
  height: 8rpx;
  border-radius: 4rpx;
}

.cell.other .dot {
  opacity: 0.35;
}
</style>
