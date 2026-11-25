<template>
  <view class="app-header">
    <view :style="{ height: statusBarHeight + 'px' }"></view>
    <view class="header-row">
      <view v-if="back" class="back-btn" @tap="onBack">
        <view class="chevron chevron-left back-chevron"></view>
      </view>
      <view class="header-titles">
        <text class="header-title">{{ title }}</text>
        <text v-if="subtitle" class="header-subtitle">{{ subtitle }}</text>
      </view>
      <view class="header-right">
        <slot name="right" />
      </view>
    </view>
    <view v-if="$slots.default" class="header-extra">
      <slot />
    </view>
  </view>
</template>

<script>
import { STATUS_BAR_HEIGHT } from '@/utils/system'
import { back, switchTab } from '@/utils/route'

export default {
  name: 'AppHeader',
  props: {
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    back: { type: Boolean, default: false },
  },
  data() {
    return { statusBarHeight: STATUS_BAR_HEIGHT }
  },
  methods: {
    onBack() {
      if (this.back) {
        back({ fail: () => switchTab({ url: '/pages/calendar/index' }).catch(() => {}) }).catch(() => {})
        return
      }
      switchTab({ url: '/pages/calendar/index' }).catch(() => {})
    },
  },
}
</script>

<style scoped>
.app-header {
  background: var(--bg);
}

/* #ifdef H5 */
.app-header {
  padding-top: env(safe-area-inset-top);
}
/* #endif */

.header-row {
  display: flex;
  align-items: center;
  min-height: 100rpx;
  padding: 8rpx 32rpx 4rpx;
}

.back-btn {
  width: 64rpx;
  height: 64rpx;
  margin-left: -16rpx;
  margin-right: 4rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-chevron {
  width: 20rpx;
  height: 20rpx;
  border-color: var(--text);
}

.header-titles {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.header-title {
  font-size: 44rpx;
  font-weight: 600;
  letter-spacing: 1rpx;
  color: var(--text);
  line-height: 1.25;
}

.header-subtitle {
  margin-top: 6rpx;
  font-size: 24rpx;
  color: var(--text-3);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.header-extra {
  padding: 8rpx 32rpx 0;
}
</style>
