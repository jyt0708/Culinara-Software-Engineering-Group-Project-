import { FUNDING, PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js'
import { Alert, App as AntdApp } from 'antd'
import { captureSubscriptionOrderAPI, createSubscriptionOrderAPI } from '../../apis/payment'
import config from '../../../config'

const PAYPAL_CLIENT_ID = config.VITE_PAYPAL_CLIENT_ID

// 订阅页传来三个参数：已选订阅计划，disabled（按钮是否禁用），onSuccess（支付成功后跳转）
export default function PayPalSubscribeButton({ plan, disabled, onSuccess }) {
  const { message } = AntdApp.useApp()
// 1. 没配paypal，弹出警告框
  if (!PAYPAL_CLIENT_ID) {
    return (
      <Alert
        type="warning"
        showIcon
        message="PayPal client ID is not configured"
        description="Add VITE_PAYPAL_CLIENT_ID to the frontend environment before testing PayPal checkout."
      />
    )
  }
// 2. 没选plan，弹出警告框
  if (!plan) {
    return (
      <Alert
        type="info"
        showIcon
        message="Choose a subscription plan first"
      />
    )
  }

  return (
    // 3. 加载 PayPal 官方的前端 SDK（一段 PayPal 的 JS 代码），并告诉它基本配置（应用的id，币种，支付意图）
    <PayPalScriptProvider
      options={{
        'client-id': PAYPAL_CLIENT_ID,
        currency: plan.currency,
        intent: 'capture',
        components: 'buttons',
      }}
    >
      <PayPalButtons
        fundingSource={FUNDING.PAYPAL}
        disabled={disabled}
        forceReRender={[plan.id, plan.amount]} // 当planid或amount变化时，强制重新渲染按钮（paypal不会更新金额感知react）
        style={{
          layout: 'vertical',
          color: 'gold',
          shape: 'rect',
          label: 'paypal',
          height: 42,
        }}
        //几个callback函数：点按钮时触发，调后端，传入planid，返回orderID——给paypal后决定多少钱
        createOrder={async () => {
          const res = await createSubscriptionOrderAPI({ planId: plan.id })
          return res.orderID || res.data?.orderID
        }}
        //支付成功后触发，调后端，PayPal回调这个时传入（data包括刚才传入的orderID），结果调 onSuccess 通知父组件
        onApprove={async (data) => {
          try {
            const res = await captureSubscriptionOrderAPI({
              orderID: data.orderID,
              planId: plan.id,
            })
            message.success('Subscription activated')
            onSuccess?.(res.data || res.user || res) //通知父组件支付成功
          } catch (err) {
            message.error(err.response?.data?.message || 'Payment capture failed')
          }
        }}
        //支付取消后触发
        onCancel={() => message.info('Payment cancelled')}
        onError={() => message.error('PayPal checkout failed')}
      />
    </PayPalScriptProvider>
  )
}
