<template>
  <view class="page" :class="{ 'theme-dark': store.theme === 'dark' }">
    <app-header title="归档箱" back>
      <template #right>
        <view v-if="archived.length" class="text-btn danger" @tap="onClear">清空</view>
      </template>
    </app-header>

    <view class="summary card">
      <view class="summary-body">
        <text class="summary-title">已完成 · 待归档 {{ doneCount }} 项</text>
        <text class="summary-desc">归档后的内容不计入待办与日历，可随时恢复</text>
      </view>
      <view v-if="doneCount" class="summary-btn" @tap="onArchiveAll">全部归档</view>
    </view>

    <view v-if="archived.length" class="list">
      <view class="card list-card">
        <view v-for="item in archived" :key="item.id" class="row">
          <view class="row-body">
            <text class="row-title">{{ item.title }}</text>
            <view class="row-meta">
              <text>{{ item.date ? humanDate(item.date) : '无日期' }}</text>
              <text v-if="item.completedAt">完成于 {{ formatStamp(item.completedAt) }}</text>
            </view>
          </view>
          <view class="row-actions">
            <view class="mini-btn" @tap="onRestore(item)">恢复</view>
            <view class="mini-btn danger" @tap="onDelete(item)">删除</view>
          </view>
        </view>
      </view>
    </view>

    <empty-state
      v-else
      text="归档箱是空的"
      hint="已完成的事项归档后会在这里集中存放"
    />
  </view>
</template>

<script>
import AppHeader from '@/components/app-header.vue'
import EmptyState from '@/components/empty-state.vue'
import { archiveCompleted, clearArchive, deleteItem, initStore, restoreItem, store } from '@/store'
import { archivedItems } from '@/store/selectors'
import { formatStamp, humanDate } from '@/utils/date'
import { confirmDialog, toast } from '@/utils/ui'

export default {
  components: { AppHeader, EmptyState },
  data() {
    return { store }
  },
  computed: {
    archived() {
      return archivedItems(store.items)
    },
    doneCount() {
      return store.items.filter((item) => !item.archivedAt && item.status === 'done').length
    },
  },
  onShow() {
    initStore()
  },
  methods: {
    humanDate,
    formatStamp,
    onArchiveAll() {
      const count = archiveCompleted()
      toast(count ? `已归档 ${count} 项` : '没有可归档的事项')
    },
    onRestore(item) {
      const result = restoreItem(item.id)
      toast(result.ok ? '已恢复到待办' : result.error)
    },
    async onDelete(item) {
      const confirmed = await confirmDialog('删除后不可恢复，确定删除该归档事项？', {
        title: '删除事项',
        confirmText: '删除',
        danger: true,
      })
      if (!confirmed) return
      const result = deleteItem(item.id)
      toast(result.ok ? '已删除' : result.error)
    },
    async onClear() {
      const confirmed = await confirmDialog(`将永久删除归档箱中的 ${this.archived.length} 项内容，无法恢复。`, {
        title: '清空归档箱',
        confirmText: '清空',
        danger: true,
      })
      if (!confirmed) return
      const count = clearArchive()
      toast(`已清空 ${count} 项`)
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

.text-btn.danger {
  color: var(--danger);
}

.summary {
  margin: 12rpx 32rpx 0;
  padding: 26rpx 24rpx;
  display: flex;
  align-items: center;
}

.summary-body {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.summary-title {
  font-size: 27rpx;
  font-weight: 500;
}

.summary-desc {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: var(--text-3);
}

.summary-btn {
  flex: none;
  margin-left: 16rpx;
  padding: 14rpx 24rpx;
  border-radius: 999rpx;
  background: var(--black);
  color: var(--on-primary);
  font-size: 23rpx;
}

.list {
  padding: 28rpx 32rpx 0;
}

.list-card {
  overflow: hidden;
}

.row {
  display: flex;
  align-items: center;
  padding: 24rpx;
  border-bottom: 1rpx solid var(--line);
}

.row:last-child {
  border-bottom: none;
}

.row-body {
  flex: 1;
  min-width: 0;
}

.row-title {
  display: block;
  font-size: 28rpx;
  color: var(--text-2);
  text-decoration: line-through;
}

.row-meta {
  margin-top: 8rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
  font-size: 22rpx;
  color: var(--text-3);
}

.row-actions {
  flex: none;
  display: flex;
  gap: 12rpx;
  margin-left: 16rpx;
}

.mini-btn {
  padding: 10rpx 20rpx;
  border-radius: 12rpx;
  background: var(--fill);
  font-size: 23rpx;
  color: var(--text-2);
}

.mini-btn.danger {
  background: var(--danger-bg);
  color: var(--danger);
}

.mini-btn:active {
  opacity: 0.7;
}
</style>
