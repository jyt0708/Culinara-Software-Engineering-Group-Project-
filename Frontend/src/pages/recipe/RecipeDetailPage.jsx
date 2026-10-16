import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
  Card, Avatar, Button, Image, Typography, Tag, Modal, Spin, Empty, Space, App as AntdApp, Popconfirm, Alert,
} from 'antd'
import { EditOutlined, DeleteOutlined, ArrowLeftOutlined, LikeOutlined, LikeFilled, DislikeOutlined, DislikeFilled} from '@ant-design/icons'
import { getRecipeAPI, incrementRecipeViewAPI, deleteRecipeAPI, toggleLikeAPI, toggleDislikeAPI } from '../../apis/recipe'
import {
  getCategoryLabel, getSubcategoryLabel, getDifficultyLabel,
} from '../../constants/categories'
import ProductPreviewCard from '../marketplace/ProductPreviewCard'
import '../marketplace/ProductBlogPage.css'

const { Title, Text, Paragraph } = Typography

const GREEN = '#50806B'
const GREEN_DARK = '#2F3D37'
const RED = '#c25450'

function RecipeDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { userInfo } = useSelector((state) => state.user)
  const { message: messageApi } = AntdApp.useApp()

  const [recipe, setRecipe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [paywalled, setPaywalled] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [dislikeCount, setDislikeCount] = useState(0)
  const [isLiked, setIsLiked] = useState(false)
  const [isDisliked, setIsDisliked] = useState(false)
  const [likeLoading, setLikeLoading] = useState(false)

  // 加载详情时如果后端返回 paywalled，就切换到订阅引导弹窗。
  useEffect(() => {
    setLoading(true)
    getRecipeAPI(id)
      .then((res) => {
        setRecipe((current) => {
          if (typeof current?.viewCount === 'number' && current.viewCount > (res.data.viewCount ?? 0)) {
            return { ...res.data, viewCount: current.viewCount }
          }
          return res.data
        })
        setLikeCount(res.data.likeCount ?? 0)
        setDislikeCount(res.data.dislikeCount ?? 0)
        setIsLiked(res.data.isLiked ?? false)
        setIsDisliked(res.data.isDisliked ?? false)
      })
      .catch((err) => {
        if (err.response?.status === 403 && err.response?.data?.paywalled) {
          setPaywalled(true)
        } else if (err.response?.status === 404) {
          messageApi.error('Recipe not found')
          setTimeout(() => navigate('/', { replace: true }), 1000)
        } else {
          messageApi.error(err.response?.data?.message || 'Failed to load recipe')
        }
      })
      .finally(() => setLoading(false))
  }, [navigate, messageApi])

  useEffect(() => {
    if (!recipe?._id || !userInfo?._id) return

    // 同一用户在当前浏览器会话中，同一篇菜谱只计一次浏览量。
    const viewKey = `viewed-recipe-${userInfo._id}-${recipe._id}`
    const alreadyCounted = sessionStorage.getItem(viewKey)

    if (alreadyCounted) return

    sessionStorage.setItem(viewKey, 'true')
    incrementRecipeViewAPI(recipe._id)
      .then((viewRes) => {
        if (typeof viewRes.viewCount === 'number') {
          setRecipe((current) => current ? { ...current, viewCount: viewRes.viewCount } : current)
        }
      })
      .catch(() => {
        sessionStorage.removeItem(viewKey)
      })
  }, [recipe?._id, userInfo?._id])

  // 删除成功后回到首页，后端会同步清理关联讨论帖。
  const handleDelete = async () => {
    try {
      await deleteRecipeAPI(id)
      messageApi.success('Recipe deleted')
      setTimeout(() => navigate('/', { replace: true }), 800)
    } catch (err) {
      messageApi.error(err.response?.data?.message || 'Delete failed')
    }
  }

  // 点赞和点踩互斥，结果以后端返回的最新数量为准。
  const handleLike = async () => {
    if (likeLoading) return
    setLikeLoading(true)
    try {
      const res = await toggleLikeAPI(id)
      setLikeCount(res.likeCount)
      setDislikeCount(res.dislikeCount)
      setIsLiked(res.isLiked)
      setIsDisliked(res.isDisliked)
    } catch (err) {
      messageApi.error(err.response?.data?.message || 'Failed')
    } finally {
      setLikeLoading(false)
    }
  }

  // 点踩同样走后端状态，避免前端自己猜测数量。
  const handleDislike = async () => {
    if (likeLoading) return
    setLikeLoading(true)
    try {
      const res = await toggleDislikeAPI(id)
      setLikeCount(res.likeCount)
      setDislikeCount(res.dislikeCount)
      setIsLiked(res.isLiked)
      setIsDisliked(res.isDisliked)
    } catch (err) {
      messageApi.error(err.response?.data?.message || 'Failed')
    } finally {
      setLikeLoading(false)
    }
  }

  const leavePaywall = () => {
    setPaywalled(false)
    navigate('/recipes')
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '4rem' }}><Spin size="large" /></div>
  }

  // 详情接口返回 paywalled 时，只显示订阅引导，不渲染正文内容。
  if (paywalled) {
    const isExpired = userInfo?.subscriptionExpiry && new Date(userInfo.subscriptionExpiry) <= new Date()
    return (
      <div style={{ maxWidth: 600, margin: '4rem auto', padding: '0 1.5rem' }}>
        <Modal
          open={true}
          closable={false}
          maskClosable={false}
          footer={null}
          centered
        >
          <div style={{ textAlign: 'center', padding: '1rem 0.5rem' }}>
            <Title level={3} style={{ color: RED, marginBottom: 12 }}>
              {isExpired ? 'Your subscription has expired' : "You've reached your free limit"}
            </Title>
            <Paragraph style={{ color: '#5d625f', marginBottom: 24 }}>
              {isExpired ? (
                <>Your subscription has expired.<br />Resubscribe to unlock unlimited access.</>
              ) : (
                <>You've already viewed 2 free recipes in the past 72 hours.<br />Subscribe to Culinara to unlock unlimited access.</>
              )}
            </Paragraph>
            <Space>
              <Button onClick={leavePaywall}>Back to Recipes</Button>
              <Button
                type="primary"
                style={{ background: GREEN, borderColor: GREEN }}
                onClick={() => navigate('/profile?tab=Subscription')}
              >
                {isExpired ? 'Resubscribe' : 'Subscribe'}
              </Button>
            </Space>
          </div>
        </Modal>
      </div>
    )
  }

  if (!recipe) {
    return <div style={{ padding: '4rem', textAlign: 'center' }}><Empty description="Recipe unavailable" /></div>
  }

  const isOwner = userInfo?._id && String(recipe.creator?._id) === String(userInfo._id)

  return (
    <div style={{ maxWidth: 1260, margin: '0 auto', padding: '2rem 2rem 5rem' }}>
      <Button
        type="link"
        icon={<ArrowLeftOutlined />}
        onClick={() => {
          if (location.state?.fromSubmit) {
            navigate('/recipes', { replace: true })
          }else {
            navigate(-1)
          }
        }}
        style={{ paddingLeft: 0, color: GREEN_DARK, marginBottom: 12 }}
      >
        Back
      </Button>

      {/* 左侧封面保持 sticky，右侧正文负责承载较长的食材和步骤内容。 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '360px minmax(0, 1fr)',
        gap: '4rem',
        alignItems: 'start',
      }}>

        {/* 固定比例封面避免图片高度变化导致详情页布局跳动。 */}
        <aside style={{ position: 'sticky', top: 88 }}>
          <div
            style={{
              width: '100%', aspectRatio: '4 / 5', borderRadius: 8,
              overflow: 'hidden', boxShadow: '0 2px 18px rgba(0,0,0,0.08)',
              backgroundImage: `linear-gradient(180deg,rgba(0,0,0,0.02),rgba(0,0,0,0.18)), url(${recipe.coverImage})`,
              backgroundSize: 'cover', backgroundPosition: 'center',
            }}
          />

          {(recipe.coverCaptionTitle || recipe.coverCaptionText) && (
            <div style={{ marginTop: '1.35rem' }}>
              {recipe.coverCaptionTitle && (
                <Text strong style={{ display: 'block', fontSize: '0.96rem', marginBottom: 6, color: '#151515' }}>
                  {recipe.coverCaptionTitle}
                </Text>
              )}
              {recipe.coverCaptionText && (
                <Paragraph style={{ fontSize: '0.95rem', lineHeight: 1.55, color: '#5d625f', marginBottom: 0 }}>
                  {recipe.coverCaptionText}
                </Paragraph>
              )}
            </div>
          )}

          <div style={{ marginTop: '1.4rem', paddingTop: '1.3rem', borderTop: '1px solid #e7e7e7' }}>
            <Link to={`/users/${recipe.creator?._id}`} style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
              <Avatar
                size={36}
                src={recipe.creator?.profilePicture || null}
                style={{ background: 'linear-gradient(135deg,#f9b8c8,#e879a0)', border: `2px solid ${GREEN}` }}
              >
                {recipe.creator?.username?.[0]?.toUpperCase()}
              </Avatar>
              <Text strong style={{ color: '#111' }}>{recipe.creator?.username}</Text>
            </Link>
            <Text type="secondary" style={{ display: 'block', marginTop: 12, fontSize: '0.85rem' }}>
              Published {new Date(recipe.createdAt).toLocaleDateString()}
            </Text>
            <Text type="secondary" style={{ display: 'block', fontSize: '0.85rem' }}>
              {recipe.viewCount} views
            </Text>

            {isOwner && (
              <Space style={{ marginTop: 16 }}>
                <Button
                  icon={<EditOutlined />}
                  onClick={() => navigate(`/recipes/edit/${recipe._id}`)}
                >Edit</Button>
                <Popconfirm
                  title="Delete this recipe?"
                  description="This cannot be undone."
                  okText="Delete" cancelText="Cancel"
                  okButtonProps={{ danger: true }}
                  onConfirm={handleDelete}
                >
                  <Button danger icon={<DeleteOutlined />}>Delete</Button>
                </Popconfirm>
              </Space>
            )}
            {recipe.forumPost?._id && (
              <div
                style={{
                  marginTop: 16,
                  padding: '12px 14px',
                  border: '1px solid #e4ece8',
                  borderRadius: 8,
                  background: '#f7faf8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <Text strong style={{ color: GREEN_DARK, fontSize: '0.92rem' }}>
                  Have a question ?
                </Text>

                <Button
                  size="small"
                  type="primary"
                  style={{
                    background: GREEN,
                    borderColor: GREEN,
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                  onClick={() => navigate(`/forum/${recipe.forumPost._id}`)}
                >
                  Discuss in Forum
                </Button>
              </div>
            )}
          </div>
        </aside>

        <article>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem', marginBottom: 12 }}>
            <Title level={1} style={{ color: GREEN_DARK, marginBottom: 0, flex: 1 }}>
              {recipe.title}
            </Title>
            <Space style={{ flexShrink: 0, paddingTop: 6 }}>
              <Button
                icon={isLiked ? <LikeFilled style={{ color: GREEN }} /> : <LikeOutlined />}
                onClick={handleLike}
                loading={likeLoading}
                disabled={isOwner}
                title={isOwner ? 'You cannot like your own recipe' : ''}
              >
                {likeCount}
              </Button>
              <Button
                icon={isDisliked ? <DislikeFilled style={{ color: RED }} /> : <DislikeOutlined />}
                onClick={handleDislike}
                loading={likeLoading}
                disabled={isOwner}
                title={isOwner ? 'You cannot dislike your own recipe' : ''}
              >
                {dislikeCount}
              </Button>
            </Space>
          </div>

          <Space wrap style={{ marginBottom: 20 }}>
            <Tag color="green">{getCategoryLabel(recipe.category)}</Tag>
            <Tag>{getSubcategoryLabel(recipe.category, recipe.subcategory)}</Tag>
            <Tag color="orange">{getDifficultyLabel(recipe.difficulty)}</Tag>
            <Tag color="blue">{recipe.cookTime} min</Tag>
          </Space>

          {dislikeCount >= 1 && (
            <Alert
              type="warning"
              showIcon
              message="This recipe has received a high number of dislikes. Please try with caution."
              style={{ marginBottom: 16 }}
            />
          )}

          {recipe.summary && (
            <Paragraph style={{ fontSize: '1.05rem', lineHeight: 1.7, color: '#3a3a3a', marginBottom: 32 }}>
              {recipe.summary}
            </Paragraph>
          )}

          <section style={{ marginBottom: 36 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
              <Title level={3} style={{ color: GREEN_DARK, margin: 0 }}>Ingredients</Title>
              <Text type="secondary">{recipe.ingredients?.length || 0} items</Text>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {recipe.ingredients?.map((ing, i) => {
                const name  = typeof ing === 'string' ? ing : ing.name
                const image = typeof ing === 'object' ? (ing.image || '') : ''
                return (
                  <li key={i} style={{
                    padding: '0.65rem 0', borderBottom: '1px solid #f0f0f0',
                    fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <span style={{ color: GREEN, fontWeight: 700 }}>•</span>
                    {image && (
                      <Image
                        src={image}
                        width={48}
                        height={48}
                        style={{ objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
                        preview={{ mask: null }}
                      />
                    )}
                    {name}
                  </li>
                )
              })}
            </ul>
          </section>

          <section style={{ marginBottom: 36 }}>
            <Title level={3} style={{ color: GREEN_DARK, marginBottom: 16 }}>Instructions</Title>
            {recipe.steps?.map((step, i) => (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 20,
                paddingBottom: 24, marginBottom: 24, borderBottom: i < recipe.steps.length - 1 ? '1px solid #f0f0f0' : 'none',
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', background: GREEN, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: '1.1rem', flexShrink: 0,
                }}>{i + 1}</div>
                <div>
                  {step.title && (
                    <Title level={4} style={{ marginTop: 4, marginBottom: 8, color: '#1a1a1a' }}>
                      {step.title}
                    </Title>
                  )}
                  {step.images?.length > 0 && (
                    <Image.PreviewGroup>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
                        {step.images.map((img, j) => (
                          <Image
                            key={j} src={img} alt={`step ${i + 1} ${j + 1}`}
                            width={160} height={120}
                            style={{ objectFit: 'cover', borderRadius: 7 }}
                          />
                        ))}
                      </div>
                    </Image.PreviewGroup>
                  )}
                  <Paragraph style={{ fontSize: '1rem', lineHeight: 1.7, color: '#3a3a3a', marginBottom: 0 }}>
                    {step.description}
                  </Paragraph>
                </div>
              </div>
            ))}
          </section>

          {recipe.tips?.length > 0 && (
            <section>
              <Title level={3} style={{ color: GREEN_DARK, marginBottom: 12 }}>Quick Tips</Title>
              <ul style={{ paddingLeft: 20, margin: 0 }}>
                {recipe.tips.map((tip, i) => (
                  <li key={i} style={{ marginBottom: 8, color: '#3a3a3a', lineHeight: 1.65 }}>
                    {tip}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {recipe.linkedProducts?.length > 0 && (
            <section style={{ marginTop: 36 }}>
              <Title level={3} style={{ color: GREEN_DARK, marginBottom: 16 }}>Related Products</Title>
              <div className="product-card-grid">
                {recipe.linkedProducts.map((product) => (
                  <ProductPreviewCard key={product._id} product={product} showRating={false} />
                ))}
              </div>
            </section>
          )}
        </article>
      </div>
    </div>
  )
}

export default RecipeDetailPage
