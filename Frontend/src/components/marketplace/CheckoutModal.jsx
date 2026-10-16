import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import {
  Modal, InputNumber, Input, Typography, Divider, Space, Alert, Tag, App as AntdApp,
} from 'antd'
import { FUNDING, PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js'
import { createOrderAPI, captureOrderAPI, cancelOrderAPI } from '../../apis/order'
import config from '../../../config'

const { Text, Title } = Typography

const GREEN = '#50806B'
const PAYPAL_CLIENT_ID = config.VITE_PAYPAL_CLIENT_ID

// 父组件ProductDetailPage传来props: 4个值
export default function CheckoutModal({ open, product, onClose, onPurchased }) {
  const { message } = AntdApp.useApp()
  const { userInfo } = useSelector((s) => s.user)

  const stock = product?.stock ?? 0
  const outOfStock = stock <= 0

  const [quantity, setQuantity] = useState(1)
  const [shippingAddress, setShippingAddress] = useState('')

  // 每当“弹窗打开”时，重置数量为1，自动填充地址
  useEffect(() => {
    if (open) {
      setQuantity(1)
      setShippingAddress(userInfo?.address || '')
    }
  }, [open, userInfo?.address])

  // 计算总价，单位欧元，保留两位小数
  const unitPrice = product?.price || 0
  const total = useMemo(
    () => (unitPrice * (quantity || 0)).toFixed(2),
    [unitPrice, quantity]
  )

  const addressReady = shippingAddress.trim().length > 0
  const canPay = !outOfStock && addressReady && quantity >= 1 && quantity <= stock

  return (
    <Modal
      open={open}
      title="Checkout"
      onCancel={onClose}
      footer={null}
      destroyOnClose
    >
      {product && (
        <div>
          <Title level={4} style={{ marginTop: 0, marginBottom: 4, color: GREEN }}>
            {product.name}
          </Title>

          {outOfStock ? (
            <Tag color="red">Out of stock</Tag>
          ) : (
            <Text type="secondary">{stock} in stock</Text>
          )}

          <Divider style={{ margin: '14px 0' }} />

          <div style={{ marginBottom: 14 }}>
            <Text strong style={{ display: 'block', marginBottom: 6 }}>Quantity</Text>
            <InputNumber
              min={1}
              max={stock || 1}
              value={quantity}
              disabled={outOfStock}
              onChange={(v) => setQuantity(v || 1)}
              style={{ width: 140 }}
            />
            {quantity > stock && !outOfStock && (
              <Text type="danger" style={{ fontSize: 12, display: 'block', marginTop: 6 }}>
                Quantity exceeds available stock ({stock})
              </Text>
            )}
          </div>

          <div style={{ marginBottom: 14 }}>
            <Text strong style={{ display: 'block', marginBottom: 6 }}>
              Shipping address <Text type="danger">*</Text>
            </Text>
            <Input.TextArea
              rows={3}
              value={shippingAddress}
              placeholder="Enter the address to ship this order to"
              onChange={(e) => setShippingAddress(e.target.value)}
            />
            {!addressReady && !outOfStock && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                A shipping address is required to continue.
              </Text>
            )}
          </div>

          <Divider style={{ margin: '14px 0' }} />

          <Space direction="vertical" style={{ width: '100%' }} size={4}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text type="secondary">Unit price</Text>
              <Text>€{unitPrice.toFixed(2)}</Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text type="secondary">Quantity</Text>
              <Text>{quantity}</Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text strong>Total</Text>
              <Text strong style={{ color: GREEN, fontSize: 18 }}>€{total}</Text>
            </div>
          </Space>

          <Divider style={{ margin: '14px 0' }} />

          {!PAYPAL_CLIENT_ID ? (
            <Alert
              type="warning"
              showIcon
              message="PayPal client ID is not configured"
              description="Add VITE_PAYPAL_CLIENT_ID to the frontend environment before testing PayPal checkout."
            />
          ) : outOfStock ? (
            <Alert type="error" showIcon message="This product is out of stock." />
          ) : (
            <PayPalScriptProvider
              options={{
                'client-id': PAYPAL_CLIENT_ID,
                currency: 'EUR',
                intent: 'capture',
                components: 'buttons',
              }}
            >
              <PayPalButtons
                fundingSource={FUNDING.PAYPAL}
                disabled={!canPay}
                forceReRender={[total, quantity, shippingAddress, product._id]}
                style={{
                  layout: 'vertical',
                  color: 'gold',
                  shape: 'rect',
                  label: 'paypal',
                  height: 42,
                }}
                //三个callback函数：传给后端商品id、数量、地址，返回PayPalid、订单id
                createOrder={async () => {
                  const res = await createOrderAPI({
                    productId: product._id,
                    quantity,
                    shippingAddress: shippingAddress.trim(),
                  })
                  return res.paypalOrderId
                }}
                onApprove={async (data) => {
                  try {
                    await captureOrderAPI({ paypalOrderId: data.orderID })
                    message.success('Payment successful!')
                    onPurchased?.()
                    onClose?.()
                  } catch (err) {
                    message.error(err.response?.data?.message || 'Payment capture failed')
                  }
                }}
                onCancel={(data) => {
                  message.info('Payment cancelled')
                  // 标记本地 pending 订单为 cancelled，避免孤儿订单堆积（失败静默，不打扰用户）
                  if (data?.orderID) {
                    cancelOrderAPI({ paypalOrderId: data.orderID }).catch(() => {})
                  }
                }}
                onError={() => message.error('PayPal checkout failed')}
              />
            </PayPalScriptProvider>
          )}
        </div>
      )}
    </Modal>
  )
}
