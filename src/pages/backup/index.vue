<template>
  <view class="page" :class="{ 'theme-dark': store.theme === 'dark' }">
    <app-header title="数据备份" back subtitle="JSON / XML 备份与迁移" />

    <view class="intro card">
      <view class="intro-tag">本地</view>
      <view class="intro-body">
        <text class="intro-title">数据只在这台设备上</text>
        <text class="intro-desc">导出的文件可自行保管，用于换机迁移或恢复；导入前会先做校验。</text>
      </view>
    </view>

    <view class="section">
      <view class="section-head">
        <text class="section-title">导出备份</text>
        <view class="format-switch">
          <view
            v-for="option in formatOptions"
            :key="option.value"
            class="format-item"
            :class="{ active: format === option.value }"
            @tap="format = option.value"
          >
            {{ option.label }}
          </view>
        </view>
      </view>

      <text class="section-desc">
        共 {{ totalItems }} 条事项 · {{ store.categories.length }} 个分类 · {{ store.rules.length }} 条规则 · 归档 {{ archivedCount }} 项
      </text>

      <view class="preview card">
        <scroll-view scroll-y class="preview-scroll" :show-scrollbar="false">
          <text class="preview-text" selectable>{{ backupText }}</text>
        </scroll-view>
      </view>

      <view class="actions">
        <view class="btn btn-ghost action-btn" @tap="copyContent">复制内容</view>
        <view class="btn btn-primary action-btn" @tap="saveFile">保存文件</view>
      </view>
      <text class="tip">保存失败时，可复制内容后粘贴到任意笔记或文件中保管。</text>
    </view>

    <view class="section">
      <text class="section-title">导入备份</text>
      <text class="section-desc">支持粘贴 JSON / XML 内容，或从文件读取。</text>

      <textarea
        v-model="importText"
        class="import-area"
        :maxlength="-1"
        placeholder="在此粘贴备份内容…"
        placeholder-class="import-placeholder"
      />

      <view class="actions">
        <!-- #ifdef H5 -->
        <view class="btn btn-ghost action-btn" @tap="chooseFile">选择文件</view>
        <!-- #endif -->
        <view class="btn btn-primary action-btn" @tap="validateImport">校验数据</view>
      </view>

      <view v-if="preview" class="result card">
        <view class="result-head">
          <text class="result-title" :class="{ error: !preview.ok }">
            {{ preview.ok ? '校验通过' : '无法导入' }}
          </text>
          <text v-if="preview.summary" class="result-meta">v{{ preview.snapshot.version }}</text>
        </view>

        <view v-if="preview.ok" class="result-grid">
          <view class="result-cell">
            <text class="cell-num">{{ preview.summary.items }}</text>
            <text class="cell-label">事项</text>
          </view>
          <view class="result-cell">
            <text class="cell-num">{{ preview.summary.categories }}</text>
            <text class="cell-label">分类</text>
          </view>
          <view class="result-cell">
            <text class="cell-num">{{ preview.summary.rules }}</text>
            <text class="cell-label">规则</text>
          </view>
          <view class="result-cell">
            <text class="cell-num">{{ preview.summary.archived }}</text>
            <text class="cell-label">归档</text>
          </view>
        </view>

        <text v-if="preview.ok && preview.summary.exportedAt" class="result-time">
          导出于 {{ preview.summary.exportedAt }}
        </text>

        <view v-if="preview.issues.length" class="issue-list">
          <text v-for="issue in preview.issues" :key="issue" class="issue">· {{ issue }}</text>
        </view>
        <view v-if="preview.warnings.length" class="issue-list">
          <text v-for="warning in preview.warnings" :key="warning" class="warning">· {{ warning }}</text>
        </view>

        <template v-if="preview.ok">
          <view class="mode-row">
            <view class="mode-item" :class="{ active: importMode === 'merge' }" @tap="importMode = 'merge'">
              <text class="mode-title">合并</text>
              <text class="mode-desc">按更新时间保留较新记录</text>
            </view>
            <view class="mode-item" :class="{ active: importMode === 'replace' }" @tap="importMode = 'replace'">
              <text class="mode-title">覆盖</text>
              <text class="mode-desc">清空当前数据后写入</text>
            </view>
          </view>
          <view class="btn btn-primary confirm-btn" @tap="confirmImport">确认导入</view>
        </template>
      </view>
    </view>

    <text class="foot-note">合并不会删除本地数据；覆盖会清空当前全部事项与分类，请谨慎操作。</text>
  </view>
