import { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation} from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Popconfirm, Space, Avatar, Button, Card, Empty, Form, Image, Input, Spin, Typography, App as AntdApp, Segmented, Pagination, Select } from 'antd'
import { ArrowLeftOutlined,CommentOutlined, LikeOutlined, LikeFilled,EditOutlined, DeleteOutlined, ClockCircleOutlined} from '@ant-design/icons'
import { getForumPostAPI,getForumCommentsAPI,createForumCommentAPI,toggleLikeForumPostAPI,deleteForumPostAPI,toggleLikeForumCommentAPI,deleteForumCommentAPI} from '../../apis/forum'
import { getCreatorProfileAPI, searchUsersAPI } from '../../apis/user'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

const GREEN = '#50806B'
const GREEN_DARK = '#2F3D37'

//格式化发布时间
function formatDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function ForumDetailPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const location = useLocation()
    const { message: messageApi } = AntdApp.useApp()
    const [form] = Form.useForm()
    const { userInfo } = useSelector((state) => state.user)

    const [post, setPost] = useState(null)
    const [comments, setComments] = useState([])
    const [commentSort, setCommentSort] = useState('oldest')
    const [loading, setLoading] = useState(true)
    const [commentSubmitting, setCommentSubmitting] = useState(false)
    const [showCommentForm, setShowCommentForm] = useState(false)
    const [replyingToComment, setReplyingToComment] = useState(null)
    const [expandedReplyRoots, setExpandedReplyRoots] = useState({})

    const [commentPage, setCommentPage] = useState(1)
    const COMMENT_PAGE_SIZE = 10

    const [likeCount, setLikeCount] = useState(0)
    const [isLiked, setIsLiked] = useState(false)
    const [likeLoading, setLikeLoading] = useState(false)
    const [commentLikeLoading, setCommentLikeLoading] = useState(null)
    const [userOptions, setUserOptions] = useState([])
    const [userSearching, setUserSearching] = useState(false)

    //加载基础数据，请求-post和comment
  const loadDetail = async () => {
    setLoading(true)

    try {
      const [postRes, commentsRes] = await Promise.all([
        getForumPostAPI(id),
        getForumCommentsAPI(id),
      ])

      const postData = postRes.data

      setPost(postData)
      setLikeCount(postData.likeCount || 0)
      setIsLiked(postData.isLiked || false)
      setComments(commentsRes.data || [])
    } catch (err) {
      messageApi.error(err.response?.data?.message || 'Failed to load forum post')
      navigate('/forum', { replace: true })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDetail()
  }, [id])

  //搜索用户
  const handleSearchUsers = async (value) => {
    if (!value.trim()) {
      setUserOptions([])
      return
    }

    setUserSearching(true)

    try {
      const res = await searchUsersAPI(value)
      setUserOptions((res.data || []).map((user) => ({
        value: user._id,
        label: user.username,
      })))
    } catch (err) {
      messageApi.error(err.response?.data?.message || 'Failed to search users')
    } finally {
      setUserSearching(false)
    }
  }

  const handleCreateComment = async (values, replyTarget = null) => {
    setCommentSubmitting(true)

    try {
      await createForumCommentAPI({
        post: id,
        content: values.content,
        replyToComment: replyTarget?._id,
        mentionUser: values.mentionUser || null,
      })

      messageApi.success('Comment added!')
      form.resetFields()
      setShowCommentForm(false)
      setReplyingToComment(null)
      loadDetail()
    } catch (err) {
      messageApi.error(err.response?.data?.message || 'Failed to add comment')
    } finally {
      setCommentSubmitting(false)
    }
  }

  const handleLike = async () => {
    if (likeLoading) return

    setLikeLoading(true)

    try {
        const res = await toggleLikeForumPostAPI(id)

        setLikeCount(res.likesCount)
        setIsLiked(res.liked)
    } catch (err) {
        messageApi.error(err.response?.data?.message || 'Failed to update like')
    } finally {
        setLikeLoading(false)
    }
  }

  const handleReplyToComment = (comment) => {
    setReplyingToComment(comment)
  }

  const handleCommentLike = async (commentId) => {
    if (commentLikeLoading) return

    setCommentLikeLoading(commentId)

    try {
      const res = await toggleLikeForumCommentAPI(commentId)

      setComments((prevComments) =>
        prevComments.map((comment) =>
          comment._id === commentId
            ? { ...comment, likeCount: res.likeCount, isLiked: res.isLiked }
            : comment
        )
      )
    } catch (err) {
      messageApi.error(err.response?.data?.message || 'Failed to update comment like')
    } finally {
      setCommentLikeLoading(null)
    }
  }

  const handleDeleteComment = async (commentId) => {
    try {
      await deleteForumCommentAPI(commentId)
      messageApi.success('Comment deleted')
      setReplyingToComment(null)
      loadDetail()
    } catch (err) {
      messageApi.error(err.response?.data?.message || 'Delete failed')
    }
  }

  const handleDelete = async () => {
    try {
      await deleteForumPostAPI(id)
      messageApi.success('Post deleted')
      setTimeout(() => {
        navigate('/forum', { replace: true })
      }, 600)
    } catch (err) {
      messageApi.error(err.response?.data?.message || 'Delete failed')
    }
  }

  //判断点击用户头像是否跳转
  const handleUserClick = async (userId) => {
    if (!userId) {
      return messageApi.error('User not found')
    }

    try {
      const res = await getCreatorProfileAPI(userId)

      if (res.data?.creator?.role === 'creator') {
        navigate(`/users/${userId}`)
      } else {
        messageApi.warning('This user is not a creator')
      }
    } catch (err) {
      messageApi.error(err.response?.data?.message || 'Failed to load user profile')
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!post) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center' }}>
        <Empty description="Forum post unavailable" />
      </div>
    )
  }

  const isOwner = userInfo?._id && String(post.author?._id) === String(userInfo._id)

  const sortedComments = [...comments].sort((a, b) => {
    if (commentSort === 'latest') {
      return new Date(b.createdAt) - new Date(a.createdAt)
    }

    if (commentSort === 'liked') {
      return (b.likeCount || 0) - (a.likeCount || 0) || new Date(a.createdAt) - new Date(b.createdAt)
    }

    return new Date(a.createdAt) - new Date(b.createdAt)
  })

  const rootComments = sortedComments.filter((comment) => !comment.rootComment)

  const pagedRootComments = rootComments.slice(
    (commentPage - 1) * COMMENT_PAGE_SIZE,
    commentPage * COMMENT_PAGE_SIZE
  )

  const repliesByRoot = sortedComments.reduce((acc, comment) => {
      if (!comment.rootComment) return acc

      const rootId = String(comment.rootComment)
      if (!acc[rootId]) acc[rootId] = []
      acc[rootId].push(comment)

      return acc
    }, {})

  const isRepliesExpanded = (commentId) => expandedReplyRoots[commentId]

  const toggleRepliesExpanded = (commentId) => {
    setExpandedReplyRoots((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }))
  }


  return (
    
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem 5rem' ,background: '#f3faf6',
      borderRadius: 16,}}>
      <Button
        type="link"
        icon={<ArrowLeftOutlined />}
        onClick={() => {
          if (location.state?.fromSubmit) {
            navigate('/forum', { replace: true })
          } else {
            navigate(-1)
          }
        }}
        style={{ paddingLeft: 0, color: GREEN, marginBottom: 12 }}
      >
        Back
      </Button>

      {/* 帖子0楼 */}
      <Card style={{ borderRadius: 10, marginBottom: 16 }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '110px minmax(0, 1fr) 120px',
          gap: '1.5rem',
          minHeight: 260,
        }}>
          <div style={{ textAlign: 'center' }}>
            <div 
            onClick={() => handleUserClick(post.author?._id)}
            style={{ color: 'inherit', textDecoration: 'none', cursor: 'pointer' }}
            >
            <Avatar size={48} src={post.author?.profilePicture|| null}>
                {post.author?.username?.[0]?.toUpperCase() || 'U'}
              </Avatar>
            <Text strong style={{ display: 'block', marginTop: 12 }}>
              {post.author?.username || 'Unknown user'}
            </Text>
            </div>

            {/* 作者本人看到 编辑/删除 按钮 */}
            {isOwner && (
              <Space direction="vertical" style={{ marginTop: 16 , width: '100%'}}>
                <Button
                  block
                  icon={<EditOutlined />}
                  onClick={() => navigate(`/forum/edit/${post._id}`)}
                >Edit
                </Button>
                <Popconfirm
                  title="Delete this Post?"
                  description="This cannot be undone."
                  okText="Delete" 
                  cancelText="Cancel"
                  okButtonProps={{ danger: true }}
                  onConfirm={handleDelete}
                >
                  <Button block danger icon={<DeleteOutlined />}>
                  Delete
                  </Button>
                </Popconfirm>
              </Space>
            )}
            {/* go to recipe button */}
            {post.linkedRecipe?._id && (
              <Button
                block
                size="small"
                type="primary"
                onClick={() => navigate(`/recipes/${post.linkedRecipe._id}`)}
                style={{
                  marginTop: 10,
                  color: '#fff',
                  borderColor: GREEN,
                  fontWeight: 600,
                }}
              >
                Go to Recipe
              </Button>
            )}
          </div>

          <div>
            <Title level={3} style={{ color: GREEN_DARK, marginTop: 0 }}>
              {post.title}
            </Title>

            <Paragraph style={{ color: '#666', lineHeight: 1.7 }}>
                {post.mentionUser && (
                  <Text 
                  strong
                  onClick={() => handleUserClick(post.mentionUser?._id)}
                  style={{ color: GREEN, marginRight: 6,cursor: 'pointer', }}
                  >
                    @{post.mentionUser.username}
                  </Text>
                )}
              {post.content}
            </Paragraph>

            {post.imageUrl && (
              <Image
                src={post.imageUrl}
                width={260}
                height={170}
                style={{ objectFit: 'cover', borderRadius: 4 }}
              />
            )}
          </div>

          <div style={{ textAlign: 'right', color: '#7a8580' }}>
            <div>📅 {formatDate(post.createdAt)}</div>
            <div style={{
              marginTop: 190,
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: 8,
              fontSize: '1.4rem',
            }}>
                <Button
                    icon={isLiked ? <LikeFilled style={{ color: GREEN }} /> : <LikeOutlined />}
                    onClick={handleLike}
                    loading={likeLoading}
                    >
                    {likeCount}
                </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* add comment */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
        <Button
          icon={<CommentOutlined />}
          onClick={() => {
            setReplyingToComment(null)
            setShowCommentForm(!showCommentForm)
          }}
          style={{ width: 300, fontWeight: 700 }}
        >
          Add Comment
        </Button>
      </div>

      {showCommentForm && !replyingToComment &&(
        <Card style={{ borderRadius: 10, marginBottom: 28 }}>
          <Form form={form} layout="vertical" onFinish={(values) => handleCreateComment(values)}>
            <Form.Item
              name="mentionUser"
              label="@ Mention user"
            >
              <Select
                showSearch
                allowClear
                filterOption={false}
                onSearch={handleSearchUsers}
                options={userOptions}
                loading={userSearching}
                placeholder="Search user to mention"
              />
            </Form.Item>
            <Form.Item
              name="content"
              label="Comment"
              rules={[
                { required: true, message: 'Please write a comment' },
                { max: 1000, message: 'Comment cannot exceed 1000 characters' },
              ]}
            >
              <TextArea
                rows={4}
                maxLength={1000}
                showCount
                placeholder="Write your comment..."
              />
            </Form.Item>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <Button onClick={() => setShowCommentForm(false)}>
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={commentSubmitting}
                style={{ background: GREEN, borderColor: GREEN }}
              >
                Submit
              </Button>
            </div>
          </Form>
        </Card>
      )}

      {/* comments */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <Title level={3} style={{ color: GREEN_DARK }}>
          All Comments({comments.length})
        </Title>
        <Segmented
          value={commentSort}
          onChange={(value) => {
            setCommentSort(value)
            setCommentPage(1)
          }}
          options={[
            { label: 'Oldest first', value: 'oldest', icon: <ClockCircleOutlined /> },
            { label: 'Latest first', value: 'latest', icon: <ClockCircleOutlined /> },
            { label: 'Most liked', value: 'liked', icon: <LikeOutlined /> },
          ]}
        />
      </div> 

      {comments.length === 0 ? (
        <Empty description="No comments yet" />
      ) : (
        <>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {pagedRootComments.map((comment) => (
            <Card key={comment._id} style={{ borderRadius: 10 }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '90px minmax(0, 1fr) 120px',
                gap: '1.5rem',
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div 
                    onClick={() => handleUserClick(comment.author?._id)}
                    style={{ color: 'inherit', textDecoration: 'none', cursor: 'pointer' }}
                  >
                    <Avatar size={52} src={comment.author?.profilePicture|| null}>
                      {comment.author?.username?.[0]?.toUpperCase()}
                    </Avatar>
                    <Text strong style={{ display: 'block', marginTop: 10 }}>
                      {comment.author?.username || 'Unknown user'}
                    </Text>
                  </div>

                  {/* delete button only for comments author */}
                  {String(comment.author?._id) === String(userInfo?._id) && (
                    <Popconfirm
                      title="Delete this comment?"
                      description={comment.rootComment ? 'This cannot be undone.' : 'Replies under this comment will also be deleted.'}
                      okText="Delete"
                      cancelText="Cancel"
                      okButtonProps={{ danger: true }}
                      onConfirm={() => handleDeleteComment(comment._id)}
                    >
                      <Button
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        style={{ marginTop: 12 }}
                      >
                        Delete
                      </Button>
                    </Popconfirm>
                  )}
                </div>

                {/* mention user exists?-show first */}
                <Paragraph style={{ color: '#666', marginTop: 10 }}>
                  {comment.mentionUser && (
                    <Text 
                    strong 
                    onClick={() => handleUserClick(comment.mentionUser?._id)}
                    style={{ color: GREEN, marginRight: 6,cursor: 'pointer', }}
                    >
                      @{comment.mentionUser.username}
                    </Text>
                  )}
                  {comment.content}
                </Paragraph>       

                {/* right section -date,like,reply button */}
                <div style={{ textAlign: 'right', color: '#7a8580'}}>
                  <div>📅 {formatDate(comment.createdAt)}</div>

                  <Button
                    size="small"
                    icon={comment.isLiked ? <LikeFilled style={{ color: GREEN }} /> : <LikeOutlined />}
                    onClick={() => handleCommentLike(comment._id)}
                    loading={commentLikeLoading === comment._id}
                  >
                    {comment.likeCount || 0}
                  </Button>

                  <Button
                    size="small"
                    icon={<CommentOutlined />}
                    onClick={() => handleReplyToComment(comment)}
                  >
                    Reply
                  </Button>
                </div>
              </div>

              {/* 点击回复评论出现的回复输入框 */}
              {replyingToComment?._id === comment._id && (
                <Card size="small" style={{ marginLeft: 80, marginTop: 12 }}>
                  <Form
                    layout="vertical"
                    onFinish={(values) => handleCreateComment(values, comment)}
                  >
                    <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                      Replying to {comment.author?.username || 'this comment'}
                    </Text>

                    <Form.Item
                      name="mentionUser"
                      label="@ Mention user"
                    >
                      <Select
                        showSearch
                        allowClear
                        filterOption={false}
                        onSearch={handleSearchUsers}
                        options={userOptions}
                        loading={userSearching}
                        placeholder="Search user to mention"
                      />
                    </Form.Item>

                    <Form.Item
                      name="content"
                      rules={[
                        { required: true, message: 'Please write a reply' },
                        { max: 1000, message: 'Reply cannot exceed 1000 characters' },
                      ]}
                    >
                      <TextArea rows={3} maxLength={1000} showCount placeholder="Write your reply..." />
                    </Form.Item>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                      <Button onClick={() => setReplyingToComment(null)}>
                        Cancel
                      </Button>
                      <Button
                        type="primary"
                        htmlType="submit"
                        loading={commentSubmitting}
                        style={{ background: GREEN, borderColor: GREEN }}
                      >
                        Submit
                      </Button>
                    </div>
                  </Form>
                </Card>
              )}

              {(isRepliesExpanded(comment._id)
                ? (repliesByRoot[comment._id] || [])
                : (repliesByRoot[comment._id] || []).slice(0, 3)
              ).map((reply) => (
                <Card key={reply._id} size="small" style={{ marginLeft: 80, marginTop: 12 }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '72px minmax(0, 1fr) 120px',
                    gap: '1rem',
                    minHeight: 96,
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <div
                        onClick={() => handleUserClick(reply.author?._id)}
                        style={{ color: 'inherit', textDecoration: 'none', cursor: 'pointer' }}
                      >
                        <Avatar size={42} src={reply.author?.profilePicture || null}>
                          {reply.author?.username?.[0]?.toUpperCase()}
                        </Avatar>
                        <Text strong style={{ display: 'block', marginTop: 8 }}>
                          {reply.author?.username || 'Unknown user'}
                        </Text>
                      </div>
                      {String(reply.author?._id) === String(userInfo?._id) && (
                          <Popconfirm
                            title="Delete this reply?"
                            description="This cannot be undone."
                            okText="Delete"
                            cancelText="Cancel"
                            okButtonProps={{ danger: true }}
                            onConfirm={() => handleDeleteComment(reply._id)}
                          >
                            <Button
                              size="small"
                              danger
                              icon={<DeleteOutlined />}
                              style={{ marginTop: 12 }}
                            >
                              Delete
                            </Button>
                          </Popconfirm>
                        )}
                    </div>

                    <div>
                      <Text type="secondary">
                        Replying to {reply.replyToUser?.username || 'a user'}
                      </Text>

                      <Paragraph style={{ color: '#666', marginTop: 8 }}>
                         {reply.mentionUser && (
                          <Text 
                          strong 
                          onClick={() => handleUserClick(reply.mentionUser?._id)}
                          style={{ color: GREEN, marginRight: 6,cursor: 'pointer', }}>
                            @{reply.mentionUser.username}
                          </Text>
                        )}
                        {reply.content}
                      </Paragraph>
                    </div>

                    <div style={{textAlign: 'right', color: '#7a8580' }}>
                      <div>📅 {formatDate(reply.createdAt)}</div>

                      <Button
                        size="small"
                        icon={reply.isLiked ? <LikeFilled style={{ color: GREEN }} /> : <LikeOutlined />}
                        onClick={() => handleCommentLike(reply._id)}
                        loading={commentLikeLoading === reply._id}
                      >
                        {reply.likeCount || 0}
                      </Button>

                      <Button
                        size="small"
                        icon={<CommentOutlined />}
                        onClick={() => handleReplyToComment(reply)}
                      >
                        Reply
                      </Button>
                    </div>
                  </div>

                  {replyingToComment?._id === reply._id && (
                    <div style={{ marginTop: 12 }}>
                      <Form
                        layout="vertical"
                        onFinish={(values) => handleCreateComment(values, reply)}
                      >
                        <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                          Replying to {reply.author?.username || 'this comment'}
                        </Text>

                        <Form.Item
                          name="mentionUser"
                          label="@ Mention user"
                        >
                          <Select
                            showSearch
                            allowClear
                            filterOption={false}
                            onSearch={handleSearchUsers}
                            options={userOptions}
                            loading={userSearching}
                            placeholder="Search user to mention"
                          />
                        </Form.Item>

                        <Form.Item
                          name="content"
                          rules={[
                            { required: true, message: 'Please write a reply' },
                            { max: 1000, message: 'Reply cannot exceed 1000 characters' },
                          ]}
                        >
                          <TextArea rows={3} maxLength={1000} showCount placeholder="Write your reply..." />
                        </Form.Item>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                          <Button onClick={() => setReplyingToComment(null)}>
                            Cancel
                          </Button>
                          <Button
                            type="primary"
                            htmlType="submit"
                            loading={commentSubmitting}
                            style={{ background: GREEN, borderColor: GREEN }}
                          >
                            Submit
                          </Button>
                        </div>
                      </Form>
                    </div>
                  )}
                </Card>
              ))}
              {(repliesByRoot[comment._id] || []).length > 3 && (
                <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center',}}>
                  <Button
                    type="link"
                    onClick={() => toggleRepliesExpanded(comment._id)}
                    style={{ 
                      color: GREEN,
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                     }}
                  >
                    {isRepliesExpanded(comment._id)
                      ? 'Collapse replies'
                      : `View ${(repliesByRoot[comment._id] || []).length - 3} more replies`}
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>

        {rootComments.length > COMMENT_PAGE_SIZE && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
            <Pagination
              current={commentPage}
              pageSize={COMMENT_PAGE_SIZE}
              total={rootComments.length}
              onChange={setCommentPage}
            />
          </div>
        )}
        </>
      )}
    </div>
    
  )
}

export default ForumDetailPage