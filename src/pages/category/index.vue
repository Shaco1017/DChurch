<template>
  <view class="page" :class="{ 'theme-dark': store.theme === 'dark' }">
    <app-header title="分类标签" back>
      <template #right>
        <view class="text-btn" @tap="openCreate">新建</view>
      </template>
    </app-header>

    <text class="intro">分类用于标记事项归属；删除分类不会删除事项，相关事项会变为未分类。</text>

    <view v-if="store.categories.length" class="list">
      <view class="card list-card">
        <view v-for="category in store.categories" :key="category.id" class="row" @tap="openEdit(category)">
          <view class="dot" :style="{ backgroundColor: category.color }"></view>
          <text class="name">{{ category.name }}</text>
          <text class="count">{{ counts[category.id] || 0 }} 项</text>
          <view class="chevron row-chevron"></view>
        </view>
      </view>
    </view>

    <empty-state
      v-else
      text="还没有分类"
      hint="创建分类，让日程与待办更有条理"
      action-label="新建分类"
      @action="openCreate"
    />

    <view class="sheet-root" :class="{ visible: sheetVisible }">
      <view class="mask" @tap="closeSheet" @touchmove.stop.prevent="noop"></view>
      <view class="panel">
        <view class="grabber"></view>
        <view class="panel-head">
          <text class="panel-title">{{ form.id ? '编辑分类' : '新建分类' }}</text>
          <view class="close-btn" @tap="closeSheet">
            <view class="close-line"></view>
          </view>
        </view>

        <view class="field">
          <text class="field-label">名称</text>
          <input
            v-model="form.name"
            class="field-input"
            maxlength="12"
            placeholder="例如：工作、健身"
            placeholder-class="field-placeholder"
            confirm-type="done"
          />
        </view>

        <view class="field">
          <text class="field-label">颜色</text>
          <view class="colors">
            <view
              v-for="color in colorOptions"
              :key="color"
              class="color"
              :class="{ selected: form.color === color }"
              :style="{ backgroundColor: color }"
              @tap="form.color = color"
            >
              <view v-if="form.color === color" class="color-tick"></view>
            </view>
          </view>
        </view>

        <view class="panel-foot">
          <view v-if="form.id" class="btn btn-danger foot-delete" @tap="onDelete">删除</view>
          <view class="btn btn-primary foot-save" @tap="onSave">保存</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import AppHeader from '@/components/app-header.vue'
import EmptyState from '@/components/empty-state.vue'
import { addCategory, initStore, removeCategory, store, updateCategory } from '@/store'
import { categoryCounts } from '@/store/selectors'
import { CATEGORY_COLORS } from '@/utils/constants'
import { confirmDialog, toast } from '@/utils/ui'

