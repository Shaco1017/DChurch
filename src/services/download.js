/**
 * 备份文件导出。
 * H5 直接触发浏览器下载；App 写入应用文档目录；
 * 其他端（小程序等）退化为复制到剪贴板，保证能力可降级、流程不断。
 */
export function buildBackupFilename(format) {
  const date = new Date()
  const pad = (value) => String(value).padStart(2, '0')
  const stamp = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(
    date.getMinutes()
  )}`
  return `dchurch-backup-${stamp}.${format}`
}

function copyToClipboard(text) {
  return new Promise((resolve) => {
    uni.setClipboardData({
      data: text,
      success: () => resolve({ ok: true, message: '已复制到剪贴板' }),
      fail: () => resolve({ ok: false, message: '复制失败，请手动选择文本' }),
    })
  })
}

function saveOnH5(text, filename, format) {
  try {
    const blob = new Blob([text], {
      type: format === 'xml' ? 'application/xml;charset=utf-8' : 'application/json;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => URL.revokeObjectURL(url), 1500)
    return Promise.resolve({ ok: true, message: '文件已开始下载' })
  } catch (error) {
    return copyToClipboard(text)
  }
}

function saveOnApp(text, filename) {
  return new Promise((resolve) => {
    try {
      if (typeof plus === 'undefined' || !plus.io) {
        resolve({ ok: false, message: '当前环境不支持保存文件' })
        return
      }
      plus.io.resolveLocalFileSystemURL(
        '_doc/',
        (dirEntry) => {
          dirEntry.getFile(
            filename,
            { create: true },
            (fileEntry) => {
              fileEntry.createWriter(
                (writer) => {
                  writer.onwrite = () => resolve({ ok: true, message: '文件已保存', path: fileEntry.fullPath })
                  writer.onerror = () => resolve({ ok: false, message: '写入文件失败' })
                  writer.write(text)
                },
                () => resolve({ ok: false, message: '无法创建文件写入器' })
              )
            },
            () => resolve({ ok: false, message: '无法创建备份文件' })
          )
        },
        () => resolve({ ok: false, message: '无法访问应用文档目录' })
      )
    } catch (error) {
      resolve({ ok: false, message: '保存失败' })
    }
  })
}

export function saveBackupFile(text, filename, format) {
  // #ifdef H5
  return saveOnH5(text, filename, format)
  // #endif
  // #ifdef APP-PLUS
  return saveOnApp(text, filename)
  // #endif
  // #ifndef H5 || APP-PLUS
  return copyToClipboard(text)
  // #endif
}
