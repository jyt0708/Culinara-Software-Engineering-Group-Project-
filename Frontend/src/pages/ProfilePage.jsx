import { useEffect, useEffectEvent, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Card, Avatar, Button, Input, Tag, Typography, App as AntdApp, Divider, Space, Alert, Spin, Empty, Form, Tooltip
} from 'antd'
const { TextArea } = Input
import { CameraOutlined, UserOutlined } from '@ant-design/icons'
import { updateUserAPI } from '../apis/user'
import { setUserInfo, fetchUserInfo } from '../store/modules/userStore'
import { getMyApplicationAPI } from '../apis/application'
import { getMyRecipesAPI } from '../apis/recipe'
import { getMyOrdersAPI, getSoldOrdersAPI, shipOrderAPI, completeOrderAPI, reportOrderIssueAPI } from '../apis/order'
import { getMyForumCommentsAPI } from '../apis/forum'
import { getCategoryLabel, getSubcategoryLabel } from '../constants/categories'
import ProfileNotifications from '../components/ProfileNotifications'
import RateProductModal from '../components/marketplace/RateProductModal'
import { getMyProductsAPI } from '../apis/product'
import { savePayoutEmailAPI, getMyOnboardingStatusAPI } from '../apis/seller'

const { Title, Text } = Typography
const GREEN = '#50806B'
const GREEN_DARK = '#2F3D37'
const PASSWORD_MIN = 6
const PASSWORD_MAX = 20
const formatDate = (value) =>
  new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
const ROLE_COLOR = { user: 'default', creator: 'green', admin: 'red' }
const ORDER_STATUS_COLOR = {
  pending: 'default',
  paid: 'blue',
  shipped: 'gold',
  completed: 'green',
  cancelled: 'red',
}

