import { Link } from 'react-router-dom'
import { Avatar, Card, Space, Tag, Typography } from 'antd'
import { ClockCircleOutlined, EyeOutlined } from '@ant-design/icons'
import { getCategoryLabel, getDifficultyLabel, getSubcategoryLabel } from '../../constants/categories'

const { Title, Paragraph } = Typography

const CATEGORY_COLORS = {
  asian: 'gold',
  european: 'blue',
  dessert: 'magenta',
  vegan: 'green',
}

const DIFFICULTY_COLORS = {
  easy: 'green',
  medium: 'orange',
  hard: 'red',
}

function formatDate(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function RecipePreviewCard({ recipe, showSubcategory = false }) {
  const categoryLabel = showSubcategory
    ? getSubcategoryLabel(recipe.category, recipe.subcategory)
    : getCategoryLabel(recipe.category)

  return (
    <Link className="recipe-card-link" to={`/recipes/${recipe._id}`}>
      <Card
        className="recipe-preview-card"
        hoverable
        cover={<img src={recipe.coverImage} alt={recipe.title} />}
      >
        <Space size={[6, 6]} wrap>
          <Tag color={CATEGORY_COLORS[recipe.category]}>{categoryLabel}</Tag>
          <Tag color={DIFFICULTY_COLORS[recipe.difficulty]}>{getDifficultyLabel(recipe.difficulty)}</Tag>
        </Space>
        <Title level={4}>{recipe.title}</Title>
        <Paragraph ellipsis={{ rows: 2 }}>
          {recipe.summary || 'A community recipe ready for your next cooking session.'}
        </Paragraph>
        <div className="recipe-preview-meta">
          <span><ClockCircleOutlined /> {recipe.cookTime} min</span>
          <span><EyeOutlined /> {recipe.viewCount || 0}</span>
        </div>
        <div className="recipe-preview-author">
          <Avatar size={24} src={recipe.creator?.profilePicture}>
            {recipe.creator?.username?.[0]?.toUpperCase()}
          </Avatar>
          <span>{recipe.creator?.username || 'Culinara creator'}</span>
          <span className="recipe-preview-date">{formatDate(recipe.updatedAt)}</span>
        </div>
      </Card>
    </Link>
  )
}

export default RecipePreviewCard
