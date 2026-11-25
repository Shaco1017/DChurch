<template>
  <view class="page" :class="{ 'theme-dark': store.theme === 'dark' }">
    <app-header title="我的" subtitle="纯本地运行 · 数据不上传" />

    <view v-if="store.storageError" class="alert">{{ store.storageError }}</view>

    <view class="stats card">
      <view class="stat">
        <text class="stat-num">{{ stats.pending }}</text>
        <text class="stat-label">待完成</text>
      </view>
      <view class="stat">
        <text class="stat-num">{{ stats.doing }}</text>
        <text class="stat-label">进行中</text>
      </view>
      <view class="stat">
        <text class="stat-num">{{ stats.weekDone }}</text>
        <text class="stat-label">本周完成</text>
      </view>
      <view class="stat">
        <text class="stat-num">{{ stats.archived }}</text>
        <text class="stat-label">已归档</text>
      </view>
    </view>

    <view class="section">
      <text class="section-label">管理</text>
      <view class="card list-card">
        <view class="row" @tap="goCategory">
          <text class="row-label">分类标签</text>
          <text class="row-value">{{ store.categories.length }} 个</text>
          <view class="chevron row-chevron"></view>
        </view>
        <view class="row" @tap="goRules">
          <text class="row-label">重复规则</text>
          <text class="row-value">{{ store.rules.length }} 条</text>
          <view class="chevron row-chevron"></view>
        </view>
        <view class="row" @tap="goArchive">
          <text class="row-label">归档箱</text>
          <text class="row-value">{{ stats.archived }} 项</text>
          <view class="chevron row-chevron"></view>
        </view>
        <view class="row" @tap="goBackup">
          <text class="row-label">数据备份</text>
          <text class="row-value">JSON / XML</text>
          <view class="chevron row-chevron"></view>
        </view>
      </view>
    </view>

    <view class="section">
      <text class="section-label">偏好</text>
      <view class="card list-card">
        <picker :range="themeLabels" :value="themeIndex" @change="onThemeChange">
          <view class="row">
            <view class="row-text">
              <text class="row-label">外观主题</text>
              <text class="row-desc">切换后立即生效，可跟随系统</text>
            </view>
            <text class="row-value">{{ themeLabels[themeIndex] }}</text>
            <view class="chevron row-chevron"></view>
          </view>
        </picker>
        <picker :range="weekStartLabels" :value="weekStartIndex" @change="onWeekStartChange">
          <view class="row">
            <text class="row-label">每周起始日</text>
            <text class="row-value">{{ weekStartLabels[weekStartIndex] }}</text>
            <view class="chevron row-chevron"></view>
          </view>
        </picker>
        <picker :range="viewLabels" :value="viewIndex" @change="onViewChange">
          <view class="row">
            <text class="row-label">默认日程视图</text>
            <text class="row-value">{{ viewLabels[viewIndex] }}</text>
            <view class="chevron row-chevron"></view>
          </view>
        </picker>
        <picker :range="reminderLabels" :value="reminderIndex" @change="onReminderChange">
          <view class="row">
            <text class="row-label">默认提醒</text>
            <text class="row-value">{{ reminderLabels[reminderIndex] }}</text>
            <view class="chevron row-chevron"></view>
          </view>
        </picker>
        <view class="row">
          <view class="row-text">
            <text class="row-label">事项提醒</text>
            <text class="row-desc">应用运行期间到点提醒</text>
          </view>
          <switch :checked="store.settings.remindersEnabled" :color="store.theme === 'dark' ? '#c6cfc2' : '#17181a'" class="row-switch" @change="onReminderToggle" />
        </view>
        <picker :range="archiveLabels" :value="archiveIndex" @change="onArchiveChange">
          <view class="row">
            <view class="row-text">
              <text class="row-label">自动归档</text>
              <text class="row-desc">已完成事项到期后移入归档箱</text>
            </view>
            <text class="row-value">{{ archiveLabels[archiveIndex] }}</text>
            <view class="chevron row-chevron"></view>
          </view>
        </picker>
      </view>
    </view>

    <view class="section">
      <text class="section-label">数据</text>
      <view class="card list-card">
        <view class="row">
          <text class="row-label">本地占用</text>
          <text class="row-value">{{ storageText }}</text>
        </view>
        <view class="row">
          <text class="row-label">数据存储</text>
          <text class="row-value">仅本机</text>
        </view>
        <view class="row">
          <text class="row-label">版本</text>
          <text class="row-value">{{ version }}</text>
        </view>
      </view>
      <text class="foot-note">
        所有日程与待办仅保存在当前设备，不经过任何服务器。卸载应用或清除应用数据前，请先导出备份。
      </text>
    </view>

    <view class="section">
      <view class="card danger-row" @tap="onReset">
        <text class="danger-text">清空全部数据</text>
      </view>
    </view>
  </view>
</template>

<script>
import AppHeader from '@/components/app-header.vue'
import { initStore, resetAll, store, updateSettings } from '@/store'
import { overviewStats } from '@/store/selectors'
import { storageUsage } from '@/services/storage'
import { ensureNotificationPermission } from '@/services/reminder'
import { setThemeMode } from '@/services/theme'
import {
  APP_VERSION,
  AUTO_ARCHIVE_OPTIONS,
  REMINDER_OPTIONS,
  THEME_OPTIONS,
  VIEWS,
  WEEK_START_OPTIONS,
} from '@/utils/constants'
import { confirmDialog, toast } from '@/utils/ui'

