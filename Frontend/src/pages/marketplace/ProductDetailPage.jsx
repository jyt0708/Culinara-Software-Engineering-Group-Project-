import { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams, Link, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
  Card, Avatar, Button, Image, Typography, Tag, Modal, Spin, 
  Empty, Space, Divider, Table, App as AntdApp, Popconfirm, Alert,
  Carousel,
} from 'antd'
import { 
  EditOutlined, DeleteOutlined, ArrowLeftOutlined,
  LikeOutlined, LikeFilled, DislikeOutlined, DislikeFilled 
} from '@ant-design/icons'
import {
  getProductsAPI, deleteProductAPI, getProductAPI, incrementProductViewAPI
} from '../../apis/product'
import { getMyOrdersAPI } from '../../apis/order'
import { getRecipeByCreatorAPI } from '../../apis/recipe'
import { getCategoryLabel } from '../../constants/productCategories'
import CheckoutModal from '../../components/marketplace/CheckoutModal'
import RateProductModal from '../../components/marketplace/RateProductModal'
import RecipePreviewCard from '../recipe/RecipePreviewCard'

const { Title, Text, Paragraph } = Typography

const GREEN = '#50806B'
const GREEN_DARK = '#2F3D37'
const RED = '#c25450'

function ProductDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { userInfo, hasToken } = useSelector((state) => state.user)
  const { message: messageApi } = AntdApp.useApp()

  const [product, setProduct] = useState(null)
  const [rating, setRating] = useState([])
  const [relatedRecipes, setRelatedRecipes] = useState([])
  const [loading, setLoading] = useState(true)

  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [rateOpen, setRateOpen] = useState(false)
  const [canRate, setCanRate] = useState(false)
  const [expandedRatings, setExpandedRatings] = useState(false)

  const carouselRef = useRef(null)
  const [activeSlide, setActiveSlide] = useState(0)

  // combine coverImage and images
  const imagesList = product 
    ? [product.coverImage, ...(product.images || [])].filter(Boolean)
    : []

  const specificationColumns = [
    {
      dataIndex: 'name1',
      width: '20%',
      render: text => <Text type="secondary">{text}</Text>,
    },
    {
      dataIndex: 'value1',
      width: '30%',
      render: text => <Text strong>{text}</Text>,
    },
    {
      dataIndex: 'name2',
      width: '20%',
      render: text => <Text type="secondary">{text}</Text>,
    },
    {
      dataIndex: 'value2',
      width: '30%',
      render: text => <Text strong>{text}</Text>,
    },
  ]

  const buildSpecificationTableData = (specifications = []) => {
    const validSpecs = specifications.filter(
      spec => spec.name || spec.value
    )

    const rows = []

    for (let i = 0; i < validSpecs.length; i += 2) {
      rows.push({
        key: i,
        name1: validSpecs[i]?.name || '',
        value1: validSpecs[i]?.value || '',
        name2: validSpecs[i + 1]?.name || '',
        value2: validSpecs[i + 1]?.value || '',
      })
    }
    return rows
  } 

  const loadRelatedRecipes = async (creatorId, productId) => {
    if (!creatorId || !productId) {
      setRelatedRecipes([])
      return
    }

    try {
      const res = await getRecipeByCreatorAPI(creatorId)
      const recipes = (res?.data || []).filter((recipe) => {
        const linkedProducts = recipe.linkedProducts || []
        return linkedProducts.some((linkedProduct) => {
          if (!linkedProduct) return false
          if (typeof linkedProduct === 'string') {
            return String(linkedProduct) === String(productId)
          }
          return String(linkedProduct._id || linkedProduct) === String(productId)
        })
      })
      setRelatedRecipes(recipes)
    } catch {
      setRelatedRecipes([])
    }
  }

  // Reusable product loader (refreshes stock / average rating after purchase/rating).
  const loadProduct = (withSpinner = false) => {
    if (withSpinner) setLoading(true)
    return getProductAPI(id)
      .then((res) => {
        const productData = res.data
        setProduct(productData)
        setRating(productData.ratings || [])
        loadRelatedRecipes(productData.createdBy?._id, productData._id)
        return productData
      })
      .catch((err) => {
        if (err.response?.status === 404) {
          messageApi.error('Product not found')
          setTimeout(() => navigate('/', { replace: true }), 1000)
        } else {
          messageApi.error(err.response?.data?.message || 'Failed to load product')
        }
      })
      .finally(() => { if (withSpinner) setLoading(false) })
  }

  // Determine whether the current user can rate this product:
  // has at least one completed order for it that hasn't been rated yet.
  const refreshRatingEligibility = async () => {
    if (!hasToken) {
      setCanRate(false)
      return
    }
    try {
      const res = await getMyOrdersAPI()
      const orders = res?.data || []
      const eligible = orders.some((o) => {
        const matches =
          String(o.product?._id) === String(id) || String(o.product) === String(id)
        return matches && o.status === 'completed' && o.ratedByBuyer === false
      })
      setCanRate(eligible)
    } catch {
      // A failed orders fetch must not break the page; just skip the rating entry.
      setCanRate(false)
    }
  }

  useEffect(() => {
    loadProduct(true)

    // Only increment viewCount once within the current session
    const viewKey = `viewed-product-${id}`
    if (!sessionStorage.getItem(viewKey)) {
      sessionStorage.setItem(viewKey, 'true')
      incrementProductViewAPI(id).catch(() => {
        sessionStorage.removeItem(viewKey)
      })
    }

    refreshRatingEligibility()
  }, [id, navigate, messageApi, hasToken])

  const handleDelete = async () => {
    try {
      await deleteProductAPI(id)
      messageApi.success('Product deleted')
      setTimeout(() => navigate('/', { replace: true }), 800)
    } catch (err) {
      messageApi.error(err.response?.data?.message || 'Delete failed')
    }
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '4rem' }}><Spin size="large" /></div>
  }

  const isOwner = userInfo?._id && String(product.createdBy?._id) === String(userInfo._id)

  return (
    <div style={{ maxWidth: 1260, margin: '0 auto', padding: '2rem 2rem 5rem' }}>
      <Button
        type="link"
        icon={<ArrowLeftOutlined />}
        onClick={() => {
          if (location.state?.fromSubmit) {
            navigate('/products', { replace: true })
          } else {
            navigate(-1)
          }
        }}
        style={{ paddingLeft: 0, color: GREEN_DARK, marginBottom: 12 }}
      >
        Back
      </Button>

      <div style={{ 
        display: 'grid',
        gridTemplateColumns: '360px minmax(0, 1fr)',
        gap: '4rem',
        alignItems: 'start',
      }}>
        <aside style={{ position: 'sticky', top: 88 }}>

          <div style={{ width: '100%' }}>
            <Carousel
              ref={carouselRef} 
              afterChange={(current) => setActiveSlide(current)}
              arrows 
              style={{
                borderRadius: 8,
                overflow: 'hidden',
                boxShadow: '0 2px 18px rgba(0,0,0,0.08)',
                backgroundColor: '#f5f5f5'
              }}
            >
              {imagesList.map((img, index) => (
                <div key={index}>
                  <div
                    style={{
                      width: '100%',
                      aspectRatio: '4 / 5',
                      backgroundImage: `url(${img})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  />
                </div>
              ))}
            </Carousel>

            {imagesList.length > 1 && (
              <div style={{ 
                display: 'flex', 
                gap: 8, 
                marginTop: 12, 
                overflowX: 'auto',
                padding: '2px'
              }}>
                {imagesList.map((img, index) => (
                  <div
                    key={index}
                    onClick={() => carouselRef.current.goTo(index)}
                    style={{
                      width: 58,
                      height: 58,
                      flexShrink: 0,
                      borderRadius: 4,
                      cursor: 'pointer',
                      border: activeSlide === index ? `2px solid ${GREEN}` : '2px solid transparent',
                      transition: 'all 0.2s',
                      backgroundImage: `url(${img})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      opacity: activeSlide === index ? 1 : 0.7
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {(product.imageTitle || product.imageDescription) && (
            <div style={{ marginTop: '1.35rem' }}>
              {product.imageTitle && (
                <Text strong style={{ display: 'block', fontSize: '0.96rem', marginBottom: 6, color: '#151515' }}>
                  {product.imageTitle}
                </Text>
              )}
              {product.imageDescription && (
                <Paragraph style={{ fontSize: '0.95rem', lineHeight: 1.55, color: '#5d625f', marginBottom: 0 }}>
                  {product.imageDescription}
                </Paragraph>
              )}
            </div>
          )}

          <div style={{ marginTop: '1.4rem', paddingTop: '1.3rem', borderTop: '1px solid #e7e7e7' }}>
            <Link to={`/users/${product.createdBy?._id}`} style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
              <Avatar
                size={36}
                src={product.createdBy?.profilePicture || null}
                style={{ background: 'linear-gradient(135deg,#f9b8c8,#e879a0)', border: `2px solid ${GREEN}` }}
              >
                {product.createdBy?.username?.[0]?.toUpperCase()}
              </Avatar>
              <Text strong style={{ color: '#111' }}>{product.creator?.username}</Text>
            </Link>
            <Text type="secondary" style={{ display: 'block', marginTop: 12, fontSize: '0.85rem' }}>
              Published {new Date(product.createdAt).toLocaleDateString()}
            </Text>
            <Text type="secondary" style={{ display: 'block', fontSize: '0.85rem' }}>
              {product.viewCount} views
            </Text>

            {isOwner && (
              <Space style={{ marginTop: 16 }}>
                <Button
                  icon={<EditOutlined />}
                  onClick={() => navigate(`/products/edit/${product._id}`)}
                >Edit</Button>
                <Popconfirm
                  title="Delete this product?"
                  description="This cannot be undone."
                  okText="Delete" cancelText="Cancel"
                  okButtonProps={{ danger: true }}
                  onConfirm={handleDelete}
                >
                  <Button danger icon={<DeleteOutlined />}>Delete</Button>
                </Popconfirm>
              </Space>
            )}
          </div>
        </aside>

        <article>
          <Title level={1} style={{ color: GREEN_DARK,flex: 1, marginBottom: 12 }}>
            {product.name}
          </Title>

          <Space wrap>
            <Tag color="green">{getCategoryLabel(product.category)}</Tag>
            <Tag color="orange">{product.origin}</Tag>
            { product.specifications?.map((spec, index) => 
                spec.name && spec.value ? (
                  <Tag key={index} color="blue">
                    {spec.value}
                  </Tag>
                ): null
            )}
          </Space>
          <div style={{ display: 'flex', alignItems: 'center', gap: 30, flexWrap: 'wrap', marginTop: 10, marginBottom: 10 }}>
            <Title level={2} style={{ fontWeight: 'bold', color: '#50806B', margin: 0 }}>
              €{product.price?.toFixed(2) || '0.00'}
            </Title>

            {hasToken && !isOwner && userInfo?.role !== 'admin' && (
              <Button
                type="primary"
                size="large"
                disabled={product.stock <= 0}
                style={{
                  background: product.stock <= 0 ? undefined : GREEN,
                  borderColor: product.stock <= 0 ? undefined : GREEN,
                }}
                onClick={() => setCheckoutOpen(true)}
              >
                {product.stock <= 0 ? 'Out of stock' : 'Buy Now'}
              </Button>
            )}
          </div>
          <Text type="secondary">{product.averageRating?.toFixed(1) || '0.0'} Customer Rating </Text>

          <Paragraph style={{ fontSize: '1.05rem', marginTop: 20, marginBottom: 12, whiteSpace: 'pre-wrap' }}>
            {product.description}
          </Paragraph>

          <Divider />

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            <Typography.Title level={4} style={{ margin: 0 }}>
              Product Specifications
            </Typography.Title>
            <Typography.Text type="secondary">
              {product.specifications?.length || 0} details
            </Typography.Text>
          </div>

          <Table
            columns={specificationColumns}
            dataSource={buildSpecificationTableData([
              { name: 'Weight', value: `${product.weight} kg` },
              { name: 'Origin', value: product.origin },
              ...(product.specifications || [])
            ])}
            showHeader={false}
            pagination={false}
            size="small"
          />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, flexWrap: 'wrap', gap: 12 }}>
            <Typography.Title level={4} style={{ marginBottom: 20 }}>
              Customer Ratings
            </Typography.Title>
            {canRate && (
              <Button
                type="primary"
                style={{ background: GREEN, borderColor: GREEN }}
                onClick={() => setRateOpen(true)}
              >
                Rate this product
              </Button>
            )}
          </div>

          {rating.length === 0 ? (
            <Empty description="No ratings yet" />
          ) : (
            <>
              {rating
                .slice(0, expandedRatings ? rating.length : 4)
                .map((r, index) => (
                  <Card key={index} style={{ marginBottom: 12 }}>
                    <Space>
                      <Avatar src={r.userId?.profilePicture}>
                        {r.userId?.username?.[0]?.toUpperCase()}
                      </Avatar>

                      <div>
                        <Text strong>{r.userId?.username}</Text>
                        <div>
                          <Text type="secondary">
                            Rating: {r.rating} / 5
                          </Text>
                        </div>
                      </div>
                    </Space>
                  </Card>
                ))}
              
              {rating.length > 4 && (
                <Button
                  type="link"
                  style={{ paddingLeft: 0, marginTop: 12 }}
                  onClick={() => setExpandedRatings(!expandedRatings)}
                >
                  {expandedRatings 
                    ? 'Collapse'
                    : `Expand (${rating.length - 4} more ${rating.length - 4 === 1 ? 'rating' : 'ratings'})`}
                </Button>
              )}
            </>
          )}

          {relatedRecipes.length > 0 && (
            <div style={{ marginTop: 32 }}>
              <Typography.Title level={4} style={{ marginBottom: 16 }}>
                Recipes featuring this product
              </Typography.Title>
              <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
                {relatedRecipes.map((recipe) => (
                  <RecipePreviewCard key={recipe._id} recipe={recipe} />
                ))}
              </div>
            </div>
          )}
        </article>
      </div>

      <CheckoutModal
        open={checkoutOpen}
        product={product}
        onClose={() => setCheckoutOpen(false)}
        onPurchased={() => {
          loadProduct(false)
          refreshRatingEligibility()
        }}
      />

      <RateProductModal
        open={rateOpen}
        productId={id}
        productName={product.name}
        onClose={() => setRateOpen(false)}
        onRated={() => {
          loadProduct(false)
          refreshRatingEligibility()
        }}
      />
    </div>
  )
}

export default ProductDetailPage
