import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { Button, Space, Avatar } from 'antd'
import { clearUserInfo } from '../store/modules/userStore'
import { useRequireLogin } from '../utils/auth'
import NotificationBell from './NotificationBell'

const GREEN = '#50806B'
const RED = '#c25450'

function Navbar() {
  const { hasToken, userInfo } = useSelector((state) => state.user)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { pathname } = useLocation() // 当前路径，用于高亮当前导航项
  // 受保护链接的拦截器；modal 是受控的 Login Required Modal，要在 JSX 里渲染出来
  const { requireLogin, modal: loginModal } = useRequireLogin()

  const handleLogout = () => {
    dispatch(clearUserInfo())
    // 不手动 navigate：ProtectedRoute 检测到 hasToken=false 会自动跳 /login；
    // 手动 navigate('/') 会造成 / → /login 两次连续跳转，Modal mask 来不及清理导致偶发灰屏
  }

  // protected: true 的链接需要登录才能进，未登录点会弹"Login Required"
  // Home 永远开放，其他三个是登录墙后面的页面
  const navLinks = [
    { label: 'Home', to: '/', protected: false },
    { label: 'Recipe', to: '/recipes', protected: true },
    { label: 'Forum', to: '/forum', protected: true },
    { label: 'Marketplace', to: '/products', protected: true },
  ]

  return (
    <nav style={{
      height: 64,
      background: '#fff',
      borderBottom: '1px solid #f1f1f1',
      display: 'flex',
      alignItems: 'center',
      padding: '0 2rem',
      gap: '2rem',
      position: 'sticky', // 滚动时吸顶
      top: 0,
      zIndex: 100,
    }}>
      {/* 受控的 Login Required Modal —— 由 useRequireLogin 内部 state 驱动开关，React 管生命周期 */}
      {loginModal}

      {/* Logo */}
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
        <span style={{
          width: 28, height: 28, borderRadius: '50%',
          background: 'linear-gradient(135deg, #6a4b91, #50806B)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: '0.8rem', fontWeight: 800,
        }}>C</span>
        <span style={{ color: GREEN, fontWeight: 700, fontSize: '1.4rem' }}>Culinara</span>
      </Link>

      {/* 导航链接：当前页面用红色 + 下划线高亮 */}
      <ul style={{ listStyle: 'none', display: 'flex', gap: '1.5rem', margin: '0 0 0 auto', padding: 0 }}>
        {navLinks.map(({ label, to, protected: isProtected }) => {
          // const active = to === '/recipes' ? pathname.startsWith('/recipes') : pathname === to
          const active = to === '/recipes' ? pathname.startsWith('/recipes')
                        : to === '/forum' ? pathname.startsWith('/forum')
                        : to === '/products' ? pathname.startsWith('/products')
                        : pathname === to
          // 受保护的链接：preventDefault 阻止跳转，交给 requireLogin 决定
          //   - 已登录 → navigate(to)
          //   - 未登录 → 弹 Modal，停在原地
          const handleClick = (e) => {
            if (isProtected) {
              e.preventDefault()
              requireLogin(() => navigate(to))
            }
          }
          return (
            <li key={label}>
              <Link to={to} onClick={handleClick} style={{
                color: active ? RED : '#4a5568',
                textDecoration: 'none',
                fontWeight: 500,
                fontSize: '0.98rem',
                paddingBottom: 4,
                borderBottom: active ? `2px solid ${RED}` : 'none',
              }}>{label}</Link>
            </li>
          )
        })}
      </ul>

      <Space style={{ marginLeft: '1rem' }}>
        {hasToken ? (
          <>
            {/* Admin 按钮只有 role === 'admin' 时才显示 */}
            {userInfo?.role === 'admin' && (
              <Link to="/admin/applications">
                <Button size="small">Admin</Button>
              </Link>
            )}
            <NotificationBell />
            {/* 头像点击进入个人主页 */}
            <Link to="/profile">
              <Avatar
                src={userInfo?.profilePicture || null}
                style={{ background: 'linear-gradient(135deg,#f9b8c8,#e879a0)', cursor: 'pointer', border: '2px solid #50806B' }}
              >
                {userInfo?.username?.[0]?.toUpperCase()}
              </Avatar>
            </Link>
            <Button onClick={handleLogout}>Logout</Button>
          </>
        ) : (
          <>
            <Link to="/login"><Button>Login</Button></Link>
            <Link to="/register"><Button type="primary">Sign Up</Button></Link>
          </>
        )}
      </Space>
    </nav>
  )
}

export default Navbar
