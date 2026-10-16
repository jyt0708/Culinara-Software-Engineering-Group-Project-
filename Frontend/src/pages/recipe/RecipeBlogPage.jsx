import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
  Alert, Button, Card, Empty, Input, Pagination, Segmented, Spin, Typography,
} from 'antd'
import {
  ClockCircleOutlined, LikeOutlined, PlusOutlined, SearchOutlined,
} from '@ant-design/icons'
import { getRecipesAPI } from '../../apis/recipe'
import { CATEGORIES, getCategoryLabel } from '../../constants/categories'
import RecipePreviewCard from './RecipePreviewCard'
import './RecipeBlogPage.css'

const { Title, Text, Paragraph } = Typography

const CATEGORY_META = {
  asian: {
    emoji: '🍜',
    gradient: 'linear-gradient(135deg, #f83600, #f9d423)',
    description: 'Chinese, Japanese, Korean, and Southeast Asian favorites.',
  },
  european: {
    emoji: '🍝',
    gradient: 'linear-gradient(135deg, #4776e6, #8e54e9)',
    description: 'Italian, French, German, and Mediterranean classics.',
  },
  dessert: {
    emoji: '🍰',
    gradient: 'linear-gradient(135deg, #f093fb, #f5576c)',
    description: 'Cakes, drinks, pastries, and oven-baked treats.',
  },
  vegan: {
    emoji: '🥗',
    gradient: 'linear-gradient(135deg, #11998e, #38ef7d)',
    description: 'Fresh salads, comforting soups, and plant-based dishes.',
  },
}

const SEARCH_PAGE_SIZE = 6

