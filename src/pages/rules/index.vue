<template>
  <view class="page" :class="{ 'theme-dark': store.theme === 'dark' }">
    <app-header title="重复规则" back>
      <template #right>
        <view class="text-btn" @tap="openEditor(null)">新建</view>
      </template>
    </app-header>

    <text class="intro">
      规则保存后会在指定起止日期内一次性生成所有可预期的日程实例。
      修改重复方式会重新生成实例；仅修改标题/时间/分类会批量更新未完成实例。
    </text>

    <view v-if="store.rules.length" class="list">
      <view class="card list-card">
        <view v-for="rule in store.rules" :key="rule.id" class="row" @tap="openEditor(rule)">
          <view class="row-main">
            <text class="title">{{ rule.title }}</text>
            <text class="desc">{{ describeRule(rule) }}</text>
            <text class="range">{{ rule.startDate }} 至 {{ rule.endDate }}</text>
          </view>
          <view class="row-right">
            <view class="count-chip">{{ stats[rule.id]?.total || 0 }}</view>
            <view class="chevron row-chevron"></view>
          </view>
        </view>
      </view>
    </view>

    <empty-state
      v-else
      text="还没有重复规则"
      hint="创建一条规则，自动批量生成未来的日程"
      action-label="新建规则"
      @action="openEditor(null)"
    />

    <view style="height: 40rpx;"></view>
  </view>
</template>

<script>
import AppHeader from '@/components/app-header.vue'
import EmptyState from '@/components/empty-state.vue'
import { initStore, ruleStats, store } from '@/store'
import { describeRule } from '@/services/rule-generator'

export default {
  components: { AppHeader, EmptyState },
  data() {
    return { store }
  },
  computed: {
    stats() {
      const map = {}
      store.rules.forEach((r) => { map[r.id] = ruleStats(r.id) })
      return map
    },
  },
  onShow() {
    initStore()
  },
  methods: {
    openEditor(rule) {
      const url = rule ? `/pages/rules/editor?id=${rule.id}` : '/pages/rules/editor'
      this.$utils.route.go(url)
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
  padding: 24rpx 26rpx;
  border-bottom: 1rpx solid var(--line);
}

.row:last-child {
  border-bottom: none;
}

.row:active {
  background: var(--fill-2);
}

.row-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.title {
  font-size: 30rpx;
  font-weight: 500;
  color: var(--text);
}

.desc {
  font-size: 24rpx;
  color: var(--text-2);
}

.range {
  font-size: 22rpx;
  color: var(--text-3);
}

.row-right {
  display: flex;
  align-items: center;
  gap: 14rpx;
}

.count-chip {
  min-width: 60rpx;
  height: 40rpx;
  padding: 0 14rpx;
  border-radius: 20rpx;
  background: var(--fill);
  color: var(--text-2);
  font-size: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.row-chevron {
  width: 14rpx;
  height: 14rpx;
  border-color: var(--text-3);
}
</style>