</template>

<script>
import AppHeader from '@/components/app-header.vue'
import { applyImport, initStore, store } from '@/store'
import { buildBackupSource, parseBackupText, serializeBackup } from '@/services/backup'
import { buildBackupFilename, saveBackupFile } from '@/services/download'
import { confirmDialog, toast } from '@/utils/ui'

export default {
  components: { AppHeader },
  data() {
    return {
      store,
      format: 'json',
      formatOptions: [
        { value: 'json', label: 'JSON' },
        { value: 'xml', label: 'XML' },
      ],
      importText: '',
      importMode: 'merge',
      preview: null,
    }
  },
  computed: {
    backupText() {
      return serializeBackup(buildBackupSource(store.items, store.categories, store.rules, store.settings), this.format)
    },
    totalItems() {
      return store.items.length
    },
    archivedCount() {
      return store.items.filter((item) => item.archivedAt).length
    },
  },
  onShow() {
    initStore()
  },
  methods: {
    async copyContent() {
      uni.setClipboardData({
        data: this.backupText,
        success: () => toast('备份内容已复制'),
        fail: () => toast('复制失败，请长按选择文本'),
      })
    },
    async saveFile() {
      const result = await saveBackupFile(
        this.backupText,
        buildBackupFilename(this.format),
        this.format
      )
      if (result.ok && result.path) {
        uni.showModal({
          title: '已保存',
          content: `备份文件已保存到：\n${result.path}`,
          showCancel: false,
          confirmColor: '#15161A',
        })
        return
      }
      toast(result.message || (result.ok ? '已保存' : '保存失败'))
    },
    chooseFile() {
      // #ifdef H5
      if (typeof uni.chooseFile !== 'function') {
        toast('当前环境不支持选择文件，请直接粘贴内容')
        return
      }
      uni.chooseFile({
        count: 1,
        type: 'all',
        extension: ['.json', '.xml'],
        success: (res) => {
          const file = res.tempFiles && res.tempFiles[0]
          if (!file) return
          const reader = new FileReader()
          reader.onload = () => {
            this.importText = String(reader.result || '')
            this.preview = null
            toast('已读取备份文件')
          }
          reader.onerror = () => toast('文件读取失败')
          reader.readAsText(file)
        },
        fail: () => toast('已取消选择'),
      })
      // #endif
    },
    validateImport() {
      try {
        const result = parseBackupText(this.importText)
        this.preview = {
          ok: result.ok,
          issues: result.issues,
          warnings: result.warnings,
          summary: result.summary,
          snapshot: result.snapshot,
        }
        if (!result.ok) toast('数据校验未通过')
      } catch (error) {
        this.preview = {
          ok: false,
          issues: [error.message || '无法解析备份内容'],
          warnings: [],
          summary: null,
          snapshot: null,
        }
      }
    },
    async confirmImport() {
      if (!this.preview || !this.preview.ok || !this.preview.snapshot) return
      const mode = this.importMode
      const summary = this.preview.summary
      const message =
        mode === 'replace'
          ? `将清空当前 ${store.items.length} 条数据，并写入备份中的 ${summary.items} 条事项。`
          : `将把备份中的 ${summary.items} 条事项合并到当前数据。`
      const confirmed = await confirmDialog(message, {
        title: '确认导入',
        confirmText: '导入',
        danger: mode === 'replace',
      })
      if (!confirmed) return

      const result = applyImport(this.preview.snapshot, mode)
      if (!result.ok) {
        toast(result.error)
        return
      }
      if (mode === 'replace') {
        toast(`已覆盖导入 ${result.added} 项`)
      } else {
        toast(`新增 ${result.added} 项，更新 ${result.updated} 项`)
      }
      this.preview = null
      this.importText = ''
    },
  },
}
</script>

