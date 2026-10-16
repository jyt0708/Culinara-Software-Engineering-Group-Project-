import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Alert, Button, Empty, Input, Spin, Typography, Segmented, Pagination} from 'antd'
import { ArrowLeftOutlined, PlusOutlined, SearchOutlined, ClockCircleOutlined, LikeOutlined  } from '@ant-design/icons'
import { getForumPostsAPI } from '../../apis/forum'
import { FORUM_CATEGORIES, getForumCategoryLabel } from '../../constants/forumCategories'
import ForumPreviewCard from './ForumPreviewCard'
import './ForumBlogPage.css'

const { Title, Text, Paragraph } = Typography

const FORUM_CATEGORIES_META = {
  'Newbie Corner': {
    description: 'Start here if you are new to cooking.',
  },
  Sharing: {
    description: 'Post and explore recipes from around the world.',
  },
  Shopping: {
    description: 'Talk about ingredients, substitutes, and grocery shopping.',
  },
  'General Discussion': {
    description: 'A general space to chat about food, cooking, and anything related.',
  },
}



function ForumCategoryPage() {
  const { category } = useParams()
  const navigate = useNavigate()

  const [posts, setPosts] = useState([])
  const [sort, setSort] = useState('recent')
  const [searchInput, setSearchInput] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10
  const [total, setTotal] = useState(0)


  const categoryExists = FORUM_CATEGORIES.some((item) => item.value === category)

  //加载帖子
  useEffect(() => {
    if (!categoryExists) return

    let cancelled = false
    setLoading(true)
    setError('')

    getForumPostsAPI({
      category,
      q: query,
      sort,
      page,
      limit: PAGE_SIZE,
    })
      .then((res) => {
        if (cancelled) return
        setPosts(res.data || [])
        setTotal(res.total || 0)
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
  }, [category, query, sort, page, categoryExists])



  const submitSearch = () => {
    setPage(1)
    setQuery(searchInput.trim())
  }

  if (!categoryExists) {
    return (
      <main className="forum-blog-page">
        <div className="forum-blog-content">
          <Empty description="Category not found">
            <Button onClick={() => navigate('/forum')}>Back to Forum</Button>
          </Empty>
        </div>
      </main>
    )
  }


  return (
    <main className="forum-blog-page">
      <section className="forum-blog-hero">
        <Button
            type="link"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/forum')}
            style={{ 
                position: 'absolute',
                color: '#fff', 
                paddingLeft: 0, 
                top: 16,
                left: 32,
             }}
          >
            Back to Forum
        </Button>
        <div className="forum-blog-hero-inner">         
          <Title level={1}>{getForumCategoryLabel(category)}</Title>

          <Paragraph style={{ color: '#fff', textShadow: '0 1px 6px rgba(0,0,0,0.35)', marginBottom: 0 }}>
            {FORUM_CATEGORIES_META[category]?.description}
          </Paragraph>

          <div className="forum-search-wrapper">
            <Input.Search
              className="forum-blog-search"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value)
                if (!e.target.value.trim()) {
                  setPage(1)
                  setQuery('')
                }
              }}
              onSearch={submitSearch}
              enterButton={<SearchOutlined />}
              placeholder={`Search in ${getForumCategoryLabel(category)}`}
              size="large"
              allowClear
            />
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
              <Text type="secondary">{getForumCategoryLabel(category)}</Text>
              <Title level={2}>All Posts ({total})</Title>
            </div>

            {/* 切换排序方法 */}
            <Segmented
              value={sort}
              onChange={(value) => {
                  setPage(1)
                  setSort(value)
                }}
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
              
              {total > PAGE_SIZE && (
                <div className="forum-blog-pagination">
                  <Pagination
                    current={page}
                    pageSize={PAGE_SIZE}
                    total={total}
                    onChange={setPage}
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

export default ForumCategoryPage