export default {
  components: { AppHeader },
  data() {
    return {
      store,
      version: APP_VERSION,
      themeOptions: THEME_OPTIONS,
      weekStartOptions: WEEK_START_OPTIONS,
      viewOptions: VIEWS,
      reminderOptions: REMINDER_OPTIONS,
      archiveOptions: AUTO_ARCHIVE_OPTIONS,
      storage: { currentSize: 0, limitSize: 0 },
    }
  },
  computed: {
    stats() {
      return overviewStats(store.items, store.settings)
    },
    weekStartLabels() {
      return this.weekStartOptions.map((option) => option.label)
    },
    themeLabels() {
      return this.themeOptions.map((option) => option.label)
    },
    themeIndex() {
      const index = this.themeOptions.findIndex((option) => option.value === store.settings.theme)
      return index === -1 ? 0 : index
    },
    weekStartIndex() {
      const index = this.weekStartOptions.findIndex((option) => option.value === store.settings.weekStart)
      return index === -1 ? 0 : index
    },
    viewLabels() {
      return this.viewOptions.map((option) => `${option.label}视图`)
    },
    viewIndex() {
      const index = this.viewOptions.findIndex((option) => option.value === store.settings.defaultView)
      return index === -1 ? 2 : index
    },
    reminderLabels() {
      return this.reminderOptions.map((option) => option.label)
    },
    reminderIndex() {
      const index = this.reminderOptions.findIndex((option) => option.value === store.settings.defaultReminder)
      return index === -1 ? 0 : index
    },
    archiveLabels() {
      return this.archiveOptions.map((option) => option.label)
    },
    archiveIndex() {
      const index = this.archiveOptions.findIndex((option) => option.value === store.settings.autoArchiveDays)
      return index === -1 ? 0 : index
    },
    storageText() {
      const size = this.storage.currentSize || 0
      if (size >= 1024) return `${(size / 1024).toFixed(1)} MB`
      return `${size} KB`
    },
  },
  onShow() {
    initStore()
    this.refreshStorage()
  },
  methods: {
    refreshStorage() {
      this.storage = storageUsage()
    },
    goCategory() {
      this.$utils.route.go('/pages/category/index')
    },
    goRules() {
      this.$utils.route.go('/pages/rules/index')
    },
    goArchive() {
      this.$utils.route.go('/pages/archive/index')
    },
    goBackup() {
      this.$utils.route.go('/pages/backup/index')
    },
    onThemeChange(event) {
      const option = this.themeOptions[Number(event.detail.value)]
      if (!option) return
      setThemeMode(option.value)
      updateSettings({ theme: option.value })
    },
    onWeekStartChange(event) {
      const option = this.weekStartOptions[Number(event.detail.value)]
      if (option) updateSettings({ weekStart: option.value })
    },
    onViewChange(event) {
      const option = this.viewOptions[Number(event.detail.value)]
      if (option) updateSettings({ defaultView: option.value })
    },
    onReminderChange(event) {
      const option = this.reminderOptions[Number(event.detail.value)]
      if (!option) return
      updateSettings({ defaultReminder: option.value })
      if (option.value !== null) ensureNotificationPermission()
    },
    onReminderToggle(event) {
      const enabled = !!event.detail.value
      updateSettings({ remindersEnabled: enabled })
      if (enabled) ensureNotificationPermission()
    },
    onArchiveChange(event) {
      const option = this.archiveOptions[Number(event.detail.value)]
      if (!option) return
      updateSettings({ autoArchiveDays: option.value })
      if (option.value > 0) toast(`已完成 ${option.value} 天后的自动归档已启用`)
    },
    async onReset() {
      const first = await confirmDialog('将删除本机全部日程、待办与分类，且无法恢复。建议先导出备份。', {
        title: '清空全部数据',
        confirmText: '继续',
        danger: true,
      })
      if (!first) return
      const second = await confirmDialog('再次确认：清空后无法找回任何数据。', {
        title: '最终确认',
        confirmText: '清空',
        danger: true,
      })
      if (!second) return
      resetAll()
      this.refreshStorage()
      toast('数据已清空')
    },
  },
}
</script>

<style scoped>
.alert {
  margin: 8rpx 32rpx 0;
  padding: 20rpx 24rpx;
  border-radius: 16rpx;
  background: var(--danger-bg);
  color: var(--danger);
  font-size: 24rpx;
}

.stats {
  margin: 16rpx 32rpx 0;
  padding: 30rpx 8rpx;
  display: flex;
}

.stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  border-right: 1rpx solid var(--line);
}

.stat:last-child {
  border-right: none;
}

.stat-num {
  font-size: 40rpx;
  font-weight: 600;
  line-height: 1.1;
}

.stat-label {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: var(--text-3);
}

.section {
  margin-top: 34rpx;
  padding: 0 32rpx;
}

.list-card {
  overflow: hidden;
}

.row {
  display: flex;
  align-items: center;
  min-height: 96rpx;
  padding: 0 24rpx;
  border-bottom: 1rpx solid var(--line);
}

.list-card .row:last-child,
.list-card picker:last-child .row {
  border-bottom: none;
}

.row:active {
  background: var(--fill-2);
}

.row-text {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.row-label {
  flex: 1;
  font-size: 28rpx;
  color: var(--text);
}

.row-text .row-label {
  flex: none;
}

.row-desc {
  margin-top: 2rpx;
  font-size: 22rpx;
  color: var(--text-3);
}

.row-value {
  font-size: 25rpx;
  color: var(--text-3);
  margin-right: 12rpx;
}

.row-chevron {
  width: 14rpx;
  height: 14rpx;
  border-color: var(--text-3);
}

.row-switch {
  transform: scale(0.8);
  margin-right: -10rpx;
}

.foot-note {
  display: block;
  padding: 18rpx 10rpx 0;
  font-size: 22rpx;
  line-height: 1.6;
  color: var(--text-3);
}

.danger-row {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 96rpx;
}

.danger-text {
  font-size: 28rpx;
  color: var(--danger);
}
</style>
