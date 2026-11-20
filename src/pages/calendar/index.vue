<template>
  <view class="page" :class="{ 'theme-dark': store.theme === 'dark' }">
    <app-header title="日程">
      <template #right>
        <view class="today-pill" :class="{ 'is-today': selected === today }" @tap="goToday">今天</view>
      </template>

      <view class="switcher">
        <view
          v-for="option in views"
          :key="option.value"
          class="switch-item"
          :class="{ active: view === option.value }"
          @tap="setView(option.value)"
        >
          {{ option.label }}
        </view>
      </view>

      <view class="period-bar">
        <view class="nav-btn" @tap="shift(-1)">
          <view class="chevron chevron-left nav-chevron"></view>
        </view>
        <view class="period-center">
          <text class="period-title">{{ periodText }}</text>
          <text class="period-sub">{{ periodSub }}</text>
        </view>
        <view class="nav-btn" @tap="shift(1)">
          <view class="chevron nav-chevron"></view>
        </view>
      </view>
    </app-header>

    <view class="cal-wrap">
      <view v-if="view === 'month'" class="cal-card card">
        <calendar-month
          :cells="cells"
          :selected="selected"
          :today="today"
          :week-start="weekStart"
          :marks="marks"
          @select="selectDate"
        />
      </view>

      <view v-else-if="view === 'week'" class="cal-card card">
        <calendar-week
          :days="weekDayList"
          :selected="selected"
          :today="today"
          :marks="marks"
          @select="selectDate"
        />
      </view>

      <view v-else class="day-hero">
        <text class="hero-num">{{ heroDay }}</text>
        <view class="hero-info">
          <text class="hero-week">{{ heroWeek }}</text>
          <text class="hero-meta">{{ monthDayLabel }} · {{ dayList.length }} 项安排</text>
        </view>
      </view>
    </view>

    <view class="agenda">
      <view class="agenda-head">
        <text class="agenda-title">{{ selectedText }}</text>
        <text class="agenda-sub">{{ dayList.length ? `${dayList.length} 项安排` : '暂无安排' }}</text>
      </view>

      <view v-if="dayList.length" class="agenda-card card">
        <task-row
          v-for="item in dayList"
          :key="item.id"
          :item="item"
          :category="categoryOf(item)"
          @open="openItem"
          @toggle="onToggle"
          @longpress="openItem"
        />
      </view>

      <view v-else class="agenda-empty card">
        <empty-state
          text="这一天还没有安排"
          hint="添加一条日程，或放入待办稍后处理"
          action-label="添加安排"
          @action="createItem"
        />
      </view>
    </view>

    <view class="fab" @tap="createItem">
      <view class="fab-plus"></view>
    </view>

    <task-sheet
      :visible="sheetVisible"
      :item="editing"
      :default-date="selected"
      @close="closeSheet"
      @saved="closeSheet"
      @changed="closeSheet"
    />
  </view>
</template>

<script>
import AppHeader from '@/components/app-header.vue'
import CalendarMonth from '@/components/calendar-month.vue'
import CalendarWeek from '@/components/calendar-week.vue'
import TaskRow from '@/components/task-row.vue'
import TaskSheet from '@/components/task-sheet.vue'
import EmptyState from '@/components/empty-state.vue'
import { initStore, store, toggleDone } from '@/store'
import { calendarMarks, categoryIndex, dayItems } from '@/store/selectors'
import { VIEWS } from '@/utils/constants'
import {
  WEEKDAY_CN,
  addDays,
  addMonths,
  humanDate,
  monthMatrix,
  parseKey,
  periodTitle,
  todayKey,
  weekKeys,
} from '@/utils/date'