export default function ProfilePage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { userInfo } = useSelector((state) => state.user)
  const { message: messageApi } = AntdApp.useApp()
  const [passwordForm] = Form.useForm()
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'Profile')
  const [saving, setSaving] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)

  const [form, setForm] = useState({
    username: userInfo?.username || '',
    phoneNum: userInfo?.phoneNum || '',
    address: userInfo?.address || '',
  })
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)

  const [appLoading, setAppLoading] = useState(false)
  const [application, setApplication] = useState(null)
  const [appFetched, setAppFetched] = useState(false)

  const [recipesLoading, setRecipesLoading] = useState(false)
  const [myRecipes, setMyRecipes] = useState([])
  const [recipesFetched, setRecipesFetched] = useState(false)

  const [productsLoading, setProductsLoading] = useState(false)
  const [myProducts, setMyProducts] = useState([])
  const [productsFetched, setProductsFetched] = useState(false)

  const [ordersLoading, setOrdersLoading] = useState(false)
  const [myOrders, setMyOrders] = useState([])
  const [ordersFetched, setOrdersFetched] = useState(false)
  const [actingOrderId, setActingOrderId] = useState(null)
  const [ratingOrder, setRatingOrder] = useState(null)

  const [soldLoading, setSoldLoading] = useState(false)
  const [soldOrders, setSoldOrders] = useState([])
  const [soldFetched, setSoldFetched] = useState(false)
  const [trackingInputs, setTrackingInputs] = useState({})

  const [onboardLoading, setOnboardLoading] = useState(false)
  const [onboarded, setOnboarded] = useState(null)
  const [onboardFetched, setOnboardFetched] = useState(false)
  const [paypalEmail, setPaypalEmail] = useState(null)
  const [payoutEmailInput, setPayoutEmailInput] = useState('')
  const [payoutSaving, setPayoutSaving] = useState(false)
  const [showPayoutEdit, setShowPayoutEdit] = useState(false)

  const [commentsLoading, setCommentsLoading] = useState(false)
  const [myComments, setMyComments] = useState([])
  const [commentsFetched, setCommentsFetched] = useState(false)

  // Redux 用户信息变化时，同步 Profile 表单默认值。
  useEffect(() => {
    setForm({
      username: userInfo?.username || '',
      phoneNum: userInfo?.phoneNum || '',
      address: userInfo?.address || '',
    })
  }, [userInfo?._id, userInfo?.username, userInfo?.phoneNum, userInfo?.address])

  // Admin 只负责审核申请，不需要显示自己的申请状态 tab。
  //根据用户状态决定显示什么样的标签
  const tabs = userInfo?.role === 'admin'
    ? ['Profile', 'Notifications']
    : userInfo?.role === 'creator'
      ? ['Profile', 'Subscription', 'My Application', 'My Recipes', 'My Products', 'Orders', 'Sold Items', 'Comments', 'Notifications']
      : ['Profile', 'Subscription', 'My Application', 'Orders', 'Comments', 'Notifications']

  // 订阅状态由后端的 isSubscribed 和到期时间共同决定。
  const subscriptionExpiry = userInfo?.subscriptionExpiry ? new Date(userInfo.subscriptionExpiry) : null
  const subscriptionActive = Boolean(userInfo?.isSubscribed && subscriptionExpiry && subscriptionExpiry > new Date())
  const subscriptionExpired = Boolean(subscriptionExpiry && subscriptionExpiry <= new Date())

  // My Application tab 首次打开时才请求申请状态。
  useEffect(() => {
    setActiveTab(searchParams.get('tab') || 'Profile')
  }, [searchParams])

  // My Recipes tab 首次打开时才加载当前用户菜谱。
  useEffect(() => {
    if (!tabs.includes(activeTab)) setActiveTab('Profile')
  }, [activeTab, userInfo?.role])

  useEffect(() => {
    if (activeTab !== 'My Application' || appFetched) return

    setAppLoading(true)
    getMyApplicationAPI()
      .then((res) => {
        setApplication(res.data)
        if (res.data?.status === 'approved') dispatch(fetchUserInfo())
      })
      .catch(() => {})
      .finally(() => { setAppLoading(false); setAppFetched(true) })
  }, [activeTab, appFetched, dispatch])

  useEffect(() => {
    if (activeTab !== 'My Recipes' || recipesFetched) return

    setRecipesLoading(true)
    getMyRecipesAPI()
      .then((res) => setMyRecipes(res.data))
      .catch(() => {})
      .finally(() => { setRecipesLoading(false); setRecipesFetched(true) })
  }, [activeTab, recipesFetched])

  useEffect(() => {
    if (activeTab !== 'My Products' || productsFetched) return

    setProductsLoading(true)
    getMyProductsAPI()
      .then((res) => setMyProducts(res.data))
      .catch(() => {})
      .finally(() => { 
        setProductsLoading(false)
        setProductsFetched(true)
      })
  })

  useEffect(() => {
    if (activeTab !== 'Orders' || ordersFetched) return

    setOrdersLoading(true)
    getMyOrdersAPI()
      .then((res) => setMyOrders(Array.isArray(res?.data) ? res.data : []))
      .catch((err) => messageApi.error(err.response?.data?.message || 'Failed to load orders'))
      .finally(() => { setOrdersLoading(false); setOrdersFetched(true) })
  }, [activeTab, ordersFetched])

  useEffect(() => {
    if (activeTab !== 'Sold Items' || soldFetched) return

    setSoldLoading(true)
    getSoldOrdersAPI()
      .then((res) => setSoldOrders(Array.isArray(res?.data) ? res.data : []))
      .catch((err) => messageApi.error(err.response?.data?.message || 'Failed to load sales'))
      .finally(() => { setSoldLoading(false); setSoldFetched(true) })
  }, [activeTab, soldFetched])

  useEffect(() => {
    if (activeTab !== 'Sold Items' || onboardFetched) return

    setOnboardLoading(true)
    getMyOnboardingStatusAPI()
      .then((res) => {
        setOnboarded(Boolean(res?.onboarded))
        setPaypalEmail(res?.paypalEmail || null)
      })
      .catch(() => {})
      .finally(() => { setOnboardLoading(false); setOnboardFetched(true) })
  }, [activeTab, onboardFetched])

  useEffect(() => {
    if (activeTab !== 'Comments' || commentsFetched) return

    setCommentsLoading(true)
    getMyForumCommentsAPI()
      .then((res) => {
        const list = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : []
        setMyComments(list)
      })
      .catch((err) => messageApi.error(err.response?.data?.message || 'Failed to load comments'))
      .finally(() => { setCommentsLoading(false); setCommentsFetched(true) })
  }, [activeTab, commentsFetched])

  const handleConfirmReceipt = async (orderId) => {
    setActingOrderId(orderId)
    try {
      await completeOrderAPI(orderId)
      setMyOrders((prev) => prev.map((o) => (o._id === orderId ? { ...o, status: 'completed' } : o)))
      messageApi.success('Receipt confirmed. Enjoy!')
    } catch (err) {
      messageApi.error(err.response?.data?.message || 'Failed to confirm receipt')
    } finally {
      setActingOrderId(null)
    }
  }

  const handleMarkShipped = async (orderId) => {
    setActingOrderId(orderId)
    const trackingNumber = (trackingInputs[orderId] || '').trim()
    try {
      await shipOrderAPI(orderId, trackingNumber)
      setSoldOrders((prev) => prev.map((o) => (o._id === orderId ? { ...o, status: 'shipped', trackingNumber, issueReportedAt: null } : o)))
      messageApi.success('Order marked as shipped')
    } catch (err) {
      messageApi.error(err.response?.data?.message || 'Failed to mark as shipped')
    } finally {
      setActingOrderId(null)
    }
  }

  const handleReportIssue = async (orderId) => {
    setActingOrderId(orderId)
    try {
      await reportOrderIssueAPI(orderId)
      setMyOrders((prev) => prev.map((o) => (o._id === orderId ? { ...o, issueReportedAt: new Date().toISOString() } : o)))
      messageApi.success('The seller has been notified')
    } catch (err) {
      messageApi.error(err.response?.data?.message || 'Failed to notify seller')
    } finally {
      setActingOrderId(null)
    }
  }

  const handleSavePayoutEmail = async () => {
    const email = payoutEmailInput.trim()
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRe.test(email)) {
      return messageApi.error('Please enter a valid PayPal email')
    }
    setPayoutSaving(true)
    try {
      const res = await savePayoutEmailAPI(email)
      setOnboarded(true)
      setPaypalEmail(res?.paypalEmail || email)
      setShowPayoutEdit(false)
      messageApi.success('Payout email saved')
    } catch (err) {
      messageApi.error(err.response?.data?.message || 'Failed to save')
    } finally {
      setPayoutSaving(false)
    }
  }

  const refetchOrders = () => {
    getMyOrdersAPI()
      .then((res) => setMyOrders(Array.isArray(res?.data) ? res.data : []))
      .catch(() => {})
  }

  // tab 状态同步到 URL，方便从订阅弹窗直接跳到指定 tab。
  const handleTabChange = (tab) => {
    setActiveTab(tab)
    setSearchParams({ tab })
  }

  // 头像先在本地预览，保存 Profile 时再上传。
  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setAvatarPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  // 保存 Profile 使用 FormData，统一处理文字字段和头像文件。
  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      const formData = new FormData()
      if (form.username !== userInfo?.username) formData.append('username', form.username)
      formData.append('phoneNum', form.phoneNum)
      formData.append('address', form.address)
      if (avatarFile) formData.append('profilePicture', avatarFile)
      const res = await updateUserAPI(formData)
      dispatch(setUserInfo(res.data))
      setAvatarFile(null)
      setAvatarPreview(null)
      messageApi.success('Profile updated!')
    } catch (err) {
      messageApi.error(err.response?.data?.message || 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  // 修改密码需要当前密码，避免误操作或未授权修改。
  const handleChangePassword = async (values) => {
    setPasswordSaving(true)
    try {
      const formData = new FormData()
      formData.append('currentPassword', values.currentPassword)
      formData.append('newPassword', values.newPassword)
      await updateUserAPI(formData)
      passwordForm.resetFields()
      messageApi.success('Password updated!')
    } catch (err) {
      messageApi.error(err.response?.data?.message || 'Password update failed')
    } finally {
      setPasswordSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: 1100, margin: '2.5rem auto 5rem', padding: '0 1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0, color: GREEN_DARK }}>
          Welcome, {userInfo?.username}!
        </Title>
        <Tag color={ROLE_COLOR[userInfo?.role]} style={{ fontSize: '0.9rem', padding: '4px 12px', textTransform: 'capitalize' }}>
          {userInfo?.role}
        </Tag>
      </div>

      <Space wrap style={{ marginBottom: 28 }}>
        {tabs.map((tab) => (
          <Button
            key={tab}
            type={activeTab === tab ? 'primary' : 'default'}
            onClick={() => handleTabChange(tab)}
            style={activeTab === tab ? { background: GREEN, borderColor: GREEN } : {}}
          >
            {tab}
          </Button>
        ))}
      </Space>

      {activeTab === 'Profile' && (
        <>
        <Card style={{ borderRadius: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
            <div style={{ position: 'relative' }}>
              <Avatar
                size={80}
                src={avatarPreview || userInfo?.profilePicture || null}
                icon={!avatarPreview && !userInfo?.profilePicture && <UserOutlined />}
                style={{ background: 'linear-gradient(135deg,#f9b8c8,#e879a0)', border: `3px solid ${GREEN}` }}
              >
                {!avatarPreview && !userInfo?.profilePicture && userInfo?.username?.[0]?.toUpperCase()}
              </Avatar>
              <label htmlFor="avatar-upload" style={{
                position: 'absolute', bottom: 0, right: 0,
                background: GREEN, borderRadius: '50%',
                width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}>
                <CameraOutlined style={{ color: '#fff', fontSize: 13 }} />
              </label>
              <input id="avatar-upload" type="file" accept=".jpg,.jpeg,.png" style={{ display: 'none' }} onChange={handleAvatarChange} />
            </div>
            <div>
              <Text strong style={{ color: GREEN, display: 'block', marginBottom: 4 }}>Profile Picture</Text>
              <Text type="secondary" style={{ fontSize: '0.8rem' }}>Click the camera icon to change</Text>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: 24 }}>
            <div>
              <Text strong style={{ color: GREEN, display: 'block', marginBottom: 6 }}>Username</Text>
              <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            </div>
            <div>
              <Text strong style={{ color: GREEN, display: 'block', marginBottom: 6 }}>Email</Text>
              <Input value={userInfo?.email || ''} readOnly variant="filled" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: 24 }}>
            <div>
              <Text strong style={{ color: GREEN, display: 'block', marginBottom: 6 }}>Phone Number</Text>
              <Input
                value={form.phoneNum}
                placeholder="+49 151 12345678"
                onChange={(e) => setForm({ ...form, phoneNum: e.target.value })}
              />
            </div>
            <div>
              <Text strong style={{ color: GREEN, display: 'block', marginBottom: 6 }}>Address</Text>
              <Input
                value={form.address}
                placeholder="Notburgastr 19, Munich"
                maxLength={200}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <Button size="large" type="primary" loading={saving} style={{ background: GREEN, borderColor: GREEN, minWidth: 180 }} onClick={handleSaveProfile}>
              Save Profile
            </Button>
          </div>
        </Card>
        <Card style={{ borderRadius: 10, marginTop: 16 }}>
          <Title level={4} style={{ color: GREEN_DARK, marginTop: 0 }}>Change Password</Title>
          <Form form={passwordForm} layout="vertical" onFinish={handleChangePassword}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: 24 }}>
              <Form.Item
                label={<Text strong style={{ color: GREEN }}>Current Password</Text>}
                name="currentPassword"
                rules={[{ required: true, message: 'Please enter your current password' }]}
              >
                <Input.Password autoComplete="off" />
              </Form.Item>

              <Form.Item
                label={<Text strong style={{ color: GREEN }}>New Password</Text>}
                name="newPassword"
                rules={[
                  { required: true, message: 'Please enter a new password' },
                  { min: PASSWORD_MIN, message: `Password must be at least ${PASSWORD_MIN} characters` },
                  { max: PASSWORD_MAX, message: `Password must be at most ${PASSWORD_MAX} characters` },
                ]}
              >
                <Input.Password autoComplete="new-password" />
              </Form.Item>

              <Form.Item
                label={<Text strong style={{ color: GREEN }}>Confirm Password</Text>}
                name="confirmPassword"
                dependencies={['newPassword']}
                rules={[
                  { required: true, message: 'Please confirm your new password' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('newPassword') === value) return Promise.resolve()
                      return Promise.reject(new Error('Passwords do not match'))
                    },
                  }),
                ]}
              >
                <Input.Password autoComplete="new-password" />
              </Form.Item>
            </div>

            <div style={{ textAlign: 'center' }}>
              <Button size="large" type="primary" htmlType="submit" loading={passwordSaving} style={{ background: GREEN, borderColor: GREEN, minWidth: 180 }}>
                Change Password
              </Button>
            </div>
          </Form>
        </Card>
        </>
      )}

      {activeTab === 'Subscription' && (
        <Card style={{ borderRadius: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 360px' }}>
              <Title level={3} style={{ color: GREEN_DARK, marginTop: 0 }}>Premium Subscription</Title>
              <Text style={{ color: '#5f6b65' }}>
                Premium members can read every recipe without the free-view limit.
              </Text>
            </div>
            <Button
              type="primary"
              size="large"
              onClick={() => navigate('/subscription')}
              style={{ background: GREEN, borderColor: GREEN }}
            >
              Manage Subscription
            </Button>
          </div>

          <Divider />

          {subscriptionActive ? (
            <Alert
              type="success"
              showIcon
              message="Your premium access is active"
              description={(
                <>
                  Unlimited recipe access is available until {formatDate(subscriptionExpiry)}.
                  <br />
                  If your subscription expires, please subscribe again manually.
                </>
              )}
            />
          ) : subscriptionExpired ? (
            <Alert
              type="warning"
              showIcon
              message="Your subscription has expired"
              description={`Your previous access ended on ${formatDate(subscriptionExpiry)}. Renew to restore unlimited recipe access.`}
            />
          ) : (
            <Alert
              type="info"
              showIcon
              message="You are currently on the free plan"
              description="Subscribe to unlock unlimited premium recipes and future community benefits."
            />
          )}
        </Card>
      )}

      {activeTab === 'My Application' && (
        <Card style={{ borderRadius: 10 }}>
          {appLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}><Spin /></div>
          ) : !application ? (
            <Empty description="You haven't applied yet">
              <Button type="primary" onClick={() => navigate('/apply')} style={{ background: GREEN, borderColor: GREEN }}>
                Apply to Become a Creator
              </Button>
            </Empty>
          ) : application.status === 'pending' ? (
            <Alert
              type="info"
              message="Application Under Review"
              description="Your application is being reviewed by our team. We'll notify you once a decision is made."
              showIcon
            />
          ) : application.status === 'approved' ? (
            <Alert
              type="success"
              message="Application Approved!"
              description={
                <>
                  Congratulations! You are now a Culinara creator.
                  <div style={{ marginTop: 8, color: '#626b66', fontSize: '0.85rem' }}>
                    Applied on {new Date(application.createdAt).toLocaleDateString()}
                    {' · '}
                    Approved on {new Date(application.updatedAt).toLocaleDateString()}
                  </div>
                </>
              }
              showIcon
            />
          ) : application.status === 'rejected' ? (
            <div>
              <Alert
                type="error"
                message="Application Rejected"
                description={application.rejectionReason ? `Reason: ${application.rejectionReason}` : 'Your application was not approved.'}
                showIcon
                style={{ marginBottom: 16 }}
              />
              <Button type="primary" onClick={() => navigate('/apply')} style={{ background: GREEN, borderColor: GREEN }}>
                Re-apply
              </Button>
            </div>
          ) : null}
        </Card>
      )}

      {/* //go to components/profilenotification */}  
      {activeTab === 'Notifications' && (
        <Card style={{ borderRadius: 10 }}>
          <ProfileNotifications />
        </Card>
      )}

      {activeTab === 'My Recipes' && (
        <Card style={{ borderRadius: 10 }}>
          {recipesLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}><Spin /></div>
          ) : myRecipes.length === 0 ? (
            <Empty description="You haven't published any recipes yet">
              <Button type="primary" onClick={() => navigate('/recipes/create')} style={{ background: GREEN, borderColor: GREEN }}>
                Create Your First Recipe
              </Button>
            </Empty>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <Text strong>{myRecipes.length} recipe(s) published</Text>
                <Button type="primary" onClick={() => navigate('/recipes/create')} style={{ background: GREEN, borderColor: GREEN }}>
                  + New Recipe
                </Button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
                {myRecipes.map((r) => (
                  <Card
                    key={r._id}
                    hoverable
                    onClick={() => navigate(`/recipes/${r._id}`)}
                    cover={
                      <div style={{
                        height: 140,
                        backgroundImage: `url(${r.coverImage})`,
                        backgroundSize: 'cover', backgroundPosition: 'center',
                      }} />
                    }
                    bodyStyle={{ padding: 12 }}
                  >
                    <div style={{ fontWeight: 700, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.title}
                    </div>
                    <Text type="secondary" style={{ fontSize: '0.78rem' }}>
                      {getCategoryLabel(r.category)} · {getSubcategoryLabel(r.category, r.subcategory)} · {r.cookTime}min
                    </Text>
                    <div style={{ marginTop: 6, fontSize: '0.78rem', color: '#888' }}>
                      {r.viewCount} views · {new Date(r.createdAt).toLocaleDateString()}
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </Card>
      )}

      {activeTab === 'My Products' && (
        <Card style={{ borderRadius: 10}}>
          {productsLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}><Spin /></div>
          ) : myProducts.length === 0 ? (
            <Empty description="You haven't published any products yet">
              <Button type="primary" onClick={() => navigate('/products/create')} style={{ background: GREEN, borderColor: GREEN }}>
                Create Your First Product
              </Button>
            </Empty>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <Text strong>{myProducts.length} product(s) published</Text>
                <Button type="primary" onClick={() => navigate('/products/create')} style={{ background: GREEN, borderColor: GREEN }}>
                  + New Product
                </Button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
                {myProducts.map((r) => (
                  <Card
                    key={r._id}
                    hoverable
                    onClick={() => navigate(`/products/${r._id}`)}
                    cover={
                      <div style={{
                        height: 140,
                        backgroundImage: `url(${r.coverImage})`,
                        backgroundSize: 'cover', backgroundPosition: 'center',
                      }} />
                    }
                    bodyStyle={{ padding: 12 }}
                  >
                    <div style={{ fontWeight: 700, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.name}
                    </div>
                    <div style={{ marginTop: 6, fontSize: '0.78rem', color: r.stock == 0 ? '#d4380d' : '#888', fontWeight: r.stock === 0 ? 700 : 400 }}>
                      Stock Left: {r.stock}  
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </Card>
      )}

      {activeTab === 'Orders' && (
        <Card style={{ borderRadius: 10 }}>
          {ordersLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}><Spin /></div>
          ) : myOrders.length === 0 ? (
            <Empty description="You have no orders yet" />
          ) : (
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              {myOrders.map((order) => (
                <Card key={order._id} size="small" style={{ borderRadius: 8 }} styles={{ body: { padding: 12 } }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div style={{
                      width: 72, height: 72, flexShrink: 0, borderRadius: 8,
                      backgroundImage: order.productSnapshot?.coverImage ? `url(${order.productSnapshot.coverImage})` : 'none',
                      backgroundColor: '#f0f0f0',
                      backgroundSize: 'cover', backgroundPosition: 'center',
                    }} />
                    <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <Text strong style={{ fontSize: '0.95rem' }}>{order.productSnapshot?.name || 'Product'}</Text>
                        <Tag color={ORDER_STATUS_COLOR[order.status] || 'default'} style={{ textTransform: 'capitalize', margin: 0 }}>
                          {order.status}
                        </Tag>
                      </div>
                      <Text type="secondary" style={{ fontSize: '0.82rem', display: 'block' }}>
                        Qty: {order.quantity} · €{order.totalAmount}
                      </Text>
                      {order.trackingNumber && (
                        <Text type="secondary" style={{ fontSize: '0.8rem', display: 'block' }}>
                          Tracking #: {order.trackingNumber}
                        </Text>
                      )}
                      <Text type="secondary" style={{ fontSize: '0.78rem' }}>
                        {new Date(order.createdAt).toLocaleDateString()}
                      </Text>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {order.status === 'paid' && (
                        <Button
                          size="small"
                          loading={actingOrderId === order._id}
                          onClick={() => handleReportIssue(order._id)}
                        >
                          Remind to ship
                        </Button>
                      )}
                      {order.status === 'shipped' && (
                        <>
                          <Button
                            danger
                            size="small"
                            loading={actingOrderId === order._id}
                            onClick={() => handleReportIssue(order._id)}
                          >
                            Not received?
                          </Button>
                          <Button
                            type="primary"
                            size="small"
                            loading={actingOrderId === order._id}
                            style={{ background: GREEN, borderColor: GREEN }}
                            onClick={() => handleConfirmReceipt(order._id)}
                          >
                            Confirm Receipt
                          </Button>
                        </>
                      )}
                      {order.status === 'completed' && !order.ratedByBuyer && (
                        <Button
                          size="small"
                          style={{ borderColor: GREEN, color: GREEN }}
                          onClick={() => setRatingOrder(order)}
                        >
                          Rate Product
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </Space>
          )}
        </Card>
      )}

      {activeTab === 'Sold Items' && (
        <>
          <Card title="PayPal Payouts " style={{ borderRadius: 10, marginBottom: 16 }}>
            {onboarded === null ? (
              <div style={{ textAlign: 'center', padding: '1rem' }}><Spin /></div>
            ) : onboarded === true ? (
              <div>
                <Alert
                  type="success"
                  showIcon
                  message={
                    <span>
                      PayPal payouts enabled{' '}
                      <Tag color="green" style={{ marginLeft: 4 }}>linked</Tag>
                    </span>
                  }
                  description={paypalEmail ? `Payments are sent to: ${paypalEmail}` : null}
                  action={
                    !showPayoutEdit ? (
                      <Button
                        size="small"
                        style={{ borderColor: GREEN, color: GREEN }}
                        onClick={() => { setPayoutEmailInput(paypalEmail || ''); setShowPayoutEdit(true) }}
                      >
                        Change
                      </Button>
                    ) : null
                  }
                />
                {showPayoutEdit && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                    <Input
                      type="email"
                      placeholder="seller@example.com"
                      value={payoutEmailInput}
                      onChange={(e) => setPayoutEmailInput(e.target.value)}
                      onPressEnter={handleSavePayoutEmail}
                      style={{ flex: '1 1 240px' }}
                    />
                    <Button
                      type="primary"
                      loading={payoutSaving}
                      style={{ background: GREEN, borderColor: GREEN }}
                      onClick={handleSavePayoutEmail}
                    >
                      Save
                    </Button>
                    <Button onClick={() => setShowPayoutEdit(false)}>Cancel</Button>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <Text style={{ color: '#5f6b65', display: 'block', marginBottom: 12 }}>
                  Add the PayPal email where you want to receive payments for your sales. You must set this before selling.
                </Text>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Input
                    type="email"
                    placeholder="seller@example.com"
                    value={payoutEmailInput}
                    onChange={(e) => setPayoutEmailInput(e.target.value)}
                    onPressEnter={handleSavePayoutEmail}
                    style={{ flex: '1 1 240px' }}
                  />
                  <Button
                    type="primary"
                    loading={payoutSaving}
                    style={{ background: GREEN, borderColor: GREEN }}
                    onClick={handleSavePayoutEmail}
                  >
                    Save
                  </Button>
                </div>
              </div>
            )}
          </Card>

          <Card style={{ borderRadius: 10 }}>
          {soldLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}><Spin /></div>
          ) : soldOrders.length === 0 ? (
            <Empty description="No sales yet" />
          ) : (
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              {soldOrders.map((order) => (
                <Card key={order._id} size="small" style={{ borderRadius: 8 }} styles={{ body: { padding: 12 } }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div style={{
                      width: 72, height: 72, flexShrink: 0, borderRadius: 8,
                      backgroundImage: order.productSnapshot?.coverImage ? `url(${order.productSnapshot.coverImage})` : 'none',
                      backgroundColor: '#f0f0f0',
                      backgroundSize: 'cover', backgroundPosition: 'center',
                    }} />
                    <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <Text strong style={{ fontSize: '0.95rem' }}>{order.productSnapshot?.name || 'Product'}</Text>
                        <Tag color={ORDER_STATUS_COLOR[order.status] || 'default'} style={{ textTransform: 'capitalize', margin: 0 }}>
                          {order.status}
                        </Tag>
                      </div>
                      <Text type="secondary" style={{ fontSize: '0.82rem', display: 'block' }}>
                        Buyer: {order.buyer?.username || 'Unknown'} · Qty: {order.quantity} · €{order.totalAmount}
                      </Text>
                      <Text type="secondary" style={{ fontSize: '0.8rem', display: 'block' }}>
                        Ship to: {order.shippingAddress || '—'}
                      </Text>
                      {order.trackingNumber && (
                        <Text type="secondary" style={{ fontSize: '0.8rem', display: 'block' }}>
                          Tracking #: {order.trackingNumber}
                        </Text>
                      )}
                      <Text type="secondary" style={{ fontSize: '0.78rem' }}>
                        {new Date(order.createdAt).toLocaleDateString()}
                      </Text>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {order.status === 'paid' && (
                        <>
                          <Input
                            size="small"
                            placeholder="Tracking # (required)"
                            value={trackingInputs[order._id] || ''}
                            onChange={(e) =>
                              setTrackingInputs((prev) => ({ ...prev, [order._id]: e.target.value }))
                            }
                            style={{ width: 180 }}
                          />
                          <Button
                            type="primary"
                            size="small"
                            loading={actingOrderId === order._id}
                            disabled={!(trackingInputs[order._id] || '').trim()}
                            style={{ background: GREEN, borderColor: GREEN }}
                            onClick={() => handleMarkShipped(order._id)}
                          >
                            Mark as Shipped
                          </Button>
                        </>
                      )}
                      {order.status === 'shipped' && order.issueReportedAt && (
                        <>
                          <Tag color="warning" style={{ margin: 0 }}>Buyer reported an issue</Tag>
                          <Input
                            size="small"
                            placeholder="New tracking # (required)"
                            value={trackingInputs[order._id] || ''}
                            onChange={(e) =>
                              setTrackingInputs((prev) => ({ ...prev, [order._id]: e.target.value }))
                            }
                            style={{ width: 180 }}
                            disabled={!(order.product?.stock > 0)}
                          />
                          <Tooltip title={!(order.product?.stock > 0) ? 'Out of stock — cannot re-ship' : ''}>
                            <Button
                              size="small"
                              danger
                              loading={actingOrderId === order._id}
                              disabled={!(order.product?.stock > 0) || !(trackingInputs[order._id] || '').trim()}
                              onClick={() => handleMarkShipped(order._id)}
                            >
                              Re-ship
                            </Button>
                          </Tooltip>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </Space>
          )}
          </Card>
        </>
      )}

      {activeTab === 'Comments' && (
        <Card style={{ borderRadius: 10 }}>
          {commentsLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}><Spin /></div>
          ) : myComments.length === 0 ? (
            <Empty description="You haven't commented yet" />
          ) : (
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              {myComments.map((c) => (
                <Card key={c._id} size="small" style={{ borderRadius: 8 }} styles={{ body: { padding: 12 } }}>
                  <Text style={{ display: 'block', marginBottom: 6 }}>{c.content}</Text>
                  <div style={{ fontSize: '0.78rem', color: '#888' }}>
                    {c.post?.title ? (
                      <a
                        style={{ color: GREEN }}
                        onClick={() => navigate(`/forum/${c.post?._id || c.post}`)}
                      >
                        on “{c.post.title}”
                      </a>
                    ) : (
                      <span>on a post</span>
                    )}
                    {c.createdAt && <span> · {new Date(c.createdAt).toLocaleDateString()}</span>}
                  </div>
                </Card>
              ))}
            </Space>
          )}
        </Card>
      )}

      <RateProductModal
        open={Boolean(ratingOrder)}
        productId={ratingOrder?.product?._id || ratingOrder?.product}
        orderId={ratingOrder?._id}
        productName={ratingOrder?.productSnapshot?.name}
        onClose={() => setRatingOrder(null)}
        onRated={() => { setRatingOrder(null); refetchOrders() }}
      />
    </div>
  )
}
