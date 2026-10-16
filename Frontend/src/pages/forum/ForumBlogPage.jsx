import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Alert, Button, Card, Empty, Input, Pagination, Spin, Typography, Segmented  } from 'antd'
import { CommentOutlined, LikeOutlined, PlusOutlined, SearchOutlined, ClockCircleOutlined } from '@ant-design/icons'
import { getForumPostsAPI } from '../../apis/forum'
import { FORUM_CATEGORIES } from '../../constants/forumCategories'
import ForumPreviewCard from './ForumPreviewCard'
import './ForumBlogPage.css'

const { Title, Text, Paragraph } = Typography

const FORUM_CATEGORIES_META = {
  'Newbie Corner': {
    emoji: '🥘',
    gradient: 'linear-gradient(135deg, #80cfa9, #50806b)',
    description: 'Start here if you are new to cooking.',
  },
  Sharing: {
    emoji: '📖',
    gradient: 'linear-gradient(135deg, #f6c65b, #e88943)',
    description: 'Post and explore recipes from around the world.',
  },
  Shopping: {
    emoji: '🛒',
    gradient: 'linear-gradient(135deg, #65e5f6, #3e1feb)',
    description: 'Talk about ingredients, substitutes, and grocery shopping.',
  },
  'General Discussion': {
    emoji: '💬',
    gradient: 'linear-gradient(135deg, #c084fc, #7c3aed)',
    description: 'A general space to chat about food, cooking, and anything related.',
  },
}

