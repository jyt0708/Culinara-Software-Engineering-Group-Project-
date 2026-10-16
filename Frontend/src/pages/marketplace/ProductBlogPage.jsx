import React from 'react'
import { useSelector } from 'react-redux'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Typography, Input, Spin, Pagination, Segmented, Button, Card, Alert, Empty
} from 'antd'
import {
  ClockCircleOutlined, LikeOutlined, PlusOutlined, SearchOutlined
} from '@ant-design/icons'
import { getProductsAPI } from '../../apis/product'
import { CATEGORIES, getCategoryLabel } from '../../constants/productCategories'
import ProductPreviewCard from './ProductPreviewCard'
import './ProductBlogPage.css'


const { Title, Text, Paragraph } = Typography

const CATEGORY_META = {
  seasoning: {
    emoji: '🧂',
    gradient: 'linear-gradient(135deg, #65e5f6 0%, #3e1feb 100%)',
    description: 'Premium salts, spices, and blends to elevate your dishes with vibrant flavors.',
  },
  accessories: {
    emoji: '🛍️',
    gradient: 'linear-gradient(135deg, #76dd0f33 0%, #e0f808 100%)',
    description: 'Elegant tableware, toolware and dining accessories to enhance your cooking experience.',
  },
  proteins: {
    emoji : '🥩',
    gradient: 'linear-gradient(135deg, #db7ed7 0%, #e517fc 100%)',
    description: 'Farm vegetables, seafood, premium meats, tofu, and more to fuel your culinary adventures.',
  },
  staple: {
    emoji: '🍚',
    gradient: 'linear-gradient(135deg, #fbc1c1 0%, #e05e5e 100%)',
    description: 'Rice, noodles, grains, and flour to complete your meals.',
  },
}

const SEARCH_PAGE_SIZE = 6

