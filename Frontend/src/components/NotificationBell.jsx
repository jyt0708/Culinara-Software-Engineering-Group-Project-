import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Badge, Button } from 'antd'
import { BellOutlined } from '@ant-design/icons'
import { getNotificationsAPI } from '../apis/notification'

export default function NotificationBell() {
  const navigate = useNavigate()
  const location = useLocation()
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchCount = useCallback(async () => {
    try {
      const res = await getNotificationsAPI()
      const notifications = res.data || []
      setUnreadCount(notifications.filter((n) => !n.isRead).length)
    } catch {
      // 静默失败，不影响主界面
    }
  }, [])

  // 每次路由切换都重新拉计数
  useEffect(() => {
    fetchCount()
  }, [fetchCount, location.pathname])

  // ProfileNotifications 标记已读后发 notifications-updated 事件，铃铛收到立刻更新
  useEffect(() => {
    window.addEventListener('notifications-updated', fetchCount)
    return () => window.removeEventListener('notifications-updated', fetchCount)
  }, [fetchCount])

  const handleClick = () => {
    fetchCount() // 点击时刷新一次
    navigate('/profile?tab=Notifications')
  }

  return (
    <Badge count={unreadCount} size="small" offset={[-2, 2]}>
      <Button
        shape="circle"
        icon={<BellOutlined />}
        onClick={handleClick}
        style={{ border: 'none', boxShadow: 'none' }}
      />
    </Badge>
  )
}
