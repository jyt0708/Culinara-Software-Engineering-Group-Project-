import { useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Alert,
  App as AntdApp,
  Button,
  Card,
  Divider,
  Space,
  Tag,
  Typography,
} from 'antd'
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  CrownOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons'
import PayPalSubscribeButton from '../components/paypal/PayPalSubscribeButton'
import { fetchUserInfo } from '../store/modules/userStore'

const { Title, Text, Paragraph } = Typography

const GREEN = '#50806B'
const GREEN_DARK = '#2F3D37'
const RED = '#c25450'
const LINE = '#e6ebe7'
// block1. 展示的订阅计划数据
const PLANS = [
  {
    id: 'monthly',
    name: 'Monthly Plan',
    amount: '9.99',
    currency: 'EUR',
    durationDays: 30,
    note: 'Flexible monthly access',
    badge: null,
  },
  {
    id: 'quarterly',
    name: 'Quarterly Plan',
    amount: '24.99',
    currency: 'EUR',
    durationDays: 90,
    note: 'Save more with quarterly access',
    badge: 'Most popular',
  },
  {
    id: 'yearly',
    name: 'Yearly Plan',
    amount: '79.99',
    currency: 'EUR',
    durationDays: 365,
    note: 'Best value for long-term members',
    badge: null,
  },
]

const formatDate = (value) => {
  if (!value) return ''
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const formatMoney = (amount, currency) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(amount))
// 会员权益行组件，传入included决定是否显示绿色对号（箭头函数：参数指向做的事情）
function FeatureLine({ included, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 28 }}>
      {included ? (
        <CheckCircleFilled style={{ color: GREEN, fontSize: 14 }} />
      ) : (
        <CloseCircleFilled style={{ color: RED, fontSize: 14 }} />
      )}
      <Text style={{ color: included ? '#38443e' : '#6e5f5f', fontSize: 14 }}>{children}</Text>
    </div>
  )
}
//block2.权益对比卡片
function MembershipCard({ premium }) {
  return (
    <Card
      style={{
        borderRadius: 8,
        borderColor: premium ? GREEN : LINE,
        background: premium ? '#fbfaf1' : '#fff',
        height: '100%',
      }}
      bodyStyle={{ padding: 22 }}
    >
      <Space align="start" size={12} style={{ marginBottom: 18 }}>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 8,
            background: premium ? '#e9f3da' : '#f5f6f5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: premium ? GREEN : '#8a918d',
          }}
        >
          {premium ? <CrownOutlined /> : <SafetyCertificateOutlined />}
        </div>
        <div>
          <Text strong style={{ color: GREEN_DARK }}>{premium ? 'Premium Member' : 'Free User'}</Text>
          <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
            {premium ? 'Full platform access' : 'Basic access'}
          </Text>
        </div>
      </Space>

      <Space direction="vertical" size={10} style={{ width: '100%' }}>
        <FeatureLine included>Browse marketplace products</FeatureLine>
        <FeatureLine included>Read forum discussions</FeatureLine>
        <FeatureLine included={premium}>Unlimited premium recipes</FeatureLine>
        <FeatureLine included={premium}>Post and reply in community forums</FeatureLine>
        {premium && <FeatureLine included>Premium badge in community spaces</FeatureLine>}
      </Space>
    </Card>
  )
}
//block3. 单个计划卡片组件，传入plan数据和selected决定是否选中，onSelect回调选中plan
function PlanCard({ plan, selected, onSelect }) {
  return (
    <Card
      hoverable
      onClick={() => onSelect(plan.id)}
      style={{
        borderRadius: 8,
        borderColor: selected ? GREEN : LINE,
        boxShadow: selected ? '0 8px 22px rgba(80,128,107,0.12)' : 'none',
        height: '100%',
      }}
      bodyStyle={{ padding: 22 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <Text strong style={{ color: GREEN_DARK }}>{plan.name}</Text>
        {plan.badge && <Tag color="green" style={{ margin: 0, textTransform: 'uppercase' }}>{plan.badge}</Tag>}
      </div>
      <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 14 }}>
        {plan.durationDays === 30 ? 'Billed monthly' : `Billed every ${plan.durationDays} days`}
      </Text>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 14 }}>
        <Title level={2} style={{ margin: 0, color: '#111' }}>{formatMoney(plan.amount, plan.currency)}</Title>
        <Text type="secondary">/ {plan.durationDays} days</Text>
      </div>
      <Tag style={{ borderRadius: 12, background: '#eef4ef', color: GREEN, border: 0 }}>{plan.note}</Tag>
      <Button
        block
        type={selected ? 'primary' : 'default'}
        style={selected ? { marginTop: 18, background: GREEN, borderColor: GREEN } : { marginTop: 18 }}
      >
        {selected ? 'Selected' : 'Choose Plan'}
      </Button>
    </Card>
  )
}

