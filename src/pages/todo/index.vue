<template>
  <view class="page" :class="{ 'theme-dark': store.theme === 'dark' }">
    <app-header title="待办" subtitle="按状态与分类梳理今天要做的事">
      <template #right>
        <text class="open-count">{{ openCount }} 项待完成</text>
      </template>
    </app-header>

    <view class="filters">
      <scroll-view scroll-x class="filter-scroll" :show-scrollbar="false">
        <view class="filter-row">
          <view
            v-for="tab in statusTabs"
            :key="tab.value"
            class="filter-chip"
            :class="{ active: filter === tab.value }"
            @tap="setFilter(tab.value)"
          >
            <text>{{ tab.label }}</text>
            <text class="chip-count">{{ tab.count }}</text>
          </view>
        </view>
      </scroll-view>

      <scroll-view scroll-x class="filter-scroll" :show-scrollbar="false">
        <view class="filter-row category-row">
          <view class="cat-chip" :class="{ active: !categoryId }" @tap="categoryId = null">全部分类</view>
          <view
            v-for="category in store.categories"
            :key="category.id"
            class="cat-chip"
            :class="{ active: categoryId === category.id }"
            @tap="categoryId = category.id"
          >
            <view class="cat-dot" :style="{ backgroundColor: category.color }"></view>
            <text>{{ category.name }}</text>
            <text v-if="catCounts[category.id]" class="chip-count">{{ catCounts[category.id] }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <view class="groups">
      <view v-for="group in groups" :key="group.key" class="group">
        <view class="group-head">
          <text class="group-label" :class="{ danger: group.key === 'overdue' }">{{ group.label }}</text>
          <text class="group-count">{{ group.items.length }}</text>
        </view>
        <view class="group-card card">
          <task-row
            v-for="item in group.items"
            :key="item.id"
            :item="item"
            :category="categoryOf(item)"
            :show-date="group.key !== 'today'"
            @open="openItem"
            @toggle="onToggle"
            @longpress="onLongpress"
          />
        </view>
      </view>

      <view v-if="!groups.length" class="empty-card card">
        <empty-state
          :text="emptyText"
          :hint="emptyHint"
          :action-label="emptyAction"
          @action="onEmptyAction"
        />
      </view>

      <text v-if="groups.length" class="list-hint">长按事项可快速切换状态、归档或删除</text>
    </view>

    <view class="fab" @tap="createItem">
      <view class="fab-plus"></view>
    </view>

    <task-sheet
      :visible="sheetVisible"
      :item="editing"
      :default-date="null"
      @close="closeSheet"
      @saved="closeSheet"
      @changed="closeSheet"
    />
  </view>
</template>

<script>
import AppHeader from '@/components/app-header.vue'
import TaskRow from '@/components/task-row.vue'
import TaskSheet from '@/components/task-sheet.vue'
import EmptyState from '@/components/empty-state.vue'
import { initStore, store, toggleDone, setStatus, archiveItem, deleteItem } from '@/store'
import {
  activeItems,
  buildTodoGroups,
  categoryCounts,
  categoryIndex,
  statusCounts,
} from '@/store/selectors'
import { confirmDialog, toast } from '@/utils/ui'

export default {
  components: { AppHeader, TaskRow, TaskSheet, EmptyState },
  data() {
    return {
      store,
      filter: 'all',
      categoryId: null,
      sheetVisible: false,
      editing: null,
    }
  },
  computed: {
    counts() {
      return statusCounts(store.items)
    },
    openCount() {
      return this.counts.pending + this.counts.doing
    },
    statusTabs() {
      return [
        { value: 'all', label: '全部', count: this.counts.all },
        { value: 'pending', label: '待完成', count: this.counts.pending },
        { value: 'doing', label: '进行中', count: this.counts.doing },
        { value: 'done', label: '已完成', count: this.counts.done },
      ]
    },
    catCounts() {
      return categoryCounts(store.items)
    },
    categoryMap() {
      return categoryIndex(store.categories)
    },
    groups() {
      return buildTodoGroups(store.items, {
        status: this.filter,
        categoryId: this.categoryId,
        now: new Date(),
      })
    },
    hasAnyActive() {
      return activeItems(store.items).length > 0
    },
    emptyText() {
      if (!this.hasAnyActive) return '还没有待办事项'
      return '没有符合条件的事项'
    },
    emptyHint() {
      if (!this.hasAnyActive) return '记录下一件要做的事，稍后处理'
      return '试试切换状态或分类筛选'
    },
    emptyAction() {
      if (!this.hasAnyActive) return '新建待办'
      return '清除筛选'
    },
  },
  onShow() {
    initStore()
    if (this.categoryId && !store.categories.some((category) => category.id === this.categoryId)) {
      this.categoryId = null
    }
  },
  methods: {
    setFilter(value) {
      this.filter = value
    },
    onEmptyAction() {
      if (!this.hasAnyActive) {
        this.createItem()
        return
      }
      this.filter = 'all'
      this.categoryId = null
    },
    categoryOf(item) {
      return item.categoryId ? this.categoryMap[item.categoryId] || null : null
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
    onToggle(item) {
      const result = toggleDone(item.id)
      if (!result.ok) toast(result.error)
    },
    onLongpress(item) {
      const isDone = item.status === 'done'
      const actions = []
      if (!isDone) {
        if (item.status !== 'doing') actions.push({ label: '标记为进行中', type: 'doing' })
        if (item.status !== 'pending') actions.push({ label: '标记为待完成', type: 'pending' })
        actions.push({ label: '标记为已完成', type: 'done' })
      } else {
        actions.push({ label: '重新打开', type: 'reopen' })
        actions.push({ label: '归档', type: 'archive' })
      }
      actions.push({ label: '删除', type: 'delete' })

      uni.showActionSheet({
        itemList: actions.map((action) => action.label),
        success: ({ tapIndex }) => {
          const action = actions[tapIndex]
          if (!action) return
          this.runAction(item, action.type)
        },
      })
    },
    async runAction(item, type) {
      if (type === 'archive') {
        const result = archiveItem(item.id)
        toast(result.ok ? '已归档' : result.error)
        return
      }
      if (type === 'delete') {
        const confirmed = await confirmDialog('删除后不可恢复，确定删除该事项？', {
          title: '删除事项',
          confirmText: '删除',
          danger: true,
        })
        if (!confirmed) return
        const result = deleteItem(item.id)
        toast(result.ok ? '已删除' : result.error)
        return
      }
      const status = type === 'reopen' ? 'pending' : type
      const result = setStatus(item.id, status)
      if (!result.ok) toast(result.error)
    },
  },
}
</script>

<style scoped>
.open-count {
  font-size: 23rpx;
  color: var(--text-3);
}

.filters {
  padding: 10rpx 0 4rpx;
}

.filter-scroll {
  width: 100%;
  white-space: nowrap;
}

.filter-row {
  display: inline-flex;
  gap: 14rpx;
  padding: 8rpx 32rpx;
}

.category-row {
  padding-top: 4rpx;
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  height: 64rpx;
  padding: 0 26rpx;
  border-radius: 999rpx;
  background: var(--field);
  border: 1rpx solid var(--line);
  font-size: 26rpx;
  color: var(--text-2);
}

.filter-chip.active {
  background: var(--black);
  border-color: var(--black);
  color: var(--on-primary);
}

.chip-count {
  font-size: 22rpx;
  color: var(--text-3);
}

.filter-chip.active .chip-count {
  color: var(--on-primary);
  opacity: 0.62;
}

.cat-chip {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  height: 56rpx;
  padding: 0 22rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  color: var(--text-3);
  border: 1rpx solid transparent;
}

.cat-chip.active {
  color: var(--text);
  border-color: var(--line);
  background: var(--card);
}

.cat-dot {
  width: 10rpx;
  height: 10rpx;
  border-radius: 5rpx;
}

.groups {
  padding: 8rpx 24rpx 0;
}

.group {
  margin-top: 22rpx;
}

.group-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10rpx 12rpx;
}

.group-label {
  font-size: 25rpx;
  font-weight: 500;
  color: var(--text-2);
}

.group-label.danger {
  color: var(--danger);
}

.group-count {
  font-size: 22rpx;
  color: var(--text-3);
}

.group-card {
  overflow: hidden;
}

.empty-card {
  margin-top: 24rpx;
  overflow: hidden;
}

.list-hint {
  display: block;
  padding: 32rpx 0 8rpx;
  text-align: center;
  font-size: 22rpx;
  color: var(--text-3);
}
</style>
