import { useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Avatar, Button, Card, Empty, Spin, Statistic, Typography, App as AntdApp } from 'antd'
import {
  DownOutlined,
  HeartOutlined,
  MessageOutlined,
  ProductOutlined,
  ReadOutlined,
  UpOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { getCreatorProfileAPI } from '../apis/user'
import RecipePreviewCard from './recipe/RecipePreviewCard'
import ProductPreviewCard from './marketplace/ProductPreviewCard'
import ForumPreviewCard from './forum/ForumPreviewCard'
import './recipe/RecipeBlogPage.css'
import './marketplace/ProductBlogPage.css'
import './forum/ForumPreviewCard.css'

const { Title, Paragraph } = Typography
const GREEN = '#50806B'
const GREEN_DARK = '#2F3D37'
const cardStyle = {
  borderRadius: 10,
  boxShadow: '0 8px 24px rgba(47, 61, 55, 0.12)',
}

function CreatorProfilePage() {
  const { id } = useParams()
  const { message: messageApi } = AntdApp.useApp()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [expandedSections, setExpandedSections] = useState({
    recipes: false,
    products: false,
    forumPosts: false,
  })

  useEffect(() => {
    setLoading(true)

    getCreatorProfileAPI(id)
      .then((res) => {
        setProfile(res.data)
      })
      .catch((err) => {
        setProfile(null)
        messageApi.error(err.response?.data?.message || 'Failed to load creator profile')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [id, messageApi])

  const creator = profile?.creator
  const stats = profile?.stats || {}
  const published = profile?.published || {}
  const recipes = published.recipes || []
  const products = published.products || []
  const forumPosts = published.forumPosts || []

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  const renderSectionHeader = (title, count, section) => {
    const expanded = expandedSections[section]
    const canExpand = count > 4

    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0, color: GREEN_DARK }}>
          {title}
        </Title>
        {canExpand && (
          <Button
            type="text"
            onClick={() => toggleSection(section)}
            icon={expanded ? <UpOutlined /> : <DownOutlined />}
            style={{ color: GREEN, fontWeight: 700 }}
          >
            {expanded ? 'Collapse' : 'Expand'}
          </Button>
        )}
      </div>
    )
  }

  const visibleRecipes = expandedSections.recipes ? recipes : recipes.slice(0, 4)
  const visibleProducts = expandedSections.products ? products : products.slice(0, 4)
  const visibleForumPosts = expandedSections.forumPosts ? forumPosts : forumPosts.slice(0, 4)

  return (
    <div style={{ maxWidth: 960, margin: '2.5rem auto 5rem', padding: '0 1.5rem' }}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <Spin size="large" />
        </div>
      ) : !creator ? (
        <Empty description="Creator profile not found" />
      ) : (
        <>
          <Card style={{ ...cardStyle, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
              <Avatar
                size={88}
                src={creator.profilePicture || null}
                icon={!creator.profilePicture && <UserOutlined />}
                style={{ background: GREEN, flexShrink: 0 }}
              >
                {!creator.profilePicture && creator.username?.[0]?.toUpperCase()}
              </Avatar>

              <div style={{ minWidth: 0, flex: '1 1 260px' }}>
                <Title level={2} style={{ margin: 0, color: GREEN_DARK }}>
                  {creator.username}
                </Title>
                {creator.bio && (
                  <Paragraph style={{ margin: '8px 0 0', color: '#5f6b65' }}>
                    {creator.bio}
                  </Paragraph>
                )}
              </div>
            </div>
          </Card>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
            <Card style={cardStyle}>
              <Statistic
                title="Products"
                value={stats.productCount || 0}
                prefix={<ProductOutlined />}
                valueStyle={{ color: GREEN }}
              />
            </Card>

            <Card style={cardStyle}>
              <Statistic
                title="Recipes"
                value={stats.recipeCount || 0}
                prefix={<ReadOutlined />}
                valueStyle={{ color: GREEN }}
              />
            </Card>

            <Card style={cardStyle}>
              <Statistic
                title="Forum Posts"
                value={stats.forumCount || 0}
                prefix={<MessageOutlined />}
                valueStyle={{ color: GREEN }}
              />
            </Card>

            <Card style={cardStyle}>
              <Statistic
                title="Likes Received"
                value={stats.likeCount || 0}
                prefix={<HeartOutlined />}
                valueStyle={{ color: GREEN }}
              />
            </Card>
          </div>

          <section style={{ marginTop: 36 }}>
            {renderSectionHeader('Published Recipes', recipes.length, 'recipes')}
            {recipes.length === 0 ? (
              <Card style={cardStyle}>
                <Empty description="No published recipes yet" />
              </Card>
            ) : (
              <div className="recipe-card-grid">
                {visibleRecipes.map((recipe) => (
                  <RecipePreviewCard key={recipe._id} recipe={recipe} showSubcategory />
                ))}
              </div>
            )}
          </section>

          <section style={{ marginTop: 36 }}>
            {renderSectionHeader('Published Products', products.length, 'products')}
            {products.length === 0 ? (
              <Card style={cardStyle}>
                <Empty description="No published products in stock yet" />
              </Card>
            ) : (
              <div className="product-card-grid">
                {visibleProducts.map((product) => (
                  <ProductPreviewCard key={product._id} product={product} />
                ))}
              </div>
            )}
          </section>

          <section style={{ marginTop: 36 }}>
            {renderSectionHeader('Forum Posts', forumPosts.length, 'forumPosts')}
            {forumPosts.length === 0 ? (
              <Card style={cardStyle}>
                <Empty description="No forum posts yet" />
              </Card>
            ) : (
              <div style={{ display: 'grid', gap: 16 }}>
                {visibleForumPosts.map((post) => (
                  <ForumPreviewCard key={post._id} post={post} />
                ))}
              </div>
            )}
          </section>
        </>
      )
      }
    </div>
  )
}

export default CreatorProfilePage
