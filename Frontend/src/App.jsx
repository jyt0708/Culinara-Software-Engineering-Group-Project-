import { useEffect, useRef } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { App as AntdApp, Modal } from 'antd'
import { fetchUserInfo } from './store/modules/userStore'
import Navbar from './components/Navbar'
import ScrollToTop from './components/ScrollToTop'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import CreatorApplyPage from './pages/CreatorApplyPage'
import AdminApplicationsPage from './pages/AdminApplicationsPage'
import ProfilePage from './pages/ProfilePage'
import SubscriptionPage from './pages/SubscriptionPage'
import CreateEditRecipePage from './pages/recipe/CreateEditRecipePage'
import RecipeDetailPage from './pages/recipe/RecipeDetailPage'
import RecipeBlogPage from './pages/recipe/RecipeBlogPage'
import RecipeCategoryPage from './pages/recipe/RecipeCategoryPage'
import ProductBlogPage from './pages/marketplace/ProductBlogPage'
import ProductCategoryPage from './pages/marketplace/ProductCategoryPage'
import CreateEditProductPage from './pages/marketplace/CreateEditProductPage'
import ProductDetailPage from './pages/marketplace/ProductDetailPage'
import ForumBlogPage from './pages/forum/ForumBlogPage'
import CreateEditForumPage from './pages/forum/CreateEditForumPage'
import ForumDetailPage from './pages/forum/ForumDetailPage'
import ForumCategoryPage from './pages/forum/ForumCategoryPage'
import CreatorProfilePage from './pages/CreatorProfilePage'

function ProtectedRoute({ children }) {
  const { hasToken } = useSelector((state) => state.user)
  return hasToken ? children : <Navigate to="/login" replace />
}

function GuestRoute({ children }) {
  const { hasToken } = useSelector((state) => state.user)
  return hasToken ? <Navigate to="/" replace /> : children
}

function AdminRoute({ children }) {
  const { userInfo, userInfoLoaded, hasToken } = useSelector((state) => state.user)
  if (!hasToken) return <Navigate to="/login" replace />
  if (!userInfoLoaded) return null
  return userInfo?.role === 'admin' ? children : <Navigate to="/" replace />
}

function CreatorRoute({ children }) {
  const { userInfo, userInfoLoaded, hasToken } = useSelector((state) => state.user)
  if (!hasToken) return <Navigate to="/login" replace />
  if (!userInfoLoaded) return null
  return userInfo?.role === 'creator' ? children : <Navigate to="/" replace />
}

function App() {
  const dispatch = useDispatch()
  const { hasToken, userInfoLoaded } = useSelector((state) => state.user)
  const location = useLocation()
  const { message: messageApi } = AntdApp.useApp()
  const prevHasToken = useRef(hasToken)

  useEffect(() => {
    if (hasToken && !userInfoLoaded)
      dispatch(fetchUserInfo())
  }, [dispatch, hasToken, userInfoLoaded])

  // 只在真正登录成功时显示欢迎消息，刷新页面不重复提示。
  useEffect(() => {
    if (!prevHasToken.current && hasToken) {
      messageApi.success('Welcome back!')
    }
    prevHasToken.current = hasToken
  }, [hasToken, messageApi])

  // 路由切换时清理命令式 Modal，避免残留遮罩。
  useEffect(() => {
    Modal.destroyAll()
  }, [location.pathname])

  return (
    <>
      <ScrollToTop />
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
        <Route path="/apply" element={<ProtectedRoute><CreatorApplyPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/subscription" element={<ProtectedRoute><SubscriptionPage /></ProtectedRoute>} />
        <Route path="/recipes"         element={<ProtectedRoute><RecipeBlogPage /></ProtectedRoute>} />
        <Route path="/recipes/category/:category" element={<ProtectedRoute><RecipeCategoryPage /></ProtectedRoute>} />
        <Route path="/recipes/:id"     element={<ProtectedRoute><RecipeDetailPage /></ProtectedRoute>} />
        <Route path="/recipes/create"  element={<CreatorRoute><CreateEditRecipePage /></CreatorRoute>} />
        <Route path="/recipes/edit/:id" element={<CreatorRoute><CreateEditRecipePage /></CreatorRoute>} />
        <Route path="/admin/applications" element={<AdminRoute><AdminApplicationsPage /></AdminRoute>} />

        <Route path="/products" element={<ProtectedRoute><ProductBlogPage /></ProtectedRoute>} />
        <Route path="/products/category/:category" element={<ProtectedRoute><ProductCategoryPage /></ProtectedRoute>} />
        <Route path="/products/create"  element={<CreatorRoute><CreateEditProductPage /></CreatorRoute>} />
        <Route path="/products/edit/:id" element={<CreatorRoute><CreateEditProductPage /></CreatorRoute>} />
        <Route path="/products/:id" element={<ProtectedRoute><ProductDetailPage /></ProtectedRoute>} />
        <Route path="/forum" element={<ProtectedRoute><ForumBlogPage /></ProtectedRoute>} />
        <Route path="/forum/category/:category" element={<ProtectedRoute><ForumCategoryPage /></ProtectedRoute>}/>
        <Route path="/forum/create" element={<ProtectedRoute><CreateEditForumPage /></ProtectedRoute>}/>
        <Route path="/forum/:id" element={<ProtectedRoute><ForumDetailPage /></ProtectedRoute>} />
        <Route path="/forum/edit/:id" element={<ProtectedRoute><CreateEditForumPage /></ProtectedRoute>} />

        <Route path="/users/:id" element={<ProtectedRoute><CreatorProfilePage /></ProtectedRoute>} />
        

      </Routes>
    </>
  )
}

export default App
