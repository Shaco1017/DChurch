<template>
  <view class="empty">
    <view class="empty-mark">
      <view class="empty-line"></view>
    </view>
    <text class="empty-text">{{ text }}</text>
    <text v-if="hint" class="empty-hint">{{ hint }}</text>
    <view v-if="actionLabel" class="empty-action" @tap="$emit('action')">
      <text>{{ actionLabel }}</text>
    </view>
  </view>
</template>

<script>
export default {
  name: 'EmptyState',
  props: {
    text: { type: String, default: '暂无内容' },
    hint: { type: String, default: '' },
    actionLabel: { type: String, default: '' },
  },
  emits: ['action'],
}
</script>

<style scoped>
.empty {
  padding: 96rpx 48rpx 80rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.empty-mark {
  width: 104rpx;
  height: 104rpx;
  border-radius: 32rpx;
  border: 2rpx dashed var(--dash);
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-line {
  width: 36rpx;
  height: 4rpx;
  border-radius: 2rpx;
  background: var(--dash);
}

.empty-text {
  margin-top: 28rpx;
  font-size: 28rpx;
  color: var(--text-2);
}

.empty-hint {
  margin-top: 10rpx;
  font-size: 24rpx;
  color: var(--text-3);
  text-align: center;
}

.empty-action {
  margin-top: 32rpx;
  padding: 16rpx 40rpx;
  border-radius: 999rpx;
  border: 1rpx solid var(--line);
  background: var(--card);
  font-size: 26rpx;
  color: var(--text);
}

.empty-action:active {
  opacity: 0.7;
}
</style>
