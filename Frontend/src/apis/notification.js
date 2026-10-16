import request from '../utils/request'

//同时请求两个通知，添加分类字段，合并之后排序
export const getNotificationsAPI = async () => {
  const [normalRes, forumRes] = await Promise.all([
    request.get('/api/notifications'),
    request.get('/api/forumNotifications'),
  ])

  const normalNotifications = (normalRes.data || []).map((n) => ({
    ...n,
    notificationSource: 'normal',
  }))

  const forumNotifications = (forumRes.data || []).map((n) => ({
    ...n,
    notificationSource: 'forum',
  }))

  return {
    success: normalRes.success && forumRes.success,
    data: [...normalNotifications, ...forumNotifications].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    ),
  }
}

export const markReadAPI = (notification) => {
  const isForum = notification.notificationSource === 'forum'
  const url = isForum
    ? `/api/forumNotifications/${notification._id}/read`
    : `/api/notifications/${notification._id}/read`

  return request.patch(url)
}
