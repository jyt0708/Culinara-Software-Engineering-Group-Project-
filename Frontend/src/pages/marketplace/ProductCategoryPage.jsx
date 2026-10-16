import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
  Alert, Breadcrumb, Button, Card, Checkbox, Empty, Input, Pagination, 
  Radio, Select, Spin, Typography, InputNumber
} from 'antd'
import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { getProductsAPI } from '../../apis/product'
import ProductPreviewCard from './ProductPreviewCard'
import { CATEGORIES, getCategoryLabel } from '../../constants/productCategories'
import './ProductBlogPage.css'
import './ProductCategoryPage.css'

const { Title, Text, Paragraph } = Typography

const CATEGORY_DESCRIPTIONS = {
  seasoning: 'Premium salts, spices, and blends to elevate your dishes with vibrant flavors.',
  accessories: 'Elegant tableware, toolware and dining accessories to enhance your cooking experience.',
  proteins: 'Farm vegetables, seafood, premium meats, tofu, and more to fuel your culinary adventures.',
  staple: 'Rice, noodles, grains, and flour to complete your meals.',
}

function ProductCategoryPage() {
  const { category } = useParams()
  const navigate = useNavigate()
  const { userInfo } = useSelector((state) => state.user)

  // memoize the matching category object to avoid re-calculating on every render.
  // only re-run when the `category` dependency changes.
  // const categoryConfig = useMemo(
  //   () => CATEGORIES.find((item) => item.value === category),
  //   [category]
  // )
  const isAllCategory = category === 'all'

  const categoryConfig = useMemo(() => {
    if (isAllCategory) return null

    return CATEGORIES.find((item) => item.value === category)
  }, [category, isAllCategory])

  const [searchInput, setSearchInput] = useState('')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('rating')
  const [maxPrice, setMaxPrice] = useState(null)
  const [minPrice, setMinPrice] = useState(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const PAGE_SIZE = 6

  useEffect(() => {
    setSearchInput('')
    setQuery('')
    setMaxPrice(null)
    setMinPrice(null)
    setSort('rating')
    setPage(1)
  }, [category])

  useEffect(() => {
      if (!categoryConfig && !isAllCategory) return
      
      let cancelled = false
      setLoading(true)
      setError('')
  
      getProductsAPI({
        q: query,
        category,
        minPrice,
        maxPrice,
        sort,
        page,
        limit: PAGE_SIZE,
      })
        .then((res) => {
          if (!cancelled) {
            setProducts(res.data || [])
            setTotal(res.total || 0)
          }
        })
        .catch((err) => {
          if (!cancelled) setError(err.response?.data?.message || 'Failed to load recipes')
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
  
      return () => { cancelled = true }
    }, [category, categoryConfig, page, query, sort, maxPrice, minPrice])

    const resetFilters = () => {
      setSearchInput('')
      setQuery('')
      setMaxPrice(null)
      setMinPrice(null)
      setSort('rating')
      setPage(1)
    }

    const handleCategoryChange = (e) => {
      // use navigate to directly change URL
      // so that useMemo recalculates
      const newCategory = e.target.value
      navigate(`/products/category/${newCategory}`); 
    }

    // Reset to page 1 whenever filters change
    useEffect(() => { setPage(1) }, [query, maxPrice, minPrice, sort])

    if (!isAllCategory && !categoryConfig) {
      return (
        <div className="product-category-missing">
          <Empty description="Category not found">
            <Button onClick={() => navigate('/products')}>
              Back to Products
            </Button>
          </Empty>
        </div>
      )
    }

  return (
    <main className='product-category-page'>
      <header className='product-category-header'>
        <Breadcrumb
          items={[
            { title: <Link to="/products">Products</Link> },
            { title: `${getCategoryLabel(category)}` },
          ]}
        />
        <Title level={1}>{getCategoryLabel(category)} </Title>
        <Paragraph>{CATEGORY_DESCRIPTIONS[category]}</Paragraph>

        <div className='product-category-toolbar'>
          <Input.Search
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onSearch={() => setQuery(searchInput.trim())}
            enterButton={<SearchOutlined />}
            placeholder={`Search ${getCategoryLabel(category).toLowerCase()} products`}
            allowClear
          />
          <Select
            aria-label="Sort products"
            value={sort}
            onChange={setSort}
            options={[
              { label: 'Recently updated', value: 'recent' },
              { label: 'Most liked', value: 'rating' },
              { label: 'Price Desc', value: 'price_desc'},
              { label: 'Price Asc', value: 'price_asc'},
            ]}
          />
        </div>
      </header>

      <div className="product-category-layout">
        <aside>
          <Card size='small' className='product-filter-card'>
            <section>
              <Text strong>Category</Text>
              <Radio.Group value={category} onChange={handleCategoryChange}>
                <Radio value="all" className="product-category-radio" >
                  <span className="product-category-radio-text">
                    All Products
                  </span>
                </Radio>

                {CATEGORIES.map((item) => (
                  <Radio 
                    key={item.value} 
                    value={item.value}
                    className='product-category-radio'
                  >
                    <span title={item.label} className='product-category-radio-text'>
                      {item.label}
                    </span>
                  </Radio>
                ))}
              </Radio.Group>
            </section>

            <section>
              <Text strong>Price</Text>
              <div className='product-price-input-group'>
                <InputNumber
                  prefix="€"
                  placeholder="Min price"
                  value={minPrice}
                  min={0}
                  onChange={setMinPrice}
                  // formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  // parser={value => value.replace(/\¥\s?|(,*)/g, '')}
                  className='product-price-input'
                />
                <InputNumber
                  prefix="€"
                  placeholder="Max price"
                  value={maxPrice}
                  min={minPrice ? Number(minPrice) : 0}
                  onChange={setMaxPrice}
                  // formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  // parser={value => value.replace(/\¥\s?|(,*)/g, '')}
                  className='product-price-input'
                />
              </div>
            </section>

            <Button block onClick={resetFilters}>Reset Filters</Button>
            {userInfo?.role === 'creator' && (
              <Button
                block
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate('/products/create')}
              >
                Publish Product
              </Button>
            )}

          </Card>
        </aside>

        <section>
          {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
          {loading ? (
            <div className="product-blog-loading"><Spin size="large" /></div>
          ) : products.length === 0 ? (
            <Empty description="No products found" />
          ) : (
            <>
              <div className="product-card-grid">
                {products.map((product) => (
                  <ProductPreviewCard key={product._id} product={product} />
                ))}
              </div>
              {total > PAGE_SIZE && (
                <div className="product-category-pagination">
                  <Pagination
                    current={page}
                    pageSize={PAGE_SIZE}
                    total={total}
                    onChange={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                    showSizeChanger={false}
                  />
                </div>
              )}
            </>
          )}    
        </section>
      </div>

    </main>
  )
}

export default ProductCategoryPage
