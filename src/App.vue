<script>
import { initStore } from '@/store'
import { repository } from '@/services/repository'
import { startReminderService } from '@/services/reminder'
import { applyTheme, startThemeWatcher } from '@/services/theme'

export default {
  onLaunch() {
    initStore()
    applyTheme()
    startThemeWatcher()
    startReminderService()
  },
  onShow() {
    initStore()
    applyTheme()
    startReminderService()
  },
  onHide() {
    // 切到后台前立即落盘，避免丢数据
    repository.flush()
  },
}
</script>

<style>
/* ---------- 设计令牌：浅色 ---------- */
page {
  --bg: #f4f4f1;
  --bg-deep: #e8e8e3;
  --card: #ffffff;
  --card-2: #fbfbf8;
  --text: #17181a;
  --text-2: #6e7178;
  --text-3: #a3a6ac;
  --line: #ebebe7;
  --fill: #f1f1ed;
  --fill-2: #fafaf7;
  --fill-3: #e9e9e4;
  --primary: #17181a;
  --on-primary: #ffffff;
  --black: var(--primary);
  --on-color: #ffffff;
  --field: #ffffff;
  --track: #e9e9e4;
  --pill: #ffffff;
  --dash: #d6d6d0;
  --check: #d4d6d9;
  --scrim: rgba(23, 24, 26, 0.34);
  --sheet-shadow: 0 -8rpx 48rpx rgba(23, 24, 26, 0.12);
  --shadow-soft: rgba(23, 24, 26, 0.06);
  --accent: #7f9180;
  --accent-soft: #e8ece5;
  --danger: #d24a3b;
  --danger-bg: #fdf0ee;
  --info-bg: #eef1ff;
  --green: #3c9a6b;
  --amber: #d79a34;
  --blue: #4b6bfb;
  --shadow: rgba(23, 24, 26, 0.22);

  background-color: var(--bg);
  color: var(--text);
  font-size: 28rpx;
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', 'PingFang SC', 'Hiragino Sans GB',
    'Microsoft YaHei', sans-serif;
  -webkit-font-smoothing: antialiased;
  line-height: 1.45;
}

/* ---------- 设计令牌：深色 ---------- */
.theme-dark {
  --bg: #121415;
  --bg-deep: #0d0f10;
  --card: #1b1e20;
  --card-2: #202426;
  --text: #e7e7e2;
  --text-2: #9ca39e;
  --text-3: #6c7370;
  --line: #2a2e30;
  --fill: #232729;
  --fill-2: #202426;
  --fill-3: #272c2e;
  --primary: #dce1d7;
  --on-primary: #141618;
  --black: var(--primary);
  --on-color: #ffffff;
  --field: #262a2c;
  --track: #17191b;
  --pill: #2b3033;
  --dash: #343a3c;
  --check: #4a5052;
  --scrim: rgba(0, 0, 0, 0.55);
  --sheet-shadow: 0 -8rpx 48rpx rgba(0, 0, 0, 0.55);
  --shadow-soft: rgba(0, 0, 0, 0.4);
  --accent: #c6cfc2;
  --accent-soft: #27302a;
  --danger: #e0766a;
  --danger-bg: #2b1d1b;
  --info-bg: #1e2426;
  --green: #6fb891;
  --amber: #d9a95e;
  --blue: #8a9cf0;
  --shadow: rgba(0, 0, 0, 0.5);
}

view,
text,
scroll-view,
input,
textarea,
picker {
  box-sizing: border-box;
}

button {
  margin: 0;
  padding: 0;
  background: transparent;
  border-radius: 0;
  font-size: inherit;
  line-height: inherit;
  color: inherit;
}

button::after {
  border: none;
}

input,
textarea {
  color: var(--text);
}

.page {
  min-height: 100vh;
  padding-bottom: calc(48rpx + env(safe-area-inset-bottom));
  color: var(--text);
  transition: background-color 0.24s ease, color 0.24s ease;
}