<style scoped>
.intro {
  margin: 8rpx 32rpx 0;
  padding: 24rpx;
  display: flex;
  gap: 20rpx;
}

.intro-tag {
  flex: none;
  height: 40rpx;
  padding: 0 16rpx;
  border-radius: 10rpx;
  background: var(--info-bg);
  color: var(--blue);
  font-size: 21rpx;
  line-height: 40rpx;
}

.intro-body {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.intro-title {
  font-size: 27rpx;
  font-weight: 500;
}

.intro-desc {
  margin-top: 6rpx;
  font-size: 22rpx;
  line-height: 1.6;
  color: var(--text-3);
}

.section {
  padding: 34rpx 32rpx 0;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title {
  font-size: 29rpx;
  font-weight: 600;
}

.section-desc {
  display: block;
  margin-top: 8rpx;
  font-size: 23rpx;
  color: var(--text-3);
}

.format-switch {
  display: flex;
  padding: 4rpx;
  border-radius: 14rpx;
  background: var(--track);
}

.format-item {
  padding: 8rpx 24rpx;
  border-radius: 10rpx;
  font-size: 23rpx;
  color: var(--text-2);
}

.format-item.active {
  background: var(--pill);
  color: var(--text);
  font-weight: 500;
}

.preview {
  margin-top: 20rpx;
  overflow: hidden;
}

.preview-scroll {
  height: 300rpx;
  padding: 22rpx 24rpx;
}

.preview-text {
  font-size: 21rpx;
  line-height: 1.6;
  color: var(--text-2);
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  white-space: pre-wrap;
  word-break: break-all;
}

.actions {
  display: flex;
  gap: 16rpx;
  margin-top: 20rpx;
}

.action-btn {
  flex: 1;
}

.tip {
  display: block;
  margin-top: 14rpx;
  font-size: 21rpx;
  color: var(--text-3);
}

.import-area {
  width: 100%;
  height: 240rpx;
  margin-top: 20rpx;
  padding: 24rpx;
  background: var(--field);
  border: 1rpx solid var(--line);
  border-radius: 22rpx;
  font-size: 24rpx;
  line-height: 1.6;
}

.import-placeholder {
  color: var(--text-3);
}

.result {
  margin-top: 24rpx;
  padding: 26rpx;
}

.result-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.result-title {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--green);
}

.result-title.error {
  color: var(--danger);
}

.result-meta {
  font-size: 21rpx;
  color: var(--text-3);
}

.result-grid {
  margin-top: 20rpx;
  display: flex;
  border-top: 1rpx solid var(--line);
  border-bottom: 1rpx solid var(--line);
  padding: 18rpx 0;
}

.result-cell {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.cell-num {
  font-size: 34rpx;
  font-weight: 600;
}

.cell-label {
  margin-top: 4rpx;
  font-size: 21rpx;
  color: var(--text-3);
}

.result-time {
  display: block;
  margin-top: 14rpx;
  font-size: 21rpx;
  color: var(--text-3);
}

.issue-list {
  margin-top: 14rpx;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.issue {
  font-size: 22rpx;
  color: var(--danger);
  line-height: 1.5;
}

.warning {
  font-size: 22rpx;
  color: var(--amber);
  line-height: 1.5;
}

.mode-row {
  display: flex;
  gap: 14rpx;
  margin-top: 24rpx;
}

.mode-item {
  flex: 1;
  padding: 20rpx;
  border-radius: 18rpx;
  border: 1rpx solid var(--line);
  background: var(--fill);
  display: flex;
  flex-direction: column;
}

.mode-item.active {
  border-color: var(--text);
  background: var(--pill);
}

.mode-title {
  font-size: 25rpx;
  font-weight: 500;
}

.mode-desc {
  margin-top: 6rpx;
  font-size: 20rpx;
  line-height: 1.4;
  color: var(--text-3);
}

.confirm-btn {
  margin-top: 22rpx;
}

.foot-note {
  display: block;
  padding: 34rpx 40rpx 0;
  font-size: 21rpx;
  line-height: 1.6;
  color: var(--text-3);
}
</style>
