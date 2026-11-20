let counter = 0

/**
 * 生成设备内唯一标识。时间戳 + 序列 + 随机串，
 * 不依赖服务端，重复概率可忽略。
 */
export function uid(prefix = 'id') {
  counter = (counter + 1) % 1296
  const time = Date.now().toString(36)
  const seq = counter.toString(36).padStart(2, '0')
  const rand = Math.random().toString(36).slice(2, 7)
  return `${prefix}_${time}${seq}${rand}`
}
