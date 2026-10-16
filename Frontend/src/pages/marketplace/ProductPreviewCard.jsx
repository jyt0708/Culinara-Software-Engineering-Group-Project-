import { Link } from 'react-router-dom'
import { Avatar, Card, Tag, Typography } from 'antd'
import { EyeOutlined, StarFilled } from '@ant-design/icons'
import { getCategoryLabel } from '../../constants/productCategories'

const { Title, Paragraph } = Typography

const CATEGORY_COLORS = {
  seasoning: 'blue',
  proteins: 'pink',
  accessories: 'gold',
  staple: 'magenta',
}

function formatDate(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function ProductPreviewCard({ product, showRating = true }) {
  const categoryLabel = getCategoryLabel(product.category)

  return (
    <Link className='product-card-link' to={`/products/${product._id}`}>
      <Card
        className="product-preview-card"
        hoverable
        cover={<img src={product.coverImage} alt={product.name} />}
      >
        <Tag color={CATEGORY_COLORS[product.category]}>{categoryLabel}</Tag>
        <Title level={4}>{product.name}</Title>
        <Paragraph ellipsis={{ rows: 2 }}>
          {product.description || 'A community recipe ready for your next cooking session.'}
        </Paragraph>
        <div className="product-preview-meta">
          {/* Price */}
          <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#0c0c0df6' }}>
            €{product.price?.toFixed(2) || '0.00'}
          </span>

          <div>
            {showRating && (
              <span>
                <StarFilled style={{ color: '#fadb14' }} />
                {product.averageRating?.toFixed(1) || '0.0'}
                <span className="rating-count">({product.ratingCount || 0})</span>
              </span>
            )}
            <span><EyeOutlined /> {product.viewCount || 0}</span>
          </div>
        </div>
        <div className="product-preview-author">
          <Avatar size={24} src={product.createdBy?.profilePicture}>
            {product.createdBy?.username?.[0]?.toUpperCase()}
          </Avatar>
          <span>{product.createdBy?.username || 'Culinara creator'}</span>
          <span className="product-preview-date">{formatDate(product.updatedAt)}</span>
        </div>
      </Card>
    </Link>
  )
}

export default ProductPreviewCard