export default function SubscriptionPage() {
  const dispatch = useDispatch() //触发redux更新（下面都是hooks）
  const navigate = useNavigate() 
  const [searchParams] = useSearchParams()
  const { userInfo } = useSelector((state) => state.user) //从redux获取当前登录用户信息
  const { message } = AntdApp.useApp()
  const [selectedPlanId, setSelectedPlanId] = useState('monthly') //记住当前选中的planid，默认选monthly，修改用set

//通过id计算当前选中的plan对象，依赖项不变就复用上次的值
  const selectedPlan = useMemo(
    () => PLANS.find((plan) => plan.id === selectedPlanId) || PLANS[0],
    [selectedPlanId],
  )
//计算订阅状态是否过期/激活
  const subscription = useMemo(() => {
    const expiry = userInfo?.subscriptionExpiry ? new Date(userInfo.subscriptionExpiry) : null
    const now = new Date()
    const active = Boolean(userInfo?.isSubscribed && expiry && expiry > now)
    const expired = Boolean(expiry && expiry <= now)
    return { expiry, active, expired }
  }, [userInfo?.isSubscribed, userInfo?.subscriptionExpiry])

  const from = searchParams.get('from')

  
//支付成功后回调，刷新用户信息+跳转到from或订阅详情页
  const handleSuccess = () => {
    dispatch(fetchUserInfo())
    if (from?.startsWith('/')) {
      message.success('Subscription active. Returning to your recipe...')
      setTimeout(() => navigate(from, { replace: true }), 3000)
    } else {
      message.success('Subscription active. Opening your subscription details...')
      setTimeout(() => navigate('/profile?tab=Subscription', { replace: true }), 3000)
    }
  }
//返回按钮，返回上一页
//订阅页顶部欢迎条幅
//订阅状态提示subscription
//第三行：会员权益卡片展示div style
//第四行：订阅计划选择卡片
//最后：paypal支付按钮
  return (
    <main style={{ background: '#f8faf8', minHeight: 'calc(100vh - 64px)', padding: '2rem 1.5rem 4rem' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        <Button
          type="link"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(-1)}
          style={{ paddingLeft: 0, color: GREEN_DARK, marginBottom: 14 }}
        >
          Return to Previous Page
        </Button>

        <section
          style={{
            border: `1px solid ${LINE}`,
            borderRadius: 8,
            background: 'linear-gradient(135deg, #c7ee8e 0%, #e9f6dd 48%, #f8fbf7 100%)',
            padding: '2rem',
            marginBottom: 22,
          }}
        >
          <Tag style={{ borderRadius: 14, marginBottom: 18, border: 0, background: '#fff9d9', color: '#6d642b' }}>
            Premium Membership
          </Tag>
          <Title level={1} style={{ maxWidth: 700, margin: 0, color: '#101511', lineHeight: 1.08 }}>
            Unlock Every Recipe & Join the Full Community Experience
          </Title>
          <Paragraph style={{ maxWidth: 660, color: '#4d5d53', marginTop: 14, marginBottom: 0 }}>
            Upgrade to Premium to access every recipe across cuisines and keep cooking without the free-view limit.
          </Paragraph>
        </section>

        {subscription.active && (
          <Alert
            type="success"
            showIcon
            style={{ marginBottom: 22 }}
            message="Your premium access is active"
            description={`Unlimited recipe access is available until ${formatDate(subscription.expiry)}.`}
          />
        )}

        {subscription.expired && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 22 }}
            message="Your subscription has expired"
            description={`Your previous access ended on ${formatDate(subscription.expiry)}. Subscribe again to restore unlimited recipe access.`}
          />
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 18,
          marginBottom: 30,
        }}>
          <MembershipCard />
          <MembershipCard premium />
        </div>

        <Title level={3} style={{ color: GREEN_DARK, marginBottom: 16 }}>Choose Your Subscription Plan</Title>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 18,
          marginBottom: 22,
        }}>
          {PLANS.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              selected={selectedPlan.id === plan.id}
              onSelect={setSelectedPlanId}
            />
          ))}
        </div>

        <Card style={{ borderRadius: 8, borderColor: LINE }} bodyStyle={{ padding: 24 }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, 420px)',
            gap: 24,
            alignItems: 'start',
          }}>
            <div>
              <Title level={4} style={{ color: GREEN_DARK, marginTop: 0 }}>Secure PayPal Checkout</Title>
              <Paragraph style={{ color: '#59645e', marginBottom: 12 }}>
                PayPal handles the checkout page, card details, wallet payment, and secure payment confirmation. Culinara only activates Premium after the backend captures a completed PayPal order.
              </Paragraph>
              <Space direction="vertical" size={8}>
                <Text><CalendarOutlined style={{ color: GREEN, marginRight: 8 }} />Selected plan: <Text strong>{selectedPlan.name}</Text></Text>
                <Text>Access length: <Text strong>{selectedPlan.durationDays} days</Text></Text>
                <Text>Total: <Text strong>{formatMoney(selectedPlan.amount, selectedPlan.currency)}</Text></Text>
              </Space>
            </div>
            <div>
              {subscription.active ? (
                <Alert
                  type="info"
                  showIcon
                  message="You are already subscribed"
                  description="You can renew again after your current subscription expires."
                />
              ) : (
                <>
                  <PayPalSubscribeButton plan={selectedPlan} onSuccess={handleSuccess} />
                  <Divider style={{ margin: '16px 0' }} />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Sandbox checkout can use a PayPal test buyer account. Card options may appear inside PayPal depending on the sandbox setup.
                  </Text>
                </>
              )}
            </div>
          </div>
        </Card>
      </div>
    </main>
  )
}