export default {
  components: { AppHeader, EmptyState },
  data() {
    return {
      store,
      colorOptions: CATEGORY_COLORS,
      sheetVisible: false,
      form: { id: null, name: '', color: CATEGORY_COLORS[0] },
    }
  },
  computed: {
    counts() {
      return categoryCounts(store.items)
    },
  },
  onShow() {
    initStore()
  },
  methods: {
    noop() {},
    openCreate() {
      this.form = { id: null, name: '', color: CATEGORY_COLORS[0] }
      this.sheetVisible = true
    },
    openEdit(category) {
      this.form = { id: category.id, name: category.name, color: category.color }
      this.sheetVisible = true
    },
    closeSheet() {
      this.sheetVisible = false
    },
    onSave() {
      const payload = { name: this.form.name, color: this.form.color }
      const result = this.form.id ? updateCategory(this.form.id, payload) : addCategory(payload)
      if (!result.ok) {
        toast(result.error)
        return
      }
      toast('已保存')
      this.closeSheet()
    },
    async onDelete() {
      const summary = this.counts[this.form.id] || 0
      const message = summary
        ? `删除后，该分类下的 ${summary} 项事项会变为未分类，事项本身不会被删除。`
        : '删除后该分类将不可恢复。'
      const confirmed = await confirmDialog(message, {
        title: '删除分类',
        confirmText: '删除',
        danger: true,
      })
      if (!confirmed) return
      const result = removeCategory(this.form.id)
      if (!result.ok) {
        toast(result.error)
        return
      }
      toast('已删除')
      this.closeSheet()
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

.text-btn:active {
  opacity: 0.6;
}

.intro {
  display: block;
  padding: 12rpx 40rpx 24rpx;
  font-size: 23rpx;
  line-height: 1.6;
  color: var(--text-3);
}

.list {
  padding: 0 32rpx;
}

.list-card {
  overflow: hidden;
}

.row {
  display: flex;
  align-items: center;
  min-height: 100rpx;
  padding: 0 26rpx;
  border-bottom: 1rpx solid var(--line);
}

.row:last-child {
  border-bottom: none;
}

.row:active {
  background: var(--fill-2);
}

.dot {
  width: 18rpx;
  height: 18rpx;
  border-radius: 9rpx;
  margin-right: 20rpx;
}

.name {
  flex: 1;
  font-size: 29rpx;
}

.count {
  font-size: 23rpx;
  color: var(--text-3);
  margin-right: 12rpx;
}

.row-chevron {
  width: 14rpx;
  height: 14rpx;
  border-color: var(--text-3);
}

.sheet-root {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 999;
  pointer-events: none;
}

.mask {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background: var(--scrim);
  opacity: 0;
  transition: opacity 0.22s ease;
}

.panel {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  max-width: 560px;
  margin: 0 auto;
  background: var(--card);
  border-radius: 32rpx 32rpx 0 0;
  transform: translateY(105%);
  transition: transform 0.28s cubic-bezier(0.32, 0.72, 0, 1);
  padding: 0 32rpx calc(24rpx + env(safe-area-inset-bottom));
  box-shadow: var(--sheet-shadow);
}

.sheet-root.visible {
  pointer-events: auto;
}

.sheet-root.visible .mask {
  opacity: 1;
}

.sheet-root.visible .panel {
  transform: translateY(0);
}

.grabber {
  width: 68rpx;
  height: 8rpx;
  border-radius: 4rpx;
  background: var(--dash);
  margin: 16rpx auto 0;
}

.panel-head {
  display: flex;
  align-items: center;
  padding: 20rpx 0 12rpx;
}

.panel-title {
  flex: 1;
  font-size: 34rpx;
  font-weight: 600;
}

.close-btn {
  width: 60rpx;
  height: 60rpx;
  border-radius: 30rpx;
  background: var(--fill);
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-line {
  position: relative;
  width: 22rpx;
  height: 2rpx;
  background: var(--text-2);
  transform: rotate(45deg);
}

.close-line::after {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  width: 22rpx;
  height: 2rpx;
  background: var(--text-2);
  transform: rotate(90deg);
}

.field {
  margin-top: 22rpx;
}

.field-label {
  display: block;
  margin-bottom: 14rpx;
  font-size: 23rpx;
  color: var(--text-3);
}

.field-input {
  width: 100%;
  height: 88rpx;
  padding: 0 24rpx;
  background: var(--fill);
  border-radius: 18rpx;
  font-size: 28rpx;
}

.field-placeholder {
  color: var(--text-3);
}

.colors {
  display: flex;
  flex-wrap: wrap;
  gap: 22rpx;
}

.color {
  width: 66rpx;
  height: 66rpx;
  border-radius: 33rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.color.selected {
  box-shadow: 0 0 0 4rpx var(--card), 0 0 0 7rpx var(--black);
}

.color-tick {
  width: 18rpx;
  height: 9rpx;
  border-left: 3rpx solid var(--on-color);
  border-bottom: 3rpx solid var(--on-color);
  transform: rotate(-45deg) translate(1rpx, -2rpx);
}

.panel-foot {
  display: flex;
  gap: 16rpx;
  padding-top: 32rpx;
}

.foot-delete {
  width: 170rpx;
  flex: none;
}

.foot-save {
  flex: 1;
}
</style>