.page.theme-dark {
  background-color: var(--bg);
}

.container {
  padding-left: 32rpx;
  padding-right: 32rpx;
}

.card {
  background: var(--card);
  border: 1rpx solid var(--line);
  border-radius: 28rpx;
  transition: background-color 0.24s ease, border-color 0.24s ease;
}

.section-label {
  padding: 0 8rpx 16rpx;
  font-size: 24rpx;
  color: var(--text-3);
  letter-spacing: 1rpx;
}

.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  padding: 0 32rpx;
  border-radius: 22rpx;
  font-size: 30rpx;
  font-weight: 500;
  transition: background-color 0.24s ease, color 0.24s ease, border-color 0.24s ease, opacity 0.16s ease;
}

.btn-primary {
  background: var(--primary);
  color: var(--on-primary);
}

.btn-ghost {
  background: var(--card);
  border: 1rpx solid var(--line);
  color: var(--text);
}

.btn-danger {
  background: var(--danger-bg);
  color: var(--danger);
}

.btn:active {
  opacity: 0.82;
}

.chevron {
  width: 16rpx;
  height: 16rpx;
  border-top: 3rpx solid var(--text-3);
  border-right: 3rpx solid var(--text-3);
  transform: rotate(45deg);
}

.chevron-left {
  transform: rotate(-135deg);
}

.chevron-down {
  transform: rotate(135deg);
}

.text-2 {
  color: var(--text-2);
}

.text-3 {
  color: var(--text-3);
}

.fab {
  position: fixed;
  right: 44rpx;
  bottom: calc(56rpx + env(safe-area-inset-bottom));
  width: 112rpx;
  height: 112rpx;
  border-radius: 56rpx;
  background: var(--primary);
  box-shadow: 0 16rpx 36rpx var(--shadow);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  transition: transform 0.15s ease, background-color 0.24s ease;
}

.fab:active {
  transform: scale(0.94);
}

.fab-plus {
  position: relative;
  width: 38rpx;
  height: 4rpx;
  background: var(--on-primary);
  border-radius: 2rpx;
}

.fab-plus::after {
  content: '';
  position: absolute;
  left: 17rpx;
  top: -17rpx;
  width: 4rpx;
  height: 38rpx;
  background: var(--on-primary);
  border-radius: 2rpx;
}

/* #ifdef H5 */
.fab {
  bottom: calc(66px + env(safe-area-inset-bottom));
}

@media screen and (min-width: 561px) {
  /* 桌面端固定按 560px 设计宽度换算 rpx，避免随视口放大 */
  html {
    font-size: 23.8933px !important;
  }

  body {
    background: #e8e8e3;
    transition: background-color 0.24s ease;
  }

  uni-page-body {
    width: 100%;
    max-width: 560px;
    margin: 0 auto;
    min-height: 100vh;
    background: var(--bg);
    box-shadow: 0 0 48px rgba(0, 0, 0, 0.08);
  }

  uni-tabbar.uni-tabbar-bottom,
  uni-tabbar.uni-tabbar-bottom .uni-tabbar {
    max-width: 560px;
    left: 0;
    right: 0;
    margin: 0 auto;
  }

  .fab {
    right: calc(50vw - 260px);
  }
}

html[data-theme='dark'] body {
  background: #0d0f10;
}

html[data-theme='dark'] uni-page-body {
  background: #121415;
  box-shadow: 0 0 48px rgba(0, 0, 0, 0.45);
}

/* H5 原生 tabBar 的背景由运行时内联样式固定，这里补一层主题覆盖 */
html[data-theme='dark'] uni-tabbar.uni-tabbar-bottom .uni-tabbar {
  background-color: #1b1e20 !important;
}

html[data-theme='dark'] uni-tabbar.uni-tabbar-bottom .uni-tabbar-border {
  background-color: #2a2e30 !important;
}
/* #endif */
</style>
