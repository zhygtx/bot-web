import { ElMessage } from 'element-plus'
import request from '../../utils/request'

export const BIG_TEXT_PREFIX = 'BIG_TEXT:'

// 判断内容是否为离线存储的大数据引用键
export const isBigTextRef = (value) =>
  typeof value === 'string' && value.startsWith(BIG_TEXT_PREFIX)

// 按引用键拉取离线存储的大数据内容
export async function fetchBigText(key) {
  if (!key) return key
  try {
    const response = await request({
      url: '/workflowLog/findBigText',
      method: 'get',
      params: { key }
    })
    if (response.code === 200) return response.data
    return key
  } catch (error) {
    console.error('加载大数据内容失败:', error)
    ElMessage.error('加载大数据内容失败')
    return key
  }
}
