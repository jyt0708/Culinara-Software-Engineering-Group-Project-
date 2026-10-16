import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
  Alert, Breadcrumb, Button, Card, Checkbox, Empty, Input, Radio, Select, Spin, Typography,
} from 'antd'
import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { getRecipesAPI } from '../../apis/recipe'
import { CATEGORIES, DIFFICULTIES, getCategoryLabel } from '../../constants/categories'
import RecipePreviewCard from './RecipePreviewCard'
import './RecipeBlogPage.css'
import './RecipeCategoryPage.css'

const { Title, Text, Paragraph } = Typography

const CATEGORY_DESCRIPTIONS = {
  asian: 'Chinese, Japanese, Korean, and Southeast Asian flavors all in one place.',
  european: 'Italian, French, German, and Mediterranean dishes for every table.',
  dessert: 'Drinks, cakes, pastries, and sweet ideas for a well-earned treat.',
  vegan: 'Fresh salads, cozy soups, and plant-based recipes full of color.',
}

function RecipeCategoryPage() {
  const { category } = useParams()
  const navigate = useNavigate()
  const { userInfo } = useSelector((state) => state.user)
  const categoryConfig = useMemo(
    () => CATEGORIES.find((item) => item.value === category),
    [category]
  )

  const [searchInput, setSearchInput] = useState('')
  const [query, setQuery] = useState('')
  const [subcategories, setSubcategories] = useState([])
  const [difficulties, setDifficulties] = useState([])
  const [cookTime, setCookTime] = useState('')
  const [sort, setSort] = useState('recent')
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // 分类页搜索只在当前分类内生效，并叠加筛选和排序条件。
  useEffect(() => {
    if (!categoryConfig) return

    let cancelled = false
    setLoading(true)
    setError('')

    getRecipesAPI({
      q: query,
      category,
      subcategory: subcategories.join(','),
      difficulty: difficulties.join(','),
      cookTime,
      sort,
    })
      .then((res) => {
        if (!cancelled) {
          setRecipes(res.data || [])
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.message || 'Failed to load recipes')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [category, categoryConfig, cookTime, difficulties, query, sort, subcategories])

  // 清空当前分类页所有搜索和筛选条件。
  const resetFilters = () => {
    setSearchInput('')
    setQuery('')
    setSubcategories([])
    setDifficulties([])
    setCookTime('')
    setSort('recent')
  }

  const handleSearch = (value) => {
    setQuery((value || '').trim())
  }

  const handleSortChange = (value) => {
    setSort(value)
  }

  const handleSubcategoriesChange = (values) => {
    setSubcategories(values)
  }

  const handleCookTimeChange = (event) => {
    setCookTime(event.target.value)
  }

  const handleDifficultiesChange = (values) => {
    setDifficulties(values)
  }

  if (!categoryConfig) {
    return (
      <div className="recipe-category-missing">
        <Empty description="Category not found">
          <Button onClick={() => navigate('/recipes')}>Back to Recipes</Button>
        </Empty>
      </div>
    )
  }

  return (
    <main className="recipe-category-page">
      <header className="recipe-category-header">
        <Breadcrumb
          items={[
            { title: <Link to="/recipes">Recipes</Link> },
            { title: `${getCategoryLabel(category)} Cuisine` },
          ]}
        />
        <Title level={1}>{getCategoryLabel(category)} Cuisine</Title>
        <Paragraph>{CATEGORY_DESCRIPTIONS[category]}</Paragraph>

        <div className="recipe-category-toolbar">
          <Input.Search
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onSearch={handleSearch}
            enterButton={<SearchOutlined />}
            placeholder={`Search ${getCategoryLabel(category).toLowerCase()} recipes`}
            allowClear
          />
          <Select
            aria-label="Sort recipes"
            value={sort}
            onChange={handleSortChange}
            options={[
              { label: 'Recently updated', value: 'recent' },
              { label: 'Most liked', value: 'liked' },
              { label: 'Cook time: shortest', value: 'quickest' },
            ]}
          />
        </div>
      </header>

      <div className="recipe-category-layout">
        <aside>
          <Card size="small" className="recipe-filter-card">
            <section>
              <Text strong>Sub-category</Text>
              <Checkbox.Group
                value={subcategories}
                onChange={handleSubcategoriesChange}
                options={categoryConfig.subcategories.map(({ value, label }) => ({ value, label }))}
              />
            </section>

            <section>
              <Text strong>Cook time</Text>
              <Radio.Group value={cookTime} onChange={handleCookTimeChange}>
                <Radio value="">Any duration</Radio>
                <Radio value="under30">Under 30 min</Radio>
                <Radio value="30to60">30 to 60 min</Radio>
                <Radio value="over60">Over 60 min</Radio>
              </Radio.Group>
            </section>

            <section>
              <Text strong>Difficulty</Text>
              <Checkbox.Group
                value={difficulties}
                onChange={handleDifficultiesChange}
                options={DIFFICULTIES}
              />
            </section>

            <Button block onClick={resetFilters}>Reset Filters</Button>
            {userInfo?.role === 'creator' && (
              <Button
                block
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate('/recipes/create')}
              >
                Create Recipe
              </Button>
            )}
          </Card>
        </aside>

        <section>
          {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}

          {loading ? (
            <div className="recipe-blog-loading"><Spin size="large" /></div>
          ) : recipes.length === 0 ? (
            <Empty description="No recipes found" />
          ) : (
            <>
              <div className="recipe-card-grid">
                {recipes.map((recipe) => (
                  <RecipePreviewCard key={recipe._id} recipe={recipe} showSubcategory />
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  )
}

export default RecipeCategoryPage
