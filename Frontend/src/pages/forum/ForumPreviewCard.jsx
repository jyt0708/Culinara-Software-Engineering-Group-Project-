import { Link } from 'react-router-dom'
import { Avatar, Card, Space, Tag, Typography } from 'antd'
import {CalendarOutlined,CommentOutlined,LikeFilled,LikeOutlined,} from '@ant-design/icons'
import './ForumPreviewCard.css'

const { Title, Paragraph } = Typography

const CATEGORY_COLORS = {
  'Newbie Corner': 'green',
  'Sharing': 'blue',
  'Shopping': 'orange',
  'General Discussion': 'purple',
}

//格式化帖子创建时间
function formatDate(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}


function ForumPreviewCard({ post }) {
  return (
    <Link className="forum-card-link" to={`/forum/${post._id}`}>
        <Card className="forum-preview-card" hoverable>
            <div className="forum-preview-left">
                <Avatar size={48} src={post.author?.profilePicture|| null}>
                {post.author?.username?.[0]?.toUpperCase() || 'U'}
                </Avatar>

                <div className="forum-preview-author-info">
                    <div className="forum-preview-username">
                        {post.author?.username || 'Unknown user'}
                    </div>

                    <Tag color={CATEGORY_COLORS[post.category] || 'default'}>
                        {post.category}
                    </Tag>
                </div>
            </div>

            <div className="forum-preview-main">
                <Title level={4}>{post.title}</Title>

                <Paragraph ellipsis={{ rows: 2 }}>
                {post.content}
                </Paragraph>

                <div className="forum-preview-date">
                    <CalendarOutlined />
                    <span>{formatDate(post.createdAt)}</span>
                </div>
            </div>

            <div className="forum-preview-meta">
                <span className={post.isLiked ? 'forum-liked' : ''}>
                    {post.isLiked ? <LikeFilled /> : <LikeOutlined />}
                    {post.likeCount || 0}
                </span>

                <span>
                    <CommentOutlined />
                    {post.commentsCount || 0}
                </span>
            </div>
        </Card>
    </Link>
    )
}

export default ForumPreviewCard