function RecipeBlogPage() {
  const navigate = useNavigate()
  const { userInfo } = useSelector((state) => state.user)

  const [sort, setSort] = useState('recent')
  const [recipes, setRecipes] = useState([])
  const [categoryCounts, setCategoryCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [searchInput, setSearchInput] = useState('')
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [searchPage, setSearchPage] = useState(1)
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef(null)

  // 菜谱首页只加载少量推荐卡片和分类数量。
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    getRecipesAPI({ sort, limit: 6 })
      .then((res) => {
        if (cancelled) return
        setRecipes(res.data || [])
        setCategoryCounts(res.categoryCounts || {})
      })
      .catch((err) => { if (!cancelled) setError(err.response?.data?.message || 'Failed to load recipes') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [sort])

  // 顶部大搜索是全局菜谱搜索，结果显示在下拉框里。
  useEffect(() => {
    if (!query) {
      setSearchResults([])
      setShowDropdown(false)
      return
    }
    let cancelled = false
    setSearchLoading(true)
    setSearchError('')
    setSearchPage(1)
    getRecipesAPI({ q: query })
      .then((res) => {
        if (cancelled) return
        setSearchResults(res.data || [])
        setShowDropdown(true)
      })
      .catch((err) => { if (!cancelled) setSearchError(err.response?.data?.message || 'Search failed') })
      .finally(() => { if (!cancelled) setSearchLoading(false) })
    return () => { cancelled = true }
  }, [query])

  // 点击下拉框外部时关闭搜索结果。
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const submitSearch = () => {
    const trimmed = searchInput.trim()
    if (trimmed) setQuery(trimmed)
  }

  const clearSearch = () => {
    setSearchInput('')
    setQuery('')
    setSearchResults([])
    setShowDropdown(false)
  }

  const dropdownStart = (searchPage - 1) * SEARCH_PAGE_SIZE
  const dropdownItems = searchResults.slice(dropdownStart, dropdownStart + SEARCH_PAGE_SIZE)

  return (
    <main className="recipe-blog-page">
      <section className="recipe-blog-hero">
        <div className="recipe-blog-hero-inner">
          <Title level={1}>Explore Recipes</Title>
          <Paragraph style={{ color: '#fff', textShadow: '0 1px 6px rgba(0,0,0,0.55)', marginBottom: 0 }}>
            Find something worth cooking, from quick weekday dishes to slow weekend favorites.
          </Paragraph>

          <div className="recipe-search-wrapper" ref={dropdownRef}>
            <Input.Search
              className="recipe-blog-search"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value)
                if (!e.target.value.trim()) clearSearch()
              }}
              onSearch={submitSearch}
              onFocus={() => { if (searchResults.length > 0) setShowDropdown(true) }}
              enterButton={<SearchOutlined />}
              placeholder="Search by title, ingredient, or cuisine"
              size="large"
              allowClear
            />

            {showDropdown && (
              <div className="recipe-search-dropdown">
                {searchLoading ? (
                  <div className="recipe-search-dropdown-state"><Spin /></div>
                ) : searchError ? (
                  <div className="recipe-search-dropdown-state">{searchError}</div>
                ) : dropdownItems.length === 0 ? (
                  <div className="recipe-search-dropdown-state">No recipes found for &ldquo;{query}&rdquo;</div>
                ) : (
                  <>
                    <div className="recipe-search-dropdown-list">
                      {dropdownItems.map((recipe) => (
                        <Link
                          key={recipe._id}
                          to={`/recipes/${recipe._id}`}
                          className="recipe-search-row"
                          onClick={() => setShowDropdown(false)}
                        >
                          <img src={recipe.coverImage} alt={recipe.title} className="recipe-search-thumb" />
                          <div className="recipe-search-info">
                            <span className="recipe-search-title">{recipe.title}</span>
                            <div className="recipe-search-meta">
                              <span>{recipe.creator?.username}</span>
                              <span className="recipe-search-dot">·</span>
                              <span>{getCategoryLabel(recipe.category)}</span>
                              <span className="recipe-search-dot">·</span>
                              <span style={{ textTransform: 'capitalize' }}>{recipe.difficulty}</span>
                              <span className="recipe-search-dot">·</span>
                              <ClockCircleOutlined style={{ fontSize: '0.72rem' }} />
                              <span>{recipe.cookTime} min</span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                    {searchResults.length > SEARCH_PAGE_SIZE && (
                      <div className="recipe-search-dropdown-pagination">
                        <Pagination
                          simple
                          size="small"
                          current={searchPage}
                          pageSize={SEARCH_PAGE_SIZE}
                          total={searchResults.length}
                          onChange={setSearchPage}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {userInfo?.role === 'creator' && (
            <Button
              className="recipe-blog-create"
              icon={<PlusOutlined />}
              onClick={() => navigate('/recipes/create')}
            >
              Create Recipe
            </Button>
          )}
        </div>
      </section>

      <div className="recipe-blog-content">
        <section className="recipe-blog-section">
          <div className="recipe-blog-section-title">
            <div>
              <Text type="secondary">Browse by cuisine</Text>
              <Title level={2}>Pick a category</Title>
            </div>
          </div>
          <div className="recipe-category-grid">
            {CATEGORIES.map((item) => (
              <Link className="recipe-category-link" key={item.value} to={`/recipes/category/${item.value}`}>
                <Card className="recipe-category-card" hoverable styles={{ body: { padding: 0 } }}>
                  <div className="recipe-category-banner" style={{ background: CATEGORY_META[item.value].gradient }}>
                    <span className="recipe-category-emoji">{CATEGORY_META[item.value].emoji}</span>
                  </div>
                  <div className="recipe-category-body">
                    <Title level={4}>{item.label}</Title>
                    <Paragraph>{CATEGORY_META[item.value].description}</Paragraph>
                    <Text type="secondary">{categoryCounts[item.value] || 0} recipes</Text>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        <section className="recipe-blog-section">
          <div className="recipe-blog-section-title recipe-list-heading">
            <div>
              <Text type="secondary">Community collection</Text>
              <Title level={2}>Top Recipes</Title>
            </div>
            <Segmented
              value={sort}
              onChange={setSort}
              options={[
                { label: 'Latest',     value: 'recent',  icon: <ClockCircleOutlined /> },
                { label: 'Most liked',  value: 'liked',   icon: <LikeOutlined /> },
              ]}
            />
          </div>

          {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}

          {loading ? (
            <div className="recipe-blog-loading"><Spin size="large" /></div>
          ) : recipes.length === 0 ? (
            <Empty description="No recipes yet" />
          ) : (
            <div className="recipe-card-grid">
              {recipes.map((recipe) => <RecipePreviewCard key={recipe._id} recipe={recipe} />)}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

export default RecipeBlogPage
