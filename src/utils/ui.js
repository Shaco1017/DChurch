export function toast(title, duration = 1800) {
  uni.showToast({ title, icon: 'none', duration })
}

export function tapFeedback() {
  try {
    uni.vibrateShort({})
  } catch (error) {
    // 部分平台不支持震动，静默忽略
  }
}

export function confirmDialog(content, options = {}) {
  return new Promise((resolve) => {
    uni.showModal({
      title: options.title || '提示',
      content,
      confirmText: options.confirmText || '确定',
      cancelText: options.cancelText || '取消',
      confirmColor: options.danger ? '#D24A3B' : '#15161A',
      success: (res) => resolve(!!res.confirm),
      fail: () => resolve(false),
    })
  })
}
