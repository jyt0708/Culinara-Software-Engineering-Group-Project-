import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar, Button, Empty, Spin, Typography, App as AntdApp, Segmented, Pagination } from 'antd'
import { getNotificationsAPI, markReadAPI } from '../apis/notification'

const { Text } = Typography
const GREEN = '#50806B'

// 不同类型通知指向的"对象名称 + 跳转目标"
//   recipe_liked  → 食谱标题，跳食谱详情
//   order_to_ship → 商品名称，跳卖家"Sold Items"标签（去发货）
//   order_shipped → 商品名称，跳买家"Orders"标签（看物流/确认收货）
//   product_out_of_stock → 商品名称，跳卖家"My Products"标签（查看库存）
//   product_rated → 商品名称，跳卖家"My Products"标签（查看评价）
function getTarget(n) {
  if (n.type === 'recipe_liked') {
    return n.recipe?._id ? { title: n.recipe.title, path: `/recipes/${n.recipe._id}` } : null
  }
  if (
      n.type === 'forum_post_liked' ||
      n.type === 'forum_post_commented' ||
      n.type === 'forum_comment_liked' ||
      n.type === 'forum_post_mentioned'
    ) {
      return n.forumPost?._id
        ? { title: n.forumPost.title, path: `/forum/${n.forumPost._id}` }
        : null
    }
  if (n.type === 'order_to_ship' || n.type === 'order_issue_reported') {
    // 待发货 / 买家报告异常（催发货·未收到货）→ 卖家去 Sold Items 处理（发货 / 补发）
    return { title: n.order?.productSnapshot?.name, path: '/profile?tab=Sold Items' }
  }
  if (n.type === 'order_shipped') {
    return { title: n.order?.productSnapshot?.name, path: '/profile?tab=Orders' }
  }
  if (n.type === 'product_out_of_stock') {
    return { title: n.order?.productSnapshot?.name, path: '/profile?tab=My Products' }
  }
  if (n.type === 'product_rated') {
    return { title: n.order?.productSnapshot?.name, path: '/profile?tab=My Products' }
  }
  return null
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins} minute${mins > 1 ? 's' : ''} ago`
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  return `${days} day${days > 1 ? 's' : ''} ago`
}

export default function ProfileNotifications() {
  const navigate = useNavigate()
  const { message: messageApi } = AntdApp.useApp()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10


  //get notifications
  useEffect(() => {
    getNotificationsAPI()
      .then((res) => {
        setNotifications(res.data || [])
      })
      .catch(() => messageApi.error('Failed to load notifications'))
      .finally(() => setLoading(false))
  }, [messageApi])

  const handleMarkRead = async (n) => {
    if (n.isRead) return
    try {
      await markReadAPI(n)
      setNotifications((prev) =>
        prev.map((item) => item._id === n._id ? { ...item, isRead: true } : item)
      )
      // 通知铃铛重新拉计数，Badge 立刻减少
      window.dispatchEvent(new CustomEvent('notifications-updated'))
    } catch {
      // 静默失败
    }
  }

  const handleView = (n) => {
    handleMarkRead(n)
    const target = getTarget(n)
    if (target?.path) navigate(target.path)
  }

  const filteredNotifications =
    filter === 'unread'
      ? notifications.filter((n) => !n.isRead)
      : notifications

  const pagedNotifications = filteredNotifications.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}><Spin /></div>
  }

  if (notifications.length === 0) {
    return <Empty description="No notifications yet" style={{ padding: '3rem 0' }} />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
        <Segmented
          size="small"
          value={filter}
          onChange={(value) => {
            setFilter(value)
            setCurrentPage(1)
          }}
          options={[
            { label: 'All', value: 'all' },
            { label: 'Unread Only', value: 'unread' },
          ]}
          style={{
            width: 'auto',
            display: 'inline-flex',
            padding: 3,
            borderRadius: 8,
            background: '#f5f5f5',
          }}
        />
      </div>
      {filteredNotifications.length === 0 ? (
        <Empty
          description={filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
          style={{ padding: '3rem 0' }}
        />
      ) : (
        pagedNotifications.map((n) => {
        const target = getTarget(n)
        return (
        <div
          key={`${n.notificationSource || 'normal'}-${n._id}`}
          onClick={() => handleMarkRead(n)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 16px',
            borderRadius: 8,
            background: n.isRead ? '#fafafa' : '#f0f7f4',
            border: `1px solid ${n.isRead ? '#f0f0f0' : '#c8e6d8'}`,
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
        >
          {/* 未读红点 */}
          {!n.isRead && (
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: '#e53e3e', flexShrink: 0,
            }} />
          )}
          {n.isRead && <div style={{ width: 8, flexShrink: 0 }} />}

          {/* 发送者头像 */}
          <Avatar
            size={36}
            src={n.sender?.profilePicture || null}
            style={{ background: 'linear-gradient(135deg,#f9b8c8,#e879a0)', flexShrink: 0 }}
          >
            {n.sender?.username?.[0]?.toUpperCase()}
          </Avatar>

          {/* 文字内容 */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: n.isRead ? '#666' : '#1a1a1a' }}>
              <span style={{ fontWeight: 700, color: n.isRead ? '#555' : GREEN }}>
                {n.sender?.username}
              </span>{' '}
              {n.message}{' '}
              {target?.title && <span style={{ fontWeight: 600 }}>"{target.title}"</span>}
            </Text>
            <Text type="secondary" style={{ display: 'block', fontSize: '0.78rem', marginTop: 2 }}>
              {timeAgo(n.createdAt)}
            </Text>
          </div>

          {/* View 按钮 */}
          {target?.path && (
            <Button
              size="small"
              type="link"
              style={{ color: GREEN, flexShrink: 0, paddingRight: 0 }}
              onClick={(e) => { 
                e.stopPropagation() 
                handleView(n) 
                }
              }
            >
              View →
            </Button>
          )}
        </div>
        )
      })
    )}
      {filteredNotifications.length > pageSize && (
          <Pagination
            current={currentPage}
            pageSize={pageSize}
            total={filteredNotifications.length}
            onChange={setCurrentPage}
            align="center"
            style={{ marginTop: 8 }}
          />
        )}
    </div>
  )
}