function ProductBlogPage() {
  const navigate = useNavigate()
  const { userInfo } = useSelector((state) => state.user)

  // Main section — Segmented tabs, top 6 per sort
  const [sort, setSort] = useState('rating')
  const [products, setProducts] = useState([])
  const [categoryCounts, setCategoryCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // search dropdown
  const [searchInput, setSearchInput] = useState('')
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState('')

  // show the first page of search results by default
  const [searchPage, setSearchPage] = useState(1)
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef(null)

  // fetch top-6 products based on sort tab
  useEffect(() => {
      let cancelled = false
      setLoading(true)
      setError('')
      getProductsAPI({ sort, limit: 6 })
        .then((res) => {
          if (cancelled) return
          setProducts(res.data || [])
          setCategoryCounts(res.categoryCounts || {})
        })
        .catch((err) => { if (!cancelled) setError(err.response?.data?.message || 'Failed to load products') })
        .finally(() => { if (!cancelled) setLoading(false) })
      return () => { cancelled = true }
    }, [sort])


  // fetch search results on submit
  useEffect(() => {
    if (!query) {
      setSearchResults([])
      setShowDropdown(false)
      return
    }
    console.log(query)
    let cancelled = false
    setSearchLoading(true)
    setSearchError('')
    setSearchPage(1)
    getProductsAPI({ q: query })
      .then((res) => {
        if (cancelled) return
        setSearchResults(res.data || [])
        setShowDropdown(true)
      })
      .catch((err) => { if (!cancelled) setSearchError(err.response?.data?.message || 'Search failed') })
      .finally(() => { if (!cancelled) setSearchLoading(false) })
    return () => { cancelled = true }
  }, [query])

  // close dropdown on outside click
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
      const trimmedQuery = searchInput.trim()
      if (trimmedQuery) setQuery(trimmedQuery)
    }

    const clearSearch = () => {
      setSearchInput('')
      setQuery('')
      setSearchResults([])
      setSearchPage(1)
      setShowDropdown(false)
    }

    // pagination
    const dropdownStart = (searchPage - 1) * SEARCH_PAGE_SIZE
    const dropdownItems = searchResults.slice(dropdownStart, dropdownStart + SEARCH_PAGE_SIZE)

  return (
    <main className="product-blog-page">
      <section className="product-blog-hero">
        <div className="product-blog-hero-inner">
          <Title level={1}>Everything Your Kitchen Needs</Title>
          <Paragraph style={{ color: '#fff', textShadow: '0 1px 6px rgba(0,0,0,0.55)', marginBottom: 0 }}>
            Shop premium ingredients, cookware, appliances, and table essentials curated for passionate
            home cooks.
          </Paragraph>
          
          {/* Search input + dropdown */}
          <div className="product-search-wrapper" ref={dropdownRef}>
            <Input.Search
              className="product-blog-search"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value)
                if (!e.target.value.trim()) clearSearch()
              }}
              onSearch={submitSearch}
              onFocus={() => { if (searchResults.length > 0) setShowDropdown(true) }}
              enterButton={<SearchOutlined />}
              placeholder="Search by name or category"
              size="large"
              allowClear
            />

            {/* Dropdown */}
            {showDropdown && (
              <div className="product-search-dropdown">
                {searchLoading ? (
                  <div className="product-search-dropdown-state"><Spin /></div>
                ) : searchError ? (
                  <div className="product-search-dropdown-state">{searchError}</div>
                ) : dropdownItems.length === 0 ? (
                  <div className="product-search-dropdown-state">No products found for &ldquo;{query}&rdquo;</div>
                ) : (
                  <>
                    <div className="product-search-dropdown-list">
                      {dropdownItems.map((product) => (
                        <Link
                          key={product._id}
                          to={`/products/${product._id}`}
                          className="product-search-row"
                          onClick={() => setShowDropdown(false)}
                        >
                          <img src={product.coverImage} alt={product.name} className="product-search-thumb" />
                          <div className="product-search-info">
                            <span className="product-search-title">{product.name}</span>
                            <div className="product-search-meta">
                              <span>{product.createdBy?.username}</span>
                              <span className="product-search-dot">·</span>
                              <span>{getCategoryLabel(product.category)}</span>
                              <span className="product-search-dot">·</span>
                              <span>€{product.price.toFixed(2)}</span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                    {searchResults.length > SEARCH_PAGE_SIZE && (
                      <div className="product-search-dropdown-pagination">
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

          {userInfo?.role == 'creator' && (
            <Button 
              className="product-blog-create"
              icon={<PlusOutlined />}
              onClick={() => navigate('/products/create')}
            >
              Publish Product
            </Button>
          )}
        </div>
      </section>

      <div className="product-blog-content">
          <section className="product-blog-section">
            <div className="product-blog-section-title">
              <Title level={2}>Browse by category</Title>
            </div>
            <div className="product-category-grid">
              {CATEGORIES.map((item) => (
                <Link className="product-category-link" key={item.value} to={`/products/category/${item.value}`}>
                  <Card className="product-category-card" hoverable styles={{ body: { padding: 0 } }}>
                    <div className="product-category-banner" style={{ background: CATEGORY_META[item.value].gradient }}>
                      <span className="product-category-emoji">{CATEGORY_META[item.value].emoji}</span>
                    </div>
                    <div className="product-category-body">
                      <Title level={4}>{item.label}</Title>
                      <Paragraph>{CATEGORY_META[item.value].description}</Paragraph>
                      <Text type="secondary">{categoryCounts[item.value] || 0} products</Text>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </section>

          <section className="product-blog-section">
            <div className="product-blog-section-title product-list-heading">
              <Title level={2}>Marketplace Picks</Title>
               <Segmented
              value={sort}
              onChange={setSort}
              options={[
                { label: 'Top rated',  value: 'rating',   icon: <LikeOutlined /> },
                { label: 'New arrivals',  value: 'recent',  icon: <ClockCircleOutlined /> },
              ]}
            />
            </div>

            {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
           
            {loading ? (
              <div className="product-blog-loading"><Spin size="large" /></div>
            ) : products.length === 0 ? (
              <Empty description="No products yet" />
            ) : (
              <div className="product-card-grid">
                {products.map((product) => <ProductPreviewCard key={product._id} product={product} />)}
              </div>
            )}
          </section>

      </div>


    </main>
  )
}

export default ProductBlogPage