function ForumBlogPage() {
  const navigate = useNavigate()

  const [posts, setPosts] = useState([])
  const [categoryCounts, setCategoryCounts] = useState({})//保存每个分类下有多少帖子
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sort, setSort] = useState('recent')

  const [searchInput, setSearchInput] = useState('')
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [searchPage, setSearchPage] = useState(1)
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef(null)

  const SEARCH_PAGE_SIZE = 6

  //获取帖子列表
  useEffect(() => {
    let cancelled = false

    setLoading(true)
    setError('')

    getForumPostsAPI({
      sort,
      page,
      limit:6,
    })
      .then((res) => {
        if (cancelled) return 
        
        setPosts(res.data || [])
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.response?.data?.message || 'Failed to load forum posts')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [sort, page])

//计算每个分类的帖子数量
  useEffect(() => {
  getForumPostsAPI()
    .then((res) => {
      const allPosts = res.data || []
      const counts = {}

      allPosts.forEach((post) => {
        counts[post.category] = (counts[post.category] || 0) + 1
      })

      setCategoryCounts(counts)
    })
  }, [])

  //query改变时，搜索帖子
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

    getForumPostsAPI({ q: query })
      .then((res) => {
        if (cancelled) return
        setSearchResults(res.data || [])
        setShowDropdown(true)
      })
      .catch((err) => {
        if (!cancelled) {
          setSearchError(err.response?.data?.message || 'Search failed')
        }
      })
      .finally(() => {
        if (!cancelled) setSearchLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [query])

  //点击外部关闭搜索框
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
  setSearchPage(1)
  setShowDropdown(false)
}


  const dropdownStart = (searchPage - 1) * SEARCH_PAGE_SIZE
  const dropdownItems = searchResults.slice(dropdownStart, dropdownStart + SEARCH_PAGE_SIZE)

  return (
    <main className="forum-blog-page">
      <section className="forum-blog-hero">
        <div className="forum-blog-hero-inner">
          <Title level={1}>Welcome to Culinara Forum</Title>
          <Paragraph style={{ color: '#fff', textShadow: '0 1px 6px rgba(0,0,0,0.35)', marginBottom: 0 }}>
            Ask questions, share cooking tips, and connect with food lovers from the community.
          </Paragraph>

          <div className="forum-search-wrapper" ref={dropdownRef}>
            <Input.Search
              className="forum-blog-search"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value)
                if (!e.target.value.trim()) clearSearch()
              }}
              onSearch={submitSearch}
              onFocus={() => {
                if (searchResults.length > 0) setShowDropdown(true)
              }}
              enterButton={<SearchOutlined />}
              placeholder="Search questions, ingredients, or cooking topics"
              size="large"
              allowClear
            />

            {showDropdown && (
              <div className="forum-search-dropdown">
                {searchLoading ? (
                  <div className="forum-search-dropdown-state"><Spin /></div>
                ) : searchError ? (
                  <div className="forum-search-dropdown-state">{searchError}</div>
                ) : dropdownItems.length === 0 ? (
                  <div className="forum-search-dropdown-state">
                    No forum posts found for &ldquo;{query}&rdquo;
                  </div>
                ) : (
                  <>
                    <div className="forum-search-dropdown-list">
                      {dropdownItems.map((post) => (
                        <Link
                          key={post._id}
                          to={`/forum/${post._id}`}
                          className="forum-search-row"
                          onClick={() => setShowDropdown(false)}
                        >
                          <div className="forum-search-thumb">
                            {post.author?.profilePicture ? (
                              <img src={post.author.profilePicture} alt={post.author?.username} />
                            ) : (
                              <span>{post.author?.username?.[0]?.toUpperCase() || 'U'}</span>
                            )}
                          </div>

                          <div className="forum-search-info">
                            <span className="forum-search-title">{post.title}</span>
                            <div className="forum-search-meta">
                              <span>{post.author?.username || 'Unknown user'}</span>
                              <span className="forum-search-dot">·</span>
                              <span>{post.category}</span>
                              <span className="forum-search-dot">·</span>
                              <LikeOutlined style={{ fontSize: '0.72rem' }} />
                              <span>{post.likeCount || 0}</span>
                              <span className="forum-search-dot">·</span>
                              <CommentOutlined style={{ fontSize: '0.72rem' }} />
                              <span>{post.commentsCount || 0}</span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>

                    {searchResults.length > SEARCH_PAGE_SIZE && (
                      <div className="forum-search-dropdown-pagination">
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

          <Button
            className="forum-blog-create"
            icon={<PlusOutlined />}
            onClick={() => navigate('/forum/create')}
          >
            Create Post
          </Button>
        </div>
      </section>

      <div className="forum-blog-content">
        <section className="forum-blog-section">
          <div className="forum-blog-section-title">
            <div>
              <Text type="secondary">Browse by topic</Text>
              <Title level={2}>Pick a category</Title>
            </div>
          </div>

          <div className="forum-category-grid">
                {FORUM_CATEGORIES.map((item) => (
                    <Link
                        className="forum-category-link"
                        key={item.value}
                        to={`/forum/category/${item.value}`}
                        >
                        <Card className="forum-category-card" hoverable styles={{ body: { padding: 0 } }}>
                            <div
                            className="forum-category-banner"
                            style={{ background: FORUM_CATEGORIES_META[item.value].gradient }}
                            >
                                <span className="forum-category-emoji">
                                    {FORUM_CATEGORIES_META[item.value].emoji}
                                </span>
                            </div>

                            <div className="forum-category-body">
                                <Title level={4}>{item.label}</Title>
                                <Paragraph>
                                    {FORUM_CATEGORIES_META[item.value].description}
                                </Paragraph>
                                <Text type="secondary">{categoryCounts[item.value] || 0} posts</Text>
                            </div>
                        </Card>
                    </Link>
                ))}
               
            </div>
        </section>

        <section className="forum-blog-section">
          <div className="forum-blog-section-title">   
            <div>
                <Text type="secondary">Community discussions</Text>
                <Title level={2}>Forum Posts</Title>
            </div>
            <Segmented
              value={sort}
              onChange={setSort}
              options={[
                { label: 'Latest', value: 'recent', icon: <ClockCircleOutlined /> },
                { label: 'Most liked', value: 'liked', icon: <LikeOutlined /> },
              ]}
            />                
          </div>

          {error && (
            <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />
          )}

          {loading ? (
            <div className="forum-blog-loading">
              <Spin size="large" />
            </div>
          ) : posts.length === 0 ? (
            <Empty description="No forum posts found" />
          ) : (
            <>
              <div className="forum-card-list">
                    {posts.map((post) => (
                    <ForumPreviewCard key={post._id} post={post} />
                    ))}
              </div>

            </>
          )}
        </section>
      </div>
    </main>
  )
}

export default ForumBlogPage