export default {
  components: { AppHeader, CalendarMonth, CalendarWeek, TaskRow, TaskSheet, EmptyState },
  data() {
    return {
      store,
      views: VIEWS,
      view: store.settings.defaultView || 'month',
      selected: todayKey(),
      today: todayKey(),
      sheetVisible: false,
      editing: null,
    }
  },
  computed: {
    weekStart() {
      return store.settings.weekStart
    },
    cells() {
      return monthMatrix(this.selected, this.weekStart)
    },
    weekDayList() {
      return weekKeys(this.selected, this.weekStart).map((key) => ({
        key,
        weekday: WEEKDAY_CN[parseKey(key).getDay()],
        dayNumber: parseKey(key).getDate(),
      }))
    },
    marks() {
      return calendarMarks(store.items)
    },
    categoryMap() {
      return categoryIndex(store.categories)
    },
    dayList() {
      return dayItems(store.items, this.selected)
    },
    periodText() {
      return periodTitle(this.selected, this.view, this.weekStart)
    },
    periodSub() {
      if (this.view === 'day') return WEEKDAY_CN[parseKey(this.selected).getDay()]
      if (this.view === 'month') {
        const prefix = this.selected.slice(0, 7)
        const count = store.items.filter((item) => !item.archivedAt && item.date && item.date.startsWith(prefix)).length
        return count ? `本月 ${count} 项安排` : '本月暂无安排'
      }
      const keys = weekKeys(this.selected, this.weekStart)
      const count = store.items.filter((item) => !item.archivedAt && item.date && keys.includes(item.date)).length
      return count ? `本周 ${count} 项安排` : '本周暂无安排'
    },
    selectedText() {
      return humanDate(this.selected)
    },
    heroDay() {
      return parseKey(this.selected).getDate()
    },
    heroWeek() {
      return WEEKDAY_CN[parseKey(this.selected).getDay()]
    },
    monthDayLabel() {
      return `${parseKey(this.selected).getMonth() + 1}月`
    },
  },
  onShow() {
    initStore()
    this.today = todayKey()
  },
  methods: {
    setView(value) {
      this.view = value
    },
    shift(direction) {
      if (this.view === 'month') {
        this.selected = addMonths(this.selected, direction)
      } else if (this.view === 'week') {
        this.selected = addDays(this.selected, direction * 7)
      } else {
        this.selected = addDays(this.selected, direction)
      }
    },
    goToday() {
      this.today = todayKey()
      this.selected = this.today
    },
    selectDate(key) {
      this.selected = key
    },
    categoryOf(item) {
      return item.categoryId ? this.categoryMap[item.categoryId] || null : null
    },
    onToggle(item) {
      const result = toggleDone(item.id)
      if (!result.ok) uni.showToast({ title: result.error, icon: 'none' })
    },
    openItem(item) {
      this.editing = item
      this.sheetVisible = true
    },
    createItem() {
      this.editing = null
      this.sheetVisible = true
    },
    closeSheet() {
      this.sheetVisible = false
      this.editing = null
    },
  },
}
</script>

<style scoped>
.today-pill {
  padding: 10rpx 26rpx;
  border-radius: 999rpx;
  border: 1rpx solid var(--line);
  background: var(--field);
  font-size: 24rpx;
  color: var(--text-2);
}

.today-pill.is-today {
  color: var(--text);
  border-color: var(--text-3);
}

.today-pill:active {
  opacity: 0.7;
}

.switcher {
  margin: 8rpx 32rpx 0;
  padding: 6rpx;
  display: flex;
  background: var(--track);
  border-radius: 18rpx;
}

.switch-item {
  flex: 1;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14rpx;
  font-size: 26rpx;
  color: var(--text-2);
  transition: all 0.18s ease;
}

.switch-item.active {
  background: var(--pill);
  color: var(--text);
  font-weight: 600;
  box-shadow: 0 2rpx 8rpx var(--shadow-soft);
}

.period-bar {
  display: flex;
  align-items: center;
  padding: 12rpx 32rpx 4rpx;
}

.nav-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 18rpx;
}

.nav-btn:active {
  background: var(--fill);
}

.nav-chevron {
  border-color: var(--text-2);
}

.period-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.period-title {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--text);
}

.period-sub {
  margin-top: 2rpx;
  font-size: 22rpx;
  color: var(--text-3);
}

.cal-wrap {
  padding: 12rpx 24rpx 0;
}

.cal-card {
  padding: 8rpx 0 12rpx;
  overflow: hidden;
}

.day-hero {
  margin: 14rpx 8rpx 8rpx;
  padding: 30rpx 36rpx;
  display: flex;
  align-items: center;
  gap: 28rpx;
  background: var(--card);
  border: 1rpx solid var(--line);
  border-radius: 28rpx;
}

.hero-num {
  font-size: 88rpx;
  font-weight: 600;
  line-height: 1;
  letter-spacing: -2rpx;
}

.hero-info {
  display: flex;
  flex-direction: column;
}

.hero-week {
  font-size: 30rpx;
  font-weight: 500;
}

.hero-meta {
  margin-top: 6rpx;
  font-size: 23rpx;
  color: var(--text-3);
}

.agenda {
  padding: 26rpx 24rpx 0;
}

.agenda-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 0 8rpx 16rpx;
}

.agenda-title {
  font-size: 30rpx;
  font-weight: 600;
}

.agenda-sub {
  font-size: 23rpx;
  color: var(--text-3);
}

.agenda-card {
  overflow: hidden;
}

.agenda-empty {
  background: var(--card);
  overflow: hidden;
}
</